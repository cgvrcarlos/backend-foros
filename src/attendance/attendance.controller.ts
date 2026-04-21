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
import { VerifyAttendanceDto } from './dto/verify-attendance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';

interface JwtUser {
  sub: string;
  email: string;
  roles: string[];
}

interface AuthenticatedRequest extends Request {
  user: JwtUser;
}

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  @Roles('ASISTENTE', 'ADMIN')
  confirm(@Req() req: AuthenticatedRequest, @Body() dto: ConfirmAttendanceDto) {
    return this.attendanceService.confirm(req.user.sub, dto);
  }

  @Post('verify')
  @Roles('ADMIN', 'STAFF')
  verify(@Req() req: AuthenticatedRequest, @Body() dto: VerifyAttendanceDto) {
    return this.attendanceService.verify(dto, req.user.sub);
  }

  @Get('my')
  @Roles('ASISTENTE', 'ADMIN')
  getMyAttendances(@Req() req: AuthenticatedRequest) {
    return this.attendanceService.getMyAttendances(req.user.sub);
  }

  @Get('event/:eventId')
  @Roles('ADMIN', 'PONENTE')
  getByEvent(
    @Req() req: AuthenticatedRequest,
    @Param('eventId') eventId: string,
  ) {
    // Pass all roles for proper multi-role support
    const roles = req.user.roles ?? [];
    return this.attendanceService.getByEvent(eventId, roles, req.user.sub);
  }

  @Get(':id/qr')
  @Roles('ASISTENTE', 'ADMIN')
  getQr(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    // Pass all roles for proper multi-role support
    const roles = req.user.roles ?? [];
    return this.attendanceService.getQr(id, req.user.sub, roles);
  }
}
