import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { Resume, ResumeAnalysisResult } from '../types/resume.interfaces';
import { Vacancy } from '../types/vacancy.types';
import { VacancyAnalysis } from '../types/vacancy-analysis.types';
import { AIProvider, AIProviderType, AIConfig } from '../types/ai.types';
import { OpenAIProvider } from './providers/openai.provider';
import { YandexProvider } from './providers/yandex.provider';
import {
  DEFAULT_AI_PROVIDER,
  ACTIVE_PROVIDER_URL,
  SYSTEM_PROMPTS,
  USER_PROMPTS,
} from '../config/ai.config';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly provider: AIProvider;
  private readonly providerType: AIProviderType;

  constructor(private readonly prisma: PrismaService) {
    this.providerType = DEFAULT_AI_PROVIDER as AIProviderType;
    this.provider = this.initializeProvider();
    this.logger.log(
      `AI Service initialized with ${this.providerType} provider`,
    );
  }

  private initializeProvider(): AIProvider {
    if (this.providerType === AIProviderType.OPENAI) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY not found in environment variables');
      }
      this.logger.log('Initializing OpenAI provider');
      return new OpenAIProvider({
        apiKey,
        baseUrl: ACTIVE_PROVIDER_URL,
      });
    } else if (this.providerType === AIProviderType.YANDEX) {
      const apiKey = process.env.YANDEX_API_KEY;
      if (!apiKey) {
        throw new Error('YANDEX_API_KEY not found in environment variables');
      }
      this.logger.log('Initializing Yandex provider');
      return new YandexProvider({
        apiKey,
        baseUrl: ACTIVE_PROVIDER_URL,
      });
    } else {
      throw new Error(`Unsupported provider: ${this.providerType}`);
    }
  }

  /**
   * Получает конфигурацию для конкретной задачи
   */
  getProviderConfig(taskType: string): AIConfig {
    return this.provider.getConfig(taskType);
  }

  /**
   * Получает тип активного провайдера
   */
  getDefaultProvider(): AIProviderType {
    return this.providerType;
  }

  /**
   * Генерирует сопроводительное письмо
   */
  async generateCoverLetter(
    resumeData: Resume,
    vacancyData: Vacancy,
    vacancyAnalysis?: VacancyAnalysis | null,
  ): Promise<string> {
    try {
      this.logger.log(
        `Генерируем сопроводительное письмо через ${this.providerType}...`,
      );

      const config = this.getProviderConfig('COVER_LETTER');
      const prompt = USER_PROMPTS.COVER_LETTER(
        resumeData,
        vacancyData,
        vacancyAnalysis,
      );

      const coverLetter = await this.provider.generateText(
        prompt,
        SYSTEM_PROMPTS.COVER_LETTER,
        config,
      );

      this.logger.log('Сопроводительное письмо успешно сгенерировано');

      // Сохраняем письмо в БД
      await this.saveCoverLetter(coverLetter, vacancyData);

      return coverLetter;
    } catch (error) {
      this.logger.error(
        'Ошибка при генерации сопроводительного письма:',
        error,
      );
      throw error;
    }
  }

  /**
   * Анализирует HTML резюме
   */
  async analyzeResumeHtml(html: string): Promise<ResumeAnalysisResult> {
    try {
      this.logger.log(`Анализируем HTML резюме через ${this.providerType}...`);

      const config = this.getProviderConfig('RESUME_ANALYSIS');
      const prompt = USER_PROMPTS.RESUME_ANALYSIS_HTML(html);

      const response = await this.provider.generateText(
        prompt,
        SYSTEM_PROMPTS.RESUME_ANALYSIS,
        config,
      );

      // Парсим JSON ответ
      const cleanResponse = this.cleanJsonResponse(response);
      const parsedResponse = JSON.parse(cleanResponse) as ResumeAnalysisResult;

      this.logger.log('Успешно проанализировано резюме');
      return parsedResponse;
    } catch (error) {
      this.logger.error('Ошибка при анализе резюме:', error);
      throw error;
    }
  }

  /**
   * Анализирует текст резюме
   */
  async analyzeResumeText(text: string): Promise<ResumeAnalysisResult> {
    try {
      this.logger.log(`Анализируем текст резюме через ${this.providerType}...`);

      const config = this.getProviderConfig('RESUME_ANALYSIS');
      const prompt = USER_PROMPTS.RESUME_ANALYSIS_TEXT(text);

      const response = await this.provider.generateText(
        prompt,
        SYSTEM_PROMPTS.RESUME_TEXT_ANALYSIS,
        config,
      );

      // Парсим JSON ответ
      const cleanResponse = this.cleanJsonResponse(response);
      const parsedResponse = JSON.parse(cleanResponse) as ResumeAnalysisResult;

      this.logger.log('Успешно проанализировано резюме');
      return parsedResponse;
    } catch (error) {
      this.logger.error('Ошибка при анализе резюме:', error);
      throw error;
    }
  }

  /**
   * Универсальный метод для генерации текста
   */
  async generateText(
    prompt: string,
    systemPrompt: string,
    config: AIConfig,
  ): Promise<string> {
    return this.provider.generateText(prompt, systemPrompt, config);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return this.provider.generateEmbedding(text);
  }

  /**
   * Проверяет доступность API
   */
  async checkApiAvailability(): Promise<boolean> {
    return this.provider.checkApiAvailability();
  }

  /**
   * Сохраняет сгенерированное сопроводительное письмо в БД
   */
  private async saveCoverLetter(
    coverLetter: string,
    vacancyData: Vacancy,
  ): Promise<void> {
    try {
      // Сохраняем в БД
      const generatedAt = new Date();
      await this.prisma.coverLetter.create({
        data: {
          vacancyId: vacancyData?.id || 'unknown',
          content: coverLetter,
          generatedAt,
          fileName: null as unknown as string,
        },
      });

      // Генерируем эмбеддинг для текста письма и сохраняем в pgvector
      try {
        const emb = await this.generateEmbedding(coverLetter);
        const vectorLiteral = `[${emb
          .map((v) => (Number.isFinite(v) ? Number(v) : 0))
          .join(',')}]`;
        await this.prisma
          .$executeRaw`UPDATE "CoverLetter" SET embedding = ${vectorLiteral}::vector WHERE "vacancyId" = ${vacancyData?.id || 'unknown'} AND "generatedAt" = ${generatedAt}`;
      } catch (e) {
        this.logger.warn('Не удалось сохранить эмбеддинг для письма', e);
      }
    } catch (error) {
      this.logger.error(
        'Ошибка при сохранении сопроводительного письма в БД:',
        error,
      );
      // Не выбрасываем ошибку, чтобы не прерывать основной процесс
    }
  }

  /**
   * Очищает JSON ответ от markdown блоков
   */
  private cleanJsonResponse(response: string): string {
    let cleanResponse = response.trim();
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse
        .replace(/^```json\s*/, '')
        .replace(/\s*```$/, '');
    } else if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '');
    }
    return cleanResponse;
  }
}
