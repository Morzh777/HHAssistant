import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { AIService } from '../ai/ai.service';
import {
  SYSTEM_PROMPTS,
  USER_PROMPTS,
} from '../config/ai.config';
import {
  VacancyAnalysis,
  VacancyAnalysisResponse,
} from '../types/vacancy-analysis.types';
import { PrismaService } from 'nestjs-prisma';
import { EmbeddingsService } from '../embeddings/embeddings.service';

@Injectable()
export class VacancyAnalysisService {
  private readonly logger = new Logger(VacancyAnalysisService.name);

  constructor(
    private readonly aiService: AIService,
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingsService,
  ) {}

  async analyzeVacancy(
    vacancyId: string,
    vacancyData: any,
    resumeData?: any,
  ): Promise<VacancyAnalysisResponse> {
    try {
      this.logger.log(
        `Analyzing vacancy ${vacancyId} for toxicity and red flags`,
      );

      const existingAnalysis = await this.getExistingAnalysis(vacancyId);
      if (existingAnalysis) {
        this.logger.log(`Found existing analysis for vacancy ${vacancyId}`);
        return existingAnalysis;
      }

      const prompt = USER_PROMPTS.VACANCY_ANALYSIS(vacancyData, resumeData);
      const systemPrompt = SYSTEM_PROMPTS.VACANCY_ANALYSIS;
      const config = this.aiService.getProviderConfig('VACANCY_ANALYSIS');

      const analysisText = await this.aiService.generateText(
        prompt,
        systemPrompt,
        config,
      );

      let analysis: VacancyAnalysis;
      try {
        analysis = JSON.parse(analysisText);
      } catch (parseError) {
        this.logger.error(
          `Failed to parse analysis JSON for vacancy ${vacancyId}:`,
          parseError,
        );
        throw new Error('Не удалось распарсить результат анализа');
      }

      this.validateAnalysis(analysis);

      const response: VacancyAnalysisResponse = {
        success: true,
        data: analysis,
        vacancyId,
        analyzedAt: new Date().toISOString(),
      };

      await this.saveAnalysis(vacancyId, response);

      // Если у вакансии еще нет эмбеддинга — досчитаем его из переданных данных
      try {
        const vacancyRow = await this.prisma.vacancy.findUnique({
          where: { id: vacancyId },
          select: { name: true, description: true, keySkills: true },
        });
        if (!vacancyRow) {
          // вакансии нет в БД
        } else {
          // Проверяем наличие эмбеддинга через raw SQL
          const embeddingCheck = await this.prisma.$queryRaw<
            [{ embedding: any }]
          >`
            SELECT embedding FROM "Vacancy" WHERE id = ${vacancyId}
          `;
          if (
            embeddingCheck.length > 0 &&
            embeddingCheck[0].embedding != null
          ) {
            // уже есть эмбеддинг
          } else {
            const sourceText = [
              vacancyRow.name ?? vacancyData?.name ?? '',
              (vacancyRow.description as any) ?? vacancyData?.description ?? '',
              JSON.stringify(
                vacancyRow.keySkills ?? vacancyData?.key_skills ?? {},
              ),
            ]
              .filter(Boolean)
              .join('\n');
            if (sourceText.trim().length > 0) {
              await this.embeddings.storeVacancyEmbedding(
                vacancyId,
                sourceText,
              );
            }
          }
        }
      } catch {}

      // best-effort: сохранить эмбеддинг по summary
      try {
        if (response.data?.summary) {
          const embText = `${response.data.summary}`;
          const emb = await this.aiService.generateEmbedding(embText);
          const vectorLiteral = `[${emb.map((v) => (Number.isFinite(v) ? Number(v) : 0)).join(',')}]`;
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore raw SQL update
          await this.prisma
            .$executeRaw`UPDATE "VacancyAnalysis" SET embedding = ${vectorLiteral}::vector WHERE "vacancyId" = ${vacancyId} AND "analyzedAt" = ${response.analyzedAt}`;
        }
      } catch {}

      this.logger.log(
        `Successfully analyzed vacancy ${vacancyId}, toxicity score: ${analysis.toxicityScore}`,
      );
      return response;
    } catch (error) {
      this.logger.error(`Error analyzing vacancy ${vacancyId}:`, error);
      return {
        success: false,
        error:
          (error as Error).message || 'Неизвестная ошибка при анализе вакансии',
        vacancyId,
        analyzedAt: new Date().toISOString(),
      };
    }
  }

  private validateAnalysis(analysis: VacancyAnalysis): void {
    if (
      !analysis.toxicityScore ||
      analysis.toxicityScore < 1 ||
      analysis.toxicityScore > 10
    ) {
      throw new Error('Некорректный рейтинг токсичности');
    }

    if (!['apply', 'avoid', 'caution'].includes(analysis.recommendation)) {
      throw new Error('Некорректная рекомендация');
    }

    if (
      !Array.isArray(analysis.redFlags) ||
      !Array.isArray(analysis.positives)
    ) {
      throw new Error('Некорректный формат флагов или плюсов');
    }

    if (!analysis.summary || typeof analysis.summary !== 'string') {
      throw new Error('Отсутствует резюме анализа');
    }
  }

  private async saveAnalysis(
    vacancyId: string,
    analysis: VacancyAnalysisResponse,
  ): Promise<void> {
    try {
      await this.prisma.vacancyAnalysis.create({
        data: {
          vacancyId,
          analyzedAt: new Date(analysis.analyzedAt),
          toxicityScore: analysis.data!.toxicityScore,
          recommendation: analysis.data!.recommendation,
          redFlags: analysis.data!.redFlags as any,
          positives: analysis.data!.positives as any,
          summary: analysis.data!.summary,
          salaryAdequacy: analysis.data!.salaryAdequacy,
          experienceMatch: analysis.data!.experienceMatch,
          raw: analysis as any,
        },
      });
    } catch (error) {
      this.logger.error('Ошибка сохранения анализа в БД:', error);
      throw new HttpException(
        'Ошибка сохранения анализа',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getExistingAnalysis(
    vacancyId: string,
  ): Promise<VacancyAnalysisResponse | null> {
    try {
      const row = await this.prisma.vacancyAnalysis.findFirst({
        where: { vacancyId },
        orderBy: { analyzedAt: 'desc' },
      });
      if (!row) return null;
      return (
        (row.raw as any) ?? {
          success: true,
          vacancyId,
          analyzedAt: row.analyzedAt.toISOString(),
          data: {
            toxicityScore: row.toxicityScore,
            recommendation: row.recommendation as any,
            redFlags: row.redFlags as any,
            positives: row.positives as any,
            summary: row.summary,
            salaryAdequacy: row.salaryAdequacy as any,
            experienceMatch: row.experienceMatch as any,
          },
        }
      );
    } catch (error) {
      this.logger.warn(
        `Could not load existing analysis for vacancy ${vacancyId}:`,
        error,
      );
      return null;
    }
  }

  async getAnalysis(
    vacancyId: string,
  ): Promise<VacancyAnalysisResponse | null> {
    return this.getExistingAnalysis(vacancyId);
  }

  async getAllAnalyses(): Promise<VacancyAnalysisResponse[]> {
    try {
      const rows = await this.prisma.vacancyAnalysis.findMany({
        orderBy: { analyzedAt: 'desc' },
      });
      return rows.map(
        (row) =>
          (row.raw as any) ?? {
            success: true,
            vacancyId: row.vacancyId,
            analyzedAt: row.analyzedAt.toISOString(),
            data: {
              toxicityScore: row.toxicityScore,
              recommendation: row.recommendation as any,
              redFlags: row.redFlags as any,
              positives: row.positives as any,
              summary: row.summary,
              salaryAdequacy: row.salaryAdequacy as any,
              experienceMatch: row.experienceMatch as any,
            },
          },
      );
    } catch (error) {
      this.logger.error('Error loading all analyses:', error);
      return [];
    }
  }
}
