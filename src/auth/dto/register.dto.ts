import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

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

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  apaterno: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  amaterno: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 150)
  nombres: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10}$/, { message: 'Teléfono debe tener exactamente 10 dígitos' })
  telefono: string;

  @IsString()
  @IsOptional()
  redesSociales?: string;

  @IsString()
  @IsNotEmpty()
  calle: string;

  @IsString()
  @IsNotEmpty()
  colonia: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{5}$/, { message: 'Código postal debe tener exactamente 5 dígitos' })
  cp: string;

  @IsString()
  @IsNotEmpty()
  municipio: string;

  @IsEnum(Genero)
  genero: Genero;

  @IsString()
  @IsNotEmpty()
  ocupacion: string;

  @IsEnum(GradoEstudios)
  gradoEstudios: GradoEstudios;

  @IsString()
  @IsOptional()
  escuela?: string;

  @IsEnum(SituacionLaboral)
  situacionLaboral: SituacionLaboral;
}
