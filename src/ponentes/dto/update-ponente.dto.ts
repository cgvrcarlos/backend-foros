import { IsEmail, IsString, IsOptional } from 'class-validator';

export class UpdatePonenteDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  bio?: string;
}
