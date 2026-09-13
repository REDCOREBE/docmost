import { IsIn, IsOptional } from 'class-validator';

export class CountTasksDto {
  /** mine-open = assignee=me AND status!=done (ACL-scoped). */
  @IsOptional()
  @IsIn(['mine-open'])
  scope?: 'mine-open';
}
