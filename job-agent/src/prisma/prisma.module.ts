import { Module } from '@nestjs/common';
import { PrismaModule as NestjsPrismaModule } from 'nestjs-prisma';

@Module({
  imports: [
    NestjsPrismaModule.forRoot({
      isGlobal: true,
    }),
  ],
})
export class PrismaModule {}
