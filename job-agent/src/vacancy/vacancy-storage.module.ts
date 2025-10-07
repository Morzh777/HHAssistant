import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { VacancyStorageController } from './vacancy-storage.controller';
import { VacancyStorageService } from './vacancy-storage.service';

@Module({
  imports: [PrismaModule, EmbeddingsModule],
  controllers: [VacancyStorageController],
  providers: [VacancyStorageService],
  exports: [VacancyStorageService],
})
export class VacancyStorageModule {}
