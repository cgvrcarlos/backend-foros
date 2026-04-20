import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { Role } from '@prisma/client';
import { CreatePonenteDto } from './dto/create-ponente.dto';
import { UpdatePonenteDto } from './dto/update-ponente.dto';
import { CreatePonenciaDto } from './dto/create-ponencia.dto';
import { UpdatePonenciaDto } from './dto/update-ponencia.dto';

@Injectable()
export class PonentesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
  ) {}

  async findAll() {
    const accounts = await this.prisma.account.findMany({
      where: {
        roles: { some: { role: Role.PONENTE } },
      },
      include: {
        ponenteProfile: true,
        _count: {
          select: { ponencias: true },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    return accounts.map((a) => ({
      id: a.id,
      email: a.email,
      nombre: a.nombre,
      bio: a.ponenteProfile?.bio ?? null,
      especialidad: a.ponenteProfile?.especialidad ?? null,
      fotoUrl: a.ponenteProfile?.fotoUrl ?? null,
      createdAt: a.createdAt,
      _count: a._count,
    }));
  }

  async findOne(id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        ponenteProfile: true,
        roles: true,
        ponencias: {
          select: {
            id: true,
            titulo: true,
            descripcion: true,
            lugar: true,
            horaInicio: true,
            horaFin: true,
            orden: true,
            createdAt: true,
            updatedAt: true,
            evento: {
              select: {
                id: true,
                titulo: true,
                fechaHora: true,
              },
            },
          },
          orderBy: [{ orden: 'asc' }, { horaInicio: 'asc' }],
        },
      },
    });

    if (!account || !account.roles.some((r) => r.role === Role.PONENTE)) {
      throw new NotFoundException(`Ponente con id "${id}" no encontrado`);
    }

    return {
      id: account.id,
      email: account.email,
      nombre: account.nombre,
      bio: account.ponenteProfile?.bio ?? null,
      especialidad: account.ponenteProfile?.especialidad ?? null,
      fotoUrl: account.ponenteProfile?.fotoUrl ?? null,
      createdAt: account.createdAt,
      ponencias: account.ponencias,
    };
  }

  async create(dto: CreatePonenteDto) {
    const existing = await this.prisma.account.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe una cuenta con el email "${dto.email}"`,
      );
    }

    const account = await this.accountsService.createWithProfile({
      email: dto.email,
      password: dto.password,
      nombre: dto.nombre,
      role: Role.PONENTE,
      profile: {
        bio: dto.bio,
      },
    });

    return {
      id: account.id,
      email: account.email,
      nombre: account.nombre,
      bio: dto.bio ?? null,
      createdAt: account.createdAt,
    };
  }

  async update(id: string, dto: UpdatePonenteDto) {
    // Verify exists as ponente
    await this.findOne(id);

    // Update Account fields (email, nombre) and PonenteProfile fields (bio) separately
    const accountData: { email?: string; nombre?: string } = {};
    if (dto.email !== undefined) accountData.email = dto.email;
    if (dto.nombre !== undefined) accountData.nombre = dto.nombre;

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(accountData).length > 0) {
        await tx.account.update({ where: { id }, data: accountData });
      }

      if (dto.bio !== undefined) {
        await tx.ponenteProfile.update({
          where: { accountId: id },
          data: { bio: dto.bio },
        });
      }
    });

    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    // Cascade deletes profile, roles, ponencias via schema onDelete: Cascade
    await this.prisma.account.delete({ where: { id } });
  }

  async createPonencia(eventoId: string, dto: CreatePonenciaDto) {
    const [ponente, evento] = await Promise.all([
      this.prisma.account.findUnique({
        where: { id: dto.ponenteId },
        include: { roles: true },
      }),
      this.prisma.event.findUnique({ where: { id: eventoId } }),
    ]);

    if (!ponente || !ponente.roles.some((r) => r.role === Role.PONENTE)) {
      throw new NotFoundException(
        `Ponente con id "${dto.ponenteId}" no encontrado`,
      );
    }

    if (!evento) {
      throw new NotFoundException(`Evento con id "${eventoId}" no encontrado`);
    }

    const horaInicio = parseTime(dto.horaInicio);
    const horaFin = parseTime(dto.horaFin);

    const ponencia = await this.prisma.ponencia.create({
      data: {
        ponenteId: dto.ponenteId,
        eventoId,
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        lugar: dto.lugar,
        horaInicio,
        horaFin,
        orden: dto.orden ?? 0,
      },
      select: {
        id: true,
        titulo: true,
        descripcion: true,
        lugar: true,
        horaInicio: true,
        horaFin: true,
        orden: true,
        createdAt: true,
        updatedAt: true,
        ponente: {
          select: { id: true, nombre: true, email: true },
        },
        evento: {
          select: { id: true, titulo: true, fechaHora: true },
        },
      },
    });

    return ponencia;
  }

  async updatePonencia(ponenciaId: string, dto: UpdatePonenciaDto) {
    const ponencia = await this.prisma.ponencia.findUnique({
      where: { id: ponenciaId },
    });

    if (!ponencia) {
      throw new NotFoundException(
        `Ponencia con id "${ponenciaId}" no encontrada`,
      );
    }

    const data: Record<string, unknown> = {};
    if (dto.titulo !== undefined) data.titulo = dto.titulo;
    if (dto.descripcion !== undefined) data.descripcion = dto.descripcion;
    if (dto.lugar !== undefined) data.lugar = dto.lugar;
    if (dto.horaInicio !== undefined) data.horaInicio = parseTime(dto.horaInicio);
    if (dto.horaFin !== undefined) data.horaFin = parseTime(dto.horaFin);
    if (dto.orden !== undefined) data.orden = dto.orden;

    return this.prisma.ponencia.update({
      where: { id: ponenciaId },
      data,
      select: {
        id: true,
        titulo: true,
        descripcion: true,
        lugar: true,
        horaInicio: true,
        horaFin: true,
        orden: true,
        createdAt: true,
        updatedAt: true,
        ponente: {
          select: { id: true, nombre: true, email: true },
        },
        evento: {
          select: { id: true, titulo: true, fechaHora: true },
        },
      },
    });
  }

  async removePonencia(ponenciaId: string) {
    const ponencia = await this.prisma.ponencia.findUnique({
      where: { id: ponenciaId },
    });

    if (!ponencia) {
      throw new NotFoundException(
        `Ponencia con id "${ponenciaId}" no encontrada`,
      );
    }

    await this.prisma.ponencia.delete({ where: { id: ponenciaId } });
  }

  async getMisPonencias(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: {
        ponenteProfile: true,
        roles: true,
        ponencias: {
          select: {
            id: true,
            titulo: true,
            descripcion: true,
            lugar: true,
            horaInicio: true,
            horaFin: true,
            orden: true,
            evento: {
              select: {
                id: true,
                titulo: true,
                descripcion: true,
                fechaHora: true,
                linkVirtual: true,
                ubicacionPresencial: true,
                publicado: true,
              },
            },
          },
          orderBy: [
            { evento: { fechaHora: 'asc' } },
            { orden: 'asc' },
            { horaInicio: 'asc' },
          ],
        },
      },
    });

    if (!account || !account.roles.some((r) => r.role === Role.PONENTE)) {
      throw new NotFoundException(`Ponente con id "${accountId}" no encontrado`);
    }

    return {
      id: account.id,
      nombre: account.nombre,
      email: account.email,
      bio: account.ponenteProfile?.bio ?? null,
      ponencias: account.ponencias,
    };
  }

  async getPonenciasByEvent(eventoId: string) {
    const ponencias = await this.prisma.ponencia.findMany({
      where: { eventoId },
      select: {
        id: true,
        titulo: true,
        descripcion: true,
        lugar: true,
        horaInicio: true,
        horaFin: true,
        orden: true,
        createdAt: true,
        updatedAt: true,
        ponente: {
          select: {
            id: true,
            nombre: true,
            email: true,
            ponenteProfile: {
              select: { bio: true },
            },
          },
        },
        evento: {
          select: {
            id: true,
            titulo: true,
            fechaHora: true,
          },
        },
      },
      orderBy: [{ orden: 'asc' }, { horaInicio: 'asc' }],
    });

    return ponencias;
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Convert "HH:MM" string to a Date object that Prisma stores as TIME(0).
 * Prisma uses a full Date for @db.Time(0) — only the time portion is stored.
 */
function parseTime(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date('1970-01-01T00:00:00Z');
  d.setUTCHours(hours, minutes, 0, 0);
  return d;
}
