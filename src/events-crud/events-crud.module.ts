import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsCrudService } from './events-crud.service';
import { EventsCrudController } from './events-crud.controller';

@Module({
  imports: [PrismaModule],
  controllers: [EventsCrudController],
  providers: [EventsCrudService],
})
export class EventsCrudModule {}
