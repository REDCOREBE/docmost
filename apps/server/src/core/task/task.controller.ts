import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import { TaskService } from './task.service';
import { ListTasksDto } from './dto/list-tasks.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskIdDto } from './dto/task-id.dto';
import {
  CreateTaskViewDto,
  ListTaskViewsDto,
  TaskViewIdDto,
  UpdateTaskViewDto,
} from './dto/task-view.dto';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @HttpCode(HttpStatus.OK)
  @Post()
  async list(
    @Body() dto: ListTasksDto,
    @Body() pagination: PaginationOptions,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.taskService.list(user, workspace.id, dto, pagination);
  }

  @HttpCode(HttpStatus.OK)
  @Post('info')
  async info(
    @Body() dto: TaskIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.taskService.info(user, workspace.id, dto.taskId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('create')
  async create(
    @Body() dto: CreateTaskDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.taskService.create(user, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('update')
  async update(
    @Body() dto: UpdateTaskDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.taskService.update(user, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('delete')
  async delete(
    @Body() dto: TaskIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    await this.taskService.delete(user, workspace.id, dto.taskId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('views')
  async listViews(
    @Body() dto: ListTaskViewsDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.taskService.listViews(user, workspace.id, dto.spaceId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('views/create')
  async createView(
    @Body() dto: CreateTaskViewDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.taskService.createView(user, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('views/update')
  async updateView(
    @Body() dto: UpdateTaskViewDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.taskService.updateView(user, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('views/delete')
  async deleteView(
    @Body() dto: TaskViewIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    await this.taskService.deleteView(user, workspace.id, dto.viewId);
  }
}
