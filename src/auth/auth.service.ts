import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthJwtService, JwtPayload } from './jwt.service';
import { RedisService } from '../redis/redis.service';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 12;
  private readonly REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: AuthJwtService,
    private readonly redis: RedisService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        password: hashedPassword,
        apaterno: dto.apaterno,
        amaterno: dto.amaterno,
        nombres: dto.nombres,
        email: dto.email,
        telefono: dto.telefono,
        redesSociales: dto.redesSociales,
        calle: dto.calle,
        colonia: dto.colonia,
        cp: dto.cp,
        municipio: dto.municipio,
        genero: dto.genero,
        ocupacion: dto.ocupacion,
        gradoEstudios: dto.gradoEstudios,
        escuela: dto.escuela,
        situacionLaboral: dto.situacionLaboral,
      },
    });

    const payload: JwtPayload = { sub: user.id, email: user.email, role: 'USER' };
    const accessToken = this.jwtService.generateUserToken(payload);

    return {
      accessToken,
      user: this.sanitizeUser(user),
    };
  }

  async login(dto: LoginDto) {
    // Try Admin first
    const admin = await this.prisma.admin.findUnique({ where: { email: dto.email } });
    if (admin) {
      const valid = await bcrypt.compare(dto.password, admin.password);
      if (!valid) throw new UnauthorizedException('Credenciales inválidas');

      const payload: JwtPayload = {
        sub: admin.id,
        email: admin.email,
        role: admin.role === 'ADMIN' ? 'ADMIN' : 'PONENTE',
      };
      const accessToken = this.jwtService.generateAccessToken(payload);
      const refreshToken = this.jwtService.generateRefreshToken(payload);
      await this.redis.set(`refresh:${admin.id}`, refreshToken, this.REFRESH_TOKEN_TTL);

      return {
        accessToken,
        refreshToken,
        user: {
          id: admin.id,
          email: admin.email,
          nombres: admin.nombre,
          apaterno: '',
          amaterno: '',
          role: payload.role,
        },
      };
    }

    // Try Ponente
    const ponente = await this.prisma.ponente.findUnique({ where: { email: dto.email } });
    if (ponente) {
      const valid = await bcrypt.compare(dto.password, ponente.password);
      if (!valid) throw new UnauthorizedException('Credenciales inválidas');

      const payload: JwtPayload = { sub: ponente.id, email: ponente.email, role: 'PONENTE' };
      const accessToken = this.jwtService.generateAccessToken(payload);
      const refreshToken = this.jwtService.generateRefreshToken(payload);
      await this.redis.set(`refresh:${ponente.id}`, refreshToken, this.REFRESH_TOKEN_TTL);

      return {
        accessToken,
        refreshToken,
        user: {
          id: ponente.id,
          email: ponente.email,
          nombres: ponente.nombre,
          apaterno: '',
          amaterno: '',
          role: 'PONENTE',
        },
      };
    }

    // Try regular User
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (user) {
      if (!user.password) throw new UnauthorizedException('Credenciales inválidas');
      const valid = await bcrypt.compare(dto.password, user.password);
      if (!valid) throw new UnauthorizedException('Credenciales inválidas');

      const payload: JwtPayload = { sub: user.id, email: user.email, role: 'USER' };
      const accessToken = this.jwtService.generateUserToken(payload);

      return {
        accessToken,
        user: this.sanitizeUser(user),
      };
    }

    throw new UnauthorizedException('Credenciales inválidas');
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

    const accessToken = this.jwtService.generateAccessToken({
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    });

    return { accessToken };
  }

  async logout(userId: string) {
    await this.redis.del(`refresh:${userId}`);
  }

  async getMe(userId: string, role: string) {
    if (role === 'ADMIN' || role === 'PONENTE') {
      const admin = await this.prisma.admin.findUnique({
        where: { id: userId },
        select: { id: true, email: true, nombre: true, role: true, createdAt: true },
      });
      if (admin) return { ...admin, type: 'admin' };

      const ponente = await this.prisma.ponente.findUnique({
        where: { id: userId },
        select: { id: true, email: true, nombre: true, bio: true, createdAt: true },
      });
      if (ponente) return { ...ponente, type: 'ponente' };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, apaterno: true, amaterno: true, nombres: true,
        email: true, telefono: true, redesSociales: true,
        calle: true, colonia: true, cp: true, municipio: true,
        genero: true, ocupacion: true, gradoEstudios: true,
        escuela: true, situacionLaboral: true, createdAt: true,
      },
    });
    if (user) return { ...user, type: 'user' };

    throw new UnauthorizedException('Usuario no encontrado');
  }

  private sanitizeUser(user: any) {
    const { password: _pw, ...rest } = user;
    return rest;
  }
}
