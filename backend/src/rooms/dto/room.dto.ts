import { IsString, IsOptional, IsInt, Min, Max, MaxLength } from 'class-validator';

export class CreateRoomDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(500)
  maxParticipants?: number;

  @IsOptional()
  allowScreenShare?: boolean;

  @IsOptional()
  allowWhiteboard?: boolean;
}

export class ScheduleMeetingDto extends CreateRoomDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsString()
  scheduledStart!: string;

  @IsString()
  scheduledEnd!: string;
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
