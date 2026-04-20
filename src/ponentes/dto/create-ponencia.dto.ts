import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Matches,
} from 'class-validator';

export class CreatePonenciaDto {
  @IsString()
  @IsNotEmpty()
  ponenteId: string;

  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsNotEmpty()
  lugar: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'horaInicio debe tener formato HH:MM' })
  horaInicio: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'horaFin debe tener formato HH:MM' })
  horaFin: string;

  @IsNumber()
  @IsOptional()
  orden?: number = 0;
}
