import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

const PONENCIAS_INCLUDE = {
  ponencias: {
    select: {
      id: true,
      lugar: true,
      horaInicio: true,
      horaFin: true,
      orden: true,
      ponente: {
        select: {
          nombre: true,
        },
      },
    },
    orderBy: {
      orden: 'asc' as const,
    },
  },
} as const;

const SURVEY_INCLUDE = {
  survey: {
    include: {
      questions: {
        orderBy: {
          orden: 'asc' as const,
        },
      },
    },
  },
} as const;

@Injectable()
export class EventsCrudService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.event.findMany({
      where: {
        publicado: true,
        eliminado: false,
      },
      include: PONENCIAS_INCLUDE,
      orderBy: {
        fechaHora: 'asc',
      },
    });
  }

  findAllAdmin() {
    return this.prisma.event.findMany({
      include: PONENCIAS_INCLUDE,
      orderBy: {
        fechaHora: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id,
        publicado: true,
        eliminado: false,
      },
      include: {
        ...PONENCIAS_INCLUDE,
        ...SURVEY_INCLUDE,
      },
    });

    if (!event) {
      throw new NotFoundException(`Evento con id "${id}" no encontrado`);
    }

    return event;
  }

  async findOneAdmin(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        ...PONENCIAS_INCLUDE,
        ...SURVEY_INCLUDE,
      },
    });

    if (!event) {
      throw new NotFoundException(`Evento con id "${id}" no encontrado`);
    }

    return event;
  }

  create(dto: CreateEventDto) {
    return this.prisma.event.create({
      data: {
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        fechaHora: new Date(dto.fechaHora),
        linkVirtual: dto.linkVirtual,
        ubicacionPresencial: dto.ubicacionPresencial,
      },
    });
  }

  async update(id: string, dto: UpdateEventDto) {
    const event = await this.prisma.event.findUnique({ where: { id } });

    if (!event) {
      throw new NotFoundException(`Evento con id "${id}" no encontrado`);
    }

    if (event.fechaHora <= new Date()) {
      throw new BadRequestException(
        'No se puede modificar un evento que ya ha iniciado',
      );
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.titulo !== undefined && { titulo: dto.titulo }),
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
        ...(dto.fechaHora !== undefined && {
          fechaHora: new Date(dto.fechaHora),
        }),
        ...(dto.linkVirtual !== undefined && { linkVirtual: dto.linkVirtual }),
        ...(dto.ubicacionPresencial !== undefined && {
          ubicacionPresencial: dto.ubicacionPresencial,
        }),
      },
    });
  }

  async remove(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });

    if (!event) {
      throw new NotFoundException(`Evento con id "${id}" no encontrado`);
    }

    await this.prisma.event.update({
      where: { id },
      data: { eliminado: true },
    });
  }

  async togglePublish(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });

    if (!event) {
      throw new NotFoundException(`Evento con id "${id}" no encontrado`);
    }

    return this.prisma.event.update({
      where: { id },
      data: { publicado: !event.publicado },
    });
  }
}
