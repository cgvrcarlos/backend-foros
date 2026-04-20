import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Role } from '@prisma/client';

export enum Genero {
  MASCULINO = 'MASCULINO',
  FEMENINO = 'FEMENINO',
  OTRO = 'OTRO',
  NO_DICE = 'NO_DICE',
}

export enum GradoEstudios {
  PRIMARIA = 'PRIMARIA',
  SECUNDARIA = 'SECUNDARIA',
  PREPARATORIA = 'PREPARATORIA',
  LICENCIATURA = 'LICENCIATURA',
  POSGRADO = 'POSGRADO',
  OTRO = 'OTRO',
}

export enum SituacionLaboral {
  ESTUDIANTE = 'ESTUDIANTE',
  EMPLEADO = 'EMPLEADO',
  AUTOEMPLEADO = 'AUTOEMPLEADO',
  DESEMPLEADO = 'DESEMPLEADO',
  OTRO = 'OTRO',
}

export enum AdminLevel {
  STANDARD = 'STANDARD',
  SUPER = 'SUPER',
}

/**
 * Flat DTO covering all fields for any account + role combination.
 * The service splits these fields by role internally.
 *
 * Account fields: email, password, nombre, telefono
 * UserProfile fields: apaterno, amaterno, nombres, genero, ocupacion,
 *   gradoEstudios, escuela?, situacionLaboral, calle, colonia, cp, municipio, redesSociales?
 * PonenteProfile fields: bio?, especialidad?, fotoUrl?
 * AdminProfile fields: nivel?
 */
export class CreateAccountDto {
  // ─── Account fields ────────────────────────────────────────────────────────

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 150)
  nombre: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{10}$/, { message: 'Teléfono debe tener exactamente 10 dígitos' })
  telefono?: string;

  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;

  // ─── UserProfile fields (required for ASISTENTE) ───────────────────────────

  @ValidateIf((o) => o.role === Role.ASISTENTE)
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  apaterno?: string;

  @ValidateIf((o) => o.role === Role.ASISTENTE)
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  amaterno?: string;

  @ValidateIf((o) => o.role === Role.ASISTENTE)
  @IsString()
  @IsNotEmpty()
  @Length(2, 150)
  nombres?: string;

  @ValidateIf((o) => o.role === Role.ASISTENTE)
  @IsEnum(Genero)
  genero?: Genero;

  @ValidateIf((o) => o.role === Role.ASISTENTE)
  @IsString()
  @IsNotEmpty()
  ocupacion?: string;

  @ValidateIf((o) => o.role === Role.ASISTENTE)
  @IsEnum(GradoEstudios)
  gradoEstudios?: GradoEstudios;

  @IsString()
  @IsOptional()
  escuela?: string;

  @ValidateIf((o) => o.role === Role.ASISTENTE)
  @IsEnum(SituacionLaboral)
  situacionLaboral?: SituacionLaboral;

  // Dirección fields (part of UserProfile.direccion Json)
  @ValidateIf((o) => o.role === Role.ASISTENTE)
  @IsString()
  @IsNotEmpty()
  calle?: string;

  @ValidateIf((o) => o.role === Role.ASISTENTE)
  @IsString()
  @IsNotEmpty()
  colonia?: string;

  @ValidateIf((o) => o.role === Role.ASISTENTE)
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{5}$/, { message: 'Código postal debe tener exactamente 5 dígitos' })
  cp?: string;

  @ValidateIf((o) => o.role === Role.ASISTENTE)
  @IsString()
  @IsNotEmpty()
  municipio?: string;

  @IsString()
  @IsOptional()
  redesSociales?: string;

  // ─── PonenteProfile fields (optional — for PONENTE role) ──────────────────

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  especialidad?: string;

  @IsString()
  @IsOptional()
  fotoUrl?: string;

  // ─── AdminProfile fields (optional — for ADMIN role) ──────────────────────

  @IsEnum(AdminLevel)
  @IsOptional()
  nivel?: AdminLevel;
}
