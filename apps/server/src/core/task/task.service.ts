import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TaskItemRepo } from '@docmost/db/repos/task/task-item.repo';
import { TaskAssigneeRepo } from '@docmost/db/repos/task/task-assignee.repo';
import { TaskViewRepo } from '@docmost/db/repos/task/task-view.repo';
import { SpaceMemberRepo } from '@docmost/db/repos/space/space-member.repo';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import { PagePermissionRepo } from '@docmost/db/repos/page/page-permission.repo';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import { User } from '@docmost/db/types/entity.types';
import { executeTx } from '@docmost/db/utils';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import SpaceAbilityFactory from '../casl/abilities/space-ability.factory';
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from '../casl/interfaces/space-ability.type';
import { ListTasksDto } from './dto/list-tasks.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  CreateTaskViewDto,
  UpdateTaskViewDto,
} from './dto/task-view.dto';
import { generateJitteredKeyBetween } from 'fractional-indexing-jittered';

@Injectable()
export class TaskService {
  constructor(
    private readonly taskItemRepo: TaskItemRepo,
    private readonly taskAssigneeRepo: TaskAssigneeRepo,
    private readonly taskViewRepo: TaskViewRepo,
    private readonly spaceMemberRepo: SpaceMemberRepo,
    private readonly pageRepo: PageRepo,
    private readonly pagePermissionRepo: PagePermissionRepo,
    private readonly spaceAbility: SpaceAbilityFactory,
    @InjectKysely() private readonly db: KyselyDB,
  ) {}

  async list(
    user: User,
    workspaceId: string,
    dto: ListTasksDto,
    pagination: PaginationOptions,
  ) {
    if (dto.spaceId) {
      const ability = await this.spaceAbility.createForUser(user, dto.spaceId);
      if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
        throw new ForbiddenException();
      }
    }

    const result = await this.taskItemRepo.findPaginated(
      user.id,
      workspaceId,
      pagination,
      {
        spaceId: dto.spaceId,
        assignee: dto.assignee,
        status: dto.status,
        priority: dto.priority,
        due: dto.due,
        query: pagination.query,
      },
    );

    result.items = await this.hydrateLinkedPages(
      result.items,
      user.id,
      workspaceId,
    );

    return result;
  }

  async info(user: User, workspaceId: string, taskId: string) {
    const task = await this.taskItemRepo.findByIdWithDetails(
      taskId,
      workspaceId,
    );
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const ability = await this.spaceAbility.createForUser(user, task.spaceId);
    if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    const [hydrated] = await this.hydrateLinkedPages(
      [task],
      user.id,
      workspaceId,
    );
    return hydrated;
  }

  async create(user: User, workspaceId: string, dto: CreateTaskDto) {
    const ability = await this.spaceAbility.createForUser(user, dto.spaceId);
    if (ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    this.assertProgress(dto.progress);
    const assigneeIds = dto.assigneeIds ?? [];
    await this.assertAssigneesInSpace(assigneeIds, dto.spaceId);
    await this.assertLinkedPageWritable(dto.linkedPageId, dto.spaceId, workspaceId);

    const status = dto.status ?? 'todo';
    const task = await executeTx(this.db, async (trx) => {
      const created = await this.taskItemRepo.insert(
        {
          workspaceId,
          spaceId: dto.spaceId,
          title: dto.title.trim(),
          description: dto.description ?? null,
          status,
          priority: dto.priority ?? 'none',
          progress: dto.progress ?? 0,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          createdById: user.id,
          completedAt: status === 'done' ? new Date() : null,
          linkedPageId: dto.linkedPageId ?? null,
        },
        trx,
      );

      if (assigneeIds.length > 0) {
        await this.taskAssigneeRepo.replaceAssignees(
          created.id,
          assigneeIds,
          trx,
        );
      }

      return created;
    });

    return this.info(user, workspaceId, task.id);
  }

  async update(user: User, workspaceId: string, dto: UpdateTaskDto) {
    const existing = await this.taskItemRepo.findById(dto.taskId, workspaceId);
    if (!existing) {
      throw new NotFoundException('Task not found');
    }

    const ability = await this.spaceAbility.createForUser(
      user,
      existing.spaceId,
    );
    if (ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    this.assertProgress(dto.progress);

    if (dto.assigneeIds) {
      await this.assertAssigneesInSpace(dto.assigneeIds, existing.spaceId);
    }

    if (dto.linkedPageId !== undefined) {
      await this.assertLinkedPageWritable(
        dto.linkedPageId,
        existing.spaceId,
        workspaceId,
      );
    }

    let completedAt = existing.completedAt;
    if (dto.status !== undefined) {
      if (dto.status === 'done' && existing.status !== 'done') {
        completedAt = new Date();
      } else if (dto.status !== 'done') {
        completedAt = null;
      }
    }

    await executeTx(this.db, async (trx) => {
      const patch: Record<string, unknown> = { completedAt };
      if (dto.title !== undefined) patch.title = dto.title.trim();
      if (dto.description !== undefined) patch.description = dto.description;
      if (dto.status !== undefined) patch.status = dto.status;
      if (dto.priority !== undefined) patch.priority = dto.priority;
      if (dto.progress !== undefined) patch.progress = dto.progress;
      if (dto.dueDate !== undefined) {
        patch.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
      }
      if (dto.linkedPageId !== undefined) {
        patch.linkedPageId = dto.linkedPageId;
      }

      await this.taskItemRepo.update(dto.taskId, workspaceId, patch as any, trx);

      if (dto.assigneeIds) {
        await this.taskAssigneeRepo.replaceAssignees(
          dto.taskId,
          dto.assigneeIds,
          trx,
        );
      }
    });

    return this.info(user, workspaceId, dto.taskId);
  }

  async delete(user: User, workspaceId: string, taskId: string) {
    const existing = await this.taskItemRepo.findById(taskId, workspaceId);
    if (!existing) {
      throw new NotFoundException('Task not found');
    }

    const ability = await this.spaceAbility.createForUser(
      user,
      existing.spaceId,
    );
    if (ability.cannot(SpaceCaslAction.Manage, SpaceCaslSubject.Settings)) {
      throw new ForbiddenException();
    }

    await this.taskItemRepo.delete(taskId, workspaceId);
  }

  async listViews(
    user: User,
    workspaceId: string,
    spaceId?: string,
  ) {
    if (spaceId) {
      const ability = await this.spaceAbility.createForUser(user, spaceId);
      if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
        throw new ForbiddenException();
      }
    }

    return this.taskViewRepo.list(workspaceId, {
      spaceId: spaceId ?? null,
      userId: user.id,
    });
  }

  async createView(user: User, workspaceId: string, dto: CreateTaskViewDto) {
    const shared = dto.shared === true;

    if (shared && !dto.spaceId) {
      throw new BadRequestException(
        'Shared workspace-global views are not supported in V1',
      );
    }

    if (dto.spaceId) {
      const ability = await this.spaceAbility.createForUser(user, dto.spaceId);
      if (shared) {
        if (ability.cannot(SpaceCaslAction.Manage, SpaceCaslSubject.Settings)) {
          throw new ForbiddenException();
        }
      } else if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
        throw new ForbiddenException();
      }
    }

    const position =
      dto.position ?? generateJitteredKeyBetween(null, null);

    return this.taskViewRepo.insert({
      workspaceId,
      spaceId: dto.spaceId ?? null,
      ownerUserId: shared ? null : user.id,
      name: dto.name.trim(),
      type: dto.type,
      config: (dto.config ?? {}) as any,
      position,
    });
  }

  async updateView(user: User, workspaceId: string, dto: UpdateTaskViewDto) {
    const view = await this.taskViewRepo.findById(dto.viewId, workspaceId);
    if (!view) {
      throw new NotFoundException('View not found');
    }

    await this.assertCanMutateView(user, view);

    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) patch.name = dto.name.trim();
    if (dto.type !== undefined) patch.type = dto.type;
    if (dto.config !== undefined) patch.config = dto.config;
    if (dto.position !== undefined) patch.position = dto.position;

    return this.taskViewRepo.update(dto.viewId, workspaceId, patch as any);
  }

  async deleteView(user: User, workspaceId: string, viewId: string) {
    const view = await this.taskViewRepo.findById(viewId, workspaceId);
    if (!view) {
      throw new NotFoundException('View not found');
    }

    await this.assertCanMutateView(user, view);
    await this.taskViewRepo.delete(viewId, workspaceId);
  }

  private async assertCanMutateView(user: User, view: any) {
    if (view.spaceId == null && view.ownerUserId == null) {
      throw new BadRequestException(
        'Shared workspace-global views are not supported in V1',
      );
    }

    if (view.ownerUserId) {
      if (view.ownerUserId !== user.id) {
        throw new ForbiddenException();
      }
      if (view.spaceId) {
        const ability = await this.spaceAbility.createForUser(
          user,
          view.spaceId,
        );
        if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
          throw new ForbiddenException();
        }
      }
      return;
    }

    // Shared space view
    const ability = await this.spaceAbility.createForUser(user, view.spaceId);
    if (ability.cannot(SpaceCaslAction.Manage, SpaceCaslSubject.Settings)) {
      throw new ForbiddenException();
    }
  }

  private assertProgress(progress?: number) {
    if (progress === undefined) return;
    if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
      throw new BadRequestException('progress must be an integer between 0 and 100');
    }
  }

  private async assertAssigneesInSpace(userIds: string[], spaceId: string) {
    if (userIds.length === 0) return;
    const allowed = await this.spaceMemberRepo.getUserIdsWithSpaceAccess(
      userIds,
      spaceId,
    );
    for (const id of userIds) {
      if (!allowed.has(id)) {
        throw new BadRequestException(
          'All assignees must be members of the Space',
        );
      }
    }
  }

  private async assertLinkedPageWritable(
    linkedPageId: string | null | undefined,
    spaceId: string,
    workspaceId: string,
  ) {
    if (!linkedPageId) return;
    const pages = await this.pageRepo.findManyByIds([linkedPageId], {
      workspaceId,
    });
    const page = pages[0];
    if (!page || page.spaceId !== spaceId) {
      throw new BadRequestException(
        'linkedPageId must reference a page in the same Space',
      );
    }
  }

  async hydrateLinkedPages<T extends { linkedPageId?: string | null }>(
    items: T[],
    userId: string,
    workspaceId: string,
  ): Promise<Array<T & { linkedPage: any | null }>> {
    const pageIds = [
      ...new Set(
        items
          .map((i) => i.linkedPageId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    if (pageIds.length === 0) {
      return items.map((item) => ({ ...item, linkedPage: null }));
    }

    const pages = await this.pageRepo.findManyByIds(pageIds, { workspaceId });
    const userSpaceIds = new Set(
      await this.spaceMemberRepo.getUserSpaceIds(userId),
    );

    const candidatePages = pages.filter((p) => userSpaceIds.has(p.spaceId));
    const accessibleIds = await this.pagePermissionRepo.filterAccessiblePageIds(
      {
        pageIds: candidatePages.map((p) => p.id),
        userId,
      },
    );
    const accessibleSet = new Set(accessibleIds);

    const spaceIds = [...new Set(candidatePages.map((p) => p.spaceId))];
    const spaces =
      spaceIds.length === 0
        ? []
        : await this.db
            .selectFrom('spaces')
            .select(['id', 'slug'])
            .where('id', 'in', spaceIds)
            .execute();
    const slugBySpace = new Map(spaces.map((s) => [s.id, s.slug]));

    const linkedById = new Map<string, any>();
    for (const page of candidatePages) {
      if (!accessibleSet.has(page.id)) continue;
      linkedById.set(page.id, {
        id: page.id,
        title: page.title,
        slugId: page.slugId,
        spaceSlug: slugBySpace.get(page.spaceId) ?? null,
      });
    }

    return items.map((item) => ({
      ...item,
      linkedPage: item.linkedPageId
        ? (linkedById.get(item.linkedPageId) ?? null)
        : null,
    }));
  }
}
