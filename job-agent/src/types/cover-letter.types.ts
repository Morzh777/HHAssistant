export interface CoverLetterResponse {
  success: boolean;
  content: string;
  vacancyId: string;
  generatedAt: string;
  error?: string;
}