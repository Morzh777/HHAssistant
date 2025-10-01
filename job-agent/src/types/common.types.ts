export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  // Дополнительные поля для vacancy-storage
  vacancyId?: string;
  filename?: string;
  path?: string;
  count?: number;
  vacancies?: T[];
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}
