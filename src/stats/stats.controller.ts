import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { StatsService } from './stats.service';
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

@Controller('stats')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  @Roles('ADMIN')
  getGlobal() {
    return this.statsService.getGlobal();
  }

  @Get('event/:id')
  @Roles('ADMIN', 'PONENTE')
  getByEvent(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.statsService.getByEvent(id, req.user.role, req.user.sub);
  }
}
