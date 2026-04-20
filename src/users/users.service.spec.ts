import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrisma = {
    account: { findUnique: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockAccount = {
        id: 'uid',
        email: 'test@test.com',
        nombre: 'Juan García',
        telefono: '5551234567',
        createdAt: new Date(),
        roles: [{ role: 'ASISTENTE' }],
        userProfile: {
          apaterno: 'García',
          amaterno: 'López',
          nombres: 'Juan Carlos',
          genero: 'MASCULINO',
          ocupacion: 'EMPLEADO',
          gradoEstudios: 'LICENCIATURA',
          escuela: null,
          situacionLaboral: 'EMPLEADO',
          direccion: null,
          redesSociales: null,
        },
      };
      mockPrisma.account.findUnique.mockResolvedValue(mockAccount);
      const result = await service.getProfile('uid');
      expect(result.id).toBe('uid');
      expect(result.email).toBe('test@test.com');
    });

    it('should throw NotFoundException if account not found', async () => {
      mockPrisma.account.findUnique.mockResolvedValue(null);
      await expect(service.getProfile('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});
