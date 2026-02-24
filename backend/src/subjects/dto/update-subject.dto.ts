import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class UpdateSubjectDto {
    @IsString()
    @IsOptional()
    @MaxLength(100)
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    @MaxLength(50)
    icon?: string;

    @IsString()
    @IsOptional()
    @MaxLength(20)
    color?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
