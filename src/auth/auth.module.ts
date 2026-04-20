import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthJwtService } from './jwt.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [
    AccountsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET') || 'development-secret-do-not-use-in-production';
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN') || '7d';
        return {
          secret,
          signOptions: { expiresIn: expiresIn as any },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthJwtService,
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
  ],
  exports: [
    AuthJwtService,
    AuthService,
    JwtAuthGuard,
    JwtModule,
  ],
})
export class AuthModule {}