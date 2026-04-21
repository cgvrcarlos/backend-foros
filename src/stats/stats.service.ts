import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import type { EventStatsResponse } from './stats.types';

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
      this.prisma.accountRole.count({ where: { role: Role.ASISTENTE } }),
      this.prisma.event.count({ where: { eliminado: false } }),
      this.prisma.attendance.count(),
      this.prisma.accountRole.count({ where: { role: Role.PONENTE } }),
    ]);

    return {
      totalUsuarios,
      totalEventos,
      totalAsistencias,
      totalPonentes,
    };
  }

async getByEvent(eventId: string, roles: string[], userId: string): Promise<EventStatsResponse> {
    if (roles.includes('PONENTE') && !roles.includes('ADMIN')) {
      const pon = await this.prisma.ponencia.findFirst({
        where: { eventoId: eventId, ponenteId: userId },
      });
      if (!pon) throw new ForbiddenException('No tenés una ponencia asignada en este evento');
    }

    const [statusGroups, tipoGroups, verifiedRows, totalRespuestas, evento] = await Promise.all([
      this.prisma.attendance.groupBy({ by: ['status'], where: { eventId }, _count: { _all: true } }),
      this.prisma.attendance.groupBy({ by: ['tipoAsistencia'], where: { eventId }, _count: { _all: true } }),
      this.prisma.attendance.findMany({ where: { eventId, verifiedAt: { not: null } }, select: { verifiedAt: true } }),
      this.prisma.response.count({ where: { attendance: { eventId } } }),
      this.prisma.event.findUnique({ where: { id: eventId }, select: { id: true, titulo: true, fechaHora: true } }),
    ]);

    const byStatus = new Map<string, number>();
    for (const g of statusGroups) byStatus.set(g.status, g._count._all);
    const asistioCount = byStatus.get('ASISTIO') ?? 0;
    const noAsistioCount = byStatus.get('NO_ASISTIO') ?? 0;
    const confirmadoPendiente = byStatus.get('CONFIRMADO') ?? 0;
    const totalConfirmados = asistioCount + noAsistioCount + confirmadoPendiente;

    const byTipo = new Map<string, number>();
    for (const g of tipoGroups) byTipo.set(g.tipoAsistencia, g._count._all);
    const confirmadosPresenciales = byTipo.get('PRESENCIAL') ?? 0;
    const confirmadosVirtuales = byTipo.get('VIRTUAL') ?? 0;

    const bucketMap = new Map<string, number>();
    for (const row of verifiedRows) {
      if (!row.verifiedAt) continue;
      const hour = row.verifiedAt.getHours();
      const key = `${hour.toString().padStart(2, '0')}:00`;
      bucketMap.set(key, (bucketMap.get(key) ?? 0) + 1);
    }
    const verifiedTimeline = Array.from(bucketMap.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    const tasaAsistencia = totalConfirmados === 0 ? 0 : asistioCount / totalConfirmados;

    return {
      evento,
      totalConfirmados,
      confirmadosPresenciales,
      confirmadosVirtuales,
      asistioCount,
      noAsistioCount,
      confirmadoPendiente,
      tasaAsistencia,
      totalRespuestas,
      verifiedTimeline,
    };
  }
}
