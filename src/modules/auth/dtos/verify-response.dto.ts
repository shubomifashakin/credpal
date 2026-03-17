import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyResponseDto {
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
