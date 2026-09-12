import { useEffect, useRef, useState } from "react";
import { Group, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { TaskItem, TaskStatus } from "../types/task.types";
import { TasksAssigneeAvatars } from "./tasks-assignee-avatars";
import { TasksPriorityBadge } from "./tasks-priority-badge";
import { TasksProgressBar } from "./tasks-progress-bar";
import { TasksDueDate } from "./tasks-due-date";
import { TasksLinkedPageIcon } from "./tasks-linked-page-icon";
import classes from "../styles/tasks.module.css";

export function TasksKanbanCard({
  task,
  onOpen,
}: {
  task: TaskItem;
  onOpen: (task: TaskItem) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return draggable({
      element: el,
      getInitialData: () => ({
        type: "task-card",
        taskId: task.id,
        status: task.status,
      }),
      onDragStart: () => setDragging(true),
      onDrop: () => setDragging(false),
    });
  }, [task.id, task.status]);

  return (
    <UnstyledButton
      ref={ref}
      className={`${classes.card} ${dragging ? classes.cardDragging : ""}`}
      onClick={() => onOpen(task)}
    >
      <Group justify="space-between" mb={6} wrap="nowrap">
        <Text size="sm" fw={600} lineClamp={2}>
          {task.title}
        </Text>
        <TasksLinkedPageIcon linkedPage={task.linkedPage} />
      </Group>
      <Group gap={6} mb={6}>
        <TasksPriorityBadge priority={task.priority} />
      </Group>
      <TasksProgressBar value={task.progress} />
      <Group justify="space-between" mt={8} wrap="nowrap">
        <TasksAssigneeAvatars assignees={task.assignees} />
        <TasksDueDate dueDate={task.dueDate} />
      </Group>
    </UnstyledButton>
  );
}

export function TasksKanbanColumn({
  status,
  title,
  tasks,
  onOpen,
  onDropTask,
}: {
  status: TaskStatus;
  title: string;
  tasks: TaskItem[];
  onOpen: (task: TaskItem) => void;
  onDropTask: (taskId: string, status: TaskStatus) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isOver, setIsOver] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return combine(
      dropTargetForElements({
        element: el,
        getData: () => ({ type: "task-column", status }),
        canDrop: ({ source }) => source.data.type === "task-card",
        onDragEnter: () => setIsOver(true),
        onDragLeave: () => setIsOver(false),
        onDrop: ({ source }) => {
          setIsOver(false);
          const taskId = source.data.taskId as string;
          if (taskId) onDropTask(taskId, status);
        },
      }),
    );
  }, [status, onDropTask]);

  return (
    <div
      ref={ref}
      className={classes.column}
      style={{
        outline: isOver ? "2px solid var(--mantine-color-blue-5)" : undefined,
      }}
    >
      <div className={classes.columnHeader}>
        {title} ({tasks.length})
      </div>
      <div className={classes.columnBody}>
        {tasks.map((task) => (
          <TasksKanbanCard key={task.id} task={task} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

export function TasksKanban({
  tasks,
  onOpen,
  onStatusChange,
}: {
  tasks: TaskItem[];
  onOpen: (task: TaskItem) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}) {
  const { t } = useTranslation();
  const columns: { status: TaskStatus; title: string }[] = [
    { status: "todo", title: t("To do") },
    { status: "in_progress", title: t("In progress") },
    { status: "done", title: t("Done") },
  ];

  return (
    <div className={classes.board}>
      {columns.map((col) => (
        <TasksKanbanColumn
          key={col.status}
          status={col.status}
          title={col.title}
          tasks={tasks.filter((task) => task.status === col.status)}
          onOpen={onOpen}
          onDropTask={onStatusChange}
        />
      ))}
    </div>
  );
}
