import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsStrongPassword,
  Length,
} from 'class-validator';

import { UserRole } from '../../../core/database/entities/users.entity';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    maxLength: 100,
    minLength: 3,
  })
  @IsString()
  @Length(3, 100)
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    maxLength: 100,
    minLength: 3,
  })
  @IsString()
  @Length(3, 100)
  lastName: string;

  @ApiProperty({
    description:
      'User password (minimum 8 characters, with uppercase, lowercase, number, and special character)',
    example: 'Password123!',
  })
  @IsStrongPassword({
    minSymbols: 0,
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
  })
  password: string;

  @ApiProperty({
    description: 'User role (optional, defaults to USER)',
    example: UserRole.USER,
    enum: UserRole,
    default: UserRole.USER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
