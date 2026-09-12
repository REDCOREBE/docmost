import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { dbOrTx } from '@docmost/db/utils';
import {
  InsertableTaskPropertyOption,
  TaskPropertyOption,
} from '@docmost/db/types/entity.types';

@Injectable()
export class TaskPropertyOptionRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async insertMany(
    options: InsertableTaskPropertyOption[],
    trx?: KyselyTransaction,
  ): Promise<TaskPropertyOption[]> {
    if (options.length === 0) return [];
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('taskPropertyOptions')
      .values(options)
      .returningAll()
      .execute();
  }

  async deleteByProperty(
    propertyId: string,
    trx?: KyselyTransaction,
  ): Promise<void> {
    const db = dbOrTx(this.db, trx);
    await db
      .deleteFrom('taskPropertyOptions')
      .where('propertyId', '=', propertyId)
      .execute();
  }

  async listByProperty(propertyId: string): Promise<TaskPropertyOption[]> {
    return this.db
      .selectFrom('taskPropertyOptions')
      .selectAll()
      .where('propertyId', '=', propertyId)
      .orderBy('position', (ob) => ob.collate('C').asc())
      .execute();
  }
}
