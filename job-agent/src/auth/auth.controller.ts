import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ResumeService } from '../resume/resume.service';
import { REGEX_PATTERNS } from '../config/openai.config';

@Controller('auth/hh')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly resumeService: ResumeService,
  ) {}

  @Post('cookies')
  @HttpCode(HttpStatus.NO_CONTENT)
  async saveCookies(@Body() body: { cookie: string }): Promise<void> {
    await this.authService.saveCookies(body.cookie);
  }

  @Post('save-resume')
  @HttpCode(HttpStatus.OK)
  async saveResume(
    @Body() body: { cookie: string; resumeUrl: string },
  ): Promise<{ message: string }> {
    await this.authService.saveCookies(body.cookie);

    // Извлекаем ID резюме из URL
    const resumeIdMatch = body.resumeUrl.match(REGEX_PATTERNS.RESUME_ID);
    if (!resumeIdMatch) {
      throw new Error('Не удалось извлечь ID резюме из URL');
    }

    const resumeId = resumeIdMatch[1];

    // Проверяем наличие резюме в папке data/analysis/
    const analysisDir = `${process.cwd()}/job-agent/data/analysis`;
    try {
      const fs = await import('fs/promises');
      const files = await fs.readdir(analysisDir);
      const resumeFile = files.find((file) => file.includes(resumeId));

      if (resumeFile) {
        return { message: 'Резюме уже проанализировано' };
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(message);
      // Папка не найдена, продолжаем анализ
    }

    await this.resumeService.analyzeResumeWithAI(body.resumeUrl);
    return { message: 'Резюме успешно сохранено и проанализировано' };
  }

  @Post('reset-resume')
  @HttpCode(HttpStatus.OK)
  async resetResume(): Promise<{ message: string }> {
    await this.authService.resetResume();
    return { message: 'Все файлы резюме успешно удалены' };
  }
}
