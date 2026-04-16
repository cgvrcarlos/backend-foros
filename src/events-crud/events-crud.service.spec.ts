import { Test, TestingModule } from '@nestjs/testing';
import { EventsCrudService } from './events-crud.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('EventsCrudService', () => {
  let service: EventsCrudService;

  const mockPrisma = {
    event: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsCrudService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<EventsCrudService>(EventsCrudService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('solo retorna eventos publicados y no eliminados', async () => {
      mockPrisma.event.findMany.mockResolvedValue([]);
      await service.findAll();
      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { publicado: true, eliminado: false },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('lanza NotFoundException si el evento no existe', async () => {
      mockPrisma.event.findFirst.mockResolvedValue(null);
      await expect(service.findOne('no-existe')).rejects.toThrow(NotFoundException);
    });

    it('retorna el evento si existe y está publicado', async () => {
      const evento = { id: '1', titulo: 'Test', publicado: true, eliminado: false };
      mockPrisma.event.findFirst.mockResolvedValue(evento);
      const result = await service.findOne('1');
      expect(result).toEqual(evento);
    });
  });

  describe('create', () => {
    it('crea el evento con los datos del DTO', async () => {
      const dto = {
        titulo: 'Nuevo Evento',
        fechaHora: '2026-05-01T10:00:00Z',
        descripcion: 'Descripción',
      };
      const created = { id: 'new-id', ...dto };
      mockPrisma.event.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(mockPrisma.event.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ titulo: 'Nuevo Evento' }),
        }),
      );
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // mañana

    it('lanza NotFoundException si el evento no existe', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);
      await expect(service.update('no-existe', { titulo: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si el evento ya inició', async () => {
      const pasadoDate = new Date(Date.now() - 1000);
      mockPrisma.event.findUnique.mockResolvedValue({ id: '1', fechaHora: pasadoDate });
      await expect(service.update('1', { titulo: 'X' })).rejects.toThrow(BadRequestException);
    });

    it('actualiza el evento si todavía no inició', async () => {
      mockPrisma.event.findUnique.mockResolvedValue({ id: '1', fechaHora: futureDate });
      mockPrisma.event.update.mockResolvedValue({ id: '1', titulo: 'Actualizado' });
      await service.update('1', { titulo: 'Actualizado' });
      expect(mockPrisma.event.update).toHaveBeenCalled();
    });
  });

  describe('remove (soft delete)', () => {
    it('lanza NotFoundException si el evento no existe', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);
      await expect(service.remove('no-existe')).rejects.toThrow(NotFoundException);
    });

    it('marca el evento como eliminado sin borrarlo', async () => {
      mockPrisma.event.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.event.update.mockResolvedValue({ id: '1', eliminado: true });
      await service.remove('1');
      expect(mockPrisma.event.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { eliminado: true } }),
      );
    });
  });

  describe('togglePublish', () => {
    test.each([
      { publicado: false, expected: true, label: 'publica un evento oculto' },
      { publicado: true, expected: false, label: 'oculta un evento publicado' },
    ])('$label', async ({ publicado, expected }) => {
      mockPrisma.event.findUnique.mockResolvedValue({ id: '1', publicado });
      mockPrisma.event.update.mockResolvedValue({ id: '1', publicado: expected });
      await service.togglePublish('1');
      expect(mockPrisma.event.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { publicado: expected } }),
      );
    });
  });
});
