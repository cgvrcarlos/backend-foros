import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const logger = new Logger('AuthController');

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ general: { limit: 10, ttl: 15 * 60 * 1000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Throttle({ general: { limit: 10, ttl: 15 * 60 * 1000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Request() req: any) {
    logger.log(`[me] Called - user.sub: ${req.user?.sub}, roles: ${req.user?.roles}`);
    return this.authService.getMe(req.user.sub);
  }

  // Debug endpoint - remove in production
  @Public()
  @Get('debug')
  async debug(@Request() req: any) {
    const user = req.user;
    logger.log(`[debug] auth header: ${req.headers.authorization ? 'YES' : 'NO'}, user: ${JSON.stringify(user)}`);
    return {
      message: 'Debug endpoint working',
      receivedToken: !!req.headers.authorization,
      userFromToken: user ? { sub: user.sub, roles: user.roles, email: user.email } : null,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req: any) {
    await this.authService.logout(req.user.sub);
    return { message: 'Sesión cerrada exitosamente' };
  }
}
