import {
  IsArray,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export const TASK_PROPERTY_TYPES = [
  'text',
  'long_text',
  'number',
  'select',
  'multi_select',
  'date',
  'person',
  'page',
] as const;

export type TaskPropertyType = (typeof TASK_PROPERTY_TYPES)[number];

export class TaskPropertyOptionInputDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  color?: string | null;

  @IsOptional()
  @IsString()
  position?: string;
}

export class ListTaskPropertiesDto {
  @IsUUID()
  spaceId: string;
}

export class CreateTaskPropertyDto {
  @IsUUID()
  spaceId: string;

  @IsString()
  @MaxLength(120)
  name: string;

  @IsIn(TASK_PROPERTY_TYPES)
  type: TaskPropertyType;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskPropertyOptionInputDto)
  options?: TaskPropertyOptionInputDto[];

  @IsOptional()
  @IsString()
  position?: string;
}

export class UpdateTaskPropertyDto {
  @IsUUID()
  propertyId: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskPropertyOptionInputDto)
  options?: TaskPropertyOptionInputDto[];
}

export class TaskPropertyIdDto {
  @IsUUID()
  propertyId: string;
}

export class SetTaskPropertyValueDto {
  @IsUUID()
  taskId: string;

  @IsUUID()
  propertyId: string;

  @IsOptional()
  @IsString()
  valueText?: string | null;

  @IsOptional()
  @IsNumber()
  valueNumber?: number | null;

  @IsOptional()
  @IsString()
  valueTimestamptz?: string | null;

  @IsOptional()
  valueJson?: unknown | null;
}
