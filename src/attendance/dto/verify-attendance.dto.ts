import { IsString, IsNotEmpty, IsBoolean } from 'class-validator';

export class VerifyAttendanceDto {
  @IsString()
  @IsNotEmpty()
  qrCode: string;

  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsBoolean()
  attended: boolean;
}
