import { Controller, Post, Body, Logger } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import { Resume } from '../types/resume.interfaces';
import { Vacancy } from '../types/vacancy.types';

@Controller('openai')
export class OpenAIController {
  private readonly logger = new Logger(OpenAIController.name);

  constructor(private readonly openaiService: OpenAIService) {}

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

      const coverLetter = await this.openaiService.generateCoverLetter(
        resume,
        vacancy,
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
