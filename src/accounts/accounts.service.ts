import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

// ─── Input types ────────────────────────────────────────────────────────────

export interface UserProfileData {
  apaterno: string;
  amaterno: string;
  nombres: string;
  genero: string;
  ocupacion: string;
  gradoEstudios: string;
  escuela?: string;
  situacionLaboral: string;
  direccion?: Record<string, unknown>;
  redesSociales?: Record<string, unknown> | string;
}

export interface PonenteProfileData {
  bio?: string;
  especialidad?: string;
  fotoUrl?: string;
  redesSociales?: Record<string, unknown>;
}

export interface AdminProfileData {
  nivel?: string;
}

export type ProfileData = UserProfileData | PonenteProfileData | AdminProfileData;

export interface CreateAccountInput {
  email: string;
  password: string;
  nombre: string;
  telefono?: string;
  role: Role;
  profile?: ProfileData;
}

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new Account, assign a Role, and create the matching Profile — atomically.
   * If any step fails, the entire transaction rolls back.
   */
  async createWithProfile(input: CreateAccountInput) {
    const { email, password, nombre, telefono, role, profile } = input;
    const hash = await bcrypt.hash(password, 12);

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: { email, password: hash, nombre, telefono },
      });

      await tx.accountRole.create({
        data: { accountId: account.id, role },
      });

      await this.createProfileFor(tx, account.id, role, profile);

      return account;
    });
  }

  /**
   * Assign an additional role to an existing account and create its profile — atomically.
   */
  async assignRole(accountId: string, role: Role, profileData?: ProfileData) {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({ where: { id: accountId } });
      if (!account) {
        throw new NotFoundException('Cuenta no encontrada');
      }

      await tx.accountRole.create({
        data: { accountId, role },
      });

      await this.createProfileFor(tx, accountId, role, profileData);
    });
  }

  /**
   * Revoke a role from an account and delete its profile — atomically.
   */
  async revokeRole(accountId: string, role: Role) {
    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.accountRole.findUnique({
        where: { accountId_role: { accountId, role } },
      });
      if (!assignment) {
        throw new NotFoundException('Rol no asignado a esta cuenta');
      }

      await tx.accountRole.delete({
        where: { accountId_role: { accountId, role } },
      });

      await this.deleteProfileFor(tx, accountId, role);
    });
  }

  /**
   * Find an account by email, including all roles and profiles.
   */
  async findByEmail(email: string) {
    return this.prisma.account.findUnique({
      where: { email },
      include: {
        roles: true,
        userProfile: true,
        ponenteProfile: true,
        adminProfile: true,
      },
    });
  }

  /**
   * Find an account by id, including all roles and profiles.
   */
  async findById(id: string) {
    return this.prisma.account.findUnique({
      where: { id },
      include: {
        roles: true,
        userProfile: true,
        ponenteProfile: true,
        adminProfile: true,
      },
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async createProfileFor(
    tx: Prisma.TransactionClient,
    accountId: string,
    role: Role,
    data?: ProfileData,
  ): Promise<void> {
    switch (role) {
      case Role.ASISTENTE: {
        const d = data as UserProfileData | undefined;
        await tx.userProfile.create({
          data: {
            accountId,
            apaterno: d?.apaterno ?? '',
            amaterno: d?.amaterno ?? '',
            nombres: d?.nombres ?? '',
            genero: (d?.genero as any) ?? 'OTRO',
            ocupacion: d?.ocupacion ?? '',
            gradoEstudios: (d?.gradoEstudios as any) ?? 'OTRO',
            escuela: d?.escuela,
            situacionLaboral: (d?.situacionLaboral as any) ?? 'OTRO',
            direccion: d?.direccion
              ? (d.direccion as unknown as Prisma.InputJsonValue)
              : undefined,
            redesSociales: d?.redesSociales
              ? typeof d.redesSociales === 'string'
                ? { raw: d.redesSociales }
                : (d.redesSociales as any)
              : undefined,
          },
        });
        break;
      }

      case Role.PONENTE: {
        const d = data as PonenteProfileData | undefined;
        await tx.ponenteProfile.create({
          data: {
            accountId,
            bio: d?.bio,
            especialidad: d?.especialidad,
            fotoUrl: d?.fotoUrl,
            redesSociales: d?.redesSociales ? (d.redesSociales as any) : undefined,
          },
        });
        break;
      }

      case Role.ADMIN: {
        const d = data as AdminProfileData | undefined;
        await tx.adminProfile.create({
          data: {
            accountId,
            nivel: (d?.nivel as any) ?? 'STANDARD',
          },
        });
        break;
      }

      default:
        throw new BadRequestException(`Rol desconocido: ${role as string}`);
    }
  }

  private async deleteProfileFor(
    tx: Prisma.TransactionClient,
    accountId: string,
    role: Role,
  ): Promise<void> {
    switch (role) {
      case Role.ASISTENTE:
        await tx.userProfile.delete({ where: { accountId } });
        break;

      case Role.PONENTE:
        await tx.ponenteProfile.delete({ where: { accountId } });
        break;

      case Role.ADMIN:
        await tx.adminProfile.delete({ where: { accountId } });
        break;

      default:
        throw new BadRequestException(`Rol desconocido: ${role as string}`);
    }
  }
}
