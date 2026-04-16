import { IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdateEventDto {
  @IsString()
  @IsOptional()
  titulo?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsDateString()
  @IsOptional()
  fechaHora?: string;

  @IsString()
  @IsOptional()
  linkVirtual?: string;

  @IsString()
  @IsOptional()
  ubicacionPresencial?: string;
}
