import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TipoAsistencia } from '@prisma/client';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getGlobal() {
    const [
      totalUsuarios,
      totalEventos,
      totalAsistencias,
      totalPonentes,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.event.count({ where: { eliminado: false } }),
      this.prisma.attendance.count(),
      this.prisma.ponente.count(),
    ]);

    return {
      totalUsuarios,
      totalEventos,
      totalAsistencias,
      totalPonentes,
    };
  }

  async getByEvent(eventId: string, role: string, userId: string) {
    // Si PONENTE: verificar que tiene ponencia en ese evento
    if (role === 'PONENTE') {
      const ponencia = await this.prisma.ponencia.findFirst({
        where: {
          eventoId: eventId,
          ponenteId: userId,
        },
      });

      if (!ponencia) {
        throw new ForbiddenException(
          'No tenés una ponencia asignada en este evento',
        );
      }
    }

    const [
      totalConfirmados,
      confirmadosPresenciales,
      confirmadosVirtuales,
      totalRespuestas,
      evento,
    ] = await Promise.all([
      this.prisma.attendance.count({ where: { eventId } }),
      this.prisma.attendance.count({
        where: { eventId, tipoAsistencia: TipoAsistencia.PRESENCIAL },
      }),
      this.prisma.attendance.count({
        where: { eventId, tipoAsistencia: TipoAsistencia.VIRTUAL },
      }),
      this.prisma.response.count({
        where: {
          attendance: { eventId },
        },
      }),
      this.prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, titulo: true, fechaHora: true },
      }),
    ]);

    return {
      evento,
      totalConfirmados,
      confirmadosPresenciales,
      confirmadosVirtuales,
      totalRespuestas,
    };
  }
}
