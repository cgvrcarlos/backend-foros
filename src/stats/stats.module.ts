import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [StatsController],
  providers: [StatsService, RolesGuard],
})
export class StatsModule {}
