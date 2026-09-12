export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "none" | "low" | "medium" | "high" | "urgent";
export type TaskViewType = "table" | "kanban";
export type TaskDueFilter = "overdue" | "today" | "upcoming";

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
