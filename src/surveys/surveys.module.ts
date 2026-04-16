import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SurveysService } from './surveys.service';
import { SurveysController } from './surveys.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SurveysController],
  providers: [SurveysService],
})
export class SurveysModule {}
