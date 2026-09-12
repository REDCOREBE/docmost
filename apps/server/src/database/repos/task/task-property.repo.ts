import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { dbOrTx } from '@docmost/db/utils';
import {
  InsertableTaskProperty,
  TaskProperty,
  UpdatableTaskProperty,
} from '@docmost/db/types/entity.types';
import { jsonArrayFrom } from 'kysely/helpers/postgres';
import { ExpressionBuilder } from 'kysely';
import { DB } from '@docmost/db/types/db';

@Injectable()
export class TaskPropertyRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async insert(
    property: InsertableTaskProperty,
    trx?: KyselyTransaction,
  ): Promise<TaskProperty> {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('taskProperties')
      .values(property)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(
    propertyId: string,
    workspaceId: string,
    values: UpdatableTaskProperty,
    trx?: KyselyTransaction,
  ): Promise<TaskProperty | undefined> {
    const db = dbOrTx(this.db, trx);
    return db
      .updateTable('taskProperties')
      .set({ ...values, updatedAt: new Date() })
      .where('id', '=', propertyId)
      .where('workspaceId', '=', workspaceId)
      .returningAll()
      .executeTakeFirst();
  }

  async delete(
    propertyId: string,
    workspaceId: string,
    trx?: KyselyTransaction,
  ): Promise<void> {
    const db = dbOrTx(this.db, trx);
    await db
      .deleteFrom('taskProperties')
      .where('id', '=', propertyId)
      .where('workspaceId', '=', workspaceId)
      .execute();
  }

  async findById(
    propertyId: string,
    workspaceId: string,
  ): Promise<TaskProperty | undefined> {
    return this.db
      .selectFrom('taskProperties')
      .selectAll()
      .where('id', '=', propertyId)
      .where('workspaceId', '=', workspaceId)
      .executeTakeFirst();
  }

  async listBySpace(workspaceId: string, spaceId: string) {
    return this.db
      .selectFrom('taskProperties')
      .selectAll('taskProperties')
      .select((eb) => [this.withOptions(eb)])
      .where('taskProperties.workspaceId', '=', workspaceId)
      .where('taskProperties.spaceId', '=', spaceId)
      .orderBy('taskProperties.position', (ob) => ob.collate('C').asc())
      .orderBy('taskProperties.id', 'asc')
      .execute();
  }

  withOptions(eb: ExpressionBuilder<DB, 'taskProperties'>) {
    return jsonArrayFrom(
      eb
        .selectFrom('taskPropertyOptions')
        .selectAll()
        .whereRef(
          'taskPropertyOptions.propertyId',
          '=',
          'taskProperties.id',
        )
        .orderBy('taskPropertyOptions.position', (ob) => ob.collate('C').asc())
        .orderBy('taskPropertyOptions.id', 'asc'),
    ).as('options');
  }
}
