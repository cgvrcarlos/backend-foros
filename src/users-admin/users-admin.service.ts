import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const USER_LIST_SELECT = {
  id: true,
  apaterno: true,
  amaterno: true,
  nombres: true,
  email: true,
  telefono: true,
  genero: true,
  ocupacion: true,
  gradoEstudios: true,
  situacionLaboral: true,
  createdAt: true,
} as const;

function escapeCsvValue(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Si contiene coma, comilla o salto de línea, envolver en comillas y escapar comillas internas
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

@Injectable()
export class UsersAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        select: USER_LIST_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        attendances: {
          select: {
            id: true,
            tipoAsistencia: true,
            qrCode: true,
            confirmedAt: true,
            event: {
              select: {
                titulo: true,
                fechaHora: true,
              },
            },
          },
          orderBy: { confirmedAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con id "${id}" no encontrado`);
    }

    return user;
  }

  async exportCsv(): Promise<string> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const headers = [
      'id',
      'apaterno',
      'amaterno',
      'nombres',
      'email',
      'telefono',
      'redesSociales',
      'calle',
      'colonia',
      'cp',
      'municipio',
      'genero',
      'ocupacion',
      'gradoEstudios',
      'escuela',
      'situacionLaboral',
      'fechaRegistro',
    ];

    const rows = users.map((u) => [
      escapeCsvValue(u.id),
      escapeCsvValue(u.apaterno),
      escapeCsvValue(u.amaterno),
      escapeCsvValue(u.nombres),
      escapeCsvValue(u.email),
      escapeCsvValue(u.telefono),
      escapeCsvValue(u.redesSociales),
      escapeCsvValue(u.calle),
      escapeCsvValue(u.colonia),
      escapeCsvValue(u.cp),
      escapeCsvValue(u.municipio),
      escapeCsvValue(u.genero),
      escapeCsvValue(u.ocupacion),
      escapeCsvValue(u.gradoEstudios),
      escapeCsvValue(u.escuela),
      escapeCsvValue(u.situacionLaboral),
      escapeCsvValue(u.createdAt.toISOString()),
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }
}
