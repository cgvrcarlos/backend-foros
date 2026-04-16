import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    getMe: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => expect(controller).toBeDefined());

  describe('login', () => {
    it('should return tokens on successful login', async () => {
      const result = { accessToken: 'access-token', refreshToken: 'refresh-token', role: 'ADMIN' };
      mockAuthService.login.mockResolvedValue(result);
      const dto = { email: 'admin@test.com', password: 'password123' };
      expect(await controller.login(dto)).toEqual(result);
    });
  });

  describe('refresh', () => {
    it('should return new access token', async () => {
      const result = { accessToken: 'new-access-token' };
      mockAuthService.refresh.mockResolvedValue(result);
      expect(await controller.refresh({ refreshToken: 'valid-token' })).toEqual(result);
    });
  });

  describe('logout', () => {
    it('should return success message', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);
      const req = { user: { sub: 'user-id' } };
      expect(await controller.logout(req)).toEqual({ message: 'Sesión cerrada exitosamente' });
    });
  });
});
