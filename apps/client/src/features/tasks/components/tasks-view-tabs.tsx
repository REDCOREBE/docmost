import { Tabs } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { TaskViewType } from "../types/task.types";

export function TasksViewTabs({
  value,
  onChange,
}: {
  value: TaskViewType;
  onChange: (value: TaskViewType) => void;
}) {
  const { t } = useTranslation();
  return (
    <Tabs
      value={value}
      onChange={(v) => {
        if (v === "table" || v === "kanban") onChange(v);
      }}
    >
      <Tabs.List>
        <Tabs.Tab value="table">{t("Table")}</Tabs.Tab>
        <Tabs.Tab value="kanban">{t("Board")}</Tabs.Tab>
      </Tabs.List>
    </Tabs>
  );
}
