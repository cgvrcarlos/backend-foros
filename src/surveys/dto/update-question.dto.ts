import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { QuestionType, Seccion } from '@prisma/client';

export class UpdateQuestionDto {
  @IsEnum(QuestionType)
  @IsOptional()
  tipo?: QuestionType;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  texto?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  opciones?: string[];

  @IsNumber()
  @IsOptional()
  escalaMin?: number;

  @IsNumber()
  @IsOptional()
  escalaMax?: number;

  @IsBoolean()
  @IsOptional()
  esRequerida?: boolean;

  @IsEnum(Seccion)
  @IsOptional()
  seccion?: Seccion;

  @IsNumber()
  @IsOptional()
  orden?: number;
}
