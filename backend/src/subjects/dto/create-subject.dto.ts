import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateSubjectDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name!: string;

    @IsString()
    @IsOptional()
    @MaxLength(2000)
    description?: string;

    @IsString()
    @IsOptional()
    @MaxLength(50)
    icon?: string;

    @IsString()
    @IsOptional()
    @MaxLength(20)
    color?: string;
}
