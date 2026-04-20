import { Module } from '@nestjs/common';
import { PonentesController } from './ponentes.controller';
import { PonentesService } from './ponentes.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [PrismaModule, AccountsModule],
  controllers: [PonentesController],
  providers: [PonentesService],
})
export class PonentesModule {}
