import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsArray,
  IsOptional,
  ValidateNested,
  Allow,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoAsistencia } from '@prisma/client';

export class AnswerItemDto {
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @Allow()
  answer: string | string[] | number;
}

export class ConfirmAttendanceDto {
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsEnum(TipoAsistencia)
  tipoAsistencia: TipoAsistencia;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AnswerItemDto)
  answers?: AnswerItemDto[];
}
