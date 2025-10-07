import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
// no file storage; keep fs import out
import { OpenAIService } from '../openai/openai.service';
import { REGEX_PATTERNS } from '../config/openai.config';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import type { Prisma } from '@prisma/client';

@Injectable()
export class ResumeService {
  private readonly USER_AGENT =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

  constructor(
    private readonly openaiService: OpenAIService,
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingsService,
  ) {}

  private async getCookies(): Promise<string | undefined> {
    try {
      const fs = await import('fs/promises');
      const cookiePath = `${process.cwd()}/job-agent/data/hh-cookie.txt`;
      const content = await fs.readFile(cookiePath, 'utf-8');
      return content.trim() || undefined;
    } catch {
      return undefined;
    }
  }

  async parseResume(url: string): Promise<string> {
    try {
      const html = await this.fetchHtmlWithCookies(url);
      return html;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Resume parse error: ${message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getHtml(url: string): Promise<string> {
    const html = await this.fetchHtmlWithCookies(url);
    return html;
  }

  private async fetchHtmlWithCookies(url: string): Promise<string> {
    const cookieHeader = await this.getCookies();

    if (!cookieHeader) {
      throw new HttpException(
        'Cookies not found. Please send cookies via Chrome extension first.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        Cookie: cookieHeader,
        'Sec-Ch-Ua':
          '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    return response.data as string;
  }

  /**
   * Анализирует резюме через OpenAI API
   */
  async analyzeResumeWithAI(url: string): Promise<any> {
    try {
      const html = await this.fetchHtmlWithCookies(url);
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
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Resume analysis error: ${message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Анализирует сохраненное резюме по ID
   */
  async analyzeSavedResume(resumeId: string): Promise<any> {
    try {
      void resumeId; // explicitly mark param as used
      await Promise.resolve();
      // HTML не сохраняем — повторный анализ сохраненного HTML не поддерживается
      throw new HttpException(
        'Повторный анализ сохраненного HTML не поддерживается (HTML не хранится). Запустите анализ по URL.',
        HttpStatus.NOT_IMPLEMENTED,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Saved resume analysis error: ${message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Получает последние данные резюме из файла анализа
   */
  async getLatestResumeData(): Promise<any> {
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
        data: row.analysisJson,
        file: row.resumeId,
        loadedAt: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Error loading resume data: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Получает структуру сохраненного HTML документа
   */
  // getResumeStructure удален: HTML не сохраняется

  // HTML не сохраняем

  // Загрузка HTML не поддерживается, так как он не сохраняется

  private async saveAnalysisToDb(
    resumeId: string,
    analysis: unknown,
  ): Promise<void> {
    try {
      const analysisJson = JSON.parse(JSON.stringify(analysis)) as Prisma.InputJsonValue;
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
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          await this.prisma.$executeRaw`UPDATE "UserResume" SET embedding = ${vectorLiteral}::vector WHERE id = ${saved.id}`;
        }
      } catch {
        // ignore embedding errors
      }
    } catch (error) {
      // Логируем, но не валим основной процесс
      console.warn('Failed to save resume analysis to DB:', error);
    }
  }

  private extractBasicStructure(html: string): any {
    // Простое извлечение основной информации из HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : 'Не найдено';

    // Ищем основные секции
    const sections: string[] = [];
    const h4Matches = html.match(/<h4[^>]*>([^<]+)<\/h4>/gi);
    if (h4Matches) {
      sections.push(
        ...h4Matches.map((match) => match.replace(/<[^>]*>/g, '').trim()),
      );
    }

    // Ищем контактную информацию
    const emailMatch = html.match(
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
    );
    const phoneMatch = html.match(/(\+?[0-9\s\-()]{10,})/);

    return {
      title,
      sections,
      contactInfo: {
        email: emailMatch ? emailMatch[1] : null,
        phone: phoneMatch ? phoneMatch[1] : null,
      },
      htmlLength: html.length,
      extractedAt: new Date().toISOString(),
    };
  }

  /**
   * Извлекает текстовую часть из HTML, убирая все теги
   */
  private extractTextFromHtml(html: string): string {
    // Убираем все HTML теги
    let text = html.replace(/<[^>]*>/g, ' ');

    // Убираем множественные пробелы и переносы строк
    text = text.replace(/\s+/g, ' ');

    // Убираем лишние пробелы в начале и конце
    text = text.trim();

    // Ограничиваем размер текста (примерно 50,000 символов)
    if (text.length > 50000) {
      text = text.substring(0, 50000) + '...';
    }

    return text;
  }
}
