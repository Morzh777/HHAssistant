import { Controller, Post, Body, Logger } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import { PrismaService } from 'nestjs-prisma';
import { Resume } from '../types/resume.interfaces';
import { Vacancy } from '../types/vacancy.types';

@Controller('openai')
export class OpenAIController {
  private readonly logger = new Logger(OpenAIController.name);

  constructor(
    private readonly openaiService: OpenAIService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('generate-cover-letter')
  async generateCoverLetter(
    @Body() body: { resume: Resume; vacancy: Vacancy },
  ) {
    try {
      this.logger.log('Получен запрос на генерацию сопроводительного письма');

      const { resume, vacancy } = body;

      if (!resume || !vacancy) {
        throw new Error('Необходимы данные резюме и вакансии');
      }

      // Попытаться получить анализ вакансии
      let vacancyAnalysis: any = null;
      try {
        const analysis = await this.prisma.vacancyAnalysis.findFirst({
          where: { vacancyId: vacancy?.id },
          orderBy: { analyzedAt: 'desc' },
        });
        if (analysis) {
          vacancyAnalysis = analysis;
          this.logger.log(
            `Найден анализ вакансии ${vacancy.id} для улучшения письма`,
          );
        }
      } catch (error) {
        this.logger.warn('Не удалось получить анализ вакансии:', error);
      }

      const coverLetter = await this.openaiService.generateCoverLetter(
        resume,
        vacancy,
        vacancyAnalysis,
      );

      return {
        success: true,
        coverLetter: coverLetter,
        generatedAt: new Date().toISOString(),
        vacancyId: vacancy?.id || 'unknown',
        vacancyName: vacancy?.name || 'Не указано',
      };
    } catch (error) {
      this.logger.error(
        'Ошибка при генерации сопроводительного письма:',
        error,
      );
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}
