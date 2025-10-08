import { Controller, Get, Param, Logger } from '@nestjs/common';
import { CoverLetterService } from './cover-letter.service';
import type { CoverLetterResponse } from '../types/cover-letter.types';

/**
 * Контроллер для работы с сопроводительными письмами
 * Предоставляет API для получения сгенерированных сопроводительных писем
 */
@Controller('cover-letter')
export class CoverLetterController {
  private readonly logger = new Logger(CoverLetterController.name);

  constructor(private readonly coverLetterService: CoverLetterService) {}

  /**
   * Получает последнее сгенерированное сопроводительное письмо
   * @returns Promise<CoverLetterResponse> - Последнее сопроводительное письмо или ошибка
   */
  @Get('latest')
  async getLatestCoverLetter(): Promise<CoverLetterResponse> {
    try {
      this.logger.log('Получен запрос на получение последнего письма');

      const result = await this.coverLetterService.getLatestCoverLetter();
      return result;
    } catch (error) {
      this.logger.error('Ошибка при получении последнего письма:', error);
      return {
        success: false,
        error: (error as Error).message,
        content: '',
        vacancyId: '',
        generatedAt: '',
      };
    }
  }

  /**
   * Получает сопроводительное письмо по ID вакансии
   * @param vacancyId - ID вакансии для поиска письма
   * @returns Promise<CoverLetterResponse> - Сопроводительное письмо для указанной вакансии или ошибка
   */
  @Get(':vacancyId')
  async getCoverLetterByVacancyId(
    @Param('vacancyId') vacancyId: string,
  ): Promise<CoverLetterResponse> {
    try {
      this.logger.log(
        `Получен запрос на получение письма для вакансии ${vacancyId}`,
      );

      const result =
        await this.coverLetterService.getCoverLetterByVacancyId(vacancyId);
      return result;
    } catch (error) {
      this.logger.error('Ошибка при получении письма по ID:', error);
      return {
        success: false,
        error: (error as Error).message,
        content: '',
        vacancyId: vacancyId,
        generatedAt: '',
      };
    }
  }
}
