import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { StatsService } from './stats.service';
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
    // Pass all roles for proper multi-role support
    const roles = req.user.roles ?? [];
    return this.statsService.getByEvent(id, roles, req.user.sub);
  }
}
