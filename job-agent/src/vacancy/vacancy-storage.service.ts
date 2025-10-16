import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { Vacancy } from '../types/vacancy.types';
import { ApiResponse } from '../types/common.types';

@Injectable()
export class VacancyStorageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingsService,
  ) {}

  /**
   * Сохранение вакансии в БД
   */
  async saveVacancy(vacancyData: Vacancy): Promise<ApiResponse<Vacancy>> {
    try {
      const now = new Date();
      const saved = await this.prisma.vacancy.upsert({
        where: { id: vacancyData.id },
        create: {
          id: vacancyData.id,
          name: vacancyData.name,
          description: (vacancyData as any).description ?? undefined,
          salary: (vacancyData as any).salary ?? undefined,
          employer: (vacancyData as any).employer ?? undefined,
          area: (vacancyData as any).area ?? undefined,
          experience: (vacancyData as any).experience ?? undefined,
          employment: (vacancyData as any).employment ?? undefined,
          schedule: (vacancyData as any).schedule ?? undefined,
          keySkills: (vacancyData as any).key_skills ?? undefined,
          professional: (vacancyData as any).professional_roles ?? undefined,
          publishedAt: (vacancyData as any).published_at
            ? new Date((vacancyData as any).published_at)
            : undefined,
          createdAt: now,
          savedAt: now,
          source: (vacancyData as any)._metadata?.source ?? 'chrome-extension',
          raw: vacancyData as any,
        },
        update: {
          name: vacancyData.name,
          description: (vacancyData as any).description ?? undefined,
          salary: (vacancyData as any).salary ?? undefined,
          employer: (vacancyData as any).employer ?? undefined,
          area: (vacancyData as any).area ?? undefined,
          experience: (vacancyData as any).experience ?? undefined,
          employment: (vacancyData as any).employment ?? undefined,
          schedule: (vacancyData as any).schedule ?? undefined,
          keySkills: (vacancyData as any).key_skills ?? undefined,
          professional: (vacancyData as any).professional_roles ?? undefined,
          publishedAt: (vacancyData as any).published_at
            ? new Date((vacancyData as any).published_at)
            : undefined,
          savedAt: now,
          raw: vacancyData as any,
        },
      });

      // Try generate embedding for semantic search (best-effort)
      try {
        const sourceText = [
          saved.name,
          (saved.description as any) ?? '',
          JSON.stringify(saved.keySkills ?? {}),
        ]
          .filter(Boolean)
          .join('\n');
        if (sourceText.trim().length > 0) {
          await this.embeddings.storeVacancyEmbedding(saved.id, sourceText);
        }
      } catch {}

      return {
        success: true,
        message: 'Вакансия успешно сохранена',
        vacancyId: saved.id,
        path: 'db:vacancy',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Ошибка сохранения вакансии: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Получение списка всех сохраненных вакансий
   */
  async getVacancyList(): Promise<ApiResponse<Vacancy[]>> {
    try {
      const rows = await this.prisma.vacancy.findMany({
        orderBy: { savedAt: 'desc' },
        select: {
          id: true,
          name: true,
          employer: true,
          area: true,
          experience: true,
          salary: true,
          publishedAt: true,
          savedAt: true,
        },
      });
      // Приводим к ранее ожидаемому виду (частичному)
      const data = rows.map((v) => ({
        id: v.id,
        name: v.name,
        employer: (v.employer as any)?.name,
        area: (v.area as any)?.name,
        experience: (v.experience as any)?.name,
        salary: v.salary as any,
        published_at: v.publishedAt?.toISOString(),
        _metadata: { savedAt: v.savedAt?.toISOString?.() },
      })) as unknown as Vacancy[];
      return { success: true, count: data.length, data };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Ошибка получения списка вакансий: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Получение конкретной вакансии по ID
   */
  async getVacancy(vacancyId: string): Promise<ApiResponse<Vacancy>> {
    try {
      const row = await this.prisma.vacancy.findUnique({
        where: { id: vacancyId },
      });
      if (!row) {
        throw new HttpException(
          `Вакансия с ID ${vacancyId} не найдена`,
          HttpStatus.NOT_FOUND,
        );
      }
      return { success: true, data: (row.raw as any) ?? (row as any) };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Ошибка получения вакансии: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Ранжирование вакансий по эмбеддингам относительно последнего резюме
   */
  async rankByLatestResume(
    limit = 20,
  ): Promise<ApiResponse<Array<{ id: string; name: string; score: number }>>> {
    try {
      // Убиваем сложный SQL из кода: обеспечиваем функцию в БД и вызываем её
      await this.ensureRankingFunction();

      const rows = await this.prisma.$queryRaw<
        Array<{ id: string; name: string; score: number }>
      >`SELECT * FROM rank_vacancies(${limit}::integer)`;

      return {
        success: true,
        count: rows.length,
        data: rows,
      } as unknown as ApiResponse<
        Array<{ id: string; name: string; score: number }>
      >;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Ошибка ранжирования вакансий: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  
  // Создаёт/обновляет SQL-функцию ранжирования в БД (инкапсуляция pgvector логики)
  private async ensureRankingFunction(): Promise<void> {
    await this.prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION rank_vacancies(limit_count integer)
      RETURNS TABLE (id text, name text, score double precision)
      LANGUAGE sql
      AS $$
      WITH latest_resume AS (
        SELECT embedding
        FROM "UserResume"
        WHERE embedding IS NOT NULL
        ORDER BY "updatedAt" DESC
        LIMIT 1
      )
      SELECT v."id"::text, v."name"::text, (1 - (v.embedding <=> lr.embedding))::float AS score
      FROM "Vacancy" v, latest_resume lr
      WHERE v.embedding IS NOT NULL
      ORDER BY v.embedding <=> lr.embedding ASC
      LIMIT limit_count;
      $$;
    `);
  }
}
