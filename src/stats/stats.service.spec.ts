import { Test, TestingModule } from '@nestjs/testing';
import { StatsService } from './stats.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';

describe('StatsService', () => {
  let service: StatsService;

const mockPrisma = {
    accountRole: { count: jest.fn() },
    event: { count: jest.fn(), findUnique: jest.fn() },
    attendance: { groupBy: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    response: { count: jest.fn() },
    ponencia: { findFirst: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<StatsService>(StatsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getGlobal', () => {
    it('retorna las 4 métricas globales en paralelo', async () => {
      mockPrisma.accountRole.count
        .mockResolvedValueOnce(100) // totalUsuarios (ASISTENTE)
        .mockResolvedValueOnce(10); // totalPonentes (PONENTE)
      mockPrisma.event.count.mockResolvedValue(5);
      mockPrisma.attendance.count.mockResolvedValue(50);

      const result = await service.getGlobal();

      expect(result).toEqual({
        totalUsuarios: 100,
        totalEventos: 5,
        totalAsistencias: expect.any(Number),
        totalPonentes: 10,
      });
      expect(mockPrisma.event.count).toHaveBeenCalledWith({ where: { eliminado: false } });
      expect(mockPrisma.accountRole.count).toHaveBeenCalledWith({ where: { role: 'ASISTENTE' } });
      expect(mockPrisma.accountRole.count).toHaveBeenCalledWith({ where: { role: 'PONENTE' } });
    });
  });

  describe('getByEvent', () => {
    const mockEvento = { id: 'ev-1', titulo: 'Test', fechaHora: new Date() };

    const setupDefaultMocks = () => {
      mockPrisma.attendance.groupBy
        .mockResolvedValueOnce([
          { status: 'ASISTIO', _count: { _all: 30 } },
          { status: 'NO_ASISTIO', _count: { _all: 10 } },
          { status: 'CONFIRMADO', _count: { _all: 10 } },
        ])
        .mockResolvedValueOnce([
          { tipoAsistencia: 'PRESENCIAL', _count: { _all: 30 } },
          { tipoAsistencia: 'VIRTUAL', _count: { _all: 20 } },
        ]);
      mockPrisma.attendance.findMany.mockResolvedValue([]);
      mockPrisma.response.count.mockResolvedValue(40);
      mockPrisma.event.findUnique.mockResolvedValue(mockEvento);
    };

    it('lanza ForbiddenException si PONENTE no tiene ponencia en el evento', async () => {
      mockPrisma.ponencia.findFirst.mockResolvedValue(null);
      mockPrisma.attendance.groupBy.mockResolvedValue([]);
      mockPrisma.attendance.findMany.mockResolvedValue([]);
      mockPrisma.response.count.mockResolvedValue(0);
      mockPrisma.event.findUnique.mockResolvedValue(null);
      await expect(service.getByEvent('ev-1', ['PONENTE'], 'ponente-1')).rejects.toThrow(ForbiddenException);
    });

    it('el ADMIN puede ver stats sin verificar ponencia', async () => {
      setupDefaultMocks();
      const result = await service.getByEvent('ev-1', ['ADMIN'], 'admin-1');
      expect(mockPrisma.ponencia.findFirst).not.toHaveBeenCalled();
      expect(result).toHaveProperty('totalConfirmados', 50);
      expect(result).toHaveProperty('confirmadosPresenciales', 30);
      expect(result).toHaveProperty('confirmadosVirtuales', 20);
    });

    it('el PONENTE con ponencia asignada puede ver las stats', async () => {
      mockPrisma.ponencia.findFirst.mockResolvedValue({ id: 'pon-1' });
      setupDefaultMocks();

      const result = await service.getByEvent('ev-1', ['PONENTE'], 'ponente-1');

      expect(mockPrisma.ponencia.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventoId: 'ev-1', ponenteId: 'ponente-1' },
        }),
      );
      expect(result).toHaveProperty('totalRespuestas', 40);
      expect(result).toHaveProperty('evento');
    });

    it('tasaAsistencia es 0 cuando totalConfirmados === 0', async () => {
      mockPrisma.attendance.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockPrisma.attendance.findMany.mockResolvedValue([]);
      mockPrisma.response.count.mockResolvedValue(0);
      mockPrisma.event.findUnique.mockResolvedValue(mockEvento);

      const result = await service.getByEvent('ev-1', ['ADMIN'], 'admin-1');

      expect(result.totalConfirmados).toBe(0);
      expect(result.tasaAsistencia).toBe(0);
    });
  });
});
