import { Module } from '@nestjs/common';
import { EmbeddingsService } from './embeddings.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OpenAIModule } from '../openai/openai.module';

@Module({
  imports: [PrismaModule, OpenAIModule],
  providers: [EmbeddingsService],
  exports: [EmbeddingsService],
})
export class EmbeddingsModule {}


