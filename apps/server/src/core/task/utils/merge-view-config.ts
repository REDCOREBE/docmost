/**
 * Shallow ViewConfig merge for task_views.config updates.
 *
 * Per-key semantics (compatible with client ViewConfigPatch):
 * - key absent in patch  → keep existing
 * - value === null         → delete key
 * - value !== undefined    → replace value wholesale
 *
 * Arrays and nested objects (filter, sorts, visiblePropertyIds, …) are
 * replaced as a whole — never deep-merged element-wise.
 */
export function mergeViewConfig(
  existing: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...(existing ?? {}) };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete merged[key];
    } else if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged;
}
