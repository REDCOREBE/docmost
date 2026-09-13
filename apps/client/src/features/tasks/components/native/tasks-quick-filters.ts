import type {
  FilterCondition,
  FilterGroup,
  FilterNode,
} from "@/ee/base/types/base.types";
import { SYS } from "@/features/tasks/adapter/tasks-native-ui-adapter";

export type TasksQuickFilterState = {
  /** User ids (URL: assignee=id1,id2). */
  assigneeIds: string[];
  /** Space id from accessible spaces (URL: space=<id>). */
  spaceId: string | null;
  /** Resolved display name for sys:space cell (name-backed today). */
  spaceName: string | null;
};

export function parseQuickFiltersFromSearch(
  search: string,
): Pick<TasksQuickFilterState, "assigneeIds" | "spaceId"> {
  const params = new URLSearchParams(search);
  const assigneeRaw = params.get("assignee") ?? "";
  const assigneeIds = assigneeRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const spaceId = params.get("space")?.trim() || null;
  return { assigneeIds, spaceId };
}

export function writeQuickFiltersToUrl(input: {
  assigneeIds: string[];
  spaceId: string | null;
}): void {
  const url = new URL(window.location.href);
  if (input.assigneeIds.length > 0) {
    url.searchParams.set("assignee", input.assigneeIds.join(","));
  } else {
    url.searchParams.delete("assignee");
  }
  if (input.spaceId) {
    url.searchParams.set("space", input.spaceId);
  } else {
    url.searchParams.delete("space");
  }
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
}

function asCondition(node: FilterCondition): FilterNode {
  return node;
}

/**
 * Compose persisted view filter with ephemeral Person / Space quick filters.
 * Does not mutate view.config — caller must keep this off the draft/dirty path.
 */
export function composeTaskDisplayFilter(
  viewFilter: FilterGroup | undefined,
  quick: TasksQuickFilterState,
): FilterGroup | undefined {
  const extras: FilterNode[] = [];

  if (quick.assigneeIds.length > 0) {
    extras.push(
      asCondition({
        propertyId: SYS.assignees,
        op: "any",
        value: quick.assigneeIds,
      }),
    );
  }

  if (quick.spaceId && quick.spaceName) {
    extras.push(
      asCondition({
        propertyId: SYS.space,
        op: "eq",
        value: quick.spaceName,
      }),
    );
  }

  if (extras.length === 0) return viewFilter;

  const children: FilterNode[] = [];
  if (viewFilter) children.push(viewFilter);
  children.push(...extras);
  return { op: "and", children };
}
