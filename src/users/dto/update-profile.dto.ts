import {
  IsString,
  IsOptional,
  IsObject,
} from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsOptional()
  apaterno?: string;

  @IsString()
  @IsOptional()
  amaterno?: string;

  @IsString()
  @IsOptional()
  genero?: string;

  @IsString()
  @IsOptional()
  ocupacion?: string;

  @IsString()
  @IsOptional()
  gradoEstudios?: string;

  @IsString()
  @IsOptional()
  situacionLaboral?: string;

  @IsString()
  @IsOptional()
  escuela?: string;

  @IsObject()
  @IsOptional()
  direccion?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  redesSociales?: Record<string, unknown>;
}