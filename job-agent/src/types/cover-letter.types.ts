export interface CoverLetterResponse {
  success: boolean;
  content: string;
  fileName: string;
  vacancyId: string;
  generatedAt: string;
  error?: string;
}

