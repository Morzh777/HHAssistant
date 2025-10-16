import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AIModule } from '../ai/ai.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { ResumeModule } from '../resume/resume.module';
import { VacancyController } from './vacancy.controller';
import { VacancyService } from './vacancy.service';
import { VacancyAnalysisController } from './vacancy-analysis.controller';
import { VacancyAnalysisService } from './vacancy-analysis.service';
import { VacancyStorageService } from './vacancy-storage.service';
import { VacancyStorageController } from './vacancy-storage.controller';

@Module({
  imports: [AIModule, PrismaModule, EmbeddingsModule, ResumeModule],
  controllers: [
    VacancyController,
    VacancyAnalysisController,
    VacancyStorageController,
  ],
  providers: [VacancyService, VacancyAnalysisService, VacancyStorageService],
  exports: [VacancyService, VacancyAnalysisService, VacancyStorageService],
})
export class VacancyModule {}
