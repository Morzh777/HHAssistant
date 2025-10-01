import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs/promises';
import { OpenAIService } from '../openai/openai.service';
import { REGEX_PATTERNS } from '../config/openai.config';

@Injectable()
export class ResumeService {
  private readonly USER_AGENT =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

  constructor(private readonly openaiService: OpenAIService) {}

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

  async parseResume(url: string): Promise<unknown> {
    try {
      const html = await this.fetchHtmlWithCookies(url);
      await this.saveHtml(html, url);
      return { message: 'HTML saved successfully', url };
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
    await this.saveHtml(html, url);
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
      await this.saveHtml(html, url);

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
      
      // Сохраняем результат анализа
      await this.saveAnalysis(analysis, resumeId);

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
      const html = await this.loadHtml(resumeId);

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

      // Сохраняем результат анализа
      await this.saveAnalysis(analysis, resumeId);

      return {
        message: 'Сохраненное резюме успешно проанализировано через OpenAI',
        resumeId,
        analysis,
      };
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
      const analysisDir = `${process.cwd()}/job-agent/data/analysis`;
      const files = await fs.readdir(analysisDir);

      if (files.length === 0) {
        throw new HttpException(
          'Данные резюме не найдены. Сначала проанализируйте резюме.',
          HttpStatus.NOT_FOUND,
        );
      }

      // Получаем самый новый файл
      const latestFile = files
        .filter((file) => file.endsWith('.json'))
        .sort()
        .pop();

      if (!latestFile) {
        throw new HttpException(
          'Файлы анализа не найдены.',
          HttpStatus.NOT_FOUND,
        );
      }

      const filePath = `${analysisDir}/${latestFile}`;
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const resumeData = JSON.parse(fileContent);

      return {
        success: true,
        data: resumeData,
        file: latestFile,
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
  async getResumeStructure(resumeId: string): Promise<any> {
    try {
      const html = await this.loadHtml(resumeId);

      // Извлекаем основную информацию из HTML без OpenAI
      const structure = this.extractBasicStructure(html);

      return {
        message: 'Структура резюме извлечена',
        resumeId,
        structure,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Resume structure extraction error: ${message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async saveHtml(html: string, url: string): Promise<void> {
    const id = url.split('/').pop() || 'resume';
    const dir = `${process.cwd()}/job-agent/data/resumes`;
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(`${dir}/${id}.html`, html, 'utf-8');
  }

  private async loadHtml(resumeId: string): Promise<string> {
    const filePath = `${process.cwd()}/job-agent/data/resumes/${resumeId}.html`;
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch {
      throw new HttpException(
        `Резюме с ID ${resumeId} не найдено`,
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private async saveAnalysis(analysis: any, identifier: string): Promise<void> {
    const dir = `${process.cwd()}/job-agent/data/analysis`;
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      `${dir}/${identifier}.json`,
      JSON.stringify(analysis, null, 2),
      'utf-8',
    );
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
