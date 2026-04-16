import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersAdminService } from './users-admin.service';
import { UsersAdminController } from './users-admin.controller';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UsersAdminController],
  providers: [UsersAdminService, RolesGuard],
})
export class UsersAdminModule {}
