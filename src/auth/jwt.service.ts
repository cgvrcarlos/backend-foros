import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'PONENTE';
}

@Injectable()
export class AuthJwtService implements OnModuleInit {
  private readonly logger = new Logger(AuthJwtService.name);

  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      this.logger.warn('JWT_SECRET not set - using default (development only!)');
    }
  }

  generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, { expiresIn: '1h' });
  }

  generateUserToken(payload: JwtPayload): string {
    // Users get a longer token since they can't refresh (no password)
    return this.jwtService.sign(payload, { expiresIn: '24h' });
  }

  generateRefreshToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, { expiresIn: '7d' });
  }

  verifyToken(token: string): JwtPayload {
    return this.jwtService.verify<JwtPayload>(token);
  }

  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) return null;
    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) return null;
    return token;
  }
}
