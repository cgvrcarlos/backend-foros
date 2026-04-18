import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthJwtService } from './jwt.service';
import { RedisService } from '../redis/redis.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { RegisterDto, Genero, GradoEstudios, SituacionLaboral } from './dto/register.dto';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrisma = {
    user: { findUnique: jest.fn(), create: jest.fn() },
    admin: { findUnique: jest.fn() },
    ponente: { findUnique: jest.fn() },
  };
  const mockRedis = { set: jest.fn(), get: jest.fn(), del: jest.fn() };
  const mockJwtService = {
    generateUserToken: jest.fn().mockReturnValue('user-token'),
    generateAccessToken: jest.fn().mockReturnValue('access-token'),
    generateRefreshToken: jest.fn().mockReturnValue('refresh-token'),
    verifyToken: jest.fn().mockReturnValue({ sub: 'id', email: 'e@e.com', role: 'ADMIN' }),
  };

  const mockRegisterDto: RegisterDto = {
    password: 'Password123!',
    apaterno: 'García',
    amaterno: 'López',
    nombres: 'Juan',
    email: 'juan@test.com',
    telefono: '5551234567',
    calle: 'Av. Principal 123',
    colonia: 'Centro',
    cp: '01000',
    municipio: 'Ciudad de México',
    genero: Genero.MASCULINO,
    ocupacion: 'Ingeniero',
    gradoEstudios: GradoEstudios.LICENCIATURA,
    situacionLaboral: SituacionLaboral.EMPLEADO,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuthJwtService, useValue: mockJwtService },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('should throw ConflictException if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1' });
      await expect(service.register(mockRegisterDto)).rejects.toThrow(ConflictException);
    });

    it('should create user and return access token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: 'uid', ...mockRegisterDto });
      const result = await service.register(mockRegisterDto);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if no admin nor ponente found', async () => {
      mockPrisma.admin.findUnique.mockResolvedValue(null);
      mockPrisma.ponente.findUnique.mockResolvedValue(null);
      await expect(service.login({ email: 'x@x.com', password: 'pass' })).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should delete refresh token from Redis', async () => {
      await service.logout('user-id');
      expect(mockRedis.del).toHaveBeenCalledWith('refresh:user-id');
    });
  });
});
