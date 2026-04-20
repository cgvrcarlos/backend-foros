import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { CreateAdminDto } from './dto/create-admin.dto';

const SALT_ROUNDS = 12;

function escapeCsvValue(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Si contiene coma, comilla o salto de línea, envolver en comillas y escapar comillas internas
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

@Injectable()
export class UsersAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
  ) {}

  async createAdmin(dto: CreateAdminDto) {
    const existing = await this.prisma.account.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('El email ya está registrado');

    const role: Role = (dto.role as Role) ?? Role.ADMIN;

    const account = await this.accountsService.createWithProfile({
      email: dto.email,
      password: dto.password,
      nombre: dto.nombre,
      role,
      profile: role === Role.ADMIN ? { nivel: 'STANDARD' } : {},
    });

    return {
      id: account.id,
      email: account.email,
      nombre: account.nombre,
      role,
      createdAt: account.createdAt,
    };
  }

  async changeAdminPassword(id: string, newPassword: string) {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account) throw new NotFoundException(`Admin con id "${id}" no encontrado`);

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.prisma.account.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  async listAdmins() {
    const accounts = await this.prisma.account.findMany({
      where: {
        roles: { some: { role: Role.ADMIN } },
      },
      include: {
        roles: true,
        adminProfile: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return accounts.map((a) => ({
      id: a.id,
      email: a.email,
      nombre: a.nombre,
      role: Role.ADMIN,
      nivel: a.adminProfile?.nivel ?? 'STANDARD',
      createdAt: a.createdAt,
    }));
  }

  async findAll(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [accounts, total] = await Promise.all([
      this.prisma.account.findMany({
        where: {
          roles: { some: { role: Role.ASISTENTE } },
        },
        include: {
          userProfile: true,
          roles: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.accountRole.count({ where: { role: Role.ASISTENTE } }),
    ]);

    const data = accounts.map((a) => {
      const p = a.userProfile;
      return {
        id: a.id,
        email: a.email,
        nombre: a.nombre,
        telefono: a.telefono,
        apaterno: p?.apaterno ?? null,
        amaterno: p?.amaterno ?? null,
        nombres: p?.nombres ?? null,
        genero: p?.genero ?? null,
        ocupacion: p?.ocupacion ?? null,
        gradoEstudios: p?.gradoEstudios ?? null,
        situacionLaboral: p?.situacionLaboral ?? null,
        createdAt: a.createdAt,
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        userProfile: true,
        roles: true,
        attendances: {
          select: {
            id: true,
            tipoAsistencia: true,
            qrCode: true,
            confirmedAt: true,
            event: {
              select: {
                titulo: true,
                fechaHora: true,
              },
            },
          },
          orderBy: { confirmedAt: 'desc' },
        },
      },
    });

    if (!account) {
      throw new NotFoundException(`Usuario con id "${id}" no encontrado`);
    }

    const p = account.userProfile;
    return {
      id: account.id,
      email: account.email,
      nombre: account.nombre,
      telefono: account.telefono,
      roles: account.roles.map((r) => r.role),
      apaterno: p?.apaterno ?? null,
      amaterno: p?.amaterno ?? null,
      nombres: p?.nombres ?? null,
      genero: p?.genero ?? null,
      ocupacion: p?.ocupacion ?? null,
      gradoEstudios: p?.gradoEstudios ?? null,
      escuela: p?.escuela ?? null,
      situacionLaboral: p?.situacionLaboral ?? null,
      direccion: p?.direccion ?? null,
      redesSociales: p?.redesSociales ?? null,
      createdAt: account.createdAt,
      attendances: account.attendances,
    };
  }

  async exportCsv(): Promise<string> {
    const accounts = await this.prisma.account.findMany({
      where: {
        roles: { some: { role: Role.ASISTENTE } },
      },
      include: { userProfile: true },
      orderBy: { createdAt: 'asc' },
    });

    const headers = [
      'id',
      'apaterno',
      'amaterno',
      'nombres',
      'email',
      'telefono',
      'redesSociales',
      'genero',
      'ocupacion',
      'gradoEstudios',
      'escuela',
      'situacionLaboral',
      'fechaRegistro',
    ];

    const rows = accounts.map((a) => {
      const p = a.userProfile;
      const redesSociales = p?.redesSociales
        ? JSON.stringify(p.redesSociales)
        : '';
      return [
        escapeCsvValue(a.id),
        escapeCsvValue(p?.apaterno),
        escapeCsvValue(p?.amaterno),
        escapeCsvValue(p?.nombres),
        escapeCsvValue(a.email),
        escapeCsvValue(a.telefono),
        escapeCsvValue(redesSociales),
        escapeCsvValue(p?.genero),
        escapeCsvValue(p?.ocupacion),
        escapeCsvValue(p?.gradoEstudios),
        escapeCsvValue(p?.escuela),
        escapeCsvValue(p?.situacionLaboral),
        escapeCsvValue(a.createdAt.toISOString()),
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}
