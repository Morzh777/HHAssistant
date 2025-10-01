import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { VacancyStorageService } from './vacancy-storage.service';
import type { Vacancy } from '../types/vacancy.types';
import type { ApiResponse } from '../types/common.types';

@Controller('vacancy-storage')
export class VacancyStorageController {
  constructor(private readonly vacancyStorageService: VacancyStorageService) {}

  /**
   * POST /vacancy-storage/save
   * Сохранение вакансии от Chrome расширения
   */
  @Post('save')
  async saveVacancy(@Body() vacancyData: Vacancy): Promise<ApiResponse<Vacancy>> {
    return this.vacancyStorageService.saveVacancy(vacancyData);
  }

  /**
   * GET /vacancy-storage/list
   * Получение списка сохраненных вакансий
   */
  @Get('list')
  async getVacancyList(): Promise<ApiResponse<Vacancy[]>> {
    return this.vacancyStorageService.getVacancyList();
  }

  /**
   * GET /vacancy-storage/:id
   * Получение конкретной вакансии по ID
   */
  @Get(':id')
  async getVacancy(@Param('id') vacancyId: string): Promise<ApiResponse<Vacancy>> {
    return this.vacancyStorageService.getVacancy(vacancyId);
  }
}
