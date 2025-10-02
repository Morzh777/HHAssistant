export interface VacancyAnalysis {
  toxicityScore: number; // 1-10, где 10 - очень токсично
  recommendation: 'apply' | 'avoid' | 'caution';
  redFlags: string[];
  positives: string[];
  summary: string;
  salaryAdequacy: 'adequate' | 'low' | 'high' | 'not_specified';
  experienceMatch: 'junior_friendly' | 'requires_experience' | 'unrealistic';
}

export interface VacancyAnalysisRequest {
  vacancyId: string;
  vacancyData: any;
}

export interface VacancyAnalysisResponse {
  success: boolean;
  data?: VacancyAnalysis;
  error?: string;
  vacancyId: string;
  analyzedAt: string;
}

// Константы для анализа
export const TOXICITY_LEVELS = {
  LOW: { min: 1, max: 3, label: 'Низкая токсичность', color: 'green' },
  MEDIUM: { min: 4, max: 6, label: 'Средняя токсичность', color: 'yellow' },
  HIGH: { min: 7, max: 10, label: 'Высокая токсичность', color: 'red' }
} as const;

export const RECOMMENDATION_LABELS = {
  apply: { label: 'Рекомендуется откликнуться', color: 'green', icon: '✅' },
  caution: { label: 'Откликаться с осторожностью', color: 'yellow', icon: '⚠️' },
  avoid: { label: 'Не рекомендуется', color: 'red', icon: '❌' }
} as const;
