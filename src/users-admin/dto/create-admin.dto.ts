import { IsEmail, IsString, MinLength, IsOptional, IsIn } from 'class-validator';

export class CreateAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(12)
  password: string;

  @IsString()
  nombre: string;

  @IsOptional()
  @IsIn(['ADMIN', 'PONENTE'])
  role?: 'ADMIN' | 'PONENTE';
}
