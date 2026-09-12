import { Badge } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { TaskPriority } from "../types/task.types";

const colors: Record<TaskPriority, string> = {
  none: "gray",
  low: "blue",
  medium: "yellow",
  high: "orange",
  urgent: "red",
};

export function TasksPriorityBadge({ priority }: { priority: TaskPriority }) {
  const { t } = useTranslation();
  const labels: Record<TaskPriority, string> = {
    none: t("None"),
    low: t("Low"),
    medium: t("Medium"),
    high: t("High"),
    urgent: t("Urgent"),
  };
  return (
    <Badge size="sm" variant="light" color={colors[priority]}>
      {labels[priority]}
    </Badge>
  );
}
