import { Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

export function TasksDueDate({ dueDate }: { dueDate?: string | null }) {
  const { t } = useTranslation();
  if (!dueDate) {
    return (
      <Text size="sm" c="dimmed">
        —
      </Text>
    );
  }
  const date = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(date);
  due.setHours(0, 0, 0, 0);
  const overdue = due < today;
  return (
    <Text size="sm" c={overdue ? "red" : undefined}>
      {overdue ? `${t("Overdue")} · ` : ""}
      {date.toLocaleDateString()}
    </Text>
  );
}
