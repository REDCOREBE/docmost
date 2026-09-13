import { mergeViewConfig } from './merge-view-config';

describe('mergeViewConfig', () => {
  const existing = {
    filter: { op: 'and', children: [{ propertyId: 'a', operator: 'is', value: 'x' }] },
    sorts: [{ propertyId: 'title', direction: 'asc' }],
    groupByPropertyId: 'sys:status',
    visiblePropertyIds: ['sys:title', 'sys:assignees'],
    propertyWidths: { 'sys:title': 200 },
    propertyOrder: ['sys:title'],
    hiddenChoiceIds: ['done'],
    choiceOrder: ['todo', 'in_progress', 'done'],
  };

  it('replaces filter only and preserves other keys', () => {
    const newFilter = { op: 'and', children: [] };
    const result = mergeViewConfig(existing, { filter: newFilter });
    expect(result.filter).toEqual(newFilter);
    expect(result.sorts).toEqual(existing.sorts);
    expect(result.groupByPropertyId).toBe('sys:status');
    expect(result.visiblePropertyIds).toEqual(existing.visiblePropertyIds);
    expect(result.propertyWidths).toEqual(existing.propertyWidths);
    expect(result.hiddenChoiceIds).toEqual(existing.hiddenChoiceIds);
  });

  it('replaces sorts only', () => {
    const sorts = [{ propertyId: 'sys:dueDate', direction: 'desc' }];
    const result = mergeViewConfig(existing, { sorts });
    expect(result.sorts).toEqual(sorts);
    expect(result.filter).toEqual(existing.filter);
    expect(result.groupByPropertyId).toBe('sys:status');
  });

  it('replaces grouping only', () => {
    const result = mergeViewConfig(existing, {
      groupByPropertyId: 'sys:priority',
    });
    expect(result.groupByPropertyId).toBe('sys:priority');
    expect(result.filter).toEqual(existing.filter);
    expect(result.visiblePropertyIds).toEqual(existing.visiblePropertyIds);
  });

  it('replaces visibility only', () => {
    const result = mergeViewConfig(existing, {
      visiblePropertyIds: ['sys:status'],
      hiddenPropertyIds: ['sys:progress'],
    });
    expect(result.visiblePropertyIds).toEqual(['sys:status']);
    expect(result.hiddenPropertyIds).toEqual(['sys:progress']);
    expect(result.sorts).toEqual(existing.sorts);
    expect(result.groupByPropertyId).toBe('sys:status');
  });

  it('replaces card props (visiblePropertyIds + propertyOrder) only', () => {
    const result = mergeViewConfig(existing, {
      visiblePropertyIds: ['sys:priority'],
      propertyOrder: ['sys:priority', 'sys:dueDate'],
    });
    expect(result.visiblePropertyIds).toEqual(['sys:priority']);
    expect(result.propertyOrder).toEqual(['sys:priority', 'sys:dueDate']);
    expect(result.filter).toEqual(existing.filter);
    expect(result.groupByPropertyId).toBe('sys:status');
  });

  it('deletes a key when patch value is null', () => {
    const result = mergeViewConfig(existing, { filter: null });
    expect(result.filter).toBeUndefined();
    expect(result.sorts).toEqual(existing.sorts);
  });

  it('starts from empty when existing is null', () => {
    const result = mergeViewConfig(null, {
      groupByPropertyId: 'sys:status',
    });
    expect(result).toEqual({ groupByPropertyId: 'sys:status' });
  });
});
