import { Controller, Get, Query, Param, Post, Body } from '@nestjs/common';
import { VacancyService } from './vacancy.service';
import { Vacancy } from '../types/vacancy.types';

@Controller('vacancies')
export class VacancyController {
  constructor(private readonly vacancyService: VacancyService) {}

  /**
   * GET /vacancies/search
   * Поиск вакансий
   */
  @Get('search')
  async searchVacancies(
    @Query() searchParams: Record<string, unknown>,
  ): Promise<unknown> {
    return this.vacancyService.searchVacancies(searchParams);
  }

  /**
   * GET /vacancies/:id
   * Получение детальной информации о вакансии
   */
  @Get(':id')
  async getVacancyById(@Param('id') vacancyId: string): Promise<Vacancy> {
    return this.vacancyService.getVacancyById(vacancyId);
  }

  /**
   * POST /vacancies/search-by-structured-resume
   * Поиск вакансий на основе структурированных данных резюме (из OpenAI анализа)
   */
  @Post('search-by-structured-resume')
  async searchVacanciesByStructuredResume(@Body() resumeAnalysis: any): Promise<unknown> {
    return this.vacancyService.searchVacanciesByStructuredResume(resumeAnalysis);
  }
}
