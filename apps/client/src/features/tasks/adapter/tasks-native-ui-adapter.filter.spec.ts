import { describe, expect, it } from "vitest";
import { matchTaskRowFilter } from "./tasks-native-ui-adapter";
import type { FilterNode, IBaseRow } from "@/ee/base/types/base.types";

function row(cells: Record<string, unknown>, id = "t1"): IBaseRow {
  return {
    id,
    pageId: "p1",
    cells: {
      "sys:title": "Task",
      "sys:status": "todo",
      "sys:assignees": [],
      "sys:dueDate": null,
      ...cells,
    },
    position: "a0",
    creatorId: "u0",
    lastUpdatedById: null,
    workspaceId: "w1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("matchTaskRowFilter seeded views", () => {
  it("matches mine assignees any", () => {
    const filter: FilterNode = {
      op: "and",
      children: [
        { propertyId: "sys:assignees", op: "any", value: ["u1"] },
      ],
    };
    expect(
      matchTaskRowFilter(row({ "sys:assignees": ["u1", "u2"] }), filter),
    ).toBe(true);
    expect(
      matchTaskRowFilter(row({ "sys:assignees": ["u2"] }), filter),
    ).toBe(false);
  });

  it("matches overdue before today and not done", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const filter: FilterNode = {
      op: "and",
      children: [
        {
          propertyId: "sys:dueDate",
          op: "before",
          value: { mode: "relative", preset: "today" },
        },
        { propertyId: "sys:status", op: "neq", value: "done" },
      ],
    };
    expect(
      matchTaskRowFilter(
        row({
          "sys:dueDate": yesterday.toISOString(),
          "sys:status": "todo",
        }),
        filter,
      ),
    ).toBe(true);
    expect(
      matchTaskRowFilter(
        row({
          "sys:dueDate": yesterday.toISOString(),
          "sys:status": "done",
        }),
        filter,
      ),
    ).toBe(false);
    expect(
      matchTaskRowFilter(
        row({
          "sys:dueDate": tomorrow.toISOString(),
          "sys:status": "todo",
        }),
        filter,
      ),
    ).toBe(false);
  });
});

describe("matchTaskRowFilter person eq (Base arrayOfIdsCondition)", () => {
  const cedric = "019f40b6-80de-770e-b2d0-152d2f94b086";
  const matteo = "01a00a3f-fcd4-7afe-9f63-fe3066aeebe4";

  it("eq with scalar userId matches multi-assignee cell containing that id", () => {
    // Prod views store: { op: "eq", value: "<userId>", propertyId: "sys:assignees" }
    const filter: FilterNode = {
      op: "and",
      children: [{ propertyId: "sys:assignees", op: "eq", value: cedric }],
    };
    expect(
      matchTaskRowFilter(row({ "sys:assignees": [cedric] }), filter),
    ).toBe(true);
    expect(
      matchTaskRowFilter(row({ "sys:assignees": [cedric, matteo] }), filter),
    ).toBe(true);
    expect(
      matchTaskRowFilter(row({ "sys:assignees": [matteo] }), filter),
    ).toBe(false);
    expect(matchTaskRowFilter(row({ "sys:assignees": [] }), filter)).toBe(
      false,
    );
  });

  it("neq excludes rows that contain the user", () => {
    const filter: FilterNode = {
      propertyId: "sys:assignees",
      op: "neq",
      value: cedric,
    };
    expect(matchTaskRowFilter(row({ "sys:assignees": [matteo] }), filter)).toBe(
      true,
    );
    expect(matchTaskRowFilter(row({ "sys:assignees": [] }), filter)).toBe(true);
    expect(
      matchTaskRowFilter(row({ "sys:assignees": [cedric, matteo] }), filter),
    ).toBe(false);
  });

  it("isEmpty / isNotEmpty", () => {
    expect(
      matchTaskRowFilter(row({ "sys:assignees": [] }), {
        propertyId: "sys:assignees",
        op: "isEmpty",
        value: null,
      }),
    ).toBe(true);
    expect(
      matchTaskRowFilter(row({ "sys:assignees": [cedric] }), {
        propertyId: "sys:assignees",
        op: "isNotEmpty",
        value: null,
      }),
    ).toBe(true);
  });

  it("none (Is none of) with array operand", () => {
    const filter: FilterNode = {
      propertyId: "sys:assignees",
      op: "none",
      value: [cedric, matteo],
    };
    expect(matchTaskRowFilter(row({ "sys:assignees": ["other"] }), filter)).toBe(
      true,
    );
    expect(matchTaskRowFilter(row({ "sys:assignees": [cedric] }), filter)).toBe(
      false,
    );
  });
});
