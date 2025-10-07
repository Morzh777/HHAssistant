import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CoverLetterResponse } from '../types/cover-letter.types';

@Injectable()
export class CoverLetterService {
  private readonly logger = new Logger(CoverLetterService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Получает сопроводительное письмо по ID вакансии
   */
  async getCoverLetterByVacancyId(
    vacancyId: string,
  ): Promise<CoverLetterResponse> {
    try {
      const row = await this.prisma.coverLetter.findFirst({
        where: { vacancyId },
        orderBy: { generatedAt: 'desc' },
      });
      if (!row) {
        throw new Error(`Письмо для вакансии ${vacancyId} не найдено`);
      }
      return {
        success: true,
        content: row.content,
        fileName: row.fileName ?? '',
        vacancyId: row.vacancyId,
        generatedAt: row.generatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error('Ошибка при получении письма по ID:', error);
      throw new Error(
        `Не удалось получить письмо: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Получает последнее сгенерированное сопроводительное письмо
   */
  async getLatestCoverLetter(): Promise<CoverLetterResponse> {
    try {
      const row = await this.prisma.coverLetter.findFirst({
        orderBy: { generatedAt: 'desc' },
      });
      if (!row) {
        throw new Error('Сопроводительные письма не найдены');
      }
      return {
        success: true,
        content: row.content,
        fileName: row.fileName ?? '',
        vacancyId: row.vacancyId,
        generatedAt: row.generatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error('Ошибка при получении последнего письма:', error);
      throw new Error(
        `Не удалось получить письмо: ${(error as Error).message}`,
      );
    }
  }
}
