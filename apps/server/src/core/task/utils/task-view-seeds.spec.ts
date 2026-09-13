import {
  buildMineFilterConfig,
  buildOverdueFilterConfig,
  buildSpaceAllKanbanConfig,
  TASK_VIEW_SYSTEM_KEY,
} from './task-view-seeds';

describe('task-view-seeds configs', () => {
  it('mine filter targets current user assignees', () => {
    const cfg = buildMineFilterConfig('user-1');
    expect(cfg.systemKey).toBe(TASK_VIEW_SYSTEM_KEY.globalMine);
    expect(cfg.filter.children[0]).toMatchObject({
      propertyId: 'sys:assignees',
      op: 'any',
      value: ['user-1'],
    });
  });

  it('overdue filter excludes done and requires due before today', () => {
    const cfg = buildOverdueFilterConfig();
    expect(cfg.systemKey).toBe(TASK_VIEW_SYSTEM_KEY.globalOverdue);
    expect(cfg.filter.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          propertyId: 'sys:dueDate',
          op: 'before',
        }),
        expect.objectContaining({
          propertyId: 'sys:status',
          op: 'neq',
          value: 'done',
        }),
      ]),
    );
  });

  it('space all kanban default groups by status with Space+Due card props', () => {
    const cfg = buildSpaceAllKanbanConfig();
    expect(cfg).toEqual({
      systemKey: TASK_VIEW_SYSTEM_KEY.spaceAll,
      groupByPropertyId: 'sys:status',
      visiblePropertyIds: ['sys:space', 'sys:dueDate'],
    });
  });
});
