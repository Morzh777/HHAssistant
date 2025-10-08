import { Module } from '@nestjs/common';
import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';
import { OpenAIModule } from '../openai/openai.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [OpenAIModule, PrismaModule, EmbeddingsModule, AuthModule],
  controllers: [ResumeController],
  providers: [ResumeService],
  exports: [ResumeService],
})
export class ResumeModule {}
