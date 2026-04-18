import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { EventsModule } from './events/events.module';
import { EventsCrudModule } from './events-crud/events-crud.module';
import { PonentesModule } from './ponentes/ponentes.module';
import { SurveysModule } from './surveys/surveys.module';
import { AttendanceModule } from './attendance/attendance.module';
import { StatsModule } from './stats/stats.module';
import { UsersAdminModule } from './users-admin/users-admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        name: 'general',
        ttl: 15 * 60 * 1000, // 15 min
        limit: 100,
      },
    ]),
    PrismaModule,
    RedisModule,
    AuthModule,
    EventsModule,
    EventsCrudModule,
    PonentesModule,
    SurveysModule,
    AttendanceModule,
    StatsModule,
    UsersAdminModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
