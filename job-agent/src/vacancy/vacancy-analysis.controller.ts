import { Controller, Get, Post, Param, Body, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { VacancyAnalysisService } from './vacancy-analysis.service';
import { VacancyStorageService } from './vacancy-storage.service';
import type { VacancyAnalysisRequest, VacancyAnalysisResponse } from '../types/vacancy-analysis.types';

@Controller('vacancy-analysis')
export class VacancyAnalysisController {
  private readonly logger = new Logger(VacancyAnalysisController.name);

  constructor(
    private readonly vacancyAnalysisService: VacancyAnalysisService,
    private readonly vacancyStorageService: VacancyStorageService
  ) {}

  @Post('analyze/:vacancyId')
  async analyzeVacancy(@Param('vacancyId') vacancyId: string): Promise<VacancyAnalysisResponse> {
    try {
      this.logger.log(`Received request to analyze vacancy ${vacancyId}`);

      // Получаем данные вакансии из локального хранилища
      const vacancyResponse = await this.vacancyStorageService.getVacancy(vacancyId);
      if (!vacancyResponse.success || !vacancyResponse.data) {
        throw new HttpException(
          `Вакансия ${vacancyId} не найдена в локальном хранилище`,
          HttpStatus.NOT_FOUND
        );
      }
      
      const vacancyData = vacancyResponse.data;

      // Анализируем вакансию
      const analysis = await this.vacancyAnalysisService.analyzeVacancy(vacancyId, vacancyData);
      
      this.logger.log(`Analysis completed for vacancy ${vacancyId}, success: ${analysis.success}`);
      return analysis;

    } catch (error) {
      this.logger.error(`Error analyzing vacancy ${vacancyId}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Ошибка анализа вакансии: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('analyze')
  async analyzeVacancyWithData(@Body() request: VacancyAnalysisRequest): Promise<VacancyAnalysisResponse> {
    try {
      this.logger.log(`Received request to analyze vacancy ${request.vacancyId} with provided data`);

      if (!request.vacancyId || !request.vacancyData) {
        throw new HttpException(
          'Требуются vacancyId и vacancyData',
          HttpStatus.BAD_REQUEST
        );
      }

      const analysis = await this.vacancyAnalysisService.analyzeVacancy(
        request.vacancyId,
        request.vacancyData
      );
      
      this.logger.log(`Analysis completed for vacancy ${request.vacancyId}, success: ${analysis.success}`);
      return analysis;

    } catch (error) {
      this.logger.error(`Error analyzing vacancy ${request.vacancyId}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Ошибка анализа вакансии: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':vacancyId')
  async getAnalysis(@Param('vacancyId') vacancyId: string): Promise<VacancyAnalysisResponse> {
    try {
      this.logger.log(`Getting analysis for vacancy ${vacancyId}`);

      const analysis = await this.vacancyAnalysisService.getAnalysis(vacancyId);
      
      if (!analysis) {
        throw new HttpException(
          `Анализ для вакансии ${vacancyId} не найден`,
          HttpStatus.NOT_FOUND
        );
      }

      return analysis;

    } catch (error) {
      this.logger.error(`Error getting analysis for vacancy ${vacancyId}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Ошибка получения анализа: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
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
        HttpStatus.INTERNAL_SERVER_ERROR
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
          apply: analyses.filter(a => a.data?.recommendation === 'apply').length,
          caution: analyses.filter(a => a.data?.recommendation === 'caution').length,
          avoid: analyses.filter(a => a.data?.recommendation === 'avoid').length
        },
        toxicityLevels: {
          low: analyses.filter(a => a.data && a.data.toxicityScore >= 1 && a.data.toxicityScore <= 3).length,
          medium: analyses.filter(a => a.data && a.data.toxicityScore >= 4 && a.data.toxicityScore <= 6).length,
          high: analyses.filter(a => a.data && a.data.toxicityScore >= 7 && a.data.toxicityScore <= 10).length
        },
        averageToxicity: analyses.length > 0 
          ? analyses.reduce((sum, a) => sum + (a.data?.toxicityScore || 0), 0) / analyses.length 
          : 0
      };

      this.logger.log(`Analysis stats: ${JSON.stringify(stats)}`);
      return stats;

    } catch (error) {
      this.logger.error('Error getting analysis stats:', error);
      
      throw new HttpException(
        `Ошибка получения статистики: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
