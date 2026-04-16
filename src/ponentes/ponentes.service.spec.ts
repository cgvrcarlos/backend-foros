import { Test, TestingModule } from '@nestjs/testing';
import { PonentesService } from './ponentes.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('PonentesService', () => {
  let service: PonentesService;

  const mockPrisma = {
    ponente: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    event: { findUnique: jest.fn() },
    ponencia: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PonentesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<PonentesService>(PonentesService);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
  });

  afterEach(() => jest.clearAllMocks());

  describe('findOne', () => {
    it('lanza NotFoundException si el ponente no existe', async () => {
      mockPrisma.ponente.findUnique.mockResolvedValue(null);
      await expect(service.findOne('no-existe')).rejects.toThrow(NotFoundException);
    });

    it('retorna el ponente si existe', async () => {
      const ponente = { id: 'p-1', email: 'p@test.com', nombre: 'Ponente', bio: null, ponencias: [] };
      mockPrisma.ponente.findUnique.mockResolvedValue(ponente);
      const result = await service.findOne('p-1');
      expect(result).toEqual(ponente);
    });
  });

  describe('create', () => {
    const dto = { email: 'nuevo@test.com', password: 'Secret123!', nombre: 'Nuevo', bio: 'Bio' };

    it('lanza ConflictException si el email ya existe', async () => {
      mockPrisma.ponente.findUnique.mockResolvedValue({ id: 'p-existing' });
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('hashea la contraseña y crea el ponente', async () => {
      mockPrisma.ponente.findUnique.mockResolvedValue(null);
      mockPrisma.ponente.create.mockResolvedValue({ id: 'p-new', email: dto.email, nombre: dto.nombre });

      const result = await service.create(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 12);
      expect(mockPrisma.ponente.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: dto.email,
            password: 'hashed-password',
          }),
        }),
      );
      expect(result).toHaveProperty('id', 'p-new');
    });
  });

  describe('remove', () => {
    it('lanza NotFoundException si el ponente no existe', async () => {
      mockPrisma.ponente.findUnique.mockResolvedValue(null);
      await expect(service.remove('no-existe')).rejects.toThrow(NotFoundException);
    });

    it('elimina el ponente si existe', async () => {
      mockPrisma.ponente.findUnique.mockResolvedValue({ id: 'p-1' });
      mockPrisma.ponente.delete.mockResolvedValue({ id: 'p-1' });
      await service.remove('p-1');
      expect(mockPrisma.ponente.delete).toHaveBeenCalledWith({ where: { id: 'p-1' } });
    });
  });

  describe('createPonencia', () => {
    const dto = {
      ponenteId: 'p-1',
      lugar: 'Sala A',
      horaInicio: '2026-05-01T10:00:00Z',
      horaFin: '2026-05-01T11:00:00Z',
      orden: 1,
    };

    it('lanza NotFoundException si el ponente no existe', async () => {
      mockPrisma.ponente.findUnique.mockResolvedValue(null);
      mockPrisma.event.findUnique.mockResolvedValue({ id: 'ev-1' });
      await expect(service.createPonencia('ev-1', dto)).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFoundException si el evento no existe', async () => {
      mockPrisma.ponente.findUnique.mockResolvedValue({ id: 'p-1' });
      mockPrisma.event.findUnique.mockResolvedValue(null);
      await expect(service.createPonencia('ev-no', dto)).rejects.toThrow(NotFoundException);
    });

    it('crea la ponencia si ponente y evento existen', async () => {
      mockPrisma.ponente.findUnique.mockResolvedValue({ id: 'p-1' });
      mockPrisma.event.findUnique.mockResolvedValue({ id: 'ev-1' });
      mockPrisma.ponencia.create.mockResolvedValue({ id: 'pon-new', ponenteId: 'p-1', eventoId: 'ev-1' });

      const result = await service.createPonencia('ev-1', dto);

      expect(mockPrisma.ponencia.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ponenteId: 'p-1', eventoId: 'ev-1' }),
        }),
      );
      expect(result).toHaveProperty('id', 'pon-new');
    });
  });

  describe('getMisPonencias', () => {
    it('lanza NotFoundException si el ponente no existe', async () => {
      mockPrisma.ponente.findUnique.mockResolvedValue(null);
      await expect(service.getMisPonencias('no-existe')).rejects.toThrow(NotFoundException);
    });

    it('retorna el ponente con sus ponencias', async () => {
      const ponente = { id: 'p-1', nombre: 'Ponente', email: 'p@test.com', bio: null, ponencias: [] };
      mockPrisma.ponente.findUnique.mockResolvedValue(ponente);
      const result = await service.getMisPonencias('p-1');
      expect(result).toEqual(ponente);
    });
  });

  describe('updatePonencia', () => {
    it('lanza NotFoundException si la ponencia no existe', async () => {
      mockPrisma.ponencia.findUnique.mockResolvedValue(null);
      await expect(service.updatePonencia('no-existe', { lugar: 'Sala B' })).rejects.toThrow(NotFoundException);
    });

    it('actualiza la ponencia si existe', async () => {
      mockPrisma.ponencia.findUnique.mockResolvedValue({ id: 'pon-1' });
      mockPrisma.ponencia.update.mockResolvedValue({ id: 'pon-1', lugar: 'Sala B' });
      const result = await service.updatePonencia('pon-1', { lugar: 'Sala B' });
      expect(mockPrisma.ponencia.update).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'pon-1');
    });
  });
});
