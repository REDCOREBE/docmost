import { type Kysely, sql } from 'kysely';

/**
 * Tasks V2 — space-scoped custom properties (additive).
 * System fields remain on task_items / task_assignees.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('task_properties')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('workspace_id', 'uuid', (col) =>
      col.references('workspaces.id').onDelete('cascade').notNull(),
    )
    .addColumn('space_id', 'uuid', (col) =>
      col.references('spaces.id').onDelete('cascade').notNull(),
    )
    .addColumn('name', 'varchar', (col) => col.notNull())
    .addColumn('type', 'varchar', (col) => col.notNull())
    .addColumn('config', 'jsonb', (col) =>
      col.notNull().defaultTo(sql`'{}'::jsonb`),
    )
    .addColumn('position', 'varchar', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addCheckConstraint(
      'task_properties_type_check',
      sql`type IN (
        'text', 'long_text', 'number', 'select', 'multi_select',
        'date', 'person', 'page'
      )`,
    )
    .execute();

  await db.schema
    .createIndex('idx_task_properties_workspace_space')
    .on('task_properties')
    .columns(['workspace_id', 'space_id'])
    .execute();

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_task_properties_space_name_ci
      ON task_properties (space_id, lower(trim(name)))
  `.execute(db);

  await db.schema
    .createTable('task_property_options')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('property_id', 'uuid', (col) =>
      col.references('task_properties.id').onDelete('cascade').notNull(),
    )
    .addColumn('name', 'varchar', (col) => col.notNull())
    .addColumn('color', 'varchar')
    .addColumn('position', 'varchar', (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex('idx_task_property_options_property')
    .on('task_property_options')
    .column('property_id')
    .execute();

  await db.schema
    .createTable('task_property_values')
    .addColumn('task_id', 'uuid', (col) =>
      col.references('task_items.id').onDelete('cascade').notNull(),
    )
    .addColumn('property_id', 'uuid', (col) =>
      col.references('task_properties.id').onDelete('cascade').notNull(),
    )
    .addColumn('value_text', 'text')
    .addColumn('value_number', 'float8')
    .addColumn('value_timestamptz', 'timestamptz')
    .addColumn('value_json', 'jsonb')
    .addPrimaryKeyConstraint('task_property_values_pkey', [
      'task_id',
      'property_id',
    ])
    .execute();

  await db.schema
    .createIndex('idx_task_property_values_task')
    .on('task_property_values')
    .column('task_id')
    .execute();

  await db.schema
    .createIndex('idx_task_property_values_property')
    .on('task_property_values')
    .column('property_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('task_property_values').execute();
  await db.schema.dropTable('task_property_options').execute();
  await db.schema.dropTable('task_properties').execute();
}
