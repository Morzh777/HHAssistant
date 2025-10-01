import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ResumeService } from './resume.service';
import * as fs from 'fs/promises';
import { REGEX_PATTERNS } from '../config/openai.config';

@Controller('resume')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Get('parse')
  async parse(@Query('url') url: string): Promise<unknown> {
    return this.resumeService.parseResume(url);
  }

  @Get('analyze')
  async analyzeWithAI(@Query('url') url: string): Promise<any> {
    return this.resumeService.analyzeResumeWithAI(url);
  }

  @Get('latest')
  async getLatestResumeData(): Promise<any> {
    return await this.resumeService.getLatestResumeData();
  }

  @Post('save-cookies')
  @HttpCode(HttpStatus.NO_CONTENT)
  async saveCookies(@Body() body: { cookie: string }): Promise<void> {
    const cookiePath = `${process.cwd()}/job-agent/data/hh-cookie.txt`;
    await fs.mkdir(`${process.cwd()}/job-agent/data`, { recursive: true });
    await fs.writeFile(cookiePath, body.cookie, 'utf-8');
  }

  @Post('save-resume')
  @HttpCode(HttpStatus.OK)
  async saveResume(
    @Body() body: { cookie: string; resumeUrl: string },
  ): Promise<{ message: string }> {
    // Сохраняем cookies
    const cookiePath = `${process.cwd()}/job-agent/data/hh-cookie.txt`;
    await fs.mkdir(`${process.cwd()}/job-agent/data`, { recursive: true });
    await fs.writeFile(cookiePath, body.cookie, 'utf-8');

    // Извлекаем ID резюме из URL
    const resumeIdMatch = body.resumeUrl.match(REGEX_PATTERNS.RESUME_ID);
    if (!resumeIdMatch) {
      throw new Error('Не удалось извлечь ID резюме из URL');
    }

    const resumeId = resumeIdMatch[1];

    // Проверяем наличие резюме в папке data/analysis/
    const analysisDir = `${process.cwd()}/job-agent/data/analysis`;
    try {
      const files = await fs.readdir(analysisDir);
      const resumeFile = files.find((file) => file.includes(resumeId));

      if (resumeFile) {
        return { message: 'Резюме уже проанализировано' };
      }
    } catch (error) {
      // Папка не найдена, продолжаем анализ
    }

    await this.resumeService.analyzeResumeWithAI(body.resumeUrl);
    return { message: 'Резюме успешно сохранено и проанализировано' };
  }

  @Post('reset-resume')
  @HttpCode(HttpStatus.OK)
  async resetResume(): Promise<{ message: string }> {
    // Удаляем все файлы из папки resumes
    const resumesDir = `${process.cwd()}/job-agent/data/resumes`;
    try {
      const files = await fs.readdir(resumesDir);
      for (const file of files) {
        if (file.endsWith('.html')) {
          await fs.unlink(`${resumesDir}/${file}`);
        }
      }
    } catch (error) {
      // Папка не найдена или пуста
    }

    // Удаляем все файлы из папки analysis
    const analysisDir = `${process.cwd()}/job-agent/data/analysis`;
    try {
      const files = await fs.readdir(analysisDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(`${analysisDir}/${file}`);
        }
      }
    } catch (error) {
      // Папка не найдена или пуста
    }

    return { message: 'Все файлы резюме успешно удалены' };
  }
}
