import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class ListTaskViewsDto {
  @IsOptional()
  @IsUUID()
  spaceId?: string;
}

export class CreateTaskViewDto {
  @IsOptional()
  @IsUUID()
  spaceId?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @IsIn(['table', 'kanban'])
  type: 'table' | 'kanban';

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  position?: string;

  /**
   * Shared Space view when true (owner_user_id null; admin only).
   * Personal view when false/omitted (owner = current user).
   * Shared global (spaceId null + shared) is forbidden in V1.
   */
  @IsOptional()
  shared?: boolean;
}

export class UpdateTaskViewDto {
  @IsUUID()
  viewId: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsIn(['table', 'kanban'])
  type?: 'table' | 'kanban';

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  position?: string;
}

export class TaskViewIdDto {
  @IsUUID()
  viewId: string;
}
