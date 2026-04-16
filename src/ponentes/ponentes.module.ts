import { Module } from '@nestjs/common';
import { PonentesController } from './ponentes.controller';
import { PonentesService } from './ponentes.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PonentesController],
  providers: [PonentesService],
})
export class PonentesModule {}
