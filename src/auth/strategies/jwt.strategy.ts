import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../jwt.service';

export interface JwtStrategyPayload extends JwtPayload {
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'development-secret-do-not-use-in-production',
    });
  }

  async validate(payload: JwtStrategyPayload): Promise<JwtPayload> {
    this.logger.debug(`Validating JWT for user: ${payload.sub}`);

    if (!payload.sub || !payload.email) {
      this.logger.warn('Invalid JWT payload - missing required fields');
      throw new UnauthorizedException('Invalid token');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      roles: Array.isArray(payload.roles) ? payload.roles : [],
    };
  }
}