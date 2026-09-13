import { describe, expect, it } from "vitest";
import { planGanttDateProvision } from "@/ee/base/components/gantt/gantt-date-provision";
import type { IBaseProperty } from "@/ee/base/types/base.types";

function dateProp(id: string, name: string): IBaseProperty {
  return {
    id,
    pageId: "p",
    workspaceId: "w",
    name,
    type: "date",
    position: "a0",
    isPrimary: false,
    createdAt: "",
    updatedAt: "",
  } as IBaseProperty;
}

describe("gantt-date-provision", () => {
  it("creates both when zero dates", () => {
    const plan = planGanttDateProvision([]);
    expect(plan.createStart).toBe(true);
    expect(plan.createEnd).toBe(true);
  });

  it("keeps one due and creates start", () => {
    const plan = planGanttDateProvision([dateProp("d1", "Due date")]);
    expect(plan.createStart).toBe(true);
    expect(plan.createEnd).toBe(false);
    expect(plan.endPropertyId).toBe("d1");
  });

  it("keeps one start and creates due", () => {
    const plan = planGanttDateProvision([dateProp("s1", "Start date")]);
    expect(plan.createStart).toBe(false);
    expect(plan.createEnd).toBe(true);
    expect(plan.startPropertyId).toBe("s1");
  });

  it("maps two without creating", () => {
    const plan = planGanttDateProvision([
      dateProp("s1", "Start date"),
      dateProp("d1", "Date d'échéance"),
    ]);
    expect(plan.createStart).toBe(false);
    expect(plan.createEnd).toBe(false);
    expect(plan.startPropertyId).toBe("s1");
    expect(plan.endPropertyId).toBe("d1");
  });

  it("reuses localized names idempotently", () => {
    const plan = planGanttDateProvision([
      dateProp("s1", "Date de début"),
      dateProp("d1", "Date d'échéance"),
      dateProp("x", "Other date"),
    ]);
    expect(plan.startPropertyId).toBe("s1");
    expect(plan.endPropertyId).toBe("d1");
    expect(plan.createStart).toBe(false);
    expect(plan.createEnd).toBe(false);
  });
});
