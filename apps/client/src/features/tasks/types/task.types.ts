export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "none" | "low" | "medium" | "high" | "urgent";
export type TaskViewType = "table" | "kanban";
export type TaskDueFilter = "overdue" | "today" | "upcoming";
/** Global /tasks scope tabs (not table|kanban). */
export type TaskScopeFilter = "all" | "mine" | "overdue";

export type TaskPropertyType =
  | "text"
  | "long_text"
  | "number"
  | "select"
  | "multi_select"
  | "date"
  | "person"
  | "page";

export interface TaskPropertyOption {
  id: string;
  propertyId: string;
  name: string;
  color?: string | null;
  position: string;
}

export interface TaskProperty {
  id: string;
  workspaceId: string;
  spaceId: string;
  name: string;
  type: TaskPropertyType;
  config: Record<string, unknown>;
  position: string;
  createdAt: string;
  updatedAt: string;
  options?: TaskPropertyOption[];
}

export interface TaskPropertyValue {
  taskId: string;
  propertyId: string;
  valueText?: string | null;
  valueNumber?: number | null;
  valueTimestamptz?: string | null;
  valueJson?: unknown | null;
}

export interface TaskAssignee {
  id: string;
  name: string;
  avatarUrl?: string | null;
  email?: string;
}

export interface TaskSpaceRef {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
}

export interface TaskLinkedPage {
  id: string;
  title: string | null;
  slugId: string;
  spaceSlug: string | null;
}

export interface TaskItem {
  id: string;
  workspaceId: string;
  spaceId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  dueDate?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  linkedPageId?: string | null;
  assignees?: TaskAssignee[];
  space?: TaskSpaceRef | null;
  linkedPage?: TaskLinkedPage | null;
}

export interface TaskViewConfig {
  sorts?: unknown;
  filter?: unknown;
  groupBy?: "status";
  visibleColumnIds?: string[];
  /** Custom task_properties ids shown on table/kanban cards. */
  visiblePropertyIds?: string[];
}

export interface TaskItemWithProperties extends TaskItem {
  propertyValues?: TaskPropertyValue[];
}

export interface TaskView {
  id: string;
  workspaceId: string;
  spaceId?: string | null;
  ownerUserId?: string | null;
  name: string;
  type: TaskViewType;
  config: TaskViewConfig;
  position: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListTasksParams {
  spaceId?: string;
  assignee?: "me" | string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due?: TaskDueFilter;
  query?: string;
  limit?: number;
  cursor?: string;
}

export interface CreateTaskParams {
  spaceId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  progress?: number;
  dueDate?: string | null;
  assigneeIds?: string[];
  linkedPageId?: string | null;
}

export interface UpdateTaskParams {
  taskId: string;
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  progress?: number;
  dueDate?: string | null;
  assigneeIds?: string[];
  linkedPageId?: string | null;
}

export interface CreateTaskViewParams {
  spaceId?: string;
  name: string;
  type: TaskViewType;
  config?: TaskViewConfig;
  position?: string;
  shared?: boolean;
}

export interface CreateTaskPropertyParams {
  spaceId: string;
  name: string;
  type: TaskPropertyType;
  config?: Record<string, unknown>;
  options?: { name: string; color?: string }[];
}

export interface UpdateTaskPropertyParams {
  propertyId: string;
  name?: string;
  config?: Record<string, unknown>;
  position?: string;
  options?: { id?: string; name: string; color?: string | null; position?: string }[];
}

export interface SetTaskPropertyValueParams {
  taskId: string;
  propertyId: string;
  valueText?: string | null;
  valueNumber?: number | null;
  valueTimestamptz?: string | null;
  valueJson?: unknown | null;
}
