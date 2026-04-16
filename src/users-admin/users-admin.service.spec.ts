import { Test, TestingModule } from '@nestjs/testing';
import { UsersAdminService } from './users-admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('UsersAdminService', () => {
  let service: UsersAdminService;

  const mockPrisma = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersAdminService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UsersAdminService>(UsersAdminService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('retorna datos paginados con totales', async () => {
      const fakeUsers = [{ id: 'u-1', nombres: 'Juan' }];
      mockPrisma.user.findMany.mockResolvedValue(fakeUsers);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.findAll(1, 50);

      expect(result).toEqual({
        data: fakeUsers,
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
    });

    test.each([
      { page: 1, limit: 10, skip: 0, label: 'primera página' },
      { page: 2, limit: 10, skip: 10, label: 'segunda página' },
      { page: 3, limit: 50, skip: 100, label: 'tercera página con limit 50' },
    ])('calcula el skip correcto — $label', async ({ page, limit, skip }) => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.findAll(page, limit);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip, take: limit }),
      );
    });
  });

  describe('findOne', () => {
    it('lanza NotFoundException si el usuario no existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne('no-existe')).rejects.toThrow(NotFoundException);
    });

    it('retorna el usuario con sus asistencias si existe', async () => {
      const user = { id: 'u-1', nombres: 'Juan', attendances: [] };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      const result = await service.findOne('u-1');
      expect(result).toEqual(user);
    });
  });

  describe('exportCsv', () => {
    it('genera CSV con encabezados correctos', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      const csv = await service.exportCsv();
      const firstLine = csv.split('\n')[0];
      expect(firstLine).toBe(
        'id,apaterno,amaterno,nombres,email,telefono,redesSociales,calle,colonia,cp,municipio,genero,ocupacion,gradoEstudios,escuela,situacionLaboral,fechaRegistro',
      );
    });

    it('genera una fila por usuario con los campos correctos', async () => {
      const createdAt = new Date('2026-01-01T00:00:00Z');
      const user = {
        id: 'u-1',
        apaterno: 'García',
        amaterno: 'López',
        nombres: 'Juan Carlos',
        email: 'juan@test.com',
        telefono: '5551234567',
        redesSociales: null,
        calle: 'Av. Principal 123',
        colonia: 'Centro',
        cp: '64000',
        municipio: 'Monterrey',
        genero: 'MASCULINO',
        ocupacion: 'EMPLEADO',
        gradoEstudios: 'LICENCIATURA',
        escuela: null,
        situacionLaboral: 'TIEMPO_COMPLETO',
        createdAt,
      };
      mockPrisma.user.findMany.mockResolvedValue([user]);

      const csv = await service.exportCsv();
      const lines = csv.split('\n');
      expect(lines).toHaveLength(2); // header + 1 row
      expect(lines[1]).toContain('u-1');
      expect(lines[1]).toContain('juan@test.com');
      expect(lines[1]).toContain(createdAt.toISOString());
    });

    it('escapa correctamente valores con comas y comillas (RFC 4180)', async () => {
      const createdAt = new Date('2026-01-01T00:00:00Z');
      const user = {
        id: 'u-special',
        apaterno: 'García, Jr.',
        amaterno: 'O"Brien',
        nombres: 'Test',
        email: 'test@test.com',
        telefono: null,
        redesSociales: null,
        calle: null,
        colonia: null,
        cp: null,
        municipio: null,
        genero: null,
        ocupacion: null,
        gradoEstudios: null,
        escuela: null,
        situacionLaboral: null,
        createdAt,
      };
      mockPrisma.user.findMany.mockResolvedValue([user]);

      const csv = await service.exportCsv();
      const dataRow = csv.split('\n')[1];

      // "García, Jr." debe estar entre comillas (contiene coma)
      expect(dataRow).toContain('"García, Jr."');
      // O"Brien debe estar entre comillas y las comillas internas duplicadas
      expect(dataRow).toContain('"O""Brien"');
    });
  });
});
