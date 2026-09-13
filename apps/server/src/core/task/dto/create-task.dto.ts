import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTaskDto {
  @IsUUID()
  spaceId: string;

  /** Empty string = untitled task (Base-parity). Omitted → treated as "". */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @IsOptional()
  @IsIn(['todo', 'in_progress', 'done'])
  status?: 'todo' | 'in_progress' | 'done';

  @IsOptional()
  @IsIn(['none', 'low', 'medium', 'high', 'urgent'])
  priority?: 'none' | 'low' | 'medium' | 'high' | 'urgent';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  assigneeIds?: string[];

  @IsOptional()
  @IsUUID()
  linkedPageId?: string | null;
}
