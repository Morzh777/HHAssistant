
import dotenv from 'dotenv';
import * as path from 'path';

// Загружаем .env файл
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as fs from 'fs/promises';
import { Resume, ResumeAnalysisResult } from '../types/resume.interfaces';
import { Vacancy } from '../types/vacancy.types';
import { CoverLetterResponse } from '../types/cover-letter.types';
import {
  OPENAI_CONFIGS,
  SYSTEM_PROMPTS,
  USER_PROMPTS,
  FILE_PATHS,
  FILE_TEMPLATES,
  REGEX_PATTERNS,
  FILE_CONTENT_TEMPLATES,
  CONSTANTS,
} from '../config/openai.config';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    // Пробуем получить API ключ из разных источников
    const apiKey = process.env.OPENAI_API_KEY;

    this.logger.log(`API Key loaded: ${!!apiKey}`);
    this.logger.log(`API Key length: ${apiKey ? apiKey.length : 0}`);

    if (!apiKey) {
      this.logger.error('OPENAI_API_KEY не найден в переменных окружения');
      this.logger.error('Проверьте файл .env в корне проекта job-agent/');
      throw new Error('OPENAI_API_KEY is required');
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
    });

    this.logger.log('OpenAI client initialized successfully');
  }

  /**
   * Генерирует сопроводительное письмо на основе резюме и вакансии
   */
  async generateCoverLetter(
    resumeData: Resume,
    vacancyData: Vacancy,
  ): Promise<string> {
    try {
      this.logger.log('Генерируем сопроводительное письмо через OpenAI...');

      const config = OPENAI_CONFIGS.COVER_LETTER;
      const prompt = USER_PROMPTS.COVER_LETTER(resumeData, vacancyData);

      const completion = await this.openai.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPTS.COVER_LETTER,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        ...(config.maxTokens && { max_tokens: config.maxTokens }),
        ...(config.temperature !== undefined && { temperature: config.temperature }),
      });

      const firstChoice = completion.choices[0];
      if (!firstChoice?.message?.content) {
        throw new Error('OpenAI не вернул сопроводительное письмо');
      }

      const coverLetter: string = firstChoice.message.content.trim();

      this.logger.log('Сопроводительное письмо успешно сгенерировано');

      // Сохраняем письмо в файл
      await this.saveCoverLetter(coverLetter, vacancyData);

      return coverLetter;
    } catch (error) {
      this.logger.error(
        'Ошибка при генерации сопроводительного письма:',
        error,
      );

      // Handle OpenAI API errors according to Context7 best practices
      if (error instanceof Error) {
        // Check if it's an OpenAI API error
        if ('status' in error && 'request_id' in error) {
          this.logger.error(
            `OpenAI API Error - Status: ${(error as any).status}, Request ID: ${(error as any).request_id}`,
          );
        }
        throw new Error(
          `Не удалось сгенерировать сопроводительное письмо: ${error.message}`,
        );
      }

      throw new Error('Не удалось сгенерировать сопроводительное письмо');
    }
  }

  /**
   * Анализирует HTML резюме и извлекает структурированную информацию
   */
  async analyzeResumeHtml(html: string): Promise<ResumeAnalysisResult> {
    try {
      this.logger.log('Начинаем анализ HTML резюме через OpenAI...');

      const config = OPENAI_CONFIGS.RESUME_ANALYSIS_HTML;
      const prompt = USER_PROMPTS.RESUME_ANALYSIS_HTML(html);

      const completion = await this.openai.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPTS.RESUME_ANALYSIS,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        ...(config.maxCompletionTokens && { max_completion_tokens: config.maxCompletionTokens }),
      });

      const firstChoice = completion.choices[0];
      if (!firstChoice?.message?.content) {
        throw new Error('OpenAI не вернул ответ');
      }

      const response: string = firstChoice.message.content;

      // Пытаемся распарсить JSON ответ
      try {
        // Убираем markdown блоки если они есть
        let cleanResponse = response.trim();
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse
            .replace(/^```json\s*/, '')
            .replace(/\s*```$/, '');
        } else if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse
            .replace(/^```\s*/, '')
            .replace(/\s*```$/, '');
        }

        const parsedResponse = JSON.parse(
          cleanResponse,
        ) as ResumeAnalysisResult;
        this.logger.log('Успешно проанализировано резюме через OpenAI');
        return parsedResponse;
      } catch (parseError) {
        this.logger.error('Ошибка парсинга JSON ответа от OpenAI:', parseError);
        this.logger.debug('Ответ от OpenAI:', response);
        throw new Error('Не удалось распарсить ответ от OpenAI');
      }
    } catch (error) {
      this.logger.error('Ошибка при анализе резюме через OpenAI:', error);
      throw error;
    }
  }

  /**
   * Анализирует текст резюме (если HTML слишком большой)
   */
  async analyzeResumeText(text: string): Promise<ResumeAnalysisResult> {
    try {
      this.logger.log('Начинаем анализ текста резюме через OpenAI...');

      const config = OPENAI_CONFIGS.RESUME_ANALYSIS_TEXT;
      const prompt = USER_PROMPTS.RESUME_ANALYSIS_TEXT(text);

      const completion = await this.openai.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPTS.RESUME_TEXT_ANALYSIS,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        ...(config.temperature !== undefined && { temperature: config.temperature }),
        ...(config.maxTokens && { max_tokens: config.maxTokens }),
      });

      const firstChoice = completion.choices[0];
      if (!firstChoice?.message?.content) {
        throw new Error('OpenAI не вернул ответ');
      }

      const response: string = firstChoice.message.content;

      try {
        // Убираем markdown блоки если они есть
        let cleanResponse = response.trim();
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse
            .replace(/^```json\s*/, '')
            .replace(/\s*```$/, '');
        } else if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse
            .replace(/^```\s*/, '')
            .replace(/\s*```$/, '');
        }

        const parsedResponse = JSON.parse(
          cleanResponse,
        ) as ResumeAnalysisResult;
        this.logger.log('Успешно проанализировано резюме через OpenAI');
        return parsedResponse;
      } catch (parseError) {
        this.logger.error('Ошибка парсинга JSON ответа от OpenAI:', parseError);
        this.logger.debug('Ответ от OpenAI:', response);
        throw new Error('Не удалось распарсить ответ от OpenAI');
      }
    } catch (error) {
      this.logger.error('Ошибка при анализе резюме через OpenAI:', error);
      throw error;
    }
  }

  /**
   * Универсальный метод для генерации текста через OpenAI
   */
  async generateText(
    prompt: string,
    systemPrompt: string,
    config: any
  ): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        ...(config.maxTokens && { max_tokens: config.maxTokens }),
        ...(config.temperature !== undefined && { temperature: config.temperature }),
      });

      const firstChoice = completion.choices[0];
      if (!firstChoice?.message?.content) {
        throw new Error('Пустой ответ от OpenAI API');
      }

      return firstChoice.message.content;
    } catch (error) {
      this.logger.error('Ошибка генерации текста через OpenAI:', error);
      throw error;
    }
  }

  /**
   * Проверяет доступность OpenAI API
   */
  async checkApiAvailability(): Promise<boolean> {
    try {
      const config = OPENAI_CONFIGS.API_CHECK;

      const completion = await this.openai.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: 'user',
            content: 'Проверка доступности API. Ответь "OK"',
          },
        ],
        ...(config.maxTokens && { max_tokens: config.maxTokens }),
        ...(config.temperature !== undefined && { temperature: config.temperature }),
      });

      const firstChoice = completion.choices[0];
      return !!firstChoice?.message?.content;
    } catch (error) {
      this.logger.error('OpenAI API недоступен:', error);
      return false;
    }
  }

  /**
   * Получает сопроводительное письмо по ID вакансии
   */
  async getCoverLetterByVacancyId(
    vacancyId: string,
  ): Promise<CoverLetterResponse> {
    try {
      const coverLettersDir = path.join(
        process.cwd(),
        FILE_PATHS.COVER_LETTERS_DIR,
      );
      const files = await fs.readdir(coverLettersDir);

      if (files.length === 0) {
        throw new Error('Сопроводительные письма не найдены');
      }

      // Ищем файл по ID вакансии
      const targetFile = files.find(
        (file) =>
          file.startsWith(`cover_letter_${vacancyId}_`) &&
          file.endsWith('.txt'),
      );

      if (!targetFile) {
        throw new Error(`Письмо для вакансии ${vacancyId} не найдено`);
      }

      const filePath = path.join(coverLettersDir, targetFile);
      const fileContent = await fs.readFile(filePath, 'utf-8');

      // Парсим файл и извлекаем только текст письма
      const lines = fileContent.split('\n');

      // Ищем второй разделитель (после метаданных)
      let startIndex = -1;
      let endIndex = lines.length;

      for (let i = 0; i < lines.length; i++) {
        if (REGEX_PATTERNS.FILE_SEPARATOR.test(lines[i])) {
          if (startIndex === -1) {
            startIndex = i;
          } else {
            // Это второй разделитель - начинаем с следующей строки
            startIndex = i + 1;
            break;
          }
        }
      }

      // Ищем третий разделитель (конец письма)
      for (let i = startIndex; i < lines.length; i++) {
        if (lines[i].includes('========================')) {
          endIndex = i;
          break;
        }
      }

      let coverLetterText = '';
      if (startIndex !== -1 && endIndex > startIndex) {
        coverLetterText = lines.slice(startIndex, endIndex).join('\n').trim();
      } else {
        coverLetterText = fileContent;
      }

      return {
        success: true,
        content: coverLetterText,
        fileName: targetFile,
        vacancyId: vacancyId,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Ошибка при получении письма по ID:', error);
      throw new Error(
        `Не удалось получить письмо: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Получает последнее сгенерированное сопроводительное письмо
   */
  async getLatestCoverLetter(): Promise<CoverLetterResponse> {
    try {
      const coverLettersDir = path.join(
        process.cwd(),
        FILE_PATHS.COVER_LETTERS_DIR,
      );
      const files = await fs.readdir(coverLettersDir);

      if (files.length === 0) {
        throw new Error('Сопроводительные письма не найдены');
      }

      // Получаем самый новый файл
      const latestFile = files
        .filter(
          (file) => file.startsWith('cover_letter_') && file.endsWith('.txt'),
        )
        .sort()
        .pop();

      if (!latestFile) {
        throw new Error('Файлы сопроводительных писем не найдены');
      }

      const filePath = path.join(coverLettersDir, latestFile);
      const fileContent = await fs.readFile(filePath, 'utf-8');

      // Парсим файл и извлекаем только текст письма
      const lines = fileContent.split('\n');

      // Ищем второй разделитель (после метаданных)
      let startIndex = -1;
      let endIndex = lines.length;

      for (let i = 0; i < lines.length; i++) {
        if (REGEX_PATTERNS.FILE_SEPARATOR.test(lines[i])) {
          if (startIndex === -1) {
            startIndex = i;
          } else {
            // Это второй разделитель - начинаем с следующей строки
            startIndex = i + 1;
            break;
          }
        }
      }

      // Ищем третий разделитель (конец письма)
      for (let i = startIndex; i < lines.length; i++) {
        if (lines[i].includes('========================')) {
          endIndex = i;
          break;
        }
      }

      let coverLetterText = '';
      if (startIndex !== -1 && endIndex > startIndex) {
        coverLetterText = lines.slice(startIndex, endIndex).join('\n').trim();
      } else {
        coverLetterText = fileContent;
      }

      // Извлекаем vacancyId из имени файла
      const vacancyIdMatch = latestFile.match(
        REGEX_PATTERNS.COVER_LETTER_VACANCY_ID,
      );
      const vacancyId = vacancyIdMatch
        ? vacancyIdMatch[1]
        : CONSTANTS.UNKNOWN_VALUE;

      return {
        success: true,
        content: coverLetterText,
        fileName: latestFile,
        vacancyId: vacancyId,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Ошибка при получении последнего письма:', error);
      throw new Error(
        `Не удалось получить письмо: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Сохраняет сгенерированное сопроводительное письмо в файл
   */
  private async saveCoverLetter(
    coverLetter: string,
    vacancyData: Vacancy,
  ): Promise<void> {
    try {
      const coverLettersDir = path.join(
        process.cwd(),
        FILE_PATHS.COVER_LETTERS_DIR,
      );
      await fs.mkdir(coverLettersDir, { recursive: true });

      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const vacancyId = vacancyData?.id || CONSTANTS.UNKNOWN_VALUE;
      const fileName = FILE_TEMPLATES.COVER_LETTER.replace(
        '{vacancyId}',
        vacancyId,
      ).replace('{date}', timestamp);

      const filePath = path.join(coverLettersDir, fileName);

      // Формируем данные для шаблона
      const salaryText = vacancyData?.salary
        ? `${vacancyData.salary.from || ''} - ${vacancyData.salary.to || ''} ${vacancyData.salary.currency || ''}`
        : CONSTANTS.NOT_SPECIFIED_SALARY;

      const fileContent = FILE_CONTENT_TEMPLATES.COVER_LETTER_HEADER.replace(
        '{vacancyName}',
        vacancyData?.name || CONSTANTS.NOT_SPECIFIED,
      )
        .replace('{vacancyId}', vacancyId)
        .replace('{generatedAt}', new Date().toISOString())
        .replace('{salary}', salaryText)
        .replace('{coverLetter}', coverLetter);

      await fs.writeFile(filePath, fileContent, 'utf-8');
      this.logger.log(`Сопроводительное письмо сохранено: ${fileName}`);
    } catch (error) {
      this.logger.error(
        'Ошибка при сохранении сопроводительного письма:',
        error,
      );
      // Не выбрасываем ошибку, чтобы не прерывать основной процесс
    }
  }
}
