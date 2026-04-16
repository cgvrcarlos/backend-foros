import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrisma = {
    user: { findUnique: jest.fn() },
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
      const mockUser = {
        id: 'uid', email: 'test@test.com', apaterno: 'García', amaterno: 'López',
        nombres: 'Juan', telefono: '5551234567',
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.getProfile('uid');
      expect(result.id).toBe('uid');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getProfile('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});
