/**
 * Idempotent default task_views seeds (lazy on listViews).
 * systemKey in config prevents duplicate seeds without a schema migration.
 */
export const TASK_VIEW_SYSTEM_KEY = {
  spaceAll: 'space:all',
  globalAll: 'global:all',
  globalMine: 'global:mine',
  globalOverdue: 'global:overdue',
} as const;

export type TaskViewSystemKey =
  (typeof TASK_VIEW_SYSTEM_KEY)[keyof typeof TASK_VIEW_SYSTEM_KEY];

export function getViewSystemKey(
  config: Record<string, unknown> | null | undefined,
): string | undefined {
  const key = config?.systemKey;
  return typeof key === 'string' && key.length > 0 ? key : undefined;
}

/** Filter configs for seeded global personal views (client filterTaskRows). */
export function buildMineFilterConfig(userId: string) {
  return {
    systemKey: TASK_VIEW_SYSTEM_KEY.globalMine,
    filter: {
      op: 'and' as const,
      children: [
        {
          propertyId: 'sys:assignees',
          op: 'any' as const,
          value: [userId],
        },
      ],
    },
  };
}

export function buildOverdueFilterConfig() {
  return {
    systemKey: TASK_VIEW_SYSTEM_KEY.globalOverdue,
    filter: {
      op: 'and' as const,
      children: [
        {
          propertyId: 'sys:dueDate',
          op: 'before' as const,
          value: { mode: 'relative' as const, preset: 'today' as const },
        },
        {
          propertyId: 'sys:status',
          op: 'neq' as const,
          value: 'done',
        },
      ],
    },
  };
}

export function buildAllFilterConfig(systemKey: TaskViewSystemKey) {
  return {
    systemKey,
  };
}

/**
 * Default Space "Tout" seed (kanban).
 * groupBy Status; card footer Space + Due (Tasks-native defaults).
 * Global /tasks seeds stay table via buildAllFilterConfig.
 */
export function buildSpaceAllKanbanConfig() {
  return {
    systemKey: TASK_VIEW_SYSTEM_KEY.spaceAll,
    groupByPropertyId: 'sys:status',
    visiblePropertyIds: ['sys:space', 'sys:dueDate'],
  };
}
