import { describe, expect, it } from "vitest";
import {
  formatBarPropertyValue,
  maxBarExtras,
  resolveBarExtras,
  resolveEffectiveBarPropertyIds,
} from "@/ee/base/components/gantt/gantt-bar-label";
import type { IBaseProperty, IBaseRow } from "@/ee/base/types/base.types";

function prop(
  partial: Partial<IBaseProperty> & Pick<IBaseProperty, "id" | "type" | "name">,
): IBaseProperty {
  return {
    pageId: "p1",
    workspaceId: "w1",
    position: "a0",
    isPrimary: false,
    createdAt: "",
    updatedAt: "",
    ...partial,
  } as IBaseProperty;
}

function row(cells: Record<string, unknown>): IBaseRow {
  return {
    id: "r1",
    pageId: "p1",
    cells,
    position: "a0",
    creatorId: "",
    lastUpdatedById: null,
    workspaceId: "w1",
    createdAt: "",
    updatedAt: "",
  };
}

describe("gantt-bar-label", () => {
  it("scales secondary extras by bar width", () => {
    expect(maxBarExtras(40)).toBe(0);
    expect(maxBarExtras(100)).toBe(1);
    expect(maxBarExtras(200)).toBe(2);
  });

  it("formats progress and dates", () => {
    const progress = prop({
      id: "prog",
      name: "Progress",
      type: "number",
      typeOptions: { format: "progress" },
    });
    expect(formatBarPropertyValue(progress, row({ prog: 42 }))).toBe("42%");

    const due = prop({ id: "due", name: "Due", type: "date" });
    expect(formatBarPropertyValue(due, row({ due: "2026-09-13" }))).toMatch(
      /Sep/,
    );
  });

  it("uses visiblePropertyIds as sole control when set", () => {
    const priority = prop({
      id: "prio",
      name: "Priority",
      type: "select",
      typeOptions: {
        choices: [{ id: "high", name: "High" }],
      },
    });
    const space = prop({ id: "space", name: "Space", type: "text" });
    const properties = [priority, space];
    const r = row({ prio: "high", space: "Ops" });

    expect(
      resolveBarExtras(r, properties, ["prio", "space"], ["prio"], 2),
    ).toEqual(["High"]);

    // undefined visible → legacy barPropertyIds
    expect(
      resolveBarExtras(r, properties, ["prio", "space"], undefined, 2),
    ).toEqual(["High", "Ops"]);

    // explicit empty visible → title-only (ignore legacy)
    expect(
      resolveBarExtras(r, properties, ["prio", "space"], [], 2),
    ).toEqual([]);
  });

  it("orders by propertyOrder when provided", () => {
    const a = prop({ id: "a", name: "A", type: "text" });
    const b = prop({ id: "b", name: "B", type: "text" });
    const properties = [a, b];
    const r = row({ a: "A1", b: "B1" });
    expect(
      resolveEffectiveBarPropertyIds({
        properties,
        visiblePropertyIds: ["a", "b"],
        propertyOrder: ["b", "a"],
      }),
    ).toEqual(["b", "a"]);
    expect(
      resolveBarExtras(r, properties, undefined, ["a", "b"], 2, ["b", "a"]),
    ).toEqual(["B1", "A1"]);
  });
});
