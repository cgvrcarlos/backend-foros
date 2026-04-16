import { Test, TestingModule } from '@nestjs/testing';
import { StatsService } from './stats.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';

describe('StatsService', () => {
  let service: StatsService;

  const mockPrisma = {
    user: { count: jest.fn() },
    event: { count: jest.fn(), findUnique: jest.fn() },
    attendance: { count: jest.fn() },
    ponente: { count: jest.fn() },
    ponencia: { findFirst: jest.fn() },
    response: { count: jest.fn() },
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
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.event.count.mockResolvedValue(5);
      mockPrisma.attendance.count.mockResolvedValue(200);
      mockPrisma.ponente.count.mockResolvedValue(10);

      const result = await service.getGlobal();

      expect(result).toEqual({
        totalUsuarios: 100,
        totalEventos: 5,
        totalAsistencias: 200,
        totalPonentes: 10,
      });
      // Filtra solo eventos no eliminados
      expect(mockPrisma.event.count).toHaveBeenCalledWith({ where: { eliminado: false } });
    });
  });

  describe('getByEvent', () => {
    const mockEventStats = {
      totalConfirmados: 50,
      confirmadosPresenciales: 30,
      confirmadosVirtuales: 20,
      totalRespuestas: 40,
      evento: { id: 'ev-1', titulo: 'Test', fechaHora: new Date() },
    };

    beforeEach(() => {
      mockPrisma.attendance.count
        .mockResolvedValueOnce(mockEventStats.totalConfirmados)
        .mockResolvedValueOnce(mockEventStats.confirmadosPresenciales)
        .mockResolvedValueOnce(mockEventStats.confirmadosVirtuales);
      mockPrisma.response.count.mockResolvedValue(mockEventStats.totalRespuestas);
      mockPrisma.event.findUnique.mockResolvedValue(mockEventStats.evento);
    });

    it('lanza ForbiddenException si PONENTE no tiene ponencia en el evento', async () => {
      mockPrisma.ponencia.findFirst.mockResolvedValue(null);
      await expect(service.getByEvent('ev-1', 'PONENTE', 'ponente-1')).rejects.toThrow(ForbiddenException);
    });

    it('el ADMIN puede ver stats sin verificar ponencia', async () => {
      const result = await service.getByEvent('ev-1', 'ADMIN', 'admin-1');
      expect(mockPrisma.ponencia.findFirst).not.toHaveBeenCalled();
      expect(result).toHaveProperty('totalConfirmados', 50);
      expect(result).toHaveProperty('confirmadosPresenciales', 30);
      expect(result).toHaveProperty('confirmadosVirtuales', 20);
    });

    it('el PONENTE con ponencia asignada puede ver las stats', async () => {
      mockPrisma.ponencia.findFirst.mockResolvedValue({ id: 'pon-1' });

      const result = await service.getByEvent('ev-1', 'PONENTE', 'ponente-1');

      expect(mockPrisma.ponencia.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventoId: 'ev-1', ponenteId: 'ponente-1' },
        }),
      );
      expect(result).toHaveProperty('totalRespuestas', 40);
      expect(result).toHaveProperty('evento');
    });
  });
});
