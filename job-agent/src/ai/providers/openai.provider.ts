import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type {
  AIProvider,
  AIProviderConfig,
  AIConfig,
} from '../../types/ai.types';

/**
 * OpenAI Provider
 * 
 * Провайдер для работы с OpenAI API.
 * Поддерживает модели GPT-5 mini и text-embedding-3-small.
 * 
 * Особенности:
 * - GPT-5 mini не поддерживает кастомную temperature (используется значение по умолчанию)
 * - text-embedding-3-small поддерживает temperature: 0
 * - Автоматическая обработка ошибок API
 * - Логирование всех операций
 */

// Конфигурации для OpenAI провайдера
export const OPENAI_CONFIGS = {
  COVER_LETTER: { model: 'gpt-5-mini' },
  RESUME_ANALYSIS: { model: 'gpt-5-mini' },
  VACANCY_ANALYSIS: { model: 'gpt-5-mini' },
  API_CHECK: { model: 'gpt-5-mini', maxTokens: 10 },
  EMBEDDINGS: { model: 'text-embedding-3-small', temperature: 0 },
} as const;

// Базовый URL для OpenAI
export const OPENAI_BASE_URL = 'https://api.openai.com/v1';

@Injectable()
export class OpenAIProvider implements AIProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly openai: OpenAI;

  constructor(private readonly config: AIProviderConfig) {
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
    this.logger.log('OpenAI provider initialized');
  }

  /**
   * Генерирует текст на основе промпта
   * 
   * @param prompt - пользовательский промпт
   * @param systemPrompt - системный промпт
   * @param config - конфигурация модели (модель, temperature, maxTokens)
   * @returns сгенерированный текст
   */
  async generateText(
    prompt: string,
    systemPrompt: string,
    config: AIConfig,
  ): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        ...(config.maxTokens && { max_tokens: config.maxTokens }),
        ...(config.maxCompletionTokens && {
          max_completion_tokens: config.maxCompletionTokens,
        }),
        ...(config.temperature !== undefined && {
          temperature: config.temperature,
        }),
      });

      const firstChoice = completion.choices[0];
      if (!firstChoice?.message?.content) {
        throw new Error('OpenAI не вернул ответ');
      }

      return firstChoice.message.content.trim();
    } catch (error) {
      this.logger.error('Ошибка генерации текста через OpenAI:', error);
      throw error;
    }
  }

  /**
   * Генерирует эмбеддинг для текста
   * 
   * @param text - текст для генерации эмбеддинга
   * @returns массив чисел (вектор эмбеддинга)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      const embedding = response.data?.[0]?.embedding as unknown as number[];
      if (!embedding || !Array.isArray(embedding)) {
        throw new Error('Empty embedding received from OpenAI');
      }

      return embedding;
    } catch (error) {
      this.logger.error('Ошибка генерации эмбеддинга через OpenAI:', error);
      throw error;
    }
  }

  /**
   * Проверяет доступность OpenAI API
   * 
   * @returns true если API доступен, false если недоступен
   */
  async checkApiAvailability(): Promise<boolean> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Проверка доступности API. Ответь "OK"',
          },
        ],
        max_tokens: 10,
      });

      return !!completion.choices[0]?.message?.content;
    } catch (error) {
      this.logger.error('OpenAI API недоступен:', error);
      return false;
    }
  }

  /**
   * Возвращает название провайдера
   * 
   * @returns название провайдера
   */
  getProviderName(): string {
    return 'OpenAI';
  }

  /**
   * Получает конфигурацию для конкретной задачи
   * 
   * @param taskType - тип задачи (COVER_LETTER, RESUME_ANALYSIS, etc.)
   * @returns конфигурация модели для задачи
   */
  getConfig(taskType: string): AIConfig {
    const config = OPENAI_CONFIGS[taskType as keyof typeof OPENAI_CONFIGS];
    if (!config) {
      throw new Error(
        `Configuration for task type "${taskType}" not found in OpenAI provider`,
      );
    }
    return config;
  }
}
