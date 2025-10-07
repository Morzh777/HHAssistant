import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { VacancyModule } from './vacancy/vacancy.module';
import { VacancyStorageModule } from './vacancy/vacancy-storage.module';
import { ResumeModule } from './resume/resume.module';
import { AuthModule } from './auth/auth.module';
import { OpenAIModule } from './openai/openai.module';
import { CoverLetterModule } from './cover-letter/cover-letter.module';
import { PrismaModule } from './prisma/prisma.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', './.env', '../.env'],
      expandVariables: true,
    }),
    VacancyModule,
    VacancyStorageModule,
    ResumeModule, 
    AuthModule, 
    OpenAIModule,
    CoverLetterModule,
    PrismaModule,
    EmbeddingsModule
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
