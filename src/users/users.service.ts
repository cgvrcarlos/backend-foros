import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: {
        userProfile: true,
        roles: true,
      },
    });

    if (!account) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const p = account.userProfile;

    // Shape the response to match what controllers/frontend expect
    return {
      id: account.id,
      email: account.email,
      nombre: account.nombre,
      telefono: account.telefono,
      roles: account.roles.map((r) => r.role),
      // Flatten UserProfile fields (may be null if profile not created yet)
      apaterno: p?.apaterno ?? null,
      amaterno: p?.amaterno ?? null,
      nombres: p?.nombres ?? null,
      genero: p?.genero ?? null,
      ocupacion: p?.ocupacion ?? null,
      gradoEstudios: p?.gradoEstudios ?? null,
      escuela: p?.escuela ?? null,
      situacionLaboral: p?.situacionLaboral ?? null,
      direccion: p?.direccion ?? null,
      redesSociales: p?.redesSociales ?? null,
      createdAt: account.createdAt,
    };
  }

  async updateProfile(accountId: string, dto: UpdateProfileDto) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: { userProfile: true },
    });

    if (!account) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Update Account fields
    const updateData: Record<string, unknown> = {};
    if (dto.nombre !== undefined) updateData.nombre = dto.nombre;
    if (dto.telefono !== undefined) updateData.telefono = dto.telefono;

    await this.prisma.account.update({
      where: { id: accountId },
      data: updateData,
    });

    // Update UserProfile fields if profile exists
    if (account.userProfile) {
      const profileData: Record<string, unknown> = {};
      if (dto.apaterno !== undefined) profileData.apaterno = dto.apaterno;
      if (dto.amaterno !== undefined) profileData.amaterno = dto.amaterno;
      if (dto.genero !== undefined) profileData.genero = dto.genero as any;
      if (dto.ocupacion !== undefined) profileData.ocupacion = dto.ocupacion;
      if (dto.gradoEstudios !== undefined) profileData.gradoEstudios = dto.gradoEstudios as any;
      if (dto.situacionLaboral !== undefined) profileData.situacionLaboral = dto.situacionLaboral as any;
      if (dto.escuela !== undefined) profileData.escuela = dto.escuela;
      if (dto.direccion !== undefined) profileData.direccion = dto.direccion as any;
      if (dto.redesSociales !== undefined) profileData.redesSociales = dto.redesSociales as any;

      await this.prisma.userProfile.update({
        where: { accountId },
        data: profileData,
      });
    }

    return this.getProfile(accountId);
  }
}
