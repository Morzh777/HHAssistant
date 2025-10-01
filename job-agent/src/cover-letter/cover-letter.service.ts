import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CoverLetterResponse } from '../types/cover-letter.types';

@Injectable()
export class CoverLetterService {
  private readonly logger = new Logger(CoverLetterService.name);
  /**
   * Получает сопроводительное письмо по ID вакансии
   */
  async getCoverLetterByVacancyId(
    vacancyId: string,
  ): Promise<CoverLetterResponse> {
    try {
      const coverLettersDir = path.join(
        process.cwd(),
        'job-agent',
        'data',
        'cover-letters',
      );
      const files = await fs.readdir(coverLettersDir);

      if (files.length === 0) {
        throw new Error('Сопроводительные письма не найдены');
      }

      // Ищем файл по ID вакансии
      const targetFile = files.find(
        (file) =>
          file.startsWith(`cover_letter_${vacancyId}_`) &&
          file.endsWith('.txt'),
      );

      if (!targetFile) {
        throw new Error(`Письмо для вакансии ${vacancyId} не найдено`);
      }

      const filePath = path.join(coverLettersDir, targetFile);
      const fileContent = await fs.readFile(filePath, 'utf-8');

      // Парсим файл и извлекаем только текст письма
      const lines = fileContent.split('\n');

      // Ищем второй разделитель (после метаданных)
      let startIndex = -1;
      let endIndex = lines.length;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('========================')) {
          if (startIndex === -1) {
            startIndex = i;
          } else {
            // Это второй разделитель - начинаем с следующей строки
            startIndex = i + 1;
            break;
          }
        }
      }

      // Ищем третий разделитель (конец письма)
      for (let i = startIndex; i < lines.length; i++) {
        if (lines[i].includes('========================')) {
          endIndex = i;
          break;
        }
      }

      let coverLetterText = '';
      if (startIndex !== -1 && endIndex > startIndex) {
        coverLetterText = lines.slice(startIndex, endIndex).join('\n').trim();
      } else {
        coverLetterText = fileContent;
      }

      return {
        success: true,
        content: coverLetterText,
        fileName: targetFile,
        vacancyId: vacancyId,
        generatedAt: new Date().toISOString(),
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
      const coverLettersDir = path.join(
        process.cwd(),
        'job-agent',
        'data',
        'cover-letters',
      );
      const files = await fs.readdir(coverLettersDir);

      if (files.length === 0) {
        throw new Error('Сопроводительные письма не найдены');
      }

      // Получаем самый новый файл
      const latestFile = files
        .filter(
          (file) => file.startsWith('cover_letter_') && file.endsWith('.txt'),
        )
        .sort()
        .pop();

      if (!latestFile) {
        throw new Error('Файлы сопроводительных писем не найдены');
      }

      const filePath = path.join(coverLettersDir, latestFile);
      const fileContent = await fs.readFile(filePath, 'utf-8');

      // Парсим файл и извлекаем только текст письма
      const lines = fileContent.split('\n');

      // Ищем второй разделитель (после метаданных)
      let startIndex = -1;
      let endIndex = lines.length;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('========================')) {
          if (startIndex === -1) {
            startIndex = i;
          } else {
            // Это второй разделитель - начинаем с следующей строки
            startIndex = i + 1;
            break;
          }
        }
      }

      // Ищем третий разделитель (конец письма)
      for (let i = startIndex; i < lines.length; i++) {
        if (lines[i].includes('========================')) {
          endIndex = i;
          break;
        }
      }

      let coverLetterText = '';
      if (startIndex !== -1 && endIndex > startIndex) {
        coverLetterText = lines.slice(startIndex, endIndex).join('\n').trim();
      } else {
        coverLetterText = fileContent;
      }

      // Извлекаем vacancyId из имени файла
      const vacancyIdMatch = latestFile.match(/cover_letter_([^_]+)_/);
      const vacancyId = vacancyIdMatch ? vacancyIdMatch[1] : 'unknown';

      return {
        success: true,
        content: coverLetterText,
        fileName: latestFile,
        vacancyId: vacancyId,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Ошибка при получении последнего письма:', error);
      throw new Error(
        `Не удалось получить письмо: ${(error as Error).message}`,
      );
    }
  }
}
