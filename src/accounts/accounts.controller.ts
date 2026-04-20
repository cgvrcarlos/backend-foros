import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AccountsService, ProfileData } from './accounts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

class AssignRoleDto {
  role: Role;
  profile?: ProfileData;
}

@Controller('accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post(':accountId/roles')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  assignRole(@Param('accountId') accountId: string, @Body() dto: AssignRoleDto) {
    return this.accountsService.assignRole(accountId, dto.role, dto.profile);
  }

  @Delete(':accountId/roles/:role')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeRole(@Param('accountId') accountId: string, @Param('role') role: string) {
    return this.accountsService.revokeRole(accountId, role as Role);
  }
}