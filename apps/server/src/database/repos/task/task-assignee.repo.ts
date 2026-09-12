import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { dbOrTx } from '@docmost/db/utils';

@Injectable()
export class TaskAssigneeRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async replaceAssignees(
    taskId: string,
    userIds: string[],
    trx?: KyselyTransaction,
  ): Promise<void> {
    const db = dbOrTx(this.db, trx);
    await db
      .deleteFrom('taskAssignees')
      .where('taskId', '=', taskId)
      .execute();

    if (userIds.length === 0) {
      return;
    }

    await db
      .insertInto('taskAssignees')
      .values(userIds.map((userId) => ({ taskId, userId })))
      .execute();
  }

  async listUserIds(taskId: string, trx?: KyselyTransaction): Promise<string[]> {
    const db = dbOrTx(this.db, trx);
    const rows = await db
      .selectFrom('taskAssignees')
      .select('userId')
      .where('taskId', '=', taskId)
      .execute();
    return rows.map((r) => r.userId);
  }
}
