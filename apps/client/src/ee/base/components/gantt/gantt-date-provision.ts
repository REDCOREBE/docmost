import type { IBaseProperty } from "@/ee/base/types/base.types";

const START_KEYS = ["start date", "date de début", "date de debut", "start"];
const DUE_KEYS = [
  "due date",
  "date d'échéance",
  "date d'echeance",
  "date d’échéance",
  "end date",
  "date de fin",
  "due",
];

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function findDatePropertyByNames(
  properties: IBaseProperty[],
  keys: string[],
): IBaseProperty | undefined {
  const dates = properties.filter((p) => p.type === "date");
  return dates.find((p) => keys.includes(normalizeName(p.name)));
}

export type GanttDateProvisionPlan = {
  startPropertyId: string;
  endPropertyId: string;
  createStart: boolean;
  createEnd: boolean;
  startNameKey: "Start date";
  endNameKey: "Due date";
};

/**
 * Plan auto-provisioning of Start/Due for Base Gantt creation.
 * Idempotent: reuses properties named Start date / Due date (localized variants).
 */
export function planGanttDateProvision(
  properties: IBaseProperty[],
): GanttDateProvisionPlan {
  const dates = properties.filter((p) => p.type === "date");
  const existingStart = findDatePropertyByNames(properties, START_KEYS);
  const existingDue = findDatePropertyByNames(properties, DUE_KEYS);

  if (dates.length >= 2) {
    const start =
      existingStart ??
      dates.find((d) => d.id !== existingDue?.id) ??
      dates[0];
    const end =
      existingDue ??
      dates.find((d) => d.id !== start.id) ??
      dates[1] ??
      dates[0];
    return {
      startPropertyId: start.id,
      endPropertyId: end.id,
      createStart: false,
      createEnd: false,
      startNameKey: "Start date",
      endNameKey: "Due date",
    };
  }

  if (dates.length === 1) {
    const only = dates[0];
    const looksDue = DUE_KEYS.includes(normalizeName(only.name));
    if (looksDue) {
      return {
        startPropertyId: "", // filled after create
        endPropertyId: only.id,
        createStart: true,
        createEnd: false,
        startNameKey: "Start date",
        endNameKey: "Due date",
      };
    }
    return {
      startPropertyId: only.id,
      endPropertyId: "",
      createStart: false,
      createEnd: true,
      startNameKey: "Start date",
      endNameKey: "Due date",
    };
  }

  return {
    startPropertyId: "",
    endPropertyId: "",
    createStart: true,
    createEnd: true,
    startNameKey: "Start date",
    endNameKey: "Due date",
  };
}
