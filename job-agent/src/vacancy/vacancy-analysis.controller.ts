import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { VacancyAnalysisService } from './vacancy-analysis.service';
import { VacancyStorageService } from './vacancy-storage.service';
import type {
  VacancyAnalysisRequest,
  VacancyAnalysisResponse,
} from '../types/vacancy-analysis.types';
import { ResumeService } from '../resume/resume.service';

@Controller('vacancy-analysis')
export class VacancyAnalysisController {
  private readonly logger = new Logger(VacancyAnalysisController.name);

  // Очередь активных запросов анализа для предотвращения дублирования
  private readonly activeAnalysisRequests = new Map<
    string,
    Promise<VacancyAnalysisResponse>
  >();

  constructor(
    private readonly vacancyAnalysisService: VacancyAnalysisService,
    private readonly vacancyStorageService: VacancyStorageService,
    private readonly resumeService: ResumeService,
  ) {}

  @Post('analyze/:vacancyId')
  async analyzeVacancy(
    @Param('vacancyId') vacancyId: string,
  ): Promise<VacancyAnalysisResponse> {
    // Проверяем, не выполняется ли уже анализ для этой вакансии
    if (this.activeAnalysisRequests.has(vacancyId)) {
      this.logger.log(
        `Analysis already in progress for vacancy ${vacancyId}, returning existing promise`,
      );
      return this.activeAnalysisRequests.get(vacancyId)!;
    }

    // Создаем новый запрос анализа
    const analysisPromise = this.performAnalysis(vacancyId);

    // Сохраняем промис в очереди
    this.activeAnalysisRequests.set(vacancyId, analysisPromise);

    try {
      const result = await analysisPromise;
      return result;
    } finally {
      // Удаляем из очереди после завершения
      this.activeAnalysisRequests.delete(vacancyId);
    }
  }

  private async performAnalysis(
    vacancyId: string,
  ): Promise<VacancyAnalysisResponse> {
    try {
      this.logger.log(`Performing analysis for vacancy ${vacancyId}`);

      // Получаем данные вакансии из локального хранилища
      const vacancyResponse =
        await this.vacancyStorageService.getVacancy(vacancyId);
      if (!vacancyResponse.success || !vacancyResponse.data) {
        throw new HttpException(
          `Вакансия ${vacancyId} не найдена в локальном хранилище`,
          HttpStatus.NOT_FOUND,
        );
      }

      const vacancyData = vacancyResponse.data;
      // Пытаемся подтянуть последнее проанализированное резюме (если есть)
      let resumeData: any | undefined;
      try {
        const latest = await this.resumeService.getLatestResumeData();
        resumeData = latest?.data;
      } catch {
        // Игнорируем ошибки получения резюме
      }

      // Анализируем вакансию с учетом резюме (если доступно)
      const analysis = await this.vacancyAnalysisService.analyzeVacancy(
        vacancyId,
        vacancyData,
        resumeData,
      );

      this.logger.log(
        `Analysis completed for vacancy ${vacancyId}, success: ${analysis.success}`,
      );
      return analysis;
    } catch (error) {
      this.logger.error(`Error analyzing vacancy ${vacancyId}:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Ошибка анализа вакансии: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('analyze')
  async analyzeVacancyWithData(
    @Body() request: VacancyAnalysisRequest,
  ): Promise<VacancyAnalysisResponse> {
    // Проверяем, не выполняется ли уже анализ для этой вакансии
    if (this.activeAnalysisRequests.has(request.vacancyId)) {
      this.logger.log(
        `Analysis already in progress for vacancy ${request.vacancyId}, returning existing promise`,
      );
      return this.activeAnalysisRequests.get(request.vacancyId)!;
    }

    // Создаем новый запрос анализа
    const analysisPromise = this.performAnalysisWithData(request);

    // Сохраняем промис в очереди
    this.activeAnalysisRequests.set(request.vacancyId, analysisPromise);

    try {
      const result = await analysisPromise;
      return result;
    } finally {
      // Удаляем из очереди после завершения
      this.activeAnalysisRequests.delete(request.vacancyId);
    }
  }

  private async performAnalysisWithData(
    request: VacancyAnalysisRequest,
  ): Promise<VacancyAnalysisResponse> {
    try {
      this.logger.log(
        `Performing analysis for vacancy ${request.vacancyId} with provided data`,
      );

      if (!request.vacancyId || !request.vacancyData) {
        throw new HttpException(
          'Требуются vacancyId и vacancyData',
          HttpStatus.BAD_REQUEST,
        );
      }

      const analysis = await this.vacancyAnalysisService.analyzeVacancy(
        request.vacancyId,
        request.vacancyData,
      );

      this.logger.log(
        `Analysis completed for vacancy ${request.vacancyId}, success: ${analysis.success}`,
      );
      return analysis;
    } catch (error) {
      this.logger.error(`Error analyzing vacancy ${request.vacancyId}:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Ошибка анализа вакансии: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':vacancyId')
  async getAnalysis(
    @Param('vacancyId') vacancyId: string,
  ): Promise<VacancyAnalysisResponse> {
    try {
      this.logger.log(`Getting analysis for vacancy ${vacancyId}`);

      const analysis = await this.vacancyAnalysisService.getAnalysis(vacancyId);

      if (!analysis) {
        throw new HttpException(
          `Анализ для вакансии ${vacancyId} не найден`,
          HttpStatus.NOT_FOUND,
        );
      }

      return analysis;
    } catch (error) {
      this.logger.error(
        `Error getting analysis for vacancy ${vacancyId}:`,
        error,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Ошибка получения анализа: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async getAllAnalyses(): Promise<VacancyAnalysisResponse[]> {
    try {
      this.logger.log('Getting all vacancy analyses');

      const analyses = await this.vacancyAnalysisService.getAllAnalyses();

      this.logger.log(`Found ${analyses.length} analyses`);
      return analyses;
    } catch (error) {
      this.logger.error('Error getting all analyses:', error);

      throw new HttpException(
        `Ошибка получения анализов: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats/summary')
  async getAnalysisStats() {
    try {
      this.logger.log('Getting analysis statistics');

      const analyses = await this.vacancyAnalysisService.getAllAnalyses();

      const stats = {
        total: analyses.length,
        recommendations: {
          apply: analyses.filter((a) => a.data?.recommendation === 'apply')
            .length,
          caution: analyses.filter((a) => a.data?.recommendation === 'caution')
            .length,
          avoid: analyses.filter((a) => a.data?.recommendation === 'avoid')
            .length,
        },
        toxicityLevels: {
          low: analyses.filter(
            (a) =>
              a.data && a.data.toxicityScore >= 1 && a.data.toxicityScore <= 3,
          ).length,
          medium: analyses.filter(
            (a) =>
              a.data && a.data.toxicityScore >= 4 && a.data.toxicityScore <= 6,
          ).length,
          high: analyses.filter(
            (a) =>
              a.data && a.data.toxicityScore >= 7 && a.data.toxicityScore <= 10,
          ).length,
        },
        averageToxicity:
          analyses.length > 0
            ? analyses.reduce(
                (sum, a) => sum + (a.data?.toxicityScore || 0),
                0,
              ) / analyses.length
            : 0,
      };

      this.logger.log(`Analysis stats: ${JSON.stringify(stats)}`);
      return stats;
    } catch (error) {
      this.logger.error('Error getting analysis stats:', error);

      throw new HttpException(
        `Ошибка получения статистики: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
