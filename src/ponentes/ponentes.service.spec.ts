import { Test, TestingModule } from '@nestjs/testing';
import { PonentesService } from './ponentes.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('PonentesService', () => {
  let service: PonentesService;

  const mockPrisma = {
    account: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      $transaction: jest.fn(),
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
    ponenteProfile: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockAccountsService = {
    createWithProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PonentesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AccountsService, useValue: mockAccountsService },
      ],
    }).compile();
    service = module.get<PonentesService>(PonentesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findOne', () => {
    it('lanza NotFoundException si el ponente no existe', async () => {
      mockPrisma.account.findUnique.mockResolvedValue(null);
      await expect(service.findOne('no-existe')).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFoundException si la cuenta no tiene rol PONENTE', async () => {
      mockPrisma.account.findUnique.mockResolvedValue({
        id: 'a-1',
        email: 'a@test.com',
        nombre: 'Account',
        createdAt: new Date(),
        roles: [{ role: 'ASISTENTE' }],
        ponenteProfile: null,
        ponencias: [],
      });
      await expect(service.findOne('a-1')).rejects.toThrow(NotFoundException);
    });

    it('retorna el ponente si existe con rol PONENTE', async () => {
      const account = {
        id: 'p-1',
        email: 'p@test.com',
        nombre: 'Ponente',
        createdAt: new Date(),
        roles: [{ role: 'PONENTE' }],
        ponenteProfile: { bio: null, especialidad: null, fotoUrl: null },
        ponencias: [],
      };
      mockPrisma.account.findUnique.mockResolvedValue(account);
      const result = await service.findOne('p-1');
      expect(result).toHaveProperty('id', 'p-1');
      expect(result).toHaveProperty('email', 'p@test.com');
    });
  });

  describe('create', () => {
    const dto = { email: 'nuevo@test.com', password: 'Secret123!', nombre: 'Nuevo', bio: 'Bio' };

    it('lanza ConflictException si el email ya existe', async () => {
      mockPrisma.account.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('delega a AccountsService y retorna datos del ponente', async () => {
      mockPrisma.account.findUnique.mockResolvedValue(null);
      mockAccountsService.createWithProfile.mockResolvedValue({
        id: 'p-new',
        email: dto.email,
        nombre: dto.nombre,
        createdAt: new Date(),
      });

      const result = await service.create(dto);

      expect(mockAccountsService.createWithProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          email: dto.email,
          nombre: dto.nombre,
          role: 'PONENTE',
          profile: expect.objectContaining({ bio: dto.bio }),
        }),
      );
      expect(result).toHaveProperty('id', 'p-new');
    });
  });

  describe('remove', () => {
    it('lanza NotFoundException si el ponente no existe', async () => {
      mockPrisma.account.findUnique.mockResolvedValue(null);
      await expect(service.remove('no-existe')).rejects.toThrow(NotFoundException);
    });

    it('elimina la cuenta si el ponente existe', async () => {
      const account = {
        id: 'p-1',
        email: 'p@test.com',
        nombre: 'Ponente',
        createdAt: new Date(),
        roles: [{ role: 'PONENTE' }],
        ponenteProfile: null,
        ponencias: [],
      };
      mockPrisma.account.findUnique.mockResolvedValue(account);
      mockPrisma.account.delete.mockResolvedValue({ id: 'p-1' });
      await service.remove('p-1');
      expect(mockPrisma.account.delete).toHaveBeenCalledWith({ where: { id: 'p-1' } });
    });
  });

  describe('createPonencia', () => {
    const dto = {
      ponenteId: 'p-1',
      titulo: 'Charla sobre tecnología',
      lugar: 'Sala A',
      horaInicio: '10:00',
      horaFin: '11:00',
      orden: 1,
    };

    it('lanza NotFoundException si el ponente no existe', async () => {
      mockPrisma.account.findUnique.mockResolvedValue(null);
      mockPrisma.event.findUnique.mockResolvedValue({ id: 'ev-1' });
      await expect(service.createPonencia('ev-1', dto)).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFoundException si el evento no existe', async () => {
      mockPrisma.account.findUnique.mockResolvedValue({
        id: 'p-1',
        roles: [{ role: 'PONENTE' }],
      });
      mockPrisma.event.findUnique.mockResolvedValue(null);
      await expect(service.createPonencia('ev-no', dto)).rejects.toThrow(NotFoundException);
    });

    it('crea la ponencia si ponente y evento existen', async () => {
      mockPrisma.account.findUnique.mockResolvedValue({
        id: 'p-1',
        roles: [{ role: 'PONENTE' }],
      });
      mockPrisma.event.findUnique.mockResolvedValue({ id: 'ev-1' });
      mockPrisma.ponencia.create.mockResolvedValue({
        id: 'pon-new',
        ponenteId: 'p-1',
        eventoId: 'ev-1',
        titulo: dto.titulo,
      });

      const result = await service.createPonencia('ev-1', dto);

      expect(mockPrisma.ponencia.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ponenteId: 'p-1', eventoId: 'ev-1', titulo: dto.titulo }),
        }),
      );
      expect(result).toHaveProperty('id', 'pon-new');
    });
  });

  describe('getMisPonencias', () => {
    it('lanza NotFoundException si el ponente no existe', async () => {
      mockPrisma.account.findUnique.mockResolvedValue(null);
      await expect(service.getMisPonencias('no-existe')).rejects.toThrow(NotFoundException);
    });

    it('retorna el ponente con sus ponencias', async () => {
      const account = {
        id: 'p-1',
        nombre: 'Ponente',
        email: 'p@test.com',
        createdAt: new Date(),
        roles: [{ role: 'PONENTE' }],
        ponenteProfile: { bio: null },
        ponencias: [],
      };
      mockPrisma.account.findUnique.mockResolvedValue(account);
      const result = await service.getMisPonencias('p-1');
      expect(result).toHaveProperty('id', 'p-1');
      expect(result).toHaveProperty('ponencias');
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
