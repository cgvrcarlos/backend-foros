import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Res,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { UsersAdminService } from './users-admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CreateAdminDto } from './dto/create-admin.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersAdminController {
  constructor(private readonly usersAdminService: UsersAdminService) {}

  @Get('export')
  async exportCsv(@Res() res: Response) {
    const csv = await this.usersAdminService.exportCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=usuarios.csv',
    );
    res.send(csv);
  }

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.usersAdminService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersAdminService.findOne(id);
  }

  // --- Admin management ---

  @Get('admins/list')
  listAdmins() {
    return this.usersAdminService.listAdmins();
  }

  @Post('admins')
  @HttpCode(HttpStatus.CREATED)
  createAdmin(@Body() dto: CreateAdminDto) {
    return this.usersAdminService.createAdmin(dto);
  }

  @Patch('admins/:id/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(@Param('id') id: string, @Body() dto: ChangePasswordDto) {
    await this.usersAdminService.changeAdminPassword(id, dto.newPassword);
  }
}
