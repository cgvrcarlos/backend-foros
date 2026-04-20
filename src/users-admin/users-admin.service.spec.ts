import { Test, TestingModule } from '@nestjs/testing';
import { UsersAdminService } from './users-admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { NotFoundException } from '@nestjs/common';

describe('UsersAdminService', () => {
  let service: UsersAdminService;

  const mockPrisma = {
    account: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    accountRole: {
      count: jest.fn(),
    },
  };

  const mockAccountsService = {
    createWithProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersAdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AccountsService, useValue: mockAccountsService },
      ],
    }).compile();
    service = module.get<UsersAdminService>(UsersAdminService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('retorna datos paginados con totales', async () => {
      const fakeAccounts = [
        {
          id: 'u-1',
          email: 'juan@test.com',
          nombre: 'Juan',
          telefono: null,
          createdAt: new Date(),
          roles: [{ role: 'ASISTENTE' }],
          userProfile: {
            apaterno: 'García',
            amaterno: 'López',
            nombres: 'Juan Carlos',
            genero: 'MASCULINO',
            ocupacion: 'EMPLEADO',
            gradoEstudios: 'LICENCIATURA',
            situacionLaboral: 'EMPLEADO',
          },
        },
      ];
      mockPrisma.account.findMany.mockResolvedValue(fakeAccounts);
      mockPrisma.accountRole.count.mockResolvedValue(1);

      const result = await service.findAll(1, 50);

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.totalPages).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('id', 'u-1');
    });

    test.each([
      { page: 1, limit: 10, skip: 0, label: 'primera página' },
      { page: 2, limit: 10, skip: 10, label: 'segunda página' },
      { page: 3, limit: 50, skip: 100, label: 'tercera página con limit 50' },
    ])('calcula el skip correcto — $label', async ({ page, limit, skip }) => {
      mockPrisma.account.findMany.mockResolvedValue([]);
      mockPrisma.accountRole.count.mockResolvedValue(0);

      await service.findAll(page, limit);

      expect(mockPrisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip, take: limit }),
      );
    });
  });

  describe('findOne', () => {
    it('lanza NotFoundException si el usuario no existe', async () => {
      mockPrisma.account.findUnique.mockResolvedValue(null);
      await expect(service.findOne('no-existe')).rejects.toThrow(NotFoundException);
    });

    it('retorna el usuario con sus asistencias si existe', async () => {
      const account = {
        id: 'u-1',
        email: 'juan@test.com',
        nombre: 'Juan',
        telefono: null,
        createdAt: new Date(),
        roles: [{ role: 'ASISTENTE' }],
        userProfile: null,
        attendances: [],
      };
      mockPrisma.account.findUnique.mockResolvedValue(account);
      const result = await service.findOne('u-1');
      expect(result).toHaveProperty('id', 'u-1');
      expect(result).toHaveProperty('attendances');
    });
  });

  describe('exportCsv', () => {
    it('genera CSV con encabezados correctos', async () => {
      mockPrisma.account.findMany.mockResolvedValue([]);
      const csv = await service.exportCsv();
      const firstLine = csv.split('\n')[0];
      expect(firstLine).toBe(
        'id,apaterno,amaterno,nombres,email,telefono,redesSociales,genero,ocupacion,gradoEstudios,escuela,situacionLaboral,fechaRegistro',
      );
    });

    it('genera una fila por usuario con los campos correctos', async () => {
      const createdAt = new Date('2026-01-01T00:00:00Z');
      const account = {
        id: 'u-1',
        email: 'juan@test.com',
        telefono: '5551234567',
        createdAt,
        userProfile: {
          apaterno: 'García',
          amaterno: 'López',
          nombres: 'Juan Carlos',
          genero: 'MASCULINO',
          ocupacion: 'EMPLEADO',
          gradoEstudios: 'LICENCIATURA',
          escuela: null,
          situacionLaboral: 'TIEMPO_COMPLETO',
          redesSociales: null,
        },
      };
      mockPrisma.account.findMany.mockResolvedValue([account]);

      const csv = await service.exportCsv();
      const lines = csv.split('\n');
      expect(lines).toHaveLength(2); // header + 1 row
      expect(lines[1]).toContain('u-1');
      expect(lines[1]).toContain('juan@test.com');
      expect(lines[1]).toContain(createdAt.toISOString());
    });

    it('escapa correctamente valores con comas y comillas (RFC 4180)', async () => {
      const createdAt = new Date('2026-01-01T00:00:00Z');
      const account = {
        id: 'u-special',
        email: 'test@test.com',
        telefono: null,
        createdAt,
        userProfile: {
          apaterno: 'García, Jr.',
          amaterno: 'O"Brien',
          nombres: 'Test',
          genero: null,
          ocupacion: null,
          gradoEstudios: null,
          escuela: null,
          situacionLaboral: null,
          redesSociales: null,
        },
      };
      mockPrisma.account.findMany.mockResolvedValue([account]);

      const csv = await service.exportCsv();
      const dataRow = csv.split('\n')[1];

      // "García, Jr." debe estar entre comillas (contiene coma)
      expect(dataRow).toContain('"García, Jr."');
      // O"Brien debe estar entre comillas y las comillas internas duplicadas
      expect(dataRow).toContain('"O""Brien"');
    });
  });
});
