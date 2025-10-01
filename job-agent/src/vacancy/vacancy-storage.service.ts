import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Vacancy } from '../types/vacancy.types';
import { ApiResponse } from '../types/common.types';

@Injectable()
export class VacancyStorageService {
  private readonly VACANCIES_DIR = path.join(
    process.cwd(),
    'job-agent',
    'data',
    'vacancies',
  );

  constructor() {
    void this.ensureDirectoryExists();
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.access(this.VACANCIES_DIR);
    } catch {
      await fs.mkdir(this.VACANCIES_DIR, { recursive: true });
    }
  }

  /**
   * Сохранение вакансии в JSON файл
   */
  async saveVacancy(vacancyData: Vacancy): Promise<ApiResponse<Vacancy>> {
    try {
      // Добавляем метаданные
      const enrichedData = {
        ...vacancyData,
        _metadata: {
          savedAt: new Date().toISOString(),
          source: 'chrome-extension',
          ...vacancyData._metadata,
        },
      };

      // Создаем имя файла
      const filename = `vacancy_${vacancyData.id}_${new Date().toISOString().split('T')[0]}.json`;
      const filePath = path.join(this.VACANCIES_DIR, filename);

      // Сохраняем файл
      await fs.writeFile(
        filePath,
        JSON.stringify(enrichedData, null, 2),
        'utf-8',
      );

      return {
        success: true,
        message: 'Вакансия успешно сохранена',
        vacancyId: vacancyData.id,
        filename,
        path: filePath,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Ошибка сохранения вакансии: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Получение списка всех сохраненных вакансий
   */
  async getVacancyList(): Promise<ApiResponse<Vacancy[]>> {
    try {
      const files = await fs.readdir(this.VACANCIES_DIR);
      const vacancyFiles = files.filter(
        (file) => file.startsWith('vacancy_') && file.endsWith('.json'),
      );

      const vacancies: Array<{
        id: string;
        name: string;
        employer?: string;
        area?: string;
        experience?: string;
        salary?: any;
        publishedAt?: string;
        savedAt?: string;
        filename: string;
      }> = [];
      for (const file of vacancyFiles) {
        try {
          const filePath = path.join(this.VACANCIES_DIR, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const vacancy = JSON.parse(content) as Vacancy;

          // Возвращаем только основную информацию для списка
          vacancies.push({
            id: vacancy.id,
            name: vacancy.name,
            employer: vacancy.employer?.name,
            area: vacancy.area?.name,
            experience: vacancy.experience?.name,
            salary: vacancy.salary,
            publishedAt: vacancy.published_at,
            savedAt: vacancy._metadata?.savedAt,
            filename: file,
          });
        } catch (error) {
          console.error(`Error reading file ${file}:`, error);
        }
      }

      // Сортируем по дате сохранения (новые сначала)
      vacancies.sort((a, b) => {
        const dateA = a.savedAt ? new Date(a.savedAt).getTime() : 0;
        const dateB = b.savedAt ? new Date(b.savedAt).getTime() : 0;
        return dateB - dateA;
      });

      return {
        success: true,
        count: vacancies.length,
        data: vacancies as unknown as Vacancy[],
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Ошибка получения списка вакансий: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Получение конкретной вакансии по ID
   */
  async getVacancy(vacancyId: string): Promise<ApiResponse<Vacancy>> {
    try {
      const files = await fs.readdir(this.VACANCIES_DIR);
      const vacancyFile = files.find(
        (file) =>
          file.startsWith(`vacancy_${vacancyId}_`) && file.endsWith('.json'),
      );

      if (!vacancyFile) {
        throw new HttpException(
          `Вакансия с ID ${vacancyId} не найдена`,
          HttpStatus.NOT_FOUND,
        );
      }

      const filePath = path.join(this.VACANCIES_DIR, vacancyFile);
      const content = await fs.readFile(filePath, 'utf-8');
      const vacancy = JSON.parse(content) as Vacancy;

      return {
        success: true,
        data: vacancy,
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Ошибка получения вакансии: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
