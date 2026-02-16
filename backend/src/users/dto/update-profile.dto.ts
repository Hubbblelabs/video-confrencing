import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class UpdateProfileDto {
    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @MinLength(8)
    @MaxLength(128)
    @IsOptional()
    password?: string;

    @IsString()
    @MinLength(1)
    @MaxLength(100)
    @IsOptional()
    displayName?: string;
}
