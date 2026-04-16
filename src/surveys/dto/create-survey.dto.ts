import { IsString, IsOptional } from 'class-validator';

export class CreateSurveyDto {
  @IsString()
  @IsOptional()
  titulo?: string;
}
