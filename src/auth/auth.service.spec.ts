import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { AuthJwtService } from './jwt.service';
import { RedisService } from '../redis/redis.service';
import { AccountsService } from '../accounts/accounts.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { RegisterDto, Genero, GradoEstudios, SituacionLaboral } from './dto/register.dto';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;

  const mockAccountsService = {
    createWithProfile: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
  };
  const mockRedis = { set: jest.fn(), get: jest.fn(), del: jest.fn() };
  const mockJwtService = {
    generateUserToken: jest.fn().mockReturnValue('user-token'),
    generateAccessToken: jest.fn().mockReturnValue('access-token'),
    generateRefreshToken: jest.fn().mockReturnValue('refresh-token'),
    verifyToken: jest.fn().mockReturnValue({ sub: 'id', email: 'e@e.com', roles: ['ADMIN'] }),
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
        { provide: AccountsService, useValue: mockAccountsService },
        { provide: AuthJwtService, useValue: mockJwtService },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('should create account and return access token', async () => {
      mockAccountsService.createWithProfile.mockResolvedValue({
        id: 'uid',
        email: mockRegisterDto.email,
        nombre: mockRegisterDto.nombres,
        roles: [],
      });

      const result = await service.register(mockRegisterDto);

      expect(mockAccountsService.createWithProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockRegisterDto.email,
          role: 'ASISTENTE',
        }),
      );
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if account not found', async () => {
      mockAccountsService.findByEmail.mockResolvedValue(null);
      await expect(service.login({ email: 'x@x.com', password: 'pass' })).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is wrong', async () => {
      mockAccountsService.findByEmail.mockResolvedValue({
        id: 'uid',
        email: 'x@x.com',
        password: 'hashed',
        nombre: 'Test',
        roles: [{ role: 'ASISTENTE' }],
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login({ email: 'x@x.com', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
    });

    it('should return accessToken for ASISTENTE (no refreshToken)', async () => {
      mockAccountsService.findByEmail.mockResolvedValue({
        id: 'uid',
        email: 'juan@test.com',
        password: 'hashed',
        nombre: 'Juan',
        roles: [{ role: 'ASISTENTE' }],
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ email: 'juan@test.com', password: 'pass' });

      expect(mockJwtService.generateUserToken).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken', 'user-token');
      expect(result).not.toHaveProperty('refreshToken');
    });

    it('should return accessToken + refreshToken for ADMIN', async () => {
      mockAccountsService.findByEmail.mockResolvedValue({
        id: 'admin-id',
        email: 'admin@test.com',
        password: 'hashed',
        nombre: 'Admin',
        roles: [{ role: 'ADMIN' }],
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ email: 'admin@test.com', password: 'pass' });

      expect(mockJwtService.generateAccessToken).toHaveBeenCalled();
      expect(mockJwtService.generateRefreshToken).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
    });
  });

  describe('logout', () => {
    it('should delete refresh token from Redis', async () => {
      await service.logout('user-id');
      expect(mockRedis.del).toHaveBeenCalledWith('refresh:user-id');
    });
  });
});
