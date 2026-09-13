import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TaskItemRepo } from '@docmost/db/repos/task/task-item.repo';
import { TaskAssigneeRepo } from '@docmost/db/repos/task/task-assignee.repo';
import { TaskViewRepo } from '@docmost/db/repos/task/task-view.repo';
import { TaskPropertyRepo } from '@docmost/db/repos/task/task-property.repo';
import { TaskPropertyOptionRepo } from '@docmost/db/repos/task/task-property-option.repo';
import { TaskPropertyValueRepo } from '@docmost/db/repos/task/task-property-value.repo';
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
import {
  CreateTaskPropertyDto,
  SetTaskPropertyValueDto,
  UpdateTaskPropertyDto,
} from './dto/task-property.dto';
import { generateJitteredKeyBetween } from 'fractional-indexing-jittered';
import { mergeViewConfig } from './utils/merge-view-config';
import {
  TASK_VIEW_SYSTEM_KEY,
  buildAllFilterConfig,
  buildMineFilterConfig,
  buildOverdueFilterConfig,
  buildSpaceAllKanbanConfig,
} from './utils/task-view-seeds';

@Injectable()
export class TaskService {
  constructor(
    private readonly taskItemRepo: TaskItemRepo,
    private readonly taskAssigneeRepo: TaskAssigneeRepo,
    private readonly taskViewRepo: TaskViewRepo,
    private readonly taskPropertyRepo: TaskPropertyRepo,
    private readonly taskPropertyOptionRepo: TaskPropertyOptionRepo,
    private readonly taskPropertyValueRepo: TaskPropertyValueRepo,
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
    const propertyValues = await this.taskPropertyValueRepo.listByTask(
      taskId,
    );
    return { ...hydrated, propertyValues };
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
          title: (dto.title ?? '').trim(),
          description: dto.description ?? null,
          status,
          priority: dto.priority ?? 'none',
          progress: dto.progress ?? 0,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
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
      if (dto.startDate !== undefined) {
        patch.startDate = dto.startDate ? new Date(dto.startDate) : null;
      }
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

    const scope = { spaceId: spaceId ?? null, userId: user.id };
    let views = await this.taskViewRepo.list(workspaceId, scope);
    views = await this.ensureDefaultViews(user, workspaceId, spaceId ?? null, views);
    return views;
  }

  /**
   * Lazy idempotent seeds. Only when the scoped list is empty.
   * Space → shared "Tout". Global → personal Tout / Mes tâches / En retard.
   *
   * Concurrency: pg_advisory_xact_lock inside a transaction so parallel
   * empty-scope listViews cannot double-insert.
   */
  private async ensureDefaultViews(
    user: User,
    workspaceId: string,
    spaceId: string | null,
    existing: Awaited<ReturnType<TaskViewRepo['list']>>,
  ) {
    if (existing.length > 0) {
      return existing;
    }

    const scope = { spaceId, userId: user.id };

    return executeTx(this.db, async (trx) => {
      await this.taskViewRepo.acquireSeedLock(workspaceId, scope, trx);

      const locked = await this.taskViewRepo.list(workspaceId, scope, trx);
      if (locked.length > 0) {
        return locked;
      }

      if (spaceId) {
        await this.taskViewRepo.insert(
          {
            workspaceId,
            spaceId,
            ownerUserId: null,
            name: 'Tout',
            type: 'kanban',
            config: buildSpaceAllKanbanConfig() as any,
            position: 'a0',
          },
          trx,
        );
      } else {
        const seeds: Array<{
          name: string;
          position: string;
          config: Record<string, unknown>;
        }> = [
          {
            name: 'Tout',
            position: 'a0',
            config: buildAllFilterConfig(TASK_VIEW_SYSTEM_KEY.globalAll),
          },
          {
            name: 'Mes tâches',
            position: 'a1',
            config: buildMineFilterConfig(user.id),
          },
          {
            name: 'En retard',
            position: 'a2',
            config: buildOverdueFilterConfig(),
          },
        ];
        for (const seed of seeds) {
          await this.taskViewRepo.insert(
            {
              workspaceId,
              spaceId: null,
              ownerUserId: user.id,
              name: seed.name,
              type: 'table',
              config: seed.config as any,
              position: seed.position,
            },
            trx,
          );
        }
      }

      return this.taskViewRepo.list(workspaceId, scope, trx);
    });
  }

  async countMineOpen(user: User, workspaceId: string) {
    const count = await this.taskItemRepo.countMineOpen(user.id, workspaceId);
    return { count, scope: 'mine-open' as const };
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
    if (dto.config !== undefined) {
      // Shallow per-key merge — never replace the whole config blob with a partial patch.
      patch.config = mergeViewConfig(
        (view.config ?? {}) as Record<string, unknown>,
        dto.config as Record<string, unknown>,
      );
    }
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

  async listProperties(user: User, workspaceId: string, spaceId: string) {
    const ability = await this.spaceAbility.createForUser(user, spaceId);
    if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }
    return this.taskPropertyRepo.listBySpace(workspaceId, spaceId);
  }

  async createProperty(
    user: User,
    workspaceId: string,
    dto: CreateTaskPropertyDto,
  ) {
    const ability = await this.spaceAbility.createForUser(user, dto.spaceId);
    if (ability.cannot(SpaceCaslAction.Manage, SpaceCaslSubject.Settings)) {
      throw new ForbiddenException();
    }

    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('name is required');
    }

    const position =
      dto.position ?? generateJitteredKeyBetween(null, null);

    try {
      const property = await executeTx(this.db, async (trx) => {
        const created = await this.taskPropertyRepo.insert(
          {
            workspaceId,
            spaceId: dto.spaceId,
            name,
            type: dto.type,
            config: (dto.config ?? {}) as any,
            position,
          },
          trx,
        );

        if (
          (dto.type === 'select' || dto.type === 'multi_select') &&
          dto.options?.length
        ) {
          let prev: string | null = null;
          const rows = dto.options.map((opt) => {
            const pos =
              opt.position ?? generateJitteredKeyBetween(prev, null);
            prev = pos;
            return {
              propertyId: created.id,
              name: opt.name.trim(),
              color: opt.color ?? null,
              position: pos,
            };
          });
          await this.taskPropertyOptionRepo.insertMany(rows, trx);
        }

        return created;
      });

      const list = await this.taskPropertyRepo.listBySpace(
        workspaceId,
        dto.spaceId,
      );
      return list.find((p) => p.id === property.id) ?? property;
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new BadRequestException(
          'A property with this name already exists in the Space',
        );
      }
      throw err;
    }
  }

  async updateProperty(
    user: User,
    workspaceId: string,
    dto: UpdateTaskPropertyDto,
  ) {
    const existing = await this.taskPropertyRepo.findById(
      dto.propertyId,
      workspaceId,
    );
    if (!existing) {
      throw new NotFoundException('Property not found');
    }

    const ability = await this.spaceAbility.createForUser(
      user,
      existing.spaceId,
    );
    if (ability.cannot(SpaceCaslAction.Manage, SpaceCaslSubject.Settings)) {
      throw new ForbiddenException();
    }

    try {
      await executeTx(this.db, async (trx) => {
        const patch: Record<string, unknown> = {};
        if (dto.name !== undefined) patch.name = dto.name.trim();
        if (dto.config !== undefined) patch.config = dto.config;
        if (dto.position !== undefined) patch.position = dto.position;
        if (Object.keys(patch).length > 0) {
          await this.taskPropertyRepo.update(
            dto.propertyId,
            workspaceId,
            patch as any,
            trx,
          );
        }

        if (dto.options) {
          await this.taskPropertyOptionRepo.deleteByProperty(
            dto.propertyId,
            trx,
          );
          let prev: string | null = null;
          const rows = dto.options.map((opt) => {
            const pos =
              opt.position ?? generateJitteredKeyBetween(prev, null);
            prev = pos;
            return {
              propertyId: dto.propertyId,
              name: opt.name.trim(),
              color: opt.color ?? null,
              position: pos,
            };
          });
          await this.taskPropertyOptionRepo.insertMany(rows, trx);
        }
      });
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new BadRequestException(
          'A property with this name already exists in the Space',
        );
      }
      throw err;
    }

    const list = await this.taskPropertyRepo.listBySpace(
      workspaceId,
      existing.spaceId,
    );
    return list.find((p) => p.id === dto.propertyId);
  }

  async deleteProperty(
    user: User,
    workspaceId: string,
    propertyId: string,
  ) {
    const existing = await this.taskPropertyRepo.findById(
      propertyId,
      workspaceId,
    );
    if (!existing) {
      throw new NotFoundException('Property not found');
    }

    const ability = await this.spaceAbility.createForUser(
      user,
      existing.spaceId,
    );
    if (ability.cannot(SpaceCaslAction.Manage, SpaceCaslSubject.Settings)) {
      throw new ForbiddenException();
    }

    await this.taskPropertyRepo.delete(propertyId, workspaceId);
  }

  async setPropertyValue(
    user: User,
    workspaceId: string,
    dto: SetTaskPropertyValueDto,
  ) {
    const task = await this.taskItemRepo.findById(dto.taskId, workspaceId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const ability = await this.spaceAbility.createForUser(user, task.spaceId);
    if (ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    const property = await this.taskPropertyRepo.findById(
      dto.propertyId,
      workspaceId,
    );
    if (!property || property.spaceId !== task.spaceId) {
      throw new BadRequestException(
        'Property must belong to the same Space as the task',
      );
    }

    await this.assertPropertyValue(property.type, dto, task.spaceId, workspaceId, user.id);

    const clear = {
      valueText: null as string | null,
      valueNumber: null as number | null,
      valueTimestamptz: null as Date | null,
      valueJson: null as any,
    };

    let row: any = { ...clear, taskId: dto.taskId, propertyId: dto.propertyId };

    switch (property.type) {
      case 'text':
      case 'long_text':
        row.valueText = dto.valueText ?? null;
        break;
      case 'number':
        row.valueNumber =
          dto.valueNumber === undefined || dto.valueNumber === null
            ? null
            : dto.valueNumber;
        break;
      case 'date':
        row.valueTimestamptz = dto.valueTimestamptz
          ? new Date(dto.valueTimestamptz)
          : null;
        break;
      case 'select':
        row.valueText = dto.valueText ?? null;
        if (row.valueText) {
          const options = await this.taskPropertyOptionRepo.listByProperty(
            property.id,
          );
          if (!options.some((o) => o.id === row.valueText)) {
            throw new BadRequestException('Invalid select option');
          }
        }
        break;
      case 'multi_select': {
        if (dto.valueJson == null) {
          row.valueJson = null;
          break;
        }
        if (!Array.isArray(dto.valueJson)) {
          throw new BadRequestException(
            'multi_select value must be an array of option ids',
          );
        }
        const optionIds = dto.valueJson as string[];
        if (optionIds.length === 0) {
          row.valueJson = null;
          break;
        }
        const options = await this.taskPropertyOptionRepo.listByProperty(
          property.id,
        );
        const allowed = new Set(options.map((o) => o.id));
        for (const id of optionIds) {
          if (typeof id !== 'string' || !allowed.has(id)) {
            throw new BadRequestException(
              'Invalid multi_select option',
            );
          }
        }
        row.valueJson = optionIds;
        break;
      }
      case 'person':
      case 'page':
        row.valueJson = dto.valueJson ?? null;
        break;
      default:
        throw new BadRequestException('Unsupported property type');
    }

    const allNull =
      row.valueText == null &&
      row.valueNumber == null &&
      row.valueTimestamptz == null &&
      row.valueJson == null;

    if (allNull) {
      await this.taskPropertyValueRepo.delete(dto.taskId, dto.propertyId);
      return null;
    }

    return this.taskPropertyValueRepo.upsert(row);
  }

  private async assertPropertyValue(
    type: string,
    dto: SetTaskPropertyValueDto,
    spaceId: string,
    workspaceId: string,
    userId: string,
  ) {
    if (type === 'person') {
      const ids = Array.isArray(dto.valueJson)
        ? (dto.valueJson as string[])
        : [];
      await this.assertAssigneesInSpace(ids, spaceId);
    }
    if (type === 'page') {
      const pageId =
        dto.valueJson &&
        typeof dto.valueJson === 'object' &&
        !Array.isArray(dto.valueJson)
          ? (dto.valueJson as any).pageId
          : typeof dto.valueJson === 'string'
            ? dto.valueJson
            : null;
      if (pageId) {
        await this.assertLinkedPageWritable(pageId, spaceId, workspaceId);
        const accessible = await this.pagePermissionRepo.filterAccessiblePageIds(
          { pageIds: [pageId], userId },
        );
        if (!accessible.includes(pageId)) {
          throw new BadRequestException('Page is not accessible');
        }
      }
    }
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
