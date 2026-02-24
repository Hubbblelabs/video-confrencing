import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class AssignTeacherDto {
    @IsString()
    @IsNotEmpty()
    @IsUUID()
    teacherId!: string;
}
