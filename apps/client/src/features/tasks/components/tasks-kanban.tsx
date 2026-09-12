import { useEffect, useRef, useState } from "react";
import { ActionIcon, Menu, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import {
  IconDots,
  IconPlus,
} from "@tabler/icons-react";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { TaskItem, TaskProperty, TaskPropertyValue, TaskStatus } from "../types/task.types";
import { TasksAssigneeAvatars } from "./tasks-assignee-avatars";
import { TasksPriorityBadge } from "./tasks-priority-badge";
import { TasksProgressBar } from "./tasks-progress-bar";
import { TasksDueDate } from "./tasks-due-date";
import { TasksLinkedPageIcon } from "./tasks-linked-page-icon";
import classes from "../styles/tasks.module.css";

const STATUS_DOT: Record<TaskStatus, string> = {
  todo: "var(--mantine-color-gray-5)",
  in_progress: "var(--mantine-color-blue-5)",
  done: "var(--mantine-color-green-5)",
};

function formatVisibleProps(
  task: TaskItem,
  properties: TaskProperty[] | undefined,
  values: TaskPropertyValue[] | undefined,
  visibleIds: string[] | undefined,
) {
  if (!properties?.length || !visibleIds?.length) return [];
  const byId = new Map(properties.map((p) => [p.id, p]));
  const valByProp = new Map((values ?? []).map((v) => [v.propertyId, v]));
  return visibleIds
    .map((id) => {
      const prop = byId.get(id);
      if (!prop || prop.spaceId !== task.spaceId) return null;
      const val = valByProp.get(id);
      let text = "";
      if (val?.valueText) text = val.valueText;
      else if (val?.valueNumber != null) text = String(val.valueNumber);
      else if (val?.valueTimestamptz) text = val.valueTimestamptz.slice(0, 10);
      else if (Array.isArray(val?.valueJson)) text = (val!.valueJson as unknown[]).join(", ");
      if (!text) return null;
      return { id, name: prop.name, text };
    })
    .filter(Boolean) as { id: string; name: string; text: string }[];
}

export function TasksKanbanCard({
  task,
  onOpen,
  canWrite = true,
  showSpace,
  properties,
  propertyValues,
  visiblePropertyIds,
}: {
  task: TaskItem;
  onOpen: (task: TaskItem) => void;
  canWrite?: boolean;
  showSpace?: boolean;
  properties?: TaskProperty[];
  propertyValues?: TaskPropertyValue[];
  visiblePropertyIds?: string[];
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [dragging, setDragging] = useState(false);
  const visible = formatVisibleProps(
    task,
    properties,
    propertyValues ?? (task as any).propertyValues,
    visiblePropertyIds,
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || !canWrite) return;
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
  }, [task.id, task.status, canWrite]);

  return (
    <button
      type="button"
      ref={ref}
      className={`${classes.card} ${dragging ? classes.cardDragging : ""}`}
      onClick={() => onOpen(task)}
      style={canWrite ? undefined : { cursor: "pointer" }}
    >
      {showSpace && task.space?.name && (
        <div className={classes.cardSpace}>{task.space.name}</div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <Text size="sm" fw={600} lineClamp={2} style={{ flex: 1 }}>
          {task.title}
        </Text>
        <TasksLinkedPageIcon linkedPage={task.linkedPage} />
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
        <TasksPriorityBadge priority={task.priority} />
      </div>
      <TasksProgressBar value={task.progress} />
      {visible.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
          {visible.map((v) => (
            <span key={v.id} className={classes.visiblePropChip} title={`${v.name}: ${v.text}`}>
              {v.name}: {v.text}
            </span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, gap: 8 }}>
        <TasksAssigneeAvatars assignees={task.assignees} />
        <TasksDueDate dueDate={task.dueDate} />
      </div>
    </button>
  );
}

export function TasksKanbanColumn({
  status,
  title,
  tasks,
  onOpen,
  onDropTask,
  onAdd,
  canWriteTask,
  canCreate,
  showSpace,
  properties,
  visiblePropertyIds,
}: {
  status: TaskStatus;
  title: string;
  tasks: TaskItem[];
  onOpen: (task: TaskItem) => void;
  onDropTask: (taskId: string, status: TaskStatus) => void;
  onAdd?: (status: TaskStatus) => void;
  canWriteTask?: (task: TaskItem) => boolean;
  canCreate?: boolean;
  showSpace?: boolean;
  properties?: TaskProperty[];
  visiblePropertyIds?: string[];
}) {
  const { t } = useTranslation();
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
      className={`${classes.column} ${isOver ? classes.columnDropActive : ""}`}
    >
      {isOver && <div className={classes.columnDropEdge} style={{ top: 40 }} />}
      <div className={classes.columnHeader}>
        <span
          className={classes.statusDot}
          style={{ background: STATUS_DOT[status] }}
        />
        <span className={classes.columnTitle}>{title}</span>
        <span className={classes.columnCount}>{tasks.length}</span>
        {canCreate && onAdd && (
          <ActionIcon
            variant="subtle"
            size="sm"
            color="gray"
            aria-label={t("New task")}
            onClick={() => onAdd(status)}
          >
            <IconPlus size={16} />
          </ActionIcon>
        )}
        <Menu withinPortal position="bottom-end">
          <Menu.Target>
            <ActionIcon variant="subtle" size="sm" color="gray" aria-label={t("More")}>
              <IconDots size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            {canCreate && onAdd && (
              <Menu.Item leftSection={<IconPlus size={14} />} onClick={() => onAdd(status)}>
                {t("New task")}
              </Menu.Item>
            )}
            <Menu.Item disabled>{t("Column options")}</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>
      <div className={classes.columnBody}>
        {tasks.map((task) => (
          <TasksKanbanCard
            key={task.id}
            task={task}
            onOpen={onOpen}
            canWrite={canWriteTask ? canWriteTask(task) : true}
            showSpace={showSpace}
            properties={properties}
            visiblePropertyIds={visiblePropertyIds}
          />
        ))}
      </div>
      {canCreate && onAdd && (
        <div
          className={classes.addCard}
          role="button"
          tabIndex={0}
          onClick={() => onAdd(status)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onAdd(status);
            }
          }}
        >
          <IconPlus size={16} />
          {t("New task")}
        </div>
      )}
    </div>
  );
}

export function TasksKanban({
  tasks,
  onOpen,
  onStatusChange,
  onAddInColumn,
  canWriteTask,
  canCreate,
  showSpace,
  properties,
  visiblePropertyIds,
}: {
  tasks: TaskItem[];
  onOpen: (task: TaskItem) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onAddInColumn?: (status: TaskStatus) => void;
  canWriteTask?: (task: TaskItem) => boolean;
  canCreate?: boolean;
  showSpace?: boolean;
  properties?: TaskProperty[];
  visiblePropertyIds?: string[];
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
          onAdd={onAddInColumn}
          canWriteTask={canWriteTask}
          canCreate={canCreate}
          showSpace={showSpace}
          properties={properties}
          visiblePropertyIds={visiblePropertyIds}
        />
      ))}
    </div>
  );
}
