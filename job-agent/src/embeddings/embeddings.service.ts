import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { OpenAIService } from '../openai/openai.service';

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openai: OpenAIService,
  ) {}

  async generate(text: string): Promise<number[]> {
    return this.openai.generateEmbedding(text);
  }

  async storeVacancyEmbedding(vacancyId: string, text: string): Promise<void> {
    try {
      const emb = await this.generate(text);
      const vectorLiteral = `[${emb.map((v) => (Number.isFinite(v) ? Number(v) : 0)).join(',')}]`;
      await this.prisma.$executeRaw`UPDATE "Vacancy" SET embedding = ${vectorLiteral}::vector WHERE id = ${vacancyId}`;
    } catch (error) {
      this.logger.warn(`Failed to store vacancy embedding for ${vacancyId}:`, error);
    }
  }

  async storeResumeEmbedding(resumeId: string, text: string): Promise<void> {
    try {
      const emb = await this.generate(text);
      const vectorLiteral = `[${emb.map((v) => (Number.isFinite(v) ? Number(v) : 0)).join(',')}]`;
      await this.prisma.$executeRaw`UPDATE "UserResume" SET embedding = ${vectorLiteral}::vector WHERE id = ${resumeId}`;
    } catch (error) {
      this.logger.warn(`Failed to store resume embedding for ${resumeId}:`, error);
    }
  }
}


