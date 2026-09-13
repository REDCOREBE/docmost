/**
 * TasksNativeUiAdapter — maps Task domain ↔ Base-shaped UI contracts.
 * Mutations must go through Task API only (never base-service / base_*).
 */
import type {
  BasePropertyType,
  Choice,
  IBase,
  IBaseProperty,
  IBaseRow,
  IBaseView,
  SelectTypeOptions,
  UserRef,
  ViewConfig,
} from "@/ee/base/types/base.types";
import type {
  TaskItem,
  TaskItemWithProperties,
  TaskPriority,
  TaskProperty,
  TaskPropertyType,
  TaskPropertyValue,
  TaskStatus,
  TaskView,
  TaskViewType,
} from "../types/task.types";

/** Stable synthetic property ids for task_items columns. */
export const SYS = {
  title: "sys:title",
  status: "sys:status",
  priority: "sys:priority",
  progress: "sys:progress",
  startDate: "sys:startDate",
  dueDate: "sys:dueDate",
  assignees: "sys:assignees",
  linkedPage: "sys:linkedPage",
  space: "sys:space",
} as const;

export type SysPropertyId = (typeof SYS)[keyof typeof SYS];

const STATUS_CHOICES: Choice[] = [
  { id: "todo", name: "Todo", color: "gray", category: "todo" },
  {
    id: "in_progress",
    name: "In progress",
    color: "blue",
    category: "inProgress",
  },
  { id: "done", name: "Done", color: "green", category: "complete" },
];

const PRIORITY_CHOICES: Choice[] = [
  { id: "none", name: "None", color: "gray" },
  { id: "low", name: "Low", color: "blue" },
  { id: "medium", name: "Medium", color: "yellow" },
  { id: "high", name: "High", color: "orange" },
  { id: "urgent", name: "Urgent", color: "red" },
];

export function mapTaskPropertyType(type: TaskPropertyType): BasePropertyType {
  switch (type) {
    case "long_text":
      return "longText";
    case "multi_select":
      return "multiSelect";
    default:
      return type;
  }
}

export function mapBasePropertyTypeToTask(
  type: BasePropertyType,
): TaskPropertyType | null {
  switch (type) {
    case "text":
    case "number":
    case "select":
    case "date":
    case "person":
    case "page":
      return type;
    case "longText":
      return "long_text";
    case "multiSelect":
      return "multi_select";
    case "status":
      return "select";
    default:
      return null;
  }
}

function prop(
  partial: Omit<IBaseProperty, "createdAt" | "updatedAt" | "workspaceId"> & {
    workspaceId?: string;
  },
  workspaceId: string,
): IBaseProperty {
  const result: IBaseProperty = {
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    workspaceId,
    typeOptions: {},
    ...partial,
  };
  // Page cells use useBaseQuery(property.pageId); keep empty so Tasks never hits /api/bases.
  // Person/other cells use the real Tasks pageId as referenceStore key.
  if (result.type === "page") {
    result.pageId = "";
  }
  return result;
}

export function buildSystemProperties(opts: {
  pageId: string;
  workspaceId: string;
  includeSpace: boolean;
}): IBaseProperty[] {
  const { pageId, workspaceId, includeSpace } = opts;
  const list: IBaseProperty[] = [
    prop(
      {
        id: SYS.title,
        pageId,
        name: "Title",
        type: "text",
        position: "a0",
        typeOptions: {},
        isPrimary: true,
      },
      workspaceId,
    ),
    prop(
      {
        id: SYS.status,
        pageId,
        name: "Status",
        type: "status",
        position: "a1",
        typeOptions: {
          choices: STATUS_CHOICES,
          choiceOrder: STATUS_CHOICES.map((c) => c.id),
        } satisfies SelectTypeOptions,
        isPrimary: false,
      },
      workspaceId,
    ),
    prop(
      {
        id: SYS.priority,
        pageId,
        name: "Priority",
        type: "select",
        position: "a2",
        typeOptions: {
          choices: PRIORITY_CHOICES,
          choiceOrder: PRIORITY_CHOICES.map((c) => c.id),
        } satisfies SelectTypeOptions,
        isPrimary: false,
      },
      workspaceId,
    ),
    prop(
      {
        id: SYS.progress,
        pageId,
        name: "Progress",
        type: "number",
        position: "a3",
        typeOptions: { format: "progress" },
        isPrimary: false,
      },
      workspaceId,
    ),
    prop(
      {
        id: SYS.startDate,
        pageId,
        name: "Start date",
        type: "date",
        position: "a3b",
        typeOptions: {},
        isPrimary: false,
      },
      workspaceId,
    ),
    prop(
      {
        id: SYS.dueDate,
        pageId,
        name: "Due date",
        type: "date",
        position: "a4",
        typeOptions: {},
        isPrimary: false,
      },
      workspaceId,
    ),
    prop(
      {
        id: SYS.assignees,
        pageId,
        name: "Assignees",
        type: "person",
        position: "a5",
        typeOptions: { allowMultiple: true },
        isPrimary: false,
      },
      workspaceId,
    ),
    prop(
      {
        id: SYS.linkedPage,
        pageId,
        name: "Page",
        type: "page",
        position: "a6",
        typeOptions: {},
        isPrimary: false,
      },
      workspaceId,
    ),
  ];
  if (includeSpace) {
    list.push(
      prop(
        {
          id: SYS.space,
          pageId,
          name: "Space",
          type: "text",
          position: "a7",
          typeOptions: {},
          isPrimary: false,
        },
        workspaceId,
      ),
    );
  }
  return list;
}

export function mapTaskPropertyToBase(
  property: TaskProperty,
  pageId: string,
): IBaseProperty {
  const baseType = mapTaskPropertyType(property.type);
  let typeOptions: IBaseProperty["typeOptions"] = {};
  if (
    (baseType === "select" ||
      baseType === "multiSelect" ||
      baseType === "status") &&
    property.options?.length
  ) {
    const choices: Choice[] = property.options.map((o) => ({
      id: o.id,
      name: o.name,
      color: o.color ?? "gray",
    }));
    typeOptions = {
      choices,
      choiceOrder: property.options.map((o) => o.id),
    } satisfies SelectTypeOptions;
  }
  if (baseType === "person") {
    typeOptions = { allowMultiple: true };
  }
  return {
    id: property.id,
    pageId: baseType === "page" ? "" : pageId,
    name: property.name,
    type: baseType,
    position: property.position,
    typeOptions,
    isPrimary: false,
    workspaceId: property.workspaceId,
    createdAt: property.createdAt,
    updatedAt: property.updatedAt,
  };
}

function cellFromPropertyValue(
  property: TaskProperty,
  value: TaskPropertyValue | undefined,
): unknown {
  if (!value) return null;
  const baseType = mapTaskPropertyType(property.type);
  switch (baseType) {
    case "text":
    case "longText":
      return value.valueText ?? null;
    case "number":
      return value.valueNumber ?? null;
    case "date":
      return value.valueTimestamptz ?? null;
    case "select":
    case "status": {
      const j = value.valueJson;
      if (typeof j === "string") return j;
      if (j && typeof j === "object" && "optionId" in (j as object)) {
        return (j as { optionId: string }).optionId;
      }
      return value.valueText ?? null;
    }
    case "multiSelect": {
      if (Array.isArray(value.valueJson)) return value.valueJson;
      return null;
    }
    case "person": {
      if (Array.isArray(value.valueJson)) return value.valueJson;
      return null;
    }
    case "page": {
      const j = value.valueJson;
      if (typeof j === "string") return j;
      if (j && typeof j === "object" && "pageId" in (j as object)) {
        return (j as { pageId: string }).pageId;
      }
      return null;
    }
    default:
      return value.valueJson ?? value.valueText ?? null;
  }
}

export function mapTaskToBaseRow(
  task: TaskItem | TaskItemWithProperties,
  pageId: string,
  customProperties: TaskProperty[] = [],
): IBaseRow {
  const withProps = task as TaskItemWithProperties;
  const valueByProp = new Map(
    (withProps.propertyValues ?? []).map((v) => [v.propertyId, v]),
  );

  const cells: Record<string, unknown> = {
    [SYS.title]: task.title,
    [SYS.status]: task.status,
    [SYS.priority]: task.priority,
    [SYS.progress]: task.progress,
    [SYS.startDate]: task.startDate ?? null,
    [SYS.dueDate]: task.dueDate ?? null,
    [SYS.assignees]: (task.assignees ?? []).map((a) => a.id),
    [SYS.linkedPage]: task.linkedPageId ?? null,
    [SYS.space]: task.space?.name ?? null,
  };

  for (const p of customProperties) {
    cells[p.id] = cellFromPropertyValue(p, valueByProp.get(p.id));
  }

  return {
    id: task.id,
    pageId,
    cells,
    position: task.createdAt,
    creatorId: task.createdById ?? "",
    lastUpdatedById: null,
    workspaceId: task.workspaceId,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

/**
 * Unique UserRefs from task assignee payloads for referenceStore hydration.
 * No extra fetch — only users already present on accessible tasks.
 */
export function collectAssigneeUserRefs(
  tasks: Array<Pick<TaskItem, "assignees">>,
): UserRef[] {
  const byId = new Map<string, UserRef>();
  for (const task of tasks) {
    for (const a of task.assignees ?? []) {
      if (!a?.id || byId.has(a.id)) continue;
      const name =
        typeof a.name === "string" && a.name.trim().length > 0
          ? a.name.trim()
          : null;
      byId.set(a.id, {
        id: a.id,
        name,
        avatarUrl: a.avatarUrl ?? null,
      });
    }
  }
  return [...byId.values()];
}

export function mapTaskViewToBaseView(
  view: TaskView,
  pageId: string,
): IBaseView {
  const config = (view.config ?? {}) as ViewConfig;
  const type: IBaseView["type"] =
    view.type === "kanban"
      ? "kanban"
      : view.type === "gantt"
        ? "gantt"
        : "table";
  const ganttDefaults =
    type === "gantt"
      ? {
          startPropertyId: SYS.startDate,
          endPropertyId: SYS.dueDate,
          zoom: "week" as const,
          showToday: true,
          showWeekends: true,
          barPropertyIds: [] as string[],
        }
      : undefined;
  return {
    id: view.id,
    pageId,
    name: view.name,
    type,
    config: {
      ...config,
      groupByPropertyId:
        config.groupByPropertyId ??
        (view.type === "kanban" ? SYS.status : undefined),
      visiblePropertyIds:
        config.visiblePropertyIds ??
        (view.config as { visiblePropertyIds?: string[] })?.visiblePropertyIds,
      gantt:
        type === "gantt"
          ? {
              ...ganttDefaults!,
              ...config.gantt,
              startPropertyId:
                config.gantt?.startPropertyId ?? SYS.startDate,
              endPropertyId: config.gantt?.endPropertyId ?? SYS.dueDate,
            }
          : config.gantt,
    },
    position: view.position,
    workspaceId: view.workspaceId,
    creatorId: view.ownerUserId ?? "",
    createdAt: view.createdAt,
    updatedAt: view.updatedAt,
  };
}

export function buildTasksBase(opts: {
  pageId: string;
  workspaceId: string;
  spaceId: string;
  name: string;
  includeSpace: boolean;
  customProperties: TaskProperty[];
  views: TaskView[];
  canEdit: boolean;
}): IBase {
  const {
    pageId,
    workspaceId,
    spaceId,
    name,
    includeSpace,
    customProperties,
    views,
    canEdit,
  } = opts;

  const properties = [
    ...buildSystemProperties({ pageId, workspaceId, includeSpace }),
    ...customProperties.map((p) => mapTaskPropertyToBase(p, pageId)),
  ];

  // Real task_views only — server lazy-seeds defaults; no client builtins.
  const mappedViews = views.map((v) => mapTaskViewToBaseView(v, pageId));

  return {
    id: pageId,
    slugId: pageId.slice(0, 10),
    name,
    spaceId,
    workspaceId,
    creatorId: "",
    properties,
    views: mappedViews,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    permissions: { canEdit, hasRestriction: false },
    baseSchemaVersion: 1,
  };
}

export function isSysPropertyId(id: string): id is SysPropertyId {
  return (Object.values(SYS) as string[]).includes(id);
}

export type TaskCellMutation =
  | {
      kind: "system";
      patch: {
        title?: string;
        status?: TaskStatus;
        priority?: TaskPriority;
        progress?: number;
        startDate?: string | null;
        dueDate?: string | null;
        assigneeIds?: string[];
        linkedPageId?: string | null;
      };
    }
  | {
      kind: "property";
      propertyId: string;
      valueText?: string | null;
      valueNumber?: number | null;
      valueTimestamptz?: string | null;
      valueJson?: unknown | null;
    };

export function cellUpdateToTaskMutation(
  propertyId: string,
  value: unknown,
  customProperties: TaskProperty[],
): TaskCellMutation | null {
  if (propertyId === SYS.title) {
    return {
      kind: "system",
      patch: { title: typeof value === "string" ? value : "" },
    };
  }
  if (propertyId === SYS.status) {
    return {
      kind: "system",
      patch: { status: (value as TaskStatus) || "todo" },
    };
  }
  if (propertyId === SYS.priority) {
    return {
      kind: "system",
      patch: { priority: (value as TaskPriority) || "none" },
    };
  }
  if (propertyId === SYS.progress) {
    const n = typeof value === "number" ? value : Number(value);
    return {
      kind: "system",
      patch: { progress: Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0 },
    };
  }
  if (propertyId === SYS.startDate) {
    return {
      kind: "system",
      patch: {
        startDate: value == null || value === "" ? null : String(value),
      },
    };
  }
  if (propertyId === SYS.dueDate) {
    return {
      kind: "system",
      patch: {
        dueDate: value == null || value === "" ? null : String(value),
      },
    };
  }
  if (propertyId === SYS.assignees) {
    const ids = Array.isArray(value) ? (value as string[]) : [];
    return { kind: "system", patch: { assigneeIds: ids } };
  }
  if (propertyId === SYS.linkedPage) {
    return {
      kind: "system",
      patch: {
        linkedPageId: value == null || value === "" ? null : String(value),
      },
    };
  }
  if (propertyId === SYS.space) {
    return null;
  }

  const property = customProperties.find((p) => p.id === propertyId);
  if (!property) return null;
  const baseType = mapTaskPropertyType(property.type);
  switch (baseType) {
    case "text":
    case "longText":
      return {
        kind: "property",
        propertyId,
        valueText: value == null ? null : String(value),
        valueJson: null,
        valueNumber: null,
        valueTimestamptz: null,
      };
    case "number":
      return {
        kind: "property",
        propertyId,
        valueNumber:
          value == null || value === "" ? null : Number(value),
        valueText: null,
        valueJson: null,
        valueTimestamptz: null,
      };
    case "date":
      return {
        kind: "property",
        propertyId,
        valueTimestamptz: value == null || value === "" ? null : String(value),
        valueText: null,
        valueNumber: null,
        valueJson: null,
      };
    case "select":
    case "status":
      return {
        kind: "property",
        propertyId,
        valueJson: value == null ? null : value,
        valueText: null,
        valueNumber: null,
        valueTimestamptz: null,
      };
    case "multiSelect":
    case "person":
      return {
        kind: "property",
        propertyId,
        valueJson: value == null ? null : value,
        valueText: null,
        valueNumber: null,
        valueTimestamptz: null,
      };
    case "page":
      return {
        kind: "property",
        propertyId,
        valueJson:
          value == null || value === ""
            ? null
            : typeof value === "string"
              ? { pageId: value }
              : value,
        valueText: null,
        valueNumber: null,
        valueTimestamptz: null,
      };
    default:
      return null;
  }
}

export function viewTypeFromBase(type: IBaseView["type"]): TaskViewType {
  if (type === "kanban") return "kanban";
  if (type === "gantt") return "gantt";
  return "table";
}

/** Normalize filter operands the same way Base engine `asStringArray` does. */
export function asStringArray(val: unknown): string[] {
  if (val == null) return [];
  if (Array.isArray(val)) {
    return val.filter((v) => v != null).map(String);
  }
  return [String(val)];
}

function cellIdList(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.filter((v) => v != null).map(String);
}

/**
 * Client-side filter evaluator for Tasks rows (Table + KanbanColumn ports.filterRows).
 * Person / multi-id cells mirror Base `arrayOfIdsCondition` (multi person):
 * - eq / "Is" → cell contains all operand id(s) (@> semantics)
 * - neq → empty OR not contains
 * - any → intersects
 * - none → empty OR no intersection
 */
export function matchTaskRowFilter(
  row: IBaseRow,
  filter: import("@/ee/base/types/base.types").FilterNode | undefined,
): boolean {
  if (!filter) return true;
  if ("children" in filter) {
    if (filter.children.length === 0) return true;
    if (filter.op === "and") {
      return filter.children.every((c) => matchTaskRowFilter(row, c));
    }
    return filter.children.some((c) => matchTaskRowFilter(row, c));
  }
  const raw = row.cells[filter.propertyId];
  const ids = cellIdList(raw);
  const empty =
    raw == null ||
    raw === "" ||
    (Array.isArray(raw) && raw.length === 0);
  switch (filter.op) {
    case "eq": {
      if (ids) {
        const needles = asStringArray(filter.value);
        if (needles.length === 0) return false;
        return needles.every((n) => ids.includes(n));
      }
      if (filter.value == null) return false;
      return String(raw) === String(filter.value);
    }
    case "neq": {
      if (ids) {
        const needles = asStringArray(filter.value);
        if (needles.length === 0) return false;
        if (ids.length === 0) return true;
        return !needles.every((n) => ids.includes(n));
      }
      if (filter.value == null) return false;
      return raw == null || String(raw) !== String(filter.value);
    }
    case "isEmpty":
      return empty;
    case "isNotEmpty":
      return !empty;
    case "contains":
      return (
        typeof raw === "string" &&
        typeof filter.value === "string" &&
        raw.toLowerCase().includes(filter.value.toLowerCase())
      );
    case "ncontains":
      return (
        typeof raw === "string" &&
        typeof filter.value === "string" &&
        !raw.toLowerCase().includes(filter.value.toLowerCase())
      );
    case "any": {
      if (!ids) return false;
      const needles = asStringArray(filter.value);
      if (needles.length === 0) return false;
      return needles.some((n) => ids.includes(n));
    }
    case "none": {
      const needles = asStringArray(filter.value);
      if (needles.length === 0) return true;
      if (!ids || ids.length === 0) return true;
      return !needles.some((n) => ids.includes(n));
    }
    case "before":
    case "after":
    case "onOrBefore":
    case "onOrAfter": {
      if (raw == null || raw === "") return false;
      const cellTime = Date.parse(String(raw));
      if (Number.isNaN(cellTime)) return false;
      const bound = resolveFilterDateBound(filter.value);
      if (bound == null) return true;
      if (filter.op === "before") return cellTime < bound;
      if (filter.op === "after") return cellTime > bound;
      if (filter.op === "onOrBefore") return cellTime <= bound;
      return cellTime >= bound;
    }
    default:
      return true;
  }
}

/** Resolve Base DateFilterValue (or ISO string) to a UTC ms bound. */
function resolveFilterDateBound(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : t;
  }
  if (typeof value !== "object") return null;
  const v = value as {
    mode?: string;
    preset?: string;
    date?: string;
  };
  if (v.mode === "exact" && typeof v.date === "string") {
    const t = Date.parse(v.date);
    return Number.isNaN(t) ? null : t;
  }
  if (v.mode === "relative" && v.preset === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  return null;
}

export function filterTaskRows(
  rows: IBaseRow[],
  _pageId: string,
  filter: import("@/ee/base/types/base.types").FilterNode | undefined,
): IBaseRow[] {
  return rows.filter((r) => matchTaskRowFilter(r, filter));
}
