/**
 * Типы для auth сервиса
 */

// Запросы
export interface SaveCookiesRequest {
  cookie: string;
}

// Ответы
export interface SaveCookiesResponse {
  success: boolean;
  message: string;
}

export interface GetCookiesResponse {
  success: boolean;
  cookie?: string;
  error?: string;
}

export interface ResetResumeResponse {
  success: boolean;
  message: string;
}
