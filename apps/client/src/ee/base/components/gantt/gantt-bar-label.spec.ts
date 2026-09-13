import { describe, expect, it } from "vitest";
import {
  formatBarPropertyValue,
  maxBarExtras,
  resolveBarExtras,
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

  it("respects visiblePropertyIds gate", () => {
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

    expect(
      resolveBarExtras(r, properties, ["prio", "space"], undefined, 2),
    ).toEqual(["High", "Ops"]);

    expect(
      resolveBarExtras(r, properties, ["prio", "space"], [], 2),
    ).toEqual([]);
  });
});
