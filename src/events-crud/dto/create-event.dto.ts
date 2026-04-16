import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsDateString()
  @IsNotEmpty()
  fechaHora: string;

  @IsString()
  @IsOptional()
  linkVirtual?: string;

  @IsString()
  @IsOptional()
  ubicacionPresencial?: string;
}
