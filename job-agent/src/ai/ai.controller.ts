import { Controller, Post, Body, Get, Logger } from '@nestjs/common';
import { AIService } from './ai.service';
import { PrismaService } from 'nestjs-prisma';
import { Resume } from '../types/resume.interfaces';
import { Vacancy } from '../types/vacancy.types';
import { AIProviderType } from '../types/ai.types';

@Controller('ai')
export class AIController {
  private readonly logger = new Logger(AIController.name);

  constructor(
    private readonly aiService: AIService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('generate-cover-letter')
  async generateCoverLetter(
    @Body()
    body: {
      resume: Resume;
      vacancy: Vacancy;
      provider?: AIProviderType;
    },
  ) {
    try {
      this.logger.log('Получен запрос на генерацию сопроводительного письма');

      const { resume, vacancy, provider } = body;

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

      const coverLetter = await this.aiService.generateCoverLetter(
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
        provider: provider || this.aiService.getDefaultProvider(),
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

  @Post('analyze-resume-html')
  async analyzeResumeHtml(
    @Body() body: { html: string; provider?: AIProviderType },
  ) {
    try {
      this.logger.log('Получен запрос на анализ HTML резюме');

      const { html, provider } = body;

      if (!html) {
        throw new Error('Необходим HTML код резюме');
      }

      const analysis = await this.aiService.analyzeResumeHtml(html);

      return {
        success: true,
        analysis: analysis,
        analyzedAt: new Date().toISOString(),
        provider: provider || this.aiService.getDefaultProvider(),
      };
    } catch (error) {
      this.logger.error('Ошибка при анализе HTML резюме:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  @Post('analyze-resume-text')
  async analyzeResumeText(
    @Body() body: { text: string; provider?: AIProviderType },
  ) {
    try {
      this.logger.log('Получен запрос на анализ текста резюме');

      const { text, provider } = body;

      if (!text) {
        throw new Error('Необходим текст резюме');
      }

      const analysis = await this.aiService.analyzeResumeText(text);

      return {
        success: true,
        analysis: analysis,
        analyzedAt: new Date().toISOString(),
        provider: provider || this.aiService.getDefaultProvider(),
      };
    } catch (error) {
      this.logger.error('Ошибка при анализе текста резюме:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  @Get('providers')
  getProviders() {
    try {
      const defaultProvider = this.aiService.getDefaultProvider();

      return {
        success: true,
        defaultProvider,
        provider: {
          type: defaultProvider,
          name:
            defaultProvider.charAt(0).toUpperCase() + defaultProvider.slice(1),
          available: true,
        },
      };
    } catch (error) {
      this.logger.error('Ошибка при получении информации о провайдере:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  @Get('check-availability')
  async checkAvailability() {
    try {
      const isAvailable = await this.aiService.checkApiAvailability();
      const providerType = this.aiService.getDefaultProvider();

      return {
        success: true,
        provider: providerType,
        available: isAvailable,
        message: isAvailable
          ? `${providerType} API доступен`
          : `${providerType} API недоступен`,
      };
    } catch (error) {
      this.logger.error('Ошибка при проверке доступности API:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}
