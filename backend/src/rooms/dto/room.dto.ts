import { IsString, IsOptional, IsInt, Min, Max, MaxLength } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(500)
  maxParticipants?: number;
}

export class JoinRoomDto {
  @IsString()
  roomId!: string;
}

export class KickUserDto {
  @IsString()
  roomId!: string;

  @IsString()
  targetUserId!: string;
}

export class ChangeRoleDto {
  @IsString()
  roomId!: string;

  @IsString()
  targetUserId!: string;

  @IsString()
  newRole!: 'co_host' | 'participant';
}
