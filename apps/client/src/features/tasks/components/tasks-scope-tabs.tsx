import { Tabs } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { TaskScopeFilter } from "../types/task.types";

export function TasksScopeTabs({
  value,
  onChange,
}: {
  value: TaskScopeFilter;
  onChange: (value: TaskScopeFilter) => void;
}) {
  const { t } = useTranslation();
  return (
    <Tabs
      value={value}
      onChange={(v) => {
        if (v === "all" || v === "mine" || v === "overdue") {
          onChange(v);
        }
      }}
    >
      <Tabs.List>
        <Tabs.Tab value="all">{t("All tasks")}</Tabs.Tab>
        <Tabs.Tab value="mine">{t("My tasks")}</Tabs.Tab>
        <Tabs.Tab value="overdue">{t("Overdue")}</Tabs.Tab>
      </Tabs.List>
    </Tabs>
  );
}
