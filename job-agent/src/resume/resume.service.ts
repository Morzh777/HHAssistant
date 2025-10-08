import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { OpenAIService } from '../openai/openai.service';
import { REGEX_PATTERNS } from '../config/openai.config';
import { PrismaService } from 'nestjs-prisma';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { AuthService } from '../auth/auth.service';
import type { Prisma } from '@prisma/client';
import type {
  LatestResumeDataResponse,
  ResumeAnalysisServiceResponse,
  ResumeParseServiceResponse,
  SavedResumeAnalysisResponse,
  HttpFetchResponse,
} from '../types/resume.controller.types';
import type { ResumeAnalysisResult } from '../types/resume.interfaces';
import type { GetCookiesResponse } from '../types/auth.types';

@Injectable()
export class ResumeService {
  private readonly USER_AGENT =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  // HTTP заголовки для запросов к HH.ru
  private readonly HTTP_HEADERS = {
    'User-Agent': this.USER_AGENT,
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    'Sec-Ch-Ua':
      '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"macOS"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
  };

  constructor(
    private readonly openaiService: OpenAIService,
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingsService,
    private readonly authService: AuthService,
  ) {}

  private async getCookies(): Promise<GetCookiesResponse> {
    try {
      const response = await this.authService.getCookies();
      return response;
    } catch {
      return {
        success: false,
        error: 'Ошибка получения cookies',
      };
    }
  }

  async parseResume(url: string): Promise<ResumeParseServiceResponse> {
    try {
      const fetchResponse = await this.fetchHtmlWithCookies(url);

      if (!fetchResponse.success) {
        throw new HttpException(
          fetchResponse.error || 'Не удалось получить HTML',
          HttpStatus.BAD_REQUEST,
        );
      }

      return { html: fetchResponse.html };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      throw new HttpException(
        `Ошибка парсинга резюме: ${message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getHtml(url: string): Promise<ResumeParseServiceResponse> {
    try {
      const fetchResponse = await this.fetchHtmlWithCookies(url);

      if (!fetchResponse.success) {
        throw new HttpException(
          fetchResponse.error || 'Не удалось получить HTML',
          HttpStatus.BAD_REQUEST,
        );
      }

      return { html: fetchResponse.html };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      throw new HttpException(
        `Ошибка получения HTML: ${message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async fetchHtmlWithCookies(url: string): Promise<HttpFetchResponse> {
    try {
      const cookiesResponse = await this.getCookies();

      if (!cookiesResponse.success || !cookiesResponse.cookie) {
        return {
          success: false,
          html: '',
          error:
            'Cookies не найдены. Сначала отправьте cookies через Chrome расширение.',
        };
      }

      const response = await axios.get(url, {
        headers: {
          ...this.HTTP_HEADERS,
          Cookie: cookiesResponse.cookie,
        },
      });

      return {
        success: true,
        html: response.data as string,
        statusCode: response.status,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      return {
        success: false,
        html: '',
        error: `Ошибка HTTP запроса: ${message}`,
      };
    }
  }

  /**
   * Анализирует резюме через OpenAI API
   */
  async analyzeResumeWithAI(
    url: string,
  ): Promise<ResumeAnalysisServiceResponse> {
    try {
      const fetchResponse = await this.fetchHtmlWithCookies(url);

      if (!fetchResponse.success) {
        throw new HttpException(
          fetchResponse.error || 'Не удалось получить HTML',
          HttpStatus.BAD_REQUEST,
        );
      }

      const html = fetchResponse.html;
      // HTML НЕ сохраняем

      // Проверяем доступность OpenAI API
      const isAvailable = await this.openaiService.checkApiAvailability();
      if (!isAvailable) {
        throw new HttpException(
          'OpenAI API недоступен. Проверьте API ключ.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      // Анализируем полный HTML через OpenAI
      const analysis = await this.openaiService.analyzeResumeHtml(html);

      // Извлекаем ID резюме из URL для сохранения
      const resumeIdMatch = url.match(REGEX_PATTERNS.RESUME_ID);
      const resumeId = resumeIdMatch ? resumeIdMatch[1] : 'unknown';

      // Сохраняем только результат анализа в БД и считаем эмбеддинг по анализу (best-effort)
      await this.saveAnalysisToDb(resumeId, analysis);

      return {
        message: 'Резюме успешно проанализировано через OpenAI',
        url,
        analysis,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      throw new HttpException(
        `Ошибка анализа резюме: ${message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Анализирует сохраненное резюме по ID
   */
  async analyzeSavedResume(
    resumeId: string,
  ): Promise<SavedResumeAnalysisResponse> {
    try {
      void resumeId; // explicitly mark param as used
      await Promise.resolve();
      // HTML не сохраняем — повторный анализ сохраненного HTML не поддерживается
      return {
        success: false,
        message:
          'Повторный анализ сохраненного HTML не поддерживается (HTML не хранится). Запустите анализ по URL.',
        error: 'НЕ_РЕАЛИЗОВАНО',
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      return {
        success: false,
        message: `Ошибка анализа сохраненного резюме: ${message}`,
        error: 'ОШИБКА_АНАЛИЗА',
      };
    }
  }

  /**
   * Получает последние данные резюме из файла анализа
   */
  async getLatestResumeData(): Promise<LatestResumeDataResponse> {
    try {
      const row = await this.prisma.userResume.findFirst({
        orderBy: { createdAt: 'desc' },
      });
      if (!row) {
        throw new HttpException(
          'Данные резюме не найдены. Сначала проанализируйте резюме.',
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        success: true,
        data: row.analysisJson as unknown as ResumeAnalysisResult,
        file: row.resumeId,
        loadedAt: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      throw new HttpException(
        `Ошибка загрузки данных резюме: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Получает структуру сохраненного HTML документа
   */

  private async saveAnalysisToDb(
    resumeId: string,
    analysis: unknown,
  ): Promise<void> {
    try {
      const analysisJson = JSON.parse(
        JSON.stringify(analysis),
      ) as Prisma.InputJsonValue;
      const saved = await this.prisma.userResume.upsert({
        where: { resumeId },
        create: {
          resumeId,
          analysisJson,
        },
        update: {
          analysisJson,
        },
      });
      // best-effort embedding
      try {
        const embSource = JSON.stringify(analysis ?? {});
        if (embSource && embSource.length > 0) {
          const emb = await this.embeddings.generate(embSource);
          const vectorLiteral = `[${emb.map((v) => (Number.isFinite(v) ? Number(v) : 0)).join(',')}]`;

          await this.prisma
            .$executeRaw`UPDATE "UserResume" SET embedding = ${vectorLiteral}::vector WHERE id = ${saved.id}`;
        }
      } catch {
        // ignore embedding errors
      }
    } catch (error) {
      console.warn('Не удалось сохранить анализ резюме в БД:', error);
    }
  }
}
