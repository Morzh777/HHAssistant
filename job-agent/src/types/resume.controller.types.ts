import { ResumeAnalysisResult } from './resume.interfaces';

/**
 * Типы для контроллера резюме
 */

// Запросы
export interface SaveCookiesRequest {
  cookie: string;
}

export interface SaveResumeRequest {
  cookie: string;
  resumeUrl: string;
}

// Ответы
export interface ResumeParseResponse {
  success: boolean;
  html: string;
  error?: string;
}

export interface ResumeAnalysisResponse {
  success: boolean;
  message: string;
  url: string;
  analysis: ResumeAnalysisResult;
  error?: string;
}

export interface ResumeAnalysisServiceResponse {
  message: string;
  url: string;
  analysis: ResumeAnalysisResult;
}

export interface LatestResumeDataResponse {
  success: boolean;
  data: ResumeAnalysisResult;
  resumeId: string;
  loadedAt: string;
}

export interface SaveCookiesResponse {
  success: boolean;
  message: string;
}

export interface SaveResumeResponse {
  message: string;
}

export interface ResetResumeResponse {
  message: string;
}

// Типы для валидации URL
export interface ResumeUrlParams {
  url: string;
}

// Типы для сервиса резюме
export interface ResumeParseServiceResponse {
  html: string;
}

export interface ResumeAnalysisServiceResponse {
  message: string;
  url: string;
  analysis: ResumeAnalysisResult;
}

export interface SavedResumeAnalysisResponse {
  success: boolean;
  message: string;
  error?: string;
}

// Типы для HTTP запросов
export interface HttpFetchResponse {
  success: boolean;
  html: string;
  error?: string;
  statusCode?: number;
}
