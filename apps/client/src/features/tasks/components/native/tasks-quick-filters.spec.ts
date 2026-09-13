import { describe, expect, it } from "vitest";
import {
  composeTaskDisplayFilter,
  parseQuickFiltersFromSearch,
} from "@/features/tasks/components/native/tasks-quick-filters";
import { SYS } from "@/features/tasks/adapter/tasks-native-ui-adapter";
import type { FilterGroup } from "@/ee/base/types/base.types";

describe("tasks-quick-filters", () => {
  it("parses URL assignee and space", () => {
    expect(parseQuickFiltersFromSearch("?assignee=u1,u2&space=s1")).toEqual({
      assigneeIds: ["u1", "u2"],
      spaceId: "s1",
    });
    expect(parseQuickFiltersFromSearch("")).toEqual({
      assigneeIds: [],
      spaceId: null,
    });
  });

  it("composes view filter AND quick filters without mutating view", () => {
    const viewFilter: FilterGroup = {
      op: "and",
      children: [{ propertyId: SYS.status, op: "eq", value: "todo" }],
    };
    const composed = composeTaskDisplayFilter(viewFilter, {
      assigneeIds: ["u1"],
      spaceId: "s1",
      spaceName: "BinHôme",
    });
    expect(composed?.op).toBe("and");
    expect(composed?.children).toHaveLength(3);
    expect(viewFilter.children).toHaveLength(1);
  });

  it("returns view filter alone when quick empty", () => {
    const viewFilter: FilterGroup = {
      op: "and",
      children: [{ propertyId: SYS.status, op: "eq", value: "todo" }],
    };
    expect(
      composeTaskDisplayFilter(viewFilter, {
        assigneeIds: [],
        spaceId: null,
        spaceName: null,
      }),
    ).toBe(viewFilter);
  });
});
