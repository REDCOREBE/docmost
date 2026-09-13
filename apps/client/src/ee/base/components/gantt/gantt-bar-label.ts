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
 * Resolve secondary bar labels from `barPropertyIds`, optionally gated by
 * `visiblePropertyIds` when that list is present on the view.
 */
export function resolveBarExtras(
  row: IBaseRow,
  properties: IBaseProperty[],
  barPropertyIds: string[] | undefined,
  visiblePropertyIds: string[] | undefined,
  maxExtras: number,
): string[] {
  if (maxExtras <= 0 || !barPropertyIds?.length) return [];

  const byId = new Map(properties.map((p) => [p.id, p]));
  const primaryId = properties.find((p) => p.isPrimary)?.id;
  const gated =
    visiblePropertyIds != null
      ? barPropertyIds.filter((id) => visiblePropertyIds.includes(id))
      : barPropertyIds;

  const out: string[] = [];
  for (const id of gated) {
    if (out.length >= maxExtras) break;
    if (id === primaryId) continue;
    const prop = byId.get(id);
    if (!prop) continue;
    const label = formatBarPropertyValue(prop, row);
    if (label) out.push(label);
  }
  return out;
}
