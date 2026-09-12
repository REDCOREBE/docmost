import { Button, Group, Select } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { TaskStatus } from "../types/task.types";
import classes from "../styles/tasks.module.css";

export function TasksToolbar({
  status,
  onStatusChange,
  onCreate,
  canCreate,
  spaceFilter,
  onSpaceFilterChange,
  spaceFilterOptions,
  showSpaceFilter,
}: {
  status?: TaskStatus | null;
  onStatusChange: (v: TaskStatus | null) => void;
  onCreate: () => void;
  canCreate: boolean;
  spaceFilter?: string | null;
  onSpaceFilterChange?: (v: string | null) => void;
  spaceFilterOptions?: { value: string; label: string }[];
  showSpaceFilter?: boolean;
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
        {showSpaceFilter && (
          <Select
            clearable
            searchable
            placeholder={t("Space")}
            data={spaceFilterOptions ?? []}
            value={spaceFilter ?? null}
            onChange={(v) => onSpaceFilterChange?.(v)}
            w={200}
          />
        )}
      </Group>
      {canCreate && (
        <Button leftSection={<IconPlus size={16} />} onClick={onCreate}>
          {t("New task")}
        </Button>
      )}
    </div>
  );
}
