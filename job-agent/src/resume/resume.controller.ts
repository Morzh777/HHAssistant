import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ResumeService } from './resume.service';
import { REGEX_PATTERNS } from '../config/openai.config';
import { PrismaService } from 'nestjs-prisma';
import type {
  SaveCookiesRequest,
  SaveResumeRequest,
  SaveResumeResponse,
  ResetResumeResponse,
  ResumeUrlParams,
  ResumeAnalysisServiceResponse,
  LatestResumeDataResponse,
  SaveCookiesResponse,
  ResumeParseServiceResponse,
} from '../types/resume.controller.types';

/**
 * ResumeController - контроллер для работы с резюме
 *
 * Предоставляет REST API для:
 * - Парсинга HTML резюме с HH.ru
 * - Анализа резюме через OpenAI
 * - Сохранения и получения данных резюме
 * - Управления cookies для авторизации
 *
 * Все методы работают с единым пользователем (DEFAULT_USER_ID)
 * и используют cookies для доступа к приватным данным на HH.ru
 */
@Controller('resume')
export class ResumeController {
  private readonly DEFAULT_USER_ID = 'default-user';

  constructor(
    private readonly resumeService: ResumeService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Парсит HTML резюме по URL
   *
   * @param params - параметры запроса с URL резюме
   * @returns HTML содержимое страницы резюме
   *
   * Требует предварительно сохраненные cookies для доступа к приватным данным
   */
  @Get('parse')
  async parse(
    @Query() params: ResumeUrlParams,
  ): Promise<ResumeParseServiceResponse> {
    return this.resumeService.parseResume(params.url);
  }

  /**
   * Анализирует резюме через OpenAI API
   *
   * @param params - параметры запроса с URL резюме
   * @returns Результат анализа с извлеченными данными резюме
   *
   * Процесс:
   * 1. Получает HTML резюме с HH.ru
   * 2. Отправляет на анализ в OpenAI
   * 3. Сохраняет результат в БД с векторным эмбеддингом
   * 4. Возвращает структурированные данные резюме
   */
  @Get('analyze')
  async analyzeWithAI(
    @Query() params: ResumeUrlParams,
  ): Promise<ResumeAnalysisServiceResponse> {
    return this.resumeService.analyzeResumeWithAI(params.url);
  }

  /**
   * Получает последние проанализированные данные резюме
   *
   * @returns Данные последнего проанализированного резюме из БД
   *
   * Возвращает:
   * - Структурированные данные резюме (персональная информация, опыт, навыки)
   * - Метаданные (ID файла, время загрузки)
   * - Статус успешности операции
   */
  @Get('latest')
  async getLatestResumeData(): Promise<LatestResumeDataResponse> {
    return this.resumeService.getLatestResumeData();
  }

  /**
   * Сохраняет cookies для авторизации на HH.ru
   *
   * @param body - объект с cookies строкой
   * @returns Результат операции сохранения
   *
   * Cookies необходимы для доступа к приватным данным резюме.
   * Получаются через Chrome расширение и сохраняются в БД для последующего использования.
   */
  @Post('save-cookies')
  @HttpCode(HttpStatus.OK)
  async saveCookies(
    @Body() body: SaveCookiesRequest,
  ): Promise<SaveCookiesResponse> {
    try {
      await this.prisma.userCookie.upsert({
        where: { userId: this.DEFAULT_USER_ID },
        create: {
          userId: this.DEFAULT_USER_ID,
          cookie: body.cookie,
        },
        update: {
          cookie: body.cookie,
        },
      });
      return {
        success: true,
        message: 'Cookies успешно сохранены',
      };
    } catch (error) {
      console.error('Ошибка сохранения cookies:', error);
      throw error;
    }
  }

  /**
   * Сохраняет и анализирует резюме по URL
   *
   * @param body - объект с cookies и URL резюме
   * @returns Результат операции сохранения и анализа
   *
   * Процесс:
   * 1. Сохраняет переданные cookies в БД
   * 2. Извлекает ID резюме из URL
   * 3. Проверяет, не анализировалось ли резюме ранее
   * 4. Если новое - запускает полный анализ через OpenAI
   * 5. Сохраняет результат в БД с векторным эмбеддингом
   */
  @Post('save-resume')
  @HttpCode(HttpStatus.OK)
  async saveResume(
    @Body() body: SaveResumeRequest,
  ): Promise<SaveResumeResponse> {
    try {
      await this.prisma.userCookie.upsert({
        where: { userId: this.DEFAULT_USER_ID },
        create: {
          userId: this.DEFAULT_USER_ID,
          cookie: body.cookie,
        },
        update: {
          cookie: body.cookie,
        },
      });

      // Извлекаем ID резюме из URL
      const resumeIdMatch = body.resumeUrl.match(REGEX_PATTERNS.RESUME_ID);
      if (!resumeIdMatch) {
        throw new Error('Не удалось извлечь ID резюме из URL');
      }

      const resumeId = resumeIdMatch[1];

      // Проверяем наличие резюме в БД
      const existingResume = await this.prisma.userResume.findUnique({
        where: { resumeId },
      });

      if (existingResume) {
        return { message: 'Резюме уже проанализировано' };
      }

      await this.resumeService.analyzeResumeWithAI(body.resumeUrl);
      return { message: 'Резюме успешно сохранено и проанализировано' };
    } catch (error) {
      console.error('Ошибка сохранения резюме:', error);
      throw error;
    }
  }

  /**
   * Сбрасывает все данные резюме из БД
   *
   * @returns Результат операции сброса
   *
   * Удаляет все записи из таблицы UserResume.
   * Используется для очистки данных при необходимости начать заново.
   * ВНИМАНИЕ: Операция необратима!
   */
  @Post('reset-resume')
  @HttpCode(HttpStatus.OK)
  async resetResume(): Promise<ResetResumeResponse> {
    try {
      await this.prisma.userResume.deleteMany({});
      return { message: 'Все данные резюме успешно удалены из БД' };
    } catch (error) {
      console.error('Ошибка сброса данных резюме:', error);
      throw error;
    }
  }
}
