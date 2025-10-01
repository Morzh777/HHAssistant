import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly cookiePath = `${process.cwd()}/job-agent/data/hh-cookie.txt`;

  async saveCookies(cookie: string): Promise<void> {
    await fs.mkdir(`${process.cwd()}/job-agent/data`, { recursive: true });
    await fs.writeFile(this.cookiePath, cookie, 'utf-8');
  }

  async getCookies(): Promise<string | undefined> {
    try {
      const content = await fs.readFile(this.cookiePath, 'utf-8');
      return content.trim() || undefined;
    } catch {
      return undefined;
    }
  }

  async resetResume(): Promise<void> {
    try {
      this.logger.log('Начинаем сброс файлов резюме...');

      // Удаляем все файлы из папки resumes
      const resumesDir = `${process.cwd()}/job-agent/data/resumes`;
      try {
        const files = await fs.readdir(resumesDir);
        for (const file of files) {
          if (file.endsWith('.html')) {
            await fs.unlink(`${resumesDir}/${file}`);
            this.logger.log(`Удален файл резюме: ${file}`);
          }
        }
      } catch (error) {
        this.logger.error('Ошибка при удалении файлов резюме:', error);
      }

      // Удаляем все файлы из папки analysis
      const analysisDir = `${process.cwd()}/job-agent/data/analysis`;
      try {
        const files = await fs.readdir(analysisDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            await fs.unlink(`${analysisDir}/${file}`);
            this.logger.log(`Удален файл анализа: ${file}`);
          }
        }
      } catch (error) {
        this.logger.error('Ошибка при удалении файлов анализа:', error);
      }

      this.logger.log('Сброс файлов резюме завершен успешно');
    } catch (error) {
      this.logger.error('Ошибка при сбросе резюме:', error);
      throw error;
    }
  }
}
