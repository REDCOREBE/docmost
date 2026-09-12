import api from "@/lib/api-client";
import { IPagination } from "@/lib/types.ts";
import {
  CreateTaskParams,
  CreateTaskPropertyParams,
  CreateTaskViewParams,
  ListTasksParams,
  SetTaskPropertyValueParams,
  TaskItem,
  TaskProperty,
  TaskView,
  UpdateTaskParams,
  UpdateTaskPropertyParams,
} from "../types/task.types";

export async function getTasks(
  params: ListTasksParams = {},
): Promise<IPagination<TaskItem>> {
  const req = await api.post<IPagination<TaskItem>>("/tasks", params);
  return req.data;
}

export async function getTaskInfo(taskId: string): Promise<TaskItem> {
  const req = await api.post<TaskItem>("/tasks/info", { taskId });
  return req.data;
}

export async function createTask(params: CreateTaskParams): Promise<TaskItem> {
  const req = await api.post<TaskItem>("/tasks/create", params);
  return req.data;
}

export async function updateTask(params: UpdateTaskParams): Promise<TaskItem> {
  const req = await api.post<TaskItem>("/tasks/update", params);
  return req.data;
}

export async function deleteTask(taskId: string): Promise<void> {
  await api.post("/tasks/delete", { taskId });
}

export async function getTaskViews(spaceId?: string): Promise<TaskView[]> {
  const req = await api.post<TaskView[]>("/tasks/views", { spaceId });
  return req.data;
}

export async function createTaskView(
  params: CreateTaskViewParams,
): Promise<TaskView> {
  const req = await api.post<TaskView>("/tasks/views/create", params);
  return req.data;
}

export async function updateTaskView(params: {
  viewId: string;
  name?: string;
  type?: TaskView["type"];
  config?: TaskView["config"];
  position?: string;
}): Promise<TaskView> {
  const req = await api.post<TaskView>("/tasks/views/update", params);
  return req.data;
}

export async function deleteTaskView(viewId: string): Promise<void> {
  await api.post("/tasks/views/delete", { viewId });
}

export async function getTaskProperties(
  spaceId: string,
): Promise<TaskProperty[]> {
  const req = await api.post<TaskProperty[]>("/tasks/properties", { spaceId });
  return req.data;
}

export async function createTaskProperty(
  params: CreateTaskPropertyParams,
): Promise<TaskProperty> {
  const req = await api.post<TaskProperty>("/tasks/properties/create", params);
  return req.data;
}

export async function updateTaskProperty(
  params: UpdateTaskPropertyParams,
): Promise<TaskProperty> {
  const req = await api.post<TaskProperty>("/tasks/properties/update", params);
  return req.data;
}

export async function deleteTaskProperty(propertyId: string): Promise<void> {
  await api.post("/tasks/properties/delete", { propertyId });
}

export async function setTaskPropertyValue(
  params: SetTaskPropertyValueParams,
): Promise<unknown> {
  const req = await api.post("/tasks/properties/value", params);
  return req.data;
}
