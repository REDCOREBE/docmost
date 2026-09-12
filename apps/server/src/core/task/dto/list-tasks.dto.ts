import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class ListTasksDto {
  @IsOptional()
  @IsUUID()
  spaceId?: string;

  @IsOptional()
  @IsString()
  assignee?: string;

  @IsOptional()
  @IsIn(['todo', 'in_progress', 'done'])
  status?: 'todo' | 'in_progress' | 'done';

  @IsOptional()
  @IsIn(['none', 'low', 'medium', 'high', 'urgent'])
  priority?: 'none' | 'low' | 'medium' | 'high' | 'urgent';

  @IsOptional()
  @IsIn(['overdue', 'today', 'upcoming'])
  due?: 'overdue' | 'today' | 'upcoming';
}
