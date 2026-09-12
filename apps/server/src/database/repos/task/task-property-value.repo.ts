import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { dbOrTx } from '@docmost/db/utils';
import {
  InsertableTaskPropertyValue,
  TaskPropertyValue,
} from '@docmost/db/types/entity.types';

@Injectable()
export class TaskPropertyValueRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async upsert(
    row: InsertableTaskPropertyValue,
    trx?: KyselyTransaction,
  ): Promise<TaskPropertyValue> {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('taskPropertyValues')
      .values(row)
      .onConflict((oc) =>
        oc.columns(['taskId', 'propertyId']).doUpdateSet({
          valueText: row.valueText ?? null,
          valueNumber: row.valueNumber ?? null,
          valueTimestamptz: row.valueTimestamptz ?? null,
          valueJson: row.valueJson ?? null,
        }),
      )
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async delete(
    taskId: string,
    propertyId: string,
    trx?: KyselyTransaction,
  ): Promise<void> {
    const db = dbOrTx(this.db, trx);
    await db
      .deleteFrom('taskPropertyValues')
      .where('taskId', '=', taskId)
      .where('propertyId', '=', propertyId)
      .execute();
  }

  async listByTask(
    taskId: string,
    trx?: KyselyTransaction,
  ): Promise<TaskPropertyValue[]> {
    const db = dbOrTx(this.db, trx);
    return db
      .selectFrom('taskPropertyValues')
      .selectAll()
      .where('taskId', '=', taskId)
      .execute();
  }

  async listByTasks(taskIds: string[]): Promise<TaskPropertyValue[]> {
    if (taskIds.length === 0) return [];
    return this.db
      .selectFrom('taskPropertyValues')
      .selectAll()
      .where('taskId', 'in', taskIds)
      .execute();
  }
}
