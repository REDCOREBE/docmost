import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createTask,
  createTaskView,
  deleteTask,
  deleteTaskView,
  getTaskViews,
  getTasks,
  updateTask,
  updateTaskView,
} from "../services/task-service";
import {
  CreateTaskParams,
  CreateTaskViewParams,
  ListTasksParams,
  UpdateTaskParams,
} from "../types/task.types";

export function tasksQueryKey(params: ListTasksParams) {
  return ["tasks", params] as const;
}

export function useTasksQuery(params: ListTasksParams) {
  return useInfiniteQuery({
    queryKey: tasksQueryKey(params),
    queryFn: ({ pageParam }) =>
      getTasks({ ...params, cursor: pageParam, limit: params.limit ?? 50 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? lastPage.meta.nextCursor : undefined,
  });
}

export function useTaskViewsQuery(spaceId?: string) {
  return useQuery({
    queryKey: ["task-views", spaceId ?? "global"],
    queryFn: () => getTaskViews(spaceId),
  });
}

export function useCreateTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaskParams) => createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useUpdateTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateTaskParams) => updateTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useCreateTaskViewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaskViewParams) => createTaskView(data),
    onSuccess: (_r, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["task-views", variables.spaceId ?? "global"],
      });
    },
  });
}

export function useUpdateTaskViewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTaskView,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-views"] });
    },
  });
}

export function useDeleteTaskViewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (viewId: string) => deleteTaskView(viewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-views"] });
    },
  });
}
