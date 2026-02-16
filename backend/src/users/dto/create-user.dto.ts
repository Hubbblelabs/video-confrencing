import { IsEmail, IsString, MinLength, MaxLength, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { UserRole } from '../../shared/enums';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
