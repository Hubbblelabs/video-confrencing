import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class GrantStudentAccessDto {
    @IsString()
    @IsNotEmpty()
    @IsUUID()
    studentId!: string;
}
