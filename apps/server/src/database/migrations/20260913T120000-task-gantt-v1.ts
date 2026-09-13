import { type Kysely, sql } from 'kysely';

/**
 * R21 Gantt V1 foundation:
 * - task_items.start_date (nullable timestamptz)
 * - task_views.type CHECK includes 'gantt'
 *
 * Rollback (down):
 * - drop start_date (+ index)
 * - restore type CHECK to table|kanban (fails if gantt rows exist — remap first)
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('task_items')
    .addColumn('start_date', 'timestamptz')
    .execute();

  await sql`
    CREATE INDEX IF NOT EXISTS idx_task_items_workspace_start
      ON task_items (workspace_id, start_date)
      WHERE start_date IS NOT NULL
  `.execute(db);

  await sql`
    ALTER TABLE task_views DROP CONSTRAINT IF EXISTS task_views_type_check
  `.execute(db);

  await sql`
    ALTER TABLE task_views
      ADD CONSTRAINT task_views_type_check
      CHECK (type IN ('table', 'kanban', 'gantt'))
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Remap any gantt views before restoring CHECK
  await sql`
    UPDATE task_views SET type = 'kanban' WHERE type = 'gantt'
  `.execute(db);

  await sql`
    ALTER TABLE task_views DROP CONSTRAINT IF EXISTS task_views_type_check
  `.execute(db);

  await sql`
    ALTER TABLE task_views
      ADD CONSTRAINT task_views_type_check
      CHECK (type IN ('table', 'kanban'))
  `.execute(db);

  await sql`
    DROP INDEX IF EXISTS idx_task_items_workspace_start
  `.execute(db);

  await db.schema
    .alterTable('task_items')
    .dropColumn('start_date')
    .execute();
}
