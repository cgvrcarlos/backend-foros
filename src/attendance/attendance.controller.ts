import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AttendanceService } from './attendance.service';
import { ConfirmAttendanceDto } from './dto/confirm-attendance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';

interface JwtUser {
  sub: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'PONENTE';
}

interface AuthenticatedRequest extends Request {
  user: JwtUser;
}

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  @Roles('USER', 'ADMIN')
  confirm(@Req() req: AuthenticatedRequest, @Body() dto: ConfirmAttendanceDto) {
    return this.attendanceService.confirm(req.user.sub, dto);
  }

  @Get('event/:eventId')
  @Roles('ADMIN', 'PONENTE')
  getByEvent(
    @Req() req: AuthenticatedRequest,
    @Param('eventId') eventId: string,
  ) {
    return this.attendanceService.getByEvent(
      eventId,
      req.user.role,
      req.user.sub,
    );
  }

  @Get(':id/qr')
  @Roles('USER', 'ADMIN')
  getQr(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.attendanceService.getQr(id, req.user.sub, req.user.role);
  }
}
