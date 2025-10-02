import { Injectable, Logger } from '@nestjs/common';
import { OpenAIService } from '../openai/openai.service';
import {
  OPENAI_CONFIGS,
  SYSTEM_PROMPTS,
  USER_PROMPTS,
  
} from '../config/openai.config';
import {
  VacancyAnalysis,
  VacancyAnalysisResponse,
} from '../types/vacancy-analysis.types';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class VacancyAnalysisService {
  private readonly logger = new Logger(VacancyAnalysisService.name);
  private readonly analysisDir = path.join(
    process.cwd(),
    'job-agent',
    'data',
    'analysis',
  );

  constructor(private readonly openaiService: OpenAIService) {
    this.ensureAnalysisDir();
  }

  private async ensureAnalysisDir(): Promise<void> {
    try {
      await fs.access(this.analysisDir);
    } catch {
      await fs.mkdir(this.analysisDir, { recursive: true });
      this.logger.log(`Created analysis directory: ${this.analysisDir}`);
    }
  }

  async analyzeVacancy(
    vacancyId: string,
    vacancyData: any,
  ): Promise<VacancyAnalysisResponse> {
    try {
      this.logger.log(
        `Analyzing vacancy ${vacancyId} for toxicity and red flags`,
      );

      // Проверяем есть ли уже анализ
      const existingAnalysis = await this.getExistingAnalysis(vacancyId);
      if (existingAnalysis) {
        this.logger.log(`Found existing analysis for vacancy ${vacancyId}`);
        return existingAnalysis;
      }

      // Генерируем анализ через OpenAI
      const prompt = USER_PROMPTS.VACANCY_ANALYSIS(vacancyData);
      const systemPrompt = SYSTEM_PROMPTS.VACANCY_ANALYSIS;
      const config = OPENAI_CONFIGS.VACANCY_ANALYSIS;

      const analysisText = await this.openaiService.generateText(
        prompt,
        systemPrompt,
        config,
      );

      // Парсим JSON ответ
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

      // Валидируем результат
      this.validateAnalysis(analysis);

      const response: VacancyAnalysisResponse = {
        success: true,
        data: analysis,
        vacancyId,
        analyzedAt: new Date().toISOString(),
      };

      // Сохраняем анализ
      await this.saveAnalysis(vacancyId, response);

      this.logger.log(
        `Successfully analyzed vacancy ${vacancyId}, toxicity score: ${analysis.toxicityScore}`,
      );
      return response;
    } catch (error) {
      this.logger.error(`Error analyzing vacancy ${vacancyId}:`, error);
      return {
        success: false,
        error: error.message || 'Неизвестная ошибка при анализе вакансии',
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
    const filename = `analysis_${vacancyId}_${new Date().toISOString().split('T')[0]}.json`;
    const filepath = path.join(this.analysisDir, filename);

    await fs.writeFile(filepath, JSON.stringify(analysis, null, 2), 'utf-8');
    this.logger.log(`Saved analysis to ${filepath}`);
  }

  private async getExistingAnalysis(
    vacancyId: string,
  ): Promise<VacancyAnalysisResponse | null> {
    try {
      const files = await fs.readdir(this.analysisDir);
      const analysisFile = files.find(
        (file) =>
          file.startsWith(`analysis_${vacancyId}_`) && file.endsWith('.json'),
      );

      if (!analysisFile) {
        return null;
      }

      const filepath = path.join(this.analysisDir, analysisFile);
      const content = await fs.readFile(filepath, 'utf-8');
      return JSON.parse(content);
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
      const files = await fs.readdir(this.analysisDir);
      const analysisFiles = files.filter(
        (file) => file.startsWith('analysis_') && file.endsWith('.json'),
      );

      const analyses: VacancyAnalysisResponse[] = [];
      for (const file of analysisFiles) {
        try {
          const filepath = path.join(this.analysisDir, file);
          const content = await fs.readFile(filepath, 'utf-8');
          const analysis = JSON.parse(content);
          analyses.push(analysis);
        } catch (error) {
          this.logger.warn(`Could not load analysis file ${file}:`, error);
        }
      }

      return analyses.sort(
        (a, b) =>
          new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime(),
      );
    } catch (error) {
      this.logger.error('Error loading all analyses:', error);
      return [];
    }
  }
}
