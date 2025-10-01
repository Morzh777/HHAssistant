import { Module } from '@nestjs/common';
import { VacancyStorageController } from './vacancy-storage.controller';
import { VacancyStorageService } from './vacancy-storage.service';

@Module({
  controllers: [VacancyStorageController],
  providers: [VacancyStorageService],
  exports: [VacancyStorageService],
})
export class VacancyStorageModule {}
