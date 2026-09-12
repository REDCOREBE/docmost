import { Badge, Table, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getSpaceUrl } from "@/lib/config";
import { TaskItem, TaskStatus } from "../types/task.types";
import { TasksAssigneeAvatars } from "./tasks-assignee-avatars";
import { TasksPriorityBadge } from "./tasks-priority-badge";
import { TasksProgressBar } from "./tasks-progress-bar";
import { TasksDueDate } from "./tasks-due-date";
import { TasksLinkedPageIcon } from "./tasks-linked-page-icon";
import classes from "../styles/tasks.module.css";

const statusColor: Record<TaskStatus, string> = {
  todo: "gray",
  in_progress: "blue",
  done: "green",
};

export function TasksTable({
  tasks,
  showSpace,
  onOpen,
  canWriteTask,
}: {
  tasks: TaskItem[];
  showSpace: boolean;
  onOpen: (task: TaskItem) => void;
  canWriteTask?: (task: TaskItem) => boolean;
}) {
  const { t } = useTranslation();
  const statusLabel: Record<TaskStatus, string> = {
    todo: t("To do"),
    in_progress: t("In progress"),
    done: t("Done"),
  };

  return (
    <div className={classes.tableWrap}>
      <Table.ScrollContainer minWidth={720}>
      <Table highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t("Title")}</Table.Th>
            <Table.Th>{t("Status")}</Table.Th>
            <Table.Th>{t("Assignees")}</Table.Th>
            <Table.Th>{t("Priority")}</Table.Th>
            <Table.Th>{t("Progress")}</Table.Th>
            <Table.Th>{t("Due date")}</Table.Th>
            {showSpace && <Table.Th>{t("Space")}</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {tasks.map((task) => (
            <Table.Tr key={task.id}>
              <Table.Td>
                {canWriteTask && !canWriteTask(task) ? (
                  <Text fw={500} size="sm">
                    {task.title}{" "}
                    <TasksLinkedPageIcon linkedPage={task.linkedPage} />
                  </Text>
                ) : (
                  <UnstyledButton onClick={() => onOpen(task)}>
                    <Text fw={500} size="sm">
                      {task.title}{" "}
                      <TasksLinkedPageIcon linkedPage={task.linkedPage} />
                    </Text>
                  </UnstyledButton>
                )}
              </Table.Td>
              <Table.Td>
                <Badge color={statusColor[task.status]} variant="light">
                  {statusLabel[task.status]}
                </Badge>
              </Table.Td>
              <Table.Td>
                <TasksAssigneeAvatars assignees={task.assignees} />
              </Table.Td>
              <Table.Td>
                <TasksPriorityBadge priority={task.priority} />
              </Table.Td>
              <Table.Td w={120}>
                <TasksProgressBar value={task.progress} />
              </Table.Td>
              <Table.Td>
                <TasksDueDate dueDate={task.dueDate} />
              </Table.Td>
              {showSpace && (
                <Table.Td>
                  {task.space ? (
                    <Text
                      component={Link}
                      to={getSpaceUrl(task.space.slug)}
                      size="sm"
                      c="dimmed"
                    >
                      {task.space.name}
                    </Text>
                  ) : (
                    "—"
                  )}
                </Table.Td>
              )}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      </Table.ScrollContainer>
    </div>
  );
}
