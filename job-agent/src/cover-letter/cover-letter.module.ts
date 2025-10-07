import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CoverLetterService } from './cover-letter.service';
import { CoverLetterController } from './cover-letter.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CoverLetterController],
  providers: [CoverLetterService],
  exports: [CoverLetterService],
})
export class CoverLetterModule {}
