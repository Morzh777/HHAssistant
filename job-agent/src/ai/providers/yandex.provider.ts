import { Injectable, Logger } from '@nestjs/common';
import type {
  AIProvider,
  AIProviderConfig,
  AIConfig,
} from '../../types/ai.types';

/**
 * Yandex Provider
 *
 * Провайдер для работы с Yandex GPT API.
 * Поддерживает модели yandexgpt и yandexgpt-embedding.
 *
 * Особенности:
 * - Поддерживает кастомную temperature для всех моделей
 * - Использует REST API вместо OpenAI-совместимого интерфейса
 * - Автоматическая обработка ошибок API
 * - Логирование всех операций
 * - Работает без VPN в России
 */

// Конфигурации для Yandex провайдера
export const YANDEX_CONFIGS = {
  COVER_LETTER: { model: 'yandexgpt', temperature: 0.7 },
  RESUME_ANALYSIS: { model: 'yandexgpt', temperature: 0.1 },
  VACANCY_ANALYSIS: { model: 'yandexgpt', temperature: 0.3 },
  API_CHECK: { model: 'yandexgpt', temperature: 0, maxTokens: 10 },
  EMBEDDINGS: { model: 'yandexgpt-embedding', temperature: 0 },
} as const;

// Базовый URL для Yandex
export const YANDEX_BASE_URL =
  'https://llm.api.cloud.yandex.net/foundationModels/v1';

@Injectable()
export class YandexProvider implements AIProvider {
  private readonly logger = new Logger(YandexProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly config: AIProviderConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl =
      config.baseUrl || 'https://llm.api.cloud.yandex.net/foundationModels/v1';
    this.logger.log('Yandex provider initialized');
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
      const response = await fetch(`${this.baseUrl}/completion`, {
        method: 'POST',
        headers: {
          Authorization: `Api-Key ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelUri: `gpt://${config.model}`,
          completionOptions: {
            stream: false,
            temperature: config.temperature,
            maxTokens: config.maxTokens || config.maxCompletionTokens,
          },
          messages: [
            {
              role: 'system',
              text: systemPrompt,
            },
            {
              role: 'user',
              text: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Yandex API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      const result = data.result?.alternatives?.[0]?.message?.text;

      if (!result) {
        throw new Error('Yandex не вернул ответ');
      }

      return result.trim();
    } catch (error) {
      this.logger.error('Ошибка генерации текста через Yandex:', error);
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
      const response = await fetch(`${this.baseUrl}/embedding`, {
        method: 'POST',
        headers: {
          Authorization: `Api-Key ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelUri: 'gpt://yandexgpt/embedding',
          text: text,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Yandex Embedding API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      const embedding = data.embedding;

      if (!embedding || !Array.isArray(embedding)) {
        throw new Error('Empty embedding received from Yandex');
      }

      return embedding;
    } catch (error) {
      this.logger.error('Ошибка генерации эмбеддинга через Yandex:', error);
      throw error;
    }
  }

  /**
   * Проверяет доступность Yandex API
   *
   * @returns true если API доступен, false если недоступен
   */
  async checkApiAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/completion`, {
        method: 'POST',
        headers: {
          Authorization: `Api-Key ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelUri: 'gpt://yandexgpt/lite',
          completionOptions: {
            stream: false,
            maxTokens: 10,
          },
          messages: [
            {
              role: 'user',
              text: 'Проверка доступности API. Ответь "OK"',
            },
          ],
        }),
      });

      return response.ok;
    } catch (error) {
      this.logger.error('Yandex API недоступен:', error);
      return false;
    }
  }

  /**
   * Возвращает название провайдера
   *
   * @returns название провайдера
   */
  getProviderName(): string {
    return 'Yandex';
  }

  /**
   * Получает конфигурацию для конкретной задачи
   *
   * @param taskType - тип задачи (COVER_LETTER, RESUME_ANALYSIS, etc.)
   * @returns конфигурация модели для задачи
   */
  getConfig(taskType: string): AIConfig {
    const config = YANDEX_CONFIGS[taskType as keyof typeof YANDEX_CONFIGS];
    if (!config) {
      throw new Error(
        `Configuration for task type "${taskType}" not found in Yandex provider`,
      );
    }
    return config;
  }
}
