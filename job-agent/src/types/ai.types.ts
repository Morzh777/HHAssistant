/**
 * Универсальные типы для AI провайдеров
 */

export interface AIConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  maxCompletionTokens?: number;
}

export interface AIProvider {
  /**
   * Генерирует текст на основе промпта
   */
  generateText(
    prompt: string,
    systemPrompt: string,
    config: AIConfig,
  ): Promise<string>;

  /**
   * Генерирует эмбеддинг для текста
   */
  generateEmbedding(text: string): Promise<number[]>;

  /**
   * Проверяет доступность API
   */
  checkApiAvailability(): Promise<boolean>;

  /**
   * Получает название провайдера
   */
  getProviderName(): string;

  /**
   * Получает конфигурацию для конкретной задачи
   */
  getConfig(taskType: string): AIConfig;
}

export interface AIProviderConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export enum AIProviderType {
  OPENAI = 'openai',
  YANDEX = 'yandex',
  ANTHROPIC = 'anthropic',
}

export interface AIServiceConfig {
  defaultProvider: AIProviderType;
  providers: {
    [AIProviderType.OPENAI]?: AIProviderConfig;
    [AIProviderType.YANDEX]?: AIProviderConfig;
    [AIProviderType.ANTHROPIC]?: AIProviderConfig;
  };
}