import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('task_items')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('workspace_id', 'uuid', (col) =>
      col.references('workspaces.id').onDelete('cascade').notNull(),
    )
    .addColumn('space_id', 'uuid', (col) =>
      col.references('spaces.id').onDelete('cascade').notNull(),
    )
    .addColumn('title', 'varchar', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('status', 'varchar', (col) => col.notNull())
    .addColumn('priority', 'varchar', (col) =>
      col.notNull().defaultTo('none'),
    )
    .addColumn('progress', 'int2', (col) => col.notNull().defaultTo(0))
    .addColumn('due_date', 'timestamptz')
    .addColumn('created_by_id', 'uuid', (col) =>
      col.references('users.id').onDelete('set null'),
    )
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('completed_at', 'timestamptz')
    .addColumn('linked_page_id', 'uuid', (col) =>
      col.references('pages.id').onDelete('set null'),
    )
    .addCheckConstraint(
      'task_items_status_check',
      sql`status IN ('todo', 'in_progress', 'done')`,
    )
    .addCheckConstraint(
      'task_items_priority_check',
      sql`priority IN ('none', 'low', 'medium', 'high', 'urgent')`,
    )
    .addCheckConstraint(
      'task_items_progress_check',
      sql`progress >= 0 AND progress <= 100`,
    )
    .execute();

  await db.schema
    .createIndex('idx_task_items_workspace_space_status')
    .on('task_items')
    .columns(['workspace_id', 'space_id', 'status'])
    .execute();

  await sql`
    CREATE INDEX IF NOT EXISTS idx_task_items_workspace_due
      ON task_items (workspace_id, due_date)
      WHERE due_date IS NOT NULL
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_task_items_linked_page
      ON task_items (linked_page_id)
      WHERE linked_page_id IS NOT NULL
  `.execute(db);

  await db.schema
    .createTable('task_assignees')
    .addColumn('task_id', 'uuid', (col) =>
      col.references('task_items.id').onDelete('cascade').notNull(),
    )
    .addColumn('user_id', 'uuid', (col) =>
      col.references('users.id').onDelete('cascade').notNull(),
    )
    .addPrimaryKeyConstraint('task_assignees_pkey', ['task_id', 'user_id'])
    .execute();

  await db.schema
    .createIndex('idx_task_assignees_user_task')
    .on('task_assignees')
    .columns(['user_id', 'task_id'])
    .execute();

  await db.schema
    .createTable('task_views')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('workspace_id', 'uuid', (col) =>
      col.references('workspaces.id').onDelete('cascade').notNull(),
    )
    .addColumn('space_id', 'uuid', (col) =>
      col.references('spaces.id').onDelete('cascade'),
    )
    .addColumn('owner_user_id', 'uuid', (col) =>
      col.references('users.id').onDelete('cascade'),
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
      'task_views_type_check',
      sql`type IN ('table', 'kanban')`,
    )
    .execute();

  await db.schema
    .createIndex('idx_task_views_workspace_space')
    .on('task_views')
    .columns(['workspace_id', 'space_id'])
    .execute();

  await db.schema
    .createIndex('idx_task_views_owner')
    .on('task_views')
    .column('owner_user_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('task_views').execute();
  await db.schema.dropTable('task_assignees').execute();
  await db.schema.dropTable('task_items').execute();
}
