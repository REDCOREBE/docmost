import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { dbOrTx } from '@docmost/db/utils';
import {
  InsertableTaskItem,
  TaskItem,
  UpdatableTaskItem,
} from '@docmost/db/types/entity.types';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import { executeWithCursorPagination } from '@docmost/db/pagination/cursor-pagination';
import { ExpressionBuilder, sql } from 'kysely';
import { DB } from '@docmost/db/types/db';
import { jsonArrayFrom, jsonObjectFrom } from 'kysely/helpers/postgres';
import { SpaceMemberRepo } from '@docmost/db/repos/space/space-member.repo';

export type TaskListFilters = {
  spaceId?: string;
  assignee?: string;
  status?: string;
  priority?: string;
  due?: 'overdue' | 'today' | 'upcoming';
  query?: string;
};

@Injectable()
export class TaskItemRepo {
  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly spaceMemberRepo: SpaceMemberRepo,
  ) {}

  async insert(
    task: InsertableTaskItem,
    trx?: KyselyTransaction,
  ): Promise<TaskItem> {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('taskItems')
      .values(task)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(
    taskId: string,
    workspaceId: string,
    values: UpdatableTaskItem,
    trx?: KyselyTransaction,
  ): Promise<TaskItem | undefined> {
    const db = dbOrTx(this.db, trx);
    return db
      .updateTable('taskItems')
      .set({ ...values, updatedAt: new Date() })
      .where('id', '=', taskId)
      .where('workspaceId', '=', workspaceId)
      .returningAll()
      .executeTakeFirst();
  }

  async delete(
    taskId: string,
    workspaceId: string,
    trx?: KyselyTransaction,
  ): Promise<void> {
    const db = dbOrTx(this.db, trx);
    await db
      .deleteFrom('taskItems')
      .where('id', '=', taskId)
      .where('workspaceId', '=', workspaceId)
      .execute();
  }

  async findById(
    taskId: string,
    workspaceId: string,
    trx?: KyselyTransaction,
  ): Promise<TaskItem | undefined> {
    const db = dbOrTx(this.db, trx);
    return db
      .selectFrom('taskItems')
      .selectAll()
      .where('id', '=', taskId)
      .where('workspaceId', '=', workspaceId)
      .executeTakeFirst();
  }

  async findByIdWithDetails(
    taskId: string,
    workspaceId: string,
  ): Promise<any | undefined> {
    return this.db
      .selectFrom('taskItems')
      .selectAll('taskItems')
      .select((eb) => [
        this.withAssignees(eb),
        this.withSpace(eb),
      ])
      .where('taskItems.id', '=', taskId)
      .where('taskItems.workspaceId', '=', workspaceId)
      .executeTakeFirst();
  }

  async findPaginated(
    userId: string,
    workspaceId: string,
    pagination: PaginationOptions,
    filters: TaskListFilters,
  ) {
    let query = this.db
      .selectFrom('taskItems')
      .selectAll('taskItems')
      .select((eb) => [
        this.withAssignees(eb),
        this.withSpace(eb),
      ])
      .where('taskItems.workspaceId', '=', workspaceId)
      .where(
        'taskItems.spaceId',
        'in',
        this.spaceMemberRepo.getUserSpaceIdsQuery(userId),
      );

    if (filters.spaceId) {
      query = query.where('taskItems.spaceId', '=', filters.spaceId);
    }

    if (filters.status) {
      query = query.where('taskItems.status', '=', filters.status);
    }

    if (filters.priority) {
      query = query.where('taskItems.priority', '=', filters.priority);
    }

    if (filters.assignee === 'me') {
      query = query.where(({ exists, selectFrom }) =>
        exists(
          selectFrom('taskAssignees')
            .select('taskAssignees.taskId')
            .whereRef('taskAssignees.taskId', '=', 'taskItems.id')
            .where('taskAssignees.userId', '=', userId),
        ),
      );
    } else if (filters.assignee) {
      query = query.where(({ exists, selectFrom }) =>
        exists(
          selectFrom('taskAssignees')
            .select('taskAssignees.taskId')
            .whereRef('taskAssignees.taskId', '=', 'taskItems.id')
            .where('taskAssignees.userId', '=', filters.assignee!),
        ),
      );
    }

    if (filters.due === 'overdue') {
      query = query
        .where('taskItems.dueDate', 'is not', null)
        .where('taskItems.dueDate', '<', sql<Date>`now()`)
        .where('taskItems.status', '!=', 'done');
    } else if (filters.due === 'today') {
      query = query
        .where('taskItems.dueDate', 'is not', null)
        .where(
          sql`task_items.due_date::date`,
          '=',
          sql`CURRENT_DATE`,
        );
    } else if (filters.due === 'upcoming') {
      query = query
        .where('taskItems.dueDate', 'is not', null)
        .where('taskItems.dueDate', '>', sql<Date>`now()`)
        .where(
          'taskItems.dueDate',
          '<=',
          sql<Date>`now() + interval '7 days'`,
        );
    }

    const search = filters.query ?? pagination.query;
    if (search) {
      query = query.where('taskItems.title', 'ilike', `%${search}%`);
    }

    return executeWithCursorPagination(query, {
      perPage: pagination.limit,
      cursor: pagination.cursor,
      beforeCursor: pagination.beforeCursor,
      fields: [
        {
          expression: 'taskItems.updatedAt',
          direction: 'desc',
          key: 'updatedAt',
        },
        { expression: 'taskItems.id', direction: 'desc', key: 'id' },
      ],
      parseCursor: (cursor) => ({
        updatedAt: new Date(cursor.updatedAt),
        id: cursor.id,
      }),
    });
  }

  withAssignees(eb: ExpressionBuilder<DB, 'taskItems'>) {
    return jsonArrayFrom(
      eb
        .selectFrom('taskAssignees')
        .innerJoin('users', 'users.id', 'taskAssignees.userId')
        .select([
          'users.id',
          'users.name',
          'users.avatarUrl',
          'users.email',
        ])
        .whereRef('taskAssignees.taskId', '=', 'taskItems.id')
        .orderBy('users.name', 'asc'),
    ).as('assignees');
  }

  withSpace(eb: ExpressionBuilder<DB, 'taskItems'>) {
    return jsonObjectFrom(
      eb
        .selectFrom('spaces')
        .select(['spaces.id', 'spaces.name', 'spaces.slug', 'spaces.logo'])
        .whereRef('spaces.id', '=', 'taskItems.spaceId'),
    ).as('space');
  }
}
