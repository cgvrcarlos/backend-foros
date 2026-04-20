import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthJwtService, JwtPayload } from './jwt.service';
import { RedisService } from '../redis/redis.service';
import { AccountsService } from '../accounts/accounts.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

  constructor(
    private readonly accountsService: AccountsService,
    private readonly jwtService: AuthJwtService,
    private readonly redis: RedisService,
  ) {}

  async register(dto: RegisterDto) {
    const account = await this.accountsService.createWithProfile({
      email: dto.email,
      password: dto.password,
      nombre: dto.nombres,
      telefono: dto.telefono,
      role: Role.ASISTENTE,
      profile: {
        apaterno: dto.apaterno,
        amaterno: dto.amaterno,
        nombres: dto.nombres,
        genero: dto.genero,
        ocupacion: dto.ocupacion,
        gradoEstudios: dto.gradoEstudios,
        escuela: dto.escuela,
        situacionLaboral: dto.situacionLaboral,
        redesSociales: dto.redesSociales,
        direccion: {
          calle: dto.calle,
          colonia: dto.colonia,
          cp: dto.cp,
          municipio: dto.municipio,
        },
      },
    });

    const payload: JwtPayload = {
      sub: account.id,
      email: account.email,
      roles: [Role.ASISTENTE],
    };
    const accessToken = this.jwtService.generateUserToken(payload);

    return {
      accessToken,
      user: {
        id: account.id,
        email: account.email,
        nombre: account.nombre,
        roles: [Role.ASISTENTE],
      },
    };
  }

  async login(dto: LoginDto) {
    const account = await this.accountsService.findByEmail(dto.email);

    if (!account) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!account.password) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(dto.password, account.password);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const roleValues: Role[] = account.roles.map((r) => r.role);

    const payload: JwtPayload = {
      sub: account.id,
      email: account.email,
      roles: roleValues,
    };

    const isPrivileged =
      roleValues.includes(Role.ADMIN) || roleValues.includes(Role.PONENTE);

    if (isPrivileged) {
      const accessToken = this.jwtService.generateAccessToken(payload);
      const refreshToken = this.jwtService.generateRefreshToken(payload);
      await this.redis.set(`refresh:${account.id}`, refreshToken, this.REFRESH_TOKEN_TTL);

      return {
        accessToken,
        refreshToken,
        user: {
          id: account.id,
          email: account.email,
          nombre: account.nombre,
          roles: roleValues,
        },
      };
    }

    // ASISTENTE-only accounts get a longer token with no refresh
    const accessToken = this.jwtService.generateUserToken(payload);
    return {
      accessToken,
      user: {
        id: account.id,
        email: account.email,
        nombre: account.nombre,
        roles: roleValues,
      },
    };
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verifyToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Token de refresco inválido');
    }

    const stored = await this.redis.get(`refresh:${payload.sub}`);
    if (stored !== refreshToken) {
      throw new UnauthorizedException('Token de refresco inválido');
    }

    // Re-read roles from DB — roles could have changed since issuance
    const account = await this.accountsService.findById(payload.sub);
    if (!account) {
      throw new UnauthorizedException('Cuenta no encontrada');
    }

    const freshRoles: Role[] = account.roles.map((r) => r.role);

    const accessToken = this.jwtService.generateAccessToken({
      sub: payload.sub,
      email: payload.email,
      roles: freshRoles,
    });

    return { accessToken };
  }

  async logout(userId: string) {
    await this.redis.del(`refresh:${userId}`);
  }

  async getMe(userId: string) {
    const account = await this.accountsService.findById(userId);
    if (!account) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const profile = account.userProfile;

    return {
      id: account.id,
      email: account.email,
      nombres: profile?.nombres ?? account.nombre,
      apaterno: profile?.apaterno ?? '',
      amaterno: profile?.amaterno ?? '',
      telefono: account.telefono,
      roles: account.roles.map((r) => r.role),
      genero: profile?.genero ?? undefined,
      ocupacion: profile?.ocupacion ?? undefined,
      gradoEstudios: profile?.gradoEstudios ?? undefined,
      situacionLaboral: profile?.situacionLaboral ?? undefined,
      escuela: profile?.escuela ?? undefined,
      direccion: profile?.direccion ?? undefined,
      redesSociales: profile?.redesSociales ?? undefined,
      ponenteProfile: account.ponenteProfile ?? undefined,
      adminProfile: account.adminProfile ?? undefined,
    };
  }
}
