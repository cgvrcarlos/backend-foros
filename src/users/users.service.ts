import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        apaterno: true,
        amaterno: true,
        nombres: true,
        email: true,
        telefono: true,
        redesSociales: true,
        calle: true,
        colonia: true,
        cp: true,
        municipio: true,
        genero: true,
        ocupacion: true,
        gradoEstudios: true,
        escuela: true,
        situacionLaboral: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }
}
