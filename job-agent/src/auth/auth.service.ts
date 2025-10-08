import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import type {
  SaveCookiesResponse,
  GetCookiesResponse,
  ResetResumeResponse,
} from '../types/auth.types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly DEFAULT_USER_ID = 'default-user'; // можно сделать динамическим

  constructor(private readonly prisma: PrismaService) {}

  async saveCookies(cookie: string): Promise<SaveCookiesResponse> {
    try {
      await this.prisma.userCookie.upsert({
        where: { userId: this.DEFAULT_USER_ID },
        create: {
          userId: this.DEFAULT_USER_ID,
          cookie,
        },
        update: {
          cookie,
        },
      });
      return {
        success: true,
        message: 'Cookies успешно сохранены',
      };
    } catch (error) {
      this.logger.error('Ошибка сохранения cookies:', error);
      throw error;
    }
  }

  async getCookies(): Promise<GetCookiesResponse> {
    try {
      const userCookie = await this.prisma.userCookie.findUnique({
        where: { userId: this.DEFAULT_USER_ID },
      });
      return {
        success: true,
        cookie: userCookie?.cookie || undefined,
      };
    } catch (error) {
      this.logger.error('Ошибка получения cookies:', error);
      return {
        success: false,
        error: 'Ошибка получения cookies',
      };
    }
  }

  async resetResume(): Promise<ResetResumeResponse> {
    try {
      this.logger.log('Начинаем сброс данных резюме из БД...');

      // Удаляем все записи резюме из БД
      await this.prisma.userResume.deleteMany({});
      this.logger.log('Данные резюме удалены из БД');

      this.logger.log('Сброс данных резюме завершен успешно');
      return {
        success: true,
        message: 'Все данные резюме успешно удалены из БД',
      };
    } catch (error) {
      this.logger.error('Ошибка при сбросе резюме:', error);
      throw error;
    }
  }
}
