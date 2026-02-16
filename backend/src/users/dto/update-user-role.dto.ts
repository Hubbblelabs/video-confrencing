import { IsEnum } from 'class-validator';
import { UserRole } from '../../shared/enums';

export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;
}
