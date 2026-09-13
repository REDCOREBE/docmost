import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { sql } from 'kysely';
import { createHash } from 'crypto';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { dbOrTx } from '@docmost/db/utils';
import {
  InsertableTaskView,
  TaskView,
  UpdatableTaskView,
} from '@docmost/db/types/entity.types';

@Injectable()
export class TaskViewRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async insert(
    view: InsertableTaskView,
    trx?: KyselyTransaction,
  ): Promise<TaskView> {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('taskViews')
      .values(view)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(
    viewId: string,
    workspaceId: string,
    values: UpdatableTaskView,
    trx?: KyselyTransaction,
  ): Promise<TaskView | undefined> {
    const db = dbOrTx(this.db, trx);
    return db
      .updateTable('taskViews')
      .set({ ...values, updatedAt: new Date() })
      .where('id', '=', viewId)
      .where('workspaceId', '=', workspaceId)
      .returningAll()
      .executeTakeFirst();
  }

  async delete(
    viewId: string,
    workspaceId: string,
    trx?: KyselyTransaction,
  ): Promise<void> {
    const db = dbOrTx(this.db, trx);
    await db
      .deleteFrom('taskViews')
      .where('id', '=', viewId)
      .where('workspaceId', '=', workspaceId)
      .execute();
  }

  async findById(
    viewId: string,
    workspaceId: string,
  ): Promise<TaskView | undefined> {
    return this.db
      .selectFrom('taskViews')
      .selectAll()
      .where('id', '=', viewId)
      .where('workspaceId', '=', workspaceId)
      .executeTakeFirst();
  }

  async list(
    workspaceId: string,
    opts: { spaceId?: string | null; userId: string },
    trx?: KyselyTransaction,
  ): Promise<TaskView[]> {
    const db = dbOrTx(this.db, trx);
    let query = db
      .selectFrom('taskViews')
      .selectAll()
      .where('workspaceId', '=', workspaceId)
      .orderBy('position', (ob) => ob.collate('C').asc())
      .orderBy('id', 'asc');

    if (opts.spaceId) {
      query = query
        .where('spaceId', '=', opts.spaceId)
        .where((eb) =>
          eb.or([
            eb('ownerUserId', 'is', null),
            eb('ownerUserId', '=', opts.userId),
          ]),
        );
    } else {
      query = query
        .where('spaceId', 'is', null)
        .where('ownerUserId', '=', opts.userId);
    }

    return query.execute();
  }

  async countForScope(
    workspaceId: string,
    opts: { spaceId?: string | null; userId: string },
    trx?: KyselyTransaction,
  ): Promise<number> {
    const db = dbOrTx(this.db, trx);
    let query = db
      .selectFrom('taskViews')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('workspaceId', '=', workspaceId);

    if (opts.spaceId) {
      query = query
        .where('spaceId', '=', opts.spaceId)
        .where((eb) =>
          eb.or([
            eb('ownerUserId', 'is', null),
            eb('ownerUserId', '=', opts.userId),
          ]),
        );
    } else {
      query = query
        .where('spaceId', 'is', null)
        .where('ownerUserId', '=', opts.userId);
    }

    const row = await query.executeTakeFirst();
    return Number(row?.count ?? 0);
  }

  /**
   * Transaction-scoped advisory lock for lazy view seeds.
   * Serializes concurrent empty-scope listViews without a schema migration.
   */
  async acquireSeedLock(
    workspaceId: string,
    opts: { spaceId?: string | null; userId: string },
    trx: KyselyTransaction,
  ): Promise<void> {
    const material = `task_view_seed:${workspaceId}:${opts.spaceId ?? ''}:${opts.userId}`;
    const digest = createHash('sha256').update(material).digest();
    const k1 = digest.readInt32BE(0);
    const k2 = digest.readInt32BE(4);
    await sql`select pg_advisory_xact_lock(${k1}, ${k2})`.execute(trx);
  }
}
