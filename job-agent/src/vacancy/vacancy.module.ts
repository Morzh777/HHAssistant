import { Module } from '@nestjs/common';
import { VacancyController } from './vacancy.controller';
import { VacancyService } from './vacancy.service';
import { VacancyAnalysisController } from './vacancy-analysis.controller';
import { VacancyAnalysisService } from './vacancy-analysis.service';
import { VacancyStorageService } from './vacancy-storage.service';
import { OpenAIModule } from '../openai/openai.module';

@Module({
  imports: [OpenAIModule],
  controllers: [VacancyController, VacancyAnalysisController],
  providers: [VacancyService, VacancyAnalysisService, VacancyStorageService],
  exports: [VacancyService, VacancyAnalysisService, VacancyStorageService],
})
export class VacancyModule {}
