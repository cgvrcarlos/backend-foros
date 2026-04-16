import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { CreatePonenteDto } from './dto/create-ponente.dto';
import { UpdatePonenteDto } from './dto/update-ponente.dto';
import { CreatePonenciaDto } from './dto/create-ponencia.dto';
import { UpdatePonenciaDto } from './dto/update-ponencia.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class PonentesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const ponentes = await this.prisma.ponente.findMany({
      select: {
        id: true,
        email: true,
        nombre: true,
        bio: true,
        createdAt: true,
        _count: {
          select: { ponencias: true },
        },
      },
      orderBy: { nombre: 'asc' },
    });
    return ponentes;
  }

  async findOne(id: string) {
    const ponente = await this.prisma.ponente.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nombre: true,
        bio: true,
        createdAt: true,
        ponencias: {
          select: {
            id: true,
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

    if (!ponente) {
      throw new NotFoundException(`Ponente con id "${id}" no encontrado`);
    }

    return ponente;
  }

  async create(dto: CreatePonenteDto) {
    const existing = await this.prisma.ponente.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe un ponente con el email "${dto.email}"`,
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const ponente = await this.prisma.ponente.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        nombre: dto.nombre,
        bio: dto.bio,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        bio: true,
        createdAt: true,
      },
    });

    return ponente;
  }

  async update(id: string, dto: UpdatePonenteDto) {
    await this.findOne(id);

    const ponente = await this.prisma.ponente.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        nombre: true,
        bio: true,
        createdAt: true,
      },
    });

    return ponente;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.ponente.delete({ where: { id } });
  }

  async createPonencia(eventoId: string, dto: CreatePonenciaDto) {
    const [ponente, evento] = await Promise.all([
      this.prisma.ponente.findUnique({ where: { id: dto.ponenteId } }),
      this.prisma.event.findUnique({ where: { id: eventoId } }),
    ]);

    if (!ponente) {
      throw new NotFoundException(
        `Ponente con id "${dto.ponenteId}" no encontrado`,
      );
    }

    if (!evento) {
      throw new NotFoundException(`Evento con id "${eventoId}" no encontrado`);
    }

    const ponencia = await this.prisma.ponencia.create({
      data: {
        ponenteId: dto.ponenteId,
        eventoId,
        lugar: dto.lugar,
        horaInicio: dto.horaInicio,
        horaFin: dto.horaFin,
        orden: dto.orden ?? 0,
      },
      select: {
        id: true,
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

    return this.prisma.ponencia.update({
      where: { id: ponenciaId },
      data: dto,
      select: {
        id: true,
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

  async getMisPonencias(ponenteId: string) {
    const ponente = await this.prisma.ponente.findUnique({
      where: { id: ponenteId },
      select: {
        id: true,
        nombre: true,
        email: true,
        bio: true,
        ponencias: {
          select: {
            id: true,
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

    if (!ponente) {
      throw new NotFoundException(`Ponente con id "${ponenteId}" no encontrado`);
    }

    return ponente;
  }

  async getPonenciasByEvent(eventoId: string) {
    const ponencias = await this.prisma.ponencia.findMany({
      where: { eventoId },
      select: {
        id: true,
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
            bio: true,
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
