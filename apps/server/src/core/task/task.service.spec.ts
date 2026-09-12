import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
} from '@casl/ability';
import { KYSELY_MODULE_CONNECTION_TOKEN } from 'nestjs-kysely';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TaskService } from './task.service';
import { TaskItemRepo } from '@docmost/db/repos/task/task-item.repo';
import { TaskAssigneeRepo } from '@docmost/db/repos/task/task-assignee.repo';
import { TaskViewRepo } from '@docmost/db/repos/task/task-view.repo';
import { TaskPropertyRepo } from '@docmost/db/repos/task/task-property.repo';
import { TaskPropertyOptionRepo } from '@docmost/db/repos/task/task-property-option.repo';
import { TaskPropertyValueRepo } from '@docmost/db/repos/task/task-property-value.repo';
import { SpaceMemberRepo } from '@docmost/db/repos/space/space-member.repo';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import { PagePermissionRepo } from '@docmost/db/repos/page/page-permission.repo';
import SpaceAbilityFactory from '../casl/abilities/space-ability.factory';
import {
  ISpaceAbility,
  SpaceCaslAction,
  SpaceCaslSubject,
} from '../casl/interfaces/space-ability.type';
import { User } from '@docmost/db/types/entity.types';

const workspaceId = '00000000-0000-0000-0000-0000000000aa';
const otherWorkspaceId = '00000000-0000-0000-0000-0000000000bb';
const spaceId = '00000000-0000-0000-0000-0000000000s1';
const otherSpaceId = '00000000-0000-0000-0000-0000000000s2';
const taskId = '00000000-0000-0000-0000-0000000000t1';
const pageId = '00000000-0000-0000-0000-0000000000p1';
const userId = '00000000-0000-0000-0000-0000000000u1';

const user = { id: userId } as User;

function buildAbility(
  role: 'reader' | 'writer' | 'admin',
): MongoAbility<ISpaceAbility> {
  const { can, build } = new AbilityBuilder<MongoAbility<ISpaceAbility>>(
    createMongoAbility,
  );
  if (role === 'admin') {
    can(SpaceCaslAction.Manage, SpaceCaslSubject.Settings);
    can(SpaceCaslAction.Manage, SpaceCaslSubject.Member);
    can(SpaceCaslAction.Manage, SpaceCaslSubject.Page);
    can(SpaceCaslAction.Manage, SpaceCaslSubject.Share);
  } else if (role === 'writer') {
    can(SpaceCaslAction.Read, SpaceCaslSubject.Settings);
    can(SpaceCaslAction.Read, SpaceCaslSubject.Member);
    can(SpaceCaslAction.Manage, SpaceCaslSubject.Page);
    can(SpaceCaslAction.Manage, SpaceCaslSubject.Share);
  } else {
    can(SpaceCaslAction.Read, SpaceCaslSubject.Settings);
    can(SpaceCaslAction.Read, SpaceCaslSubject.Member);
    can(SpaceCaslAction.Read, SpaceCaslSubject.Page);
    can(SpaceCaslAction.Read, SpaceCaslSubject.Share);
  }
  return build();
}

describe('TaskService ACL and isolation', () => {
  let service: TaskService;
  let taskItemRepo: jest.Mocked<TaskItemRepo>;
  let taskAssigneeRepo: jest.Mocked<TaskAssigneeRepo>;
  let taskViewRepo: jest.Mocked<TaskViewRepo>;
  let taskPropertyRepo: jest.Mocked<TaskPropertyRepo>;
  let taskPropertyOptionRepo: jest.Mocked<TaskPropertyOptionRepo>;
  let taskPropertyValueRepo: jest.Mocked<TaskPropertyValueRepo>;
  let spaceMemberRepo: jest.Mocked<SpaceMemberRepo>;
  let pageRepo: jest.Mocked<PageRepo>;
  let pagePermissionRepo: jest.Mocked<PagePermissionRepo>;
  let spaceAbility: jest.Mocked<SpaceAbilityFactory>;
  let db: { selectFrom: jest.Mock; transaction: jest.Mock };

  beforeEach(async () => {
    const selectChain = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue([]),
    };
    db = {
      selectFrom: jest.fn().mockReturnValue(selectChain),
      transaction: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: TaskItemRepo,
          useValue: {
            findPaginated: jest.fn(),
            findById: jest.fn(),
            findByIdWithDetails: jest.fn(),
            insert: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: TaskAssigneeRepo,
          useValue: {
            replaceAssignees: jest.fn(),
            listUserIds: jest.fn(),
          },
        },
        {
          provide: TaskViewRepo,
          useValue: {
            list: jest.fn(),
            insert: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: TaskPropertyRepo,
          useValue: {
            listBySpace: jest.fn(),
            insert: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: TaskPropertyOptionRepo,
          useValue: {
            insertMany: jest.fn(),
            deleteByProperty: jest.fn(),
            listByProperty: jest.fn(),
          },
        },
        {
          provide: TaskPropertyValueRepo,
          useValue: {
            upsert: jest.fn(),
            delete: jest.fn(),
            listByTask: jest.fn().mockResolvedValue([]),
            listByTasks: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: SpaceMemberRepo,
          useValue: {
            getUserIdsWithSpaceAccess: jest.fn(),
            getUserSpaceIds: jest.fn(),
            getUserSpaceIdsQuery: jest.fn(),
          },
        },
        {
          provide: PageRepo,
          useValue: {
            findManyByIds: jest.fn(),
          },
        },
        {
          provide: PagePermissionRepo,
          useValue: {
            filterAccessiblePageIds: jest.fn(),
          },
        },
        {
          provide: SpaceAbilityFactory,
          useValue: {
            createForUser: jest.fn(),
          },
        },
        {
          provide: KYSELY_MODULE_CONNECTION_TOKEN(),
          useValue: db,
        },
      ],
    }).compile();

    service = module.get(TaskService);
    taskItemRepo = module.get(TaskItemRepo);
    taskAssigneeRepo = module.get(TaskAssigneeRepo);
    taskViewRepo = module.get(TaskViewRepo);
    taskPropertyRepo = module.get(TaskPropertyRepo);
    taskPropertyOptionRepo = module.get(TaskPropertyOptionRepo);
    taskPropertyValueRepo = module.get(TaskPropertyValueRepo);
    spaceMemberRepo = module.get(SpaceMemberRepo);
    pageRepo = module.get(PageRepo);
    pagePermissionRepo = module.get(PagePermissionRepo);
    spaceAbility = module.get(SpaceAbilityFactory);

    // Default: executeTx path — TaskService uses executeTx helper which
    // calls db.transaction().execute(cb). Provide a passthrough.
    (db as any).transaction = jest.fn().mockReturnValue({
      execute: async (cb: any) => cb(db),
    });
  });

  describe('non-member', () => {
    it('list space-scoped surfaces native 404 from createForUser', async () => {
      spaceAbility.createForUser.mockRejectedValue(
        new NotFoundException('Space permissions not found'),
      );

      await expect(
        service.list(user, workspaceId, { spaceId }, { limit: 20 } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(taskItemRepo.findPaginated).not.toHaveBeenCalled();
    });

    it('create surfaces native 404 from createForUser', async () => {
      spaceAbility.createForUser.mockRejectedValue(
        new NotFoundException('Space permissions not found'),
      );

      await expect(
        service.create(user, workspaceId, {
          spaceId,
          title: 'x',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('reader', () => {
    beforeEach(() => {
      spaceAbility.createForUser.mockResolvedValue(buildAbility('reader'));
    });

    it('list ok', async () => {
      taskItemRepo.findPaginated.mockResolvedValue({ items: [], meta: {} } as any);
      await expect(
        service.list(user, workspaceId, { spaceId }, { limit: 20 } as any),
      ).resolves.toEqual({ items: [], meta: {} });
    });

    it('create 403', async () => {
      await expect(
        service.create(user, workspaceId, { spaceId, title: 'x' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('update 403', async () => {
      taskItemRepo.findById.mockResolvedValue({
        id: taskId,
        spaceId,
        workspaceId,
        status: 'todo',
        completedAt: null,
      } as any);
      await expect(
        service.update(user, workspaceId, { taskId, title: 'y' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('delete 403', async () => {
      taskItemRepo.findById.mockResolvedValue({
        id: taskId,
        spaceId,
        workspaceId,
      } as any);
      await expect(
        service.delete(user, workspaceId, taskId),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('writer', () => {
    beforeEach(() => {
      spaceAbility.createForUser.mockResolvedValue(buildAbility('writer'));
      spaceMemberRepo.getUserIdsWithSpaceAccess.mockResolvedValue(new Set());
      pageRepo.findManyByIds.mockResolvedValue([]);
    });

    it('list ok', async () => {
      taskItemRepo.findPaginated.mockResolvedValue({ items: [], meta: {} } as any);
      await expect(
        service.list(user, workspaceId, { spaceId }, { limit: 20 } as any),
      ).resolves.toBeDefined();
    });

    it('create ok', async () => {
      taskItemRepo.insert.mockResolvedValue({ id: taskId } as any);
      taskItemRepo.findByIdWithDetails.mockResolvedValue({
        id: taskId,
        spaceId,
        linkedPageId: null,
      } as any);
      spaceMemberRepo.getUserSpaceIds.mockResolvedValue([spaceId]);

      await expect(
        service.create(user, workspaceId, { spaceId, title: 'Task' }),
      ).resolves.toMatchObject({ id: taskId, linkedPage: null });
      expect(taskItemRepo.insert).toHaveBeenCalled();
    });

    it('update ok', async () => {
      taskItemRepo.findById.mockResolvedValue({
        id: taskId,
        spaceId,
        workspaceId,
        status: 'todo',
        completedAt: null,
      } as any);
      taskItemRepo.update.mockResolvedValue({} as any);
      taskItemRepo.findByIdWithDetails.mockResolvedValue({
        id: taskId,
        spaceId,
        linkedPageId: null,
      } as any);
      spaceMemberRepo.getUserSpaceIds.mockResolvedValue([spaceId]);

      await expect(
        service.update(user, workspaceId, { taskId, title: 'Updated' }),
      ).resolves.toMatchObject({ id: taskId });
    });

    it('delete 403', async () => {
      taskItemRepo.findById.mockResolvedValue({
        id: taskId,
        spaceId,
        workspaceId,
      } as any);
      await expect(
        service.delete(user, workspaceId, taskId),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('shared space view create 403', async () => {
      await expect(
        service.createView(user, workspaceId, {
          spaceId,
          name: 'Shared',
          type: 'table',
          shared: true,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('admin', () => {
    beforeEach(() => {
      spaceAbility.createForUser.mockResolvedValue(buildAbility('admin'));
    });

    it('delete ok', async () => {
      taskItemRepo.findById.mockResolvedValue({
        id: taskId,
        spaceId,
        workspaceId,
      } as any);
      taskItemRepo.delete.mockResolvedValue(undefined);
      await expect(
        service.delete(user, workspaceId, taskId),
      ).resolves.toBeUndefined();
      expect(taskItemRepo.delete).toHaveBeenCalledWith(taskId, workspaceId);
    });

    it('shared space view create ok', async () => {
      taskViewRepo.insert.mockResolvedValue({
        id: 'v1',
        ownerUserId: null,
        spaceId,
      } as any);
      await expect(
        service.createView(user, workspaceId, {
          spaceId,
          name: 'Shared',
          type: 'kanban',
          shared: true,
        }),
      ).resolves.toMatchObject({ ownerUserId: null });
    });
  });

  describe('global list', () => {
    it('does not call createForUser when spaceId omitted', async () => {
      taskItemRepo.findPaginated.mockResolvedValue({ items: [], meta: {} } as any);
      await service.list(user, workspaceId, {}, { limit: 20 } as any);
      expect(spaceAbility.createForUser).not.toHaveBeenCalled();
      expect(taskItemRepo.findPaginated).toHaveBeenCalledWith(
        userId,
        workspaceId,
        expect.anything(),
        expect.objectContaining({ spaceId: undefined }),
      );
    });

    it('passes assignee=me filter through to repo', async () => {
      taskItemRepo.findPaginated.mockResolvedValue({ items: [], meta: {} } as any);
      await service.list(
        user,
        workspaceId,
        { assignee: 'me' },
        { limit: 20 } as any,
      );
      expect(taskItemRepo.findPaginated).toHaveBeenCalledWith(
        userId,
        workspaceId,
        expect.anything(),
        expect.objectContaining({ assignee: 'me' }),
      );
    });
  });

  describe('workspace isolation', () => {
    it('scopes list and delete to the auth workspace id', async () => {
      spaceAbility.createForUser.mockResolvedValue(buildAbility('admin'));
      taskItemRepo.findPaginated.mockResolvedValue({ items: [], meta: {} } as any);
      await service.list(user, workspaceId, { spaceId }, { limit: 20 } as any);
      expect(taskItemRepo.findPaginated).toHaveBeenCalledWith(
        userId,
        workspaceId,
        expect.anything(),
        expect.anything(),
      );

      taskItemRepo.findById.mockResolvedValue({
        id: taskId,
        spaceId,
        workspaceId,
      } as any);
      await service.delete(user, workspaceId, taskId);
      expect(taskItemRepo.delete).toHaveBeenCalledWith(taskId, workspaceId);
      expect(taskItemRepo.delete).not.toHaveBeenCalledWith(
        taskId,
        otherWorkspaceId,
      );
    });
  });

  describe('progress', () => {
    beforeEach(() => {
      spaceAbility.createForUser.mockResolvedValue(buildAbility('writer'));
      spaceMemberRepo.getUserIdsWithSpaceAccess.mockResolvedValue(new Set());
    });

    it.each([0, 50, 100])('accepts progress %i', async (progress) => {
      taskItemRepo.insert.mockResolvedValue({ id: taskId } as any);
      taskItemRepo.findByIdWithDetails.mockResolvedValue({
        id: taskId,
        spaceId,
        linkedPageId: null,
      } as any);
      spaceMemberRepo.getUserSpaceIds.mockResolvedValue([spaceId]);

      await expect(
        service.create(user, workspaceId, { spaceId, title: 'p', progress }),
      ).resolves.toBeDefined();
    });

    it.each([-1, 101])('rejects progress %i', async (progress) => {
      await expect(
        service.create(user, workspaceId, {
          spaceId,
          title: 'p',
          progress,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('linkedPage hydration', () => {
    it('returns full DTO when accessible', async () => {
      pageRepo.findManyByIds.mockResolvedValue([
        {
          id: pageId,
          title: 'Secret',
          slugId: 'slug',
          spaceId,
        },
      ] as any);
      spaceMemberRepo.getUserSpaceIds.mockResolvedValue([spaceId]);
      pagePermissionRepo.filterAccessiblePageIds.mockResolvedValue([pageId]);
      db.selectFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue([{ id: spaceId, slug: 'eng' }]),
      });

      const [item] = await service.hydrateLinkedPages(
        [{ linkedPageId: pageId }],
        userId,
        workspaceId,
      );
      expect(item.linkedPage).toEqual({
        id: pageId,
        title: 'Secret',
        slugId: 'slug',
        spaceSlug: 'eng',
      });
    });

    it('returns null when page soft-deleted / missing from findManyByIds', async () => {
      pageRepo.findManyByIds.mockResolvedValue([]);
      spaceMemberRepo.getUserSpaceIds.mockResolvedValue([spaceId]);
      pagePermissionRepo.filterAccessiblePageIds.mockResolvedValue([]);

      const [item] = await service.hydrateLinkedPages(
        [{ linkedPageId: pageId }],
        userId,
        workspaceId,
      );
      expect(item.linkedPage).toBeNull();
    });

    it('returns null when page ACL forbids access (no title leak)', async () => {
      pageRepo.findManyByIds.mockResolvedValue([
        {
          id: pageId,
          title: 'Hidden',
          slugId: 'h',
          spaceId,
        },
      ] as any);
      spaceMemberRepo.getUserSpaceIds.mockResolvedValue([spaceId]);
      pagePermissionRepo.filterAccessiblePageIds.mockResolvedValue([]);

      const [item] = await service.hydrateLinkedPages(
        [{ linkedPageId: pageId }],
        userId,
        workspaceId,
      );
      expect(item.linkedPage).toBeNull();
    });

    it('returns null when page is in another inaccessible space', async () => {
      pageRepo.findManyByIds.mockResolvedValue([
        {
          id: pageId,
          title: 'Other',
          slugId: 'o',
          spaceId: otherSpaceId,
        },
      ] as any);
      spaceMemberRepo.getUserSpaceIds.mockResolvedValue([spaceId]);
      pagePermissionRepo.filterAccessiblePageIds.mockResolvedValue([]);

      const [item] = await service.hydrateLinkedPages(
        [{ linkedPageId: pageId }],
        userId,
        workspaceId,
      );
      expect(item.linkedPage).toBeNull();
      expect(pagePermissionRepo.filterAccessiblePageIds).toHaveBeenCalledWith({
        pageIds: [],
        userId,
      });
    });
  });

  describe('task views', () => {
    it('creates personal global view', async () => {
      taskViewRepo.insert.mockResolvedValue({
        id: 'v1',
        spaceId: null,
        ownerUserId: userId,
      } as any);
      await expect(
        service.createView(user, workspaceId, {
          name: 'Mine',
          type: 'table',
        }),
      ).resolves.toMatchObject({ ownerUserId: userId, spaceId: null });
      expect(spaceAbility.createForUser).not.toHaveBeenCalled();
    });

    it('creates personal space view for reader', async () => {
      spaceAbility.createForUser.mockResolvedValue(buildAbility('reader'));
      taskViewRepo.insert.mockResolvedValue({
        id: 'v2',
        spaceId,
        ownerUserId: userId,
      } as any);
      await expect(
        service.createView(user, workspaceId, {
          spaceId,
          name: 'Mine space',
          type: 'table',
        }),
      ).resolves.toMatchObject({ ownerUserId: userId });
    });

    it('rejects shared global views', async () => {
      await expect(
        service.createView(user, workspaceId, {
          name: 'Global shared',
          type: 'table',
          shared: true,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('completed_at', () => {
    beforeEach(() => {
      spaceAbility.createForUser.mockResolvedValue(buildAbility('writer'));
      spaceMemberRepo.getUserIdsWithSpaceAccess.mockResolvedValue(new Set());
      spaceMemberRepo.getUserSpaceIds.mockResolvedValue([spaceId]);
    });

    it('sets completedAt when moving to done', async () => {
      taskItemRepo.findById.mockResolvedValue({
        id: taskId,
        spaceId,
        workspaceId,
        status: 'todo',
        completedAt: null,
      } as any);
      taskItemRepo.update.mockResolvedValue({} as any);
      taskItemRepo.findByIdWithDetails.mockResolvedValue({
        id: taskId,
        spaceId,
        linkedPageId: null,
      } as any);

      await service.update(user, workspaceId, { taskId, status: 'done' });
      const patch = taskItemRepo.update.mock.calls[0][2] as any;
      expect(patch.status).toBe('done');
      expect(patch.completedAt).toBeInstanceOf(Date);
    });

    it('clears completedAt when leaving done', async () => {
      taskItemRepo.findById.mockResolvedValue({
        id: taskId,
        spaceId,
        workspaceId,
        status: 'done',
        completedAt: new Date(),
      } as any);
      taskItemRepo.update.mockResolvedValue({} as any);
      taskItemRepo.findByIdWithDetails.mockResolvedValue({
        id: taskId,
        spaceId,
        linkedPageId: null,
      } as any);

      await service.update(user, workspaceId, {
        taskId,
        status: 'in_progress',
      });
      const patch = taskItemRepo.update.mock.calls[0][2] as any;
      expect(patch.completedAt).toBeNull();
    });
  });

  describe('V2 custom properties', () => {
    const propertyId = '00000000-0000-0000-0000-0000000000pr';

    it('global list passes assignee/due filters without weakening ACL', async () => {
      spaceAbility.createForUser.mockResolvedValue(buildAbility('reader'));
      taskItemRepo.findPaginated.mockResolvedValue({ items: [], meta: {} } as any);

      await service.list(user, workspaceId, {}, { limit: 20 } as any);
      expect(taskItemRepo.findPaginated).toHaveBeenCalledWith(
        userId,
        workspaceId,
        expect.anything(),
        expect.objectContaining({
          spaceId: undefined,
          assignee: undefined,
          due: undefined,
        }),
      );

      await service.list(
        user,
        workspaceId,
        { assignee: 'me' },
        { limit: 20 } as any,
      );
      expect(taskItemRepo.findPaginated).toHaveBeenCalledWith(
        userId,
        workspaceId,
        expect.anything(),
        expect.objectContaining({ assignee: 'me' }),
      );

      await service.list(
        user,
        workspaceId,
        { due: 'overdue' },
        { limit: 20 } as any,
      );
      expect(taskItemRepo.findPaginated).toHaveBeenCalledWith(
        userId,
        workspaceId,
        expect.anything(),
        expect.objectContaining({ due: 'overdue' }),
      );
    });

    it('admin can create property', async () => {
      spaceAbility.createForUser.mockResolvedValue(buildAbility('admin'));
      taskPropertyRepo.insert.mockResolvedValue({
        id: propertyId,
        spaceId,
        type: 'text',
      } as any);
      taskPropertyRepo.listBySpace.mockResolvedValue([
        { id: propertyId, spaceId, type: 'text', options: [] },
      ] as any);

      await expect(
        service.createProperty(user, workspaceId, {
          spaceId,
          name: 'Effort',
          type: 'text',
        }),
      ).resolves.toMatchObject({ id: propertyId });
    });

    it('writer create property => 403', async () => {
      spaceAbility.createForUser.mockResolvedValue(buildAbility('writer'));
      await expect(
        service.createProperty(user, workspaceId, {
          spaceId,
          name: 'Effort',
          type: 'text',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('writer set value => OK', async () => {
      spaceAbility.createForUser.mockResolvedValue(buildAbility('writer'));
      taskItemRepo.findById.mockResolvedValue({
        id: taskId,
        spaceId,
        workspaceId,
      } as any);
      taskPropertyRepo.findById.mockResolvedValue({
        id: propertyId,
        spaceId,
        workspaceId,
        type: 'text',
      } as any);
      taskPropertyValueRepo.upsert.mockResolvedValue({
        taskId,
        propertyId,
        valueText: 'hi',
      } as any);

      await expect(
        service.setPropertyValue(user, workspaceId, {
          taskId,
          propertyId,
          valueText: 'hi',
        }),
      ).resolves.toMatchObject({ valueText: 'hi' });
    });

    it('reader set value => 403', async () => {
      spaceAbility.createForUser.mockResolvedValue(buildAbility('reader'));
      taskItemRepo.findById.mockResolvedValue({
        id: taskId,
        spaceId,
        workspaceId,
      } as any);

      await expect(
        service.setPropertyValue(user, workspaceId, {
          taskId,
          propertyId,
          valueText: 'nope',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects property from another space', async () => {
      spaceAbility.createForUser.mockResolvedValue(buildAbility('writer'));
      taskItemRepo.findById.mockResolvedValue({
        id: taskId,
        spaceId,
        workspaceId,
      } as any);
      taskPropertyRepo.findById.mockResolvedValue({
        id: propertyId,
        spaceId: otherSpaceId,
        workspaceId,
        type: 'text',
      } as any);

      await expect(
        service.setPropertyValue(user, workspaceId, {
          taskId,
          propertyId,
          valueText: 'x',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('person outside space rejected', async () => {
      spaceAbility.createForUser.mockResolvedValue(buildAbility('writer'));
      taskItemRepo.findById.mockResolvedValue({
        id: taskId,
        spaceId,
        workspaceId,
      } as any);
      taskPropertyRepo.findById.mockResolvedValue({
        id: propertyId,
        spaceId,
        workspaceId,
        type: 'person',
      } as any);
      spaceMemberRepo.getUserIdsWithSpaceAccess.mockResolvedValue(new Set());

      await expect(
        service.setPropertyValue(user, workspaceId, {
          taskId,
          propertyId,
          valueJson: ['00000000-0000-0000-0000-0000000000u9'],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('page outside space rejected', async () => {
      spaceAbility.createForUser.mockResolvedValue(buildAbility('writer'));
      taskItemRepo.findById.mockResolvedValue({
        id: taskId,
        spaceId,
        workspaceId,
      } as any);
      taskPropertyRepo.findById.mockResolvedValue({
        id: propertyId,
        spaceId,
        workspaceId,
        type: 'page',
      } as any);
      pageRepo.findManyByIds.mockResolvedValue([
        { id: pageId, spaceId: otherSpaceId },
      ] as any);

      await expect(
        service.setPropertyValue(user, workspaceId, {
          taskId,
          propertyId,
          valueJson: { pageId },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('inaccessible page rejected', async () => {
      spaceAbility.createForUser.mockResolvedValue(buildAbility('writer'));
      taskItemRepo.findById.mockResolvedValue({
        id: taskId,
        spaceId,
        workspaceId,
      } as any);
      taskPropertyRepo.findById.mockResolvedValue({
        id: propertyId,
        spaceId,
        workspaceId,
        type: 'page',
      } as any);
      pageRepo.findManyByIds.mockResolvedValue([
        { id: pageId, spaceId },
      ] as any);
      pagePermissionRepo.filterAccessiblePageIds.mockResolvedValue([]);

      await expect(
        service.setPropertyValue(user, workspaceId, {
          taskId,
          propertyId,
          valueJson: { pageId },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('delete property cascades via repo delete', async () => {
      spaceAbility.createForUser.mockResolvedValue(buildAbility('admin'));
      taskPropertyRepo.findById.mockResolvedValue({
        id: propertyId,
        spaceId,
        workspaceId,
      } as any);
      taskPropertyRepo.delete.mockResolvedValue(undefined);

      await service.deleteProperty(user, workspaceId, propertyId);
      expect(taskPropertyRepo.delete).toHaveBeenCalledWith(
        propertyId,
        workspaceId,
      );
    });

    it.each([
      ['text', { valueText: 'a' }],
      ['long_text', { valueText: 'long' }],
      ['number', { valueNumber: 3 }],
      ['date', { valueTimestamptz: '2026-09-12T00:00:00.000Z' }],
    ] as const)('roundtrip %s', async (type, patch) => {
      spaceAbility.createForUser.mockResolvedValue(buildAbility('writer'));
      taskItemRepo.findById.mockResolvedValue({
        id: taskId,
        spaceId,
        workspaceId,
      } as any);
      taskPropertyRepo.findById.mockResolvedValue({
        id: propertyId,
        spaceId,
        workspaceId,
        type,
      } as any);
      taskPropertyValueRepo.upsert.mockResolvedValue({
        taskId,
        propertyId,
        ...patch,
      } as any);

      await expect(
        service.setPropertyValue(user, workspaceId, {
          taskId,
          propertyId,
          ...patch,
        }),
      ).resolves.toBeTruthy();
      expect(taskPropertyValueRepo.upsert).toHaveBeenCalled();
    });

    describe('multi_select option validation', () => {
      const optA = '00000000-0000-0000-0000-0000000000o1';
      const optB = '00000000-0000-0000-0000-0000000000o2';
      const optOtherProp = '00000000-0000-0000-0000-0000000000o9';

      beforeEach(() => {
        spaceAbility.createForUser.mockResolvedValue(buildAbility('writer'));
        taskItemRepo.findById.mockResolvedValue({
          id: taskId,
          spaceId,
          workspaceId,
        } as any);
        taskPropertyRepo.findById.mockResolvedValue({
          id: propertyId,
          spaceId,
          workspaceId,
          type: 'multi_select',
        } as any);
        taskPropertyOptionRepo.listByProperty.mockResolvedValue([
          { id: optA, propertyId, name: 'A' },
          { id: optB, propertyId, name: 'B' },
        ] as any);
      });

      it('multi_select valid IDs => OK', async () => {
        taskPropertyValueRepo.upsert.mockResolvedValue({
          taskId,
          propertyId,
          valueJson: [optA, optB],
        } as any);

        await expect(
          service.setPropertyValue(user, workspaceId, {
            taskId,
            propertyId,
            valueJson: [optA, optB],
          }),
        ).resolves.toMatchObject({ valueJson: [optA, optB] });
        expect(taskPropertyOptionRepo.listByProperty).toHaveBeenCalledWith(
          propertyId,
        );
      });

      it('unknown option => 400', async () => {
        await expect(
          service.setPropertyValue(user, workspaceId, {
            taskId,
            propertyId,
            valueJson: [optA, '00000000-0000-0000-0000-0000000000zz'],
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(taskPropertyValueRepo.upsert).not.toHaveBeenCalled();
      });

      it('option from another property => 400', async () => {
        await expect(
          service.setPropertyValue(user, workspaceId, {
            taskId,
            propertyId,
            valueJson: [optOtherProp],
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(taskPropertyValueRepo.upsert).not.toHaveBeenCalled();
      });
    });
  });
});

describe('Tasks migration CASCADE contract', () => {
  it('declares space_id ON DELETE CASCADE on task_items', () => {
    const migrationPath = join(
      __dirname,
      '../../database/migrations/20260912T074500-tasks.ts',
    );
    const src = readFileSync(migrationPath, 'utf8');
    expect(src).toMatch(/space_id[\s\S]*onDelete\('cascade'\)/);
    expect(src).toContain("dropTable('task_views')");
    expect(src).toContain("dropTable('task_assignees')");
    expect(src).toContain("dropTable('task_items')");
  });

  it('V2 properties migration drops in cascade-safe order', () => {
    const migrationPath = join(
      __dirname,
      '../../database/migrations/20260912T120000-task-properties.ts',
    );
    const src = readFileSync(migrationPath, 'utf8');
    const valuesIdx = src.indexOf("dropTable('task_property_values')");
    const optionsIdx = src.indexOf("dropTable('task_property_options')");
    const propsIdx = src.indexOf("dropTable('task_properties')");
    expect(valuesIdx).toBeGreaterThan(-1);
    expect(optionsIdx).toBeGreaterThan(valuesIdx);
    expect(propsIdx).toBeGreaterThan(optionsIdx);
    expect(src).not.toContain('is_system');
    expect(src).not.toContain('base_');
  });
});
