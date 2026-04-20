import { IsString, IsOptional, IsNumber, Matches } from 'class-validator';

export class UpdatePonenciaDto {
  @IsString()
  @IsOptional()
  titulo?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsOptional()
  lugar?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'horaInicio debe tener formato HH:MM' })
  horaInicio?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'horaFin debe tener formato HH:MM' })
  horaFin?: string;

  @IsNumber()
  @IsOptional()
  orden?: number;
}
