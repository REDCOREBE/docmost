import { Button, Group, Select } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { TaskDueFilter, TaskStatus } from "../types/task.types";
import classes from "../styles/tasks.module.css";

export function TasksToolbar({
  status,
  due,
  onStatusChange,
  onDueChange,
  onCreate,
  canCreate,
}: {
  status?: TaskStatus | null;
  due?: TaskDueFilter | null;
  onStatusChange: (v: TaskStatus | null) => void;
  onDueChange: (v: TaskDueFilter | null) => void;
  onCreate: () => void;
  canCreate: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className={classes.toolbar}>
      <Group gap="sm">
        <Select
          clearable
          placeholder={t("Status")}
          data={[
            { value: "todo", label: t("To do") },
            { value: "in_progress", label: t("In progress") },
            { value: "done", label: t("Done") },
          ]}
          value={status ?? null}
          onChange={(v) => onStatusChange((v as TaskStatus) || null)}
          w={160}
        />
        <Select
          clearable
          placeholder={t("Due")}
          data={[
            { value: "overdue", label: t("Overdue") },
            { value: "today", label: t("Today") },
            { value: "upcoming", label: t("Upcoming") },
          ]}
          value={due ?? null}
          onChange={(v) => onDueChange((v as TaskDueFilter) || null)}
          w={160}
        />
      </Group>
      {canCreate && (
        <Button leftSection={<IconPlus size={16} />} onClick={onCreate}>
          {t("New task")}
        </Button>
      )}
    </div>
  );
}
