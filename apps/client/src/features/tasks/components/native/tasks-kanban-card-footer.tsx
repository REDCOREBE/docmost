import { Group, Text } from "@mantine/core";
import {
  IconBuilding,
  IconCalendarEvent,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import type { IBaseRow } from "@/ee/base/types/base.types";
import { SYS } from "../../adapter/tasks-native-ui-adapter";
import { formatLocalized, getDateFnsLocale } from "@/lib/date-locale";
import classes from "@/ee/base/styles/kanban.module.css";

/**
 * FILES_NOT_IMPLEMENTED — Tasks property types have no file/attachment type.
 * Comments: NOT IMPLEMENTED / NOT DISPLAYED.
 *
 * Footer rows follow view.config.visiblePropertyIds (KanbanCardProperties).
 * No structural force-display of Space/Due.
 */

type Props = {
  row: IBaseRow;
  /** Active card property ids from the view (same as KanbanCard). */
  visiblePropertyIds: string[];
};

function formatDueDate(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const locale = getDateFnsLocale();
  return formatLocalized(date, "MMM d, yyyy", "PP", locale);
}

function isOverdue(value: unknown): boolean {
  if (typeof value !== "string" || !value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return date.getTime() < startOfToday.getTime();
}

export function TasksKanbanCardFooter({ row, visiblePropertyIds }: Props) {
  const { t } = useTranslation();
  const visible = new Set(visiblePropertyIds);

  const showSpace = visible.has(SYS.space);
  const showDue = visible.has(SYS.dueDate);

  const spaceName =
    typeof row.cells[SYS.space] === "string"
      ? (row.cells[SYS.space] as string).trim()
      : "";
  const dueRaw = row.cells[SYS.dueDate];
  const dueLabel = formatDueDate(dueRaw);
  const overdue = isOverdue(dueRaw);

  const spaceRow = showSpace && spaceName.length > 0;
  const dueRow = showDue;

  if (!spaceRow && !dueRow) return null;

  return (
    <div className={classes.cardFooter}>
      {spaceRow && (
        <Group gap={6} wrap="nowrap" className={classes.cardFooterRow}>
          <IconBuilding size={14} className={classes.cardFooterIcon} />
          <Text size="xs" c="dimmed" lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
            {spaceName}
          </Text>
        </Group>
      )}
      {dueRow && (
        <Group
          gap={6}
          wrap="nowrap"
          justify="space-between"
          className={classes.cardFooterRow}
        >
          <Group gap={6} wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
            <IconCalendarEvent size={14} className={classes.cardFooterIcon} />
            <Text
              size="xs"
              c={overdue ? "red.6" : "dimmed"}
              lineClamp={1}
              style={{ minWidth: 0 }}
            >
              {dueLabel ?? t("No due date")}
            </Text>
          </Group>
        </Group>
      )}
    </div>
  );
}
