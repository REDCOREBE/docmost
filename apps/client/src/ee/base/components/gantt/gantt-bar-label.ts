import type { IBaseProperty, IBaseRow } from "@/ee/base/types/base.types";

/** How many secondary labels fit for a given bar pixel width. */
export function maxBarExtras(barWidthPx: number): number {
  if (barWidthPx < 88) return 0;
  if (barWidthPx < 168) return 1;
  return 2;
}

function choiceLabel(
  property: IBaseProperty,
  value: unknown,
): string | null {
  if (value == null || value === "") return null;
  const choices =
    (
      property.typeOptions as
        | { choices?: { id: string; name: string; label?: string }[] }
        | undefined
    )?.choices ?? [];
  const choice = choices.find((c) => c.id === value);
  if (!choice) return String(value);
  return choice.name || choice.label || String(value);
}

function formatDateShort(value: unknown): string | null {
  const d =
    value instanceof Date
      ? value
      : typeof value === "string" || typeof value === "number"
        ? new Date(value)
        : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Compact single-line label for a secondary bar property.
 * Returns null when the cell is empty / unrenderable.
 */
export function formatBarPropertyValue(
  property: IBaseProperty,
  row: IBaseRow,
): string | null {
  const value = row.cells?.[property.id];
  if (value == null || value === "") return null;

  switch (property.type) {
    case "date":
      return formatDateShort(value);
    case "number": {
      const n = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(n)) return null;
      const format = (property.typeOptions as { format?: string } | undefined)
        ?.format;
      if (format === "progress") return `${Math.round(n)}%`;
      return String(n);
    }
    case "status":
    case "select":
      return choiceLabel(property, value);
    case "multiSelect": {
      if (!Array.isArray(value) || value.length === 0) return null;
      const labels = value
        .map((id) => choiceLabel(property, id))
        .filter((x): x is string => !!x);
      if (labels.length === 0) return null;
      return labels.length <= 2 ? labels.join(", ") : `${labels.length}`;
    }
    case "person": {
      const ids = Array.isArray(value)
        ? value.filter((x) => typeof x === "string")
        : typeof value === "string"
          ? [value]
          : [];
      if (ids.length === 0) return null;
      // Compact: count when multi; single id abbreviated (names come from
      // reference hydration in richer renderers — keep string-safe here).
      return ids.length === 1 ? "1" : String(ids.length);
    }
    case "checkbox":
      return value === true || value === "true" ? "✓" : null;
    case "text":
    default: {
      const s = String(value).trim();
      return s ? s : null;
    }
  }
}

/**
 * Resolve which property ids drive Gantt bar extras.
 *
 * Priority (R24):
 * 1. `visiblePropertyIds` when non-empty → Card properties is the sole UX control
 * 2. Legacy `gantt.barPropertyIds` when visible list is empty/absent
 * 3. Otherwise title-only
 *
 * Order follows `propertyOrder` when provided, else the source list order.
 */
export function resolveEffectiveBarPropertyIds(input: {
  properties: IBaseProperty[];
  visiblePropertyIds?: string[];
  barPropertyIds?: string[];
  propertyOrder?: string[];
}): string[] {
  const { properties, visiblePropertyIds, barPropertyIds, propertyOrder } =
    input;
  const primaryId = properties.find((p) => p.isPrimary)?.id;
  const allowed = new Set(
    properties
      .filter((p) => !p.isPrimary && p.type !== "file")
      .map((p) => p.id),
  );

  // `undefined` = never configured → legacy barPropertyIds fallback.
  // `[]` = user explicitly hid all card properties → title-only.
  const source =
    visiblePropertyIds !== undefined
      ? visiblePropertyIds
      : barPropertyIds && barPropertyIds.length > 0
        ? barPropertyIds
        : [];

  const filtered = source.filter((id) => allowed.has(id) && id !== primaryId);
  if (!propertyOrder?.length) return filtered;

  const rank = new Map(propertyOrder.map((id, i) => [id, i]));
  return [...filtered].sort((a, b) => {
    const ra = rank.has(a) ? rank.get(a)! : 9999;
    const rb = rank.has(b) ? rank.get(b)! : 9999;
    return ra - rb;
  });
}

/**
 * Resolve secondary bar labels from Card properties (visiblePropertyIds),
 * with legacy barPropertyIds fallback for R22 configs.
 */
export function resolveBarExtras(
  row: IBaseRow,
  properties: IBaseProperty[],
  barPropertyIds: string[] | undefined,
  visiblePropertyIds: string[] | undefined,
  maxExtras: number,
  propertyOrder?: string[],
): string[] {
  if (maxExtras <= 0) return [];

  const ids = resolveEffectiveBarPropertyIds({
    properties,
    visiblePropertyIds,
    barPropertyIds,
    propertyOrder,
  });
  if (!ids.length) return [];

  const byId = new Map(properties.map((p) => [p.id, p]));
  const out: string[] = [];
  for (const id of ids) {
    if (out.length >= maxExtras) break;
    const prop = byId.get(id);
    if (!prop) continue;
    const label = formatBarPropertyValue(prop, row);
    if (label) out.push(label);
  }
  return out;
}
