import dotenv from 'dotenv';
import * as path from 'path';

// Загружаем .env файл
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Resume, ResumeAnalysisResult } from '../types/resume.interfaces';
import { Vacancy } from '../types/vacancy.types';
// cover-letter responses are handled via CoverLetterService (DB-backed)
import {
  OPENAI_CONFIGS,
  SYSTEM_PROMPTS,
  USER_PROMPTS,
  // file constants are no longer used for cover letters
} from '../config/openai.config';
import { PrismaService } from 'nestjs-prisma';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    // Пробуем получить API ключ из разных источников
    const apiKey = process.env.OPENAI_API_KEY;

    this.logger.log(`API Key loaded: ${!!apiKey}`);
    this.logger.log(`API Key length: ${apiKey ? apiKey.length : 0}`);

    if (!apiKey) {
      this.logger.error('OPENAI_API_KEY не найден в переменных окружения');
      this.logger.error('Проверьте файл .env в корне проекта job-agent/');
      throw new Error('OPENAI_API_KEY is required');
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
    });

    this.logger.log('OpenAI client initialized successfully');
  }

  /**
   * Генерирует сопроводительное письмо на основе резюме и вакансии
   */
  async generateCoverLetter(
    resumeData: Resume,
    vacancyData: Vacancy,
  ): Promise<string> {
    try {
      this.logger.log('Генерируем сопроводительное письмо через OpenAI...');

      const config = OPENAI_CONFIGS.COVER_LETTER;
      const prompt = USER_PROMPTS.COVER_LETTER(resumeData, vacancyData);

      const completion = await this.openai.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPTS.COVER_LETTER,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        ...(config.maxTokens && { max_tokens: config.maxTokens }),
        ...(config.temperature !== undefined && {
          temperature: config.temperature,
        }),
      });

      const firstChoice = completion.choices[0];
      if (!firstChoice?.message?.content) {
        throw new Error('OpenAI не вернул сопроводительное письмо');
      }

      const coverLetter: string = firstChoice.message.content.trim();

      this.logger.log('Сопроводительное письмо успешно сгенерировано');

      // Сохраняем письмо в файл
      await this.saveCoverLetter(coverLetter, vacancyData);

      return coverLetter;
    } catch (error) {
      this.logger.error(
        'Ошибка при генерации сопроводительного письма:',
        error,
      );

      if (error instanceof Error) {
        throw new Error(
          `Не удалось сгенерировать сопроводительное письмо: ${error.message}`,
        );
      }

      throw new Error('Не удалось сгенерировать сопроводительное письмо');
    }
  }

  /**
   * Анализирует HTML резюме и извлекает структурированную информацию
   */
  async analyzeResumeHtml(html: string): Promise<ResumeAnalysisResult> {
    try {
      this.logger.log('Начинаем анализ HTML резюме через OpenAI...');

      const config = OPENAI_CONFIGS.RESUME_ANALYSIS_HTML;
      const prompt = USER_PROMPTS.RESUME_ANALYSIS_HTML(html);

      const completion = await this.openai.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPTS.RESUME_ANALYSIS,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        ...(config.maxCompletionTokens && {
          max_completion_tokens: config.maxCompletionTokens,
        }),
      });

      const firstChoice = completion.choices[0];
      if (!firstChoice?.message?.content) {
        throw new Error('OpenAI не вернул ответ');
      }

      const response: string = firstChoice.message.content;

      // Пытаемся распарсить JSON ответ
      try {
        // Убираем markdown блоки если они есть
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

        const parsedResponse = JSON.parse(
          cleanResponse,
        ) as ResumeAnalysisResult;
        this.logger.log('Успешно проанализировано резюме через OpenAI');
        return parsedResponse;
      } catch (parseError) {
        this.logger.error('Ошибка парсинга JSON ответа от OpenAI:', parseError);
        this.logger.debug('Ответ от OpenAI:', response);
        throw new Error('Не удалось распарсить ответ от OpenAI');
      }
    } catch (error) {
      this.logger.error('Ошибка при анализе резюме через OpenAI:', error);
      throw error;
    }
  }

  /**
   * Анализирует текст резюме (если HTML слишком большой)
   */
  async analyzeResumeText(text: string): Promise<ResumeAnalysisResult> {
    try {
      this.logger.log('Начинаем анализ текста резюме через OpenAI...');

      const config = OPENAI_CONFIGS.RESUME_ANALYSIS_TEXT;
      const prompt = USER_PROMPTS.RESUME_ANALYSIS_TEXT(text);

      const completion = await this.openai.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPTS.RESUME_TEXT_ANALYSIS,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        ...(config.temperature !== undefined && {
          temperature: config.temperature,
        }),
        ...(config.maxTokens && { max_tokens: config.maxTokens }),
      });

      const firstChoice = completion.choices[0];
      if (!firstChoice?.message?.content) {
        throw new Error('OpenAI не вернул ответ');
      }

      const response: string = firstChoice.message.content;

      try {
        // Убираем markdown блоки если они есть
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

        const parsedResponse = JSON.parse(
          cleanResponse,
        ) as ResumeAnalysisResult;
        this.logger.log('Успешно проанализировано резюме через OpenAI');
        return parsedResponse;
      } catch (parseError) {
        this.logger.error('Ошибка парсинга JSON ответа от OpenAI:', parseError);
        this.logger.debug('Ответ от OpenAI:', response);
        throw new Error('Не удалось распарсить ответ от OpenAI');
      }
    } catch (error) {
      this.logger.error('Ошибка при анализе резюме через OpenAI:', error);
      throw error;
    }
  }

  /**
   * Универсальный метод для генерации текста через OpenAI
   */
  async generateText(
    prompt: string,
    systemPrompt: string,
    config: { model: string; maxTokens?: number; temperature?: number },
  ): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        ...(config.maxTokens && { max_tokens: config.maxTokens }),
        ...(config.temperature !== undefined && {
          temperature: config.temperature,
        }),
      });

      const firstChoice = completion.choices[0];
      if (!firstChoice?.message?.content) {
        throw new Error('Пустой ответ от OpenAI API');
      }

      return firstChoice.message.content;
    } catch (error) {
      this.logger.error('Ошибка генерации текста через OpenAI:', error);
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const model = OPENAI_CONFIGS.EMBEDDINGS.model;
      const response = await this.openai.embeddings.create({
        model,
        input: text,
      });
      const embedding = response.data?.[0]?.embedding as unknown as number[];
      if (!embedding || !Array.isArray(embedding)) {
        throw new Error('Empty embedding received');
      }
      return embedding;
    } catch (error) {
      this.logger.error('Ошибка генерации эмбеддинга через OpenAI:', error);
      throw error;
    }
  }

  /**
   * Проверяет доступность OpenAI API
   */
  async checkApiAvailability(): Promise<boolean> {
    try {
      const config = OPENAI_CONFIGS.API_CHECK;

      const completion = await this.openai.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: 'user',
            content: 'Проверка доступности API. Ответь "OK"',
          },
        ],
        ...(config.maxTokens && { max_tokens: config.maxTokens }),
        ...(config.temperature !== undefined && {
          temperature: config.temperature,
        }),
      });

      const firstChoice = completion.choices[0];
      return !!firstChoice?.message?.content;
    } catch (error) {
      this.logger.error('OpenAI API недоступен:', error);
      return false;
    }
  }

  // Методы чтения писем из файловой системы удалены. Чтение осуществляется через CoverLetterService из БД.

  /**
   * Сохраняет сгенерированное сопроводительное письмо в файл
   */
  private async saveCoverLetter(
    coverLetter: string,
    vacancyData: Vacancy,
  ): Promise<void> {
    try {
      // Сохраняем только в БД (без записи на файловую систему)
      const generatedAt = new Date();
      await this.prisma.coverLetter.create({
        data: {
          vacancyId: vacancyData?.id || 'unknown',
          content: coverLetter,
          generatedAt,
          // fileName больше не используется, оставляем пустым
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
}
