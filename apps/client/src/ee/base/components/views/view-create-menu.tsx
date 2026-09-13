import { useState, useCallback, useEffect, useRef } from "react";
import { useAtom } from "jotai";
import { Menu, ActionIcon, Tooltip } from "@mantine/core";
import {
  IconPlus,
  IconTable,
  IconLayoutKanban,
  IconTimeline,
  IconArrowLeft,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { IBase } from "@/ee/base/types/base.types";
import { useCreateViewMutation } from "@/ee/base/queries/base-view-query";
import { activeViewIdAtomFamily } from "@/ee/base/atoms/base-atoms";
import { getDescriptor } from "@/ee/base/property-types/property-type.registry";
import { useBaseDataPorts } from "@/ee/base/context/base-data-ports";

type Panel = "types" | "groupBy" | "ganttDates";

type ViewCreateMenuProps = {
  base: IBase;
  pageId: string;
};

export function ViewCreateMenu({ base, pageId }: ViewCreateMenuProps) {
  const { t } = useTranslation();
  const ports = useBaseDataPorts();
  const [opened, setOpened] = useState(false);
  const [panel, setPanel] = useState<Panel>("types");
  const [ganttStartId, setGanttStartId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const createViewMutation = useCreateViewMutation();
  const [, setActiveViewId] = useAtom(
    activeViewIdAtomFamily(pageId),
  ) as unknown as [string | null, (val: string | null) => void];

  const groupable = base.properties.filter(
    (p) => p.type === "select" || p.type === "status",
  );
  const dateProperties = base.properties.filter((p) => p.type === "date");
  /** Tasks ports supply createView — use system date defaults. */
  const isTasksSurface = !!ports?.createView;

  const close = useCallback(() => {
    setOpened(false);
    setPanel("types");
    setGanttStartId(null);
  }, []);

  const submitView = useCallback(
    (input: {
      name: string;
      type: "table" | "kanban" | "gantt";
      config?: Record<string, unknown>;
    }) => {
      createViewMutation.mutate(
        { pageId, ...input },
        { onSuccess: (created) => setActiveViewId(created.id) },
      );
      close();
    },
    [pageId, createViewMutation, setActiveViewId, close],
  );

  const handleCreateTable = useCallback(() => {
    submitView({ name: t("Table"), type: "table" });
  }, [submitView, t]);

  const handleBoardClick = useCallback(() => {
    if (groupable.length <= 1) {
      const config =
        groupable.length === 1
          ? { groupByPropertyId: groupable[0].id }
          : undefined;
      submitView({ name: t("Kanban"), type: "kanban", config });
    } else {
      setPanel("groupBy");
    }
  }, [groupable, submitView, t]);

  const handleGroupByPick = useCallback(
    (propertyId: string) => {
      submitView({
        name: t("Kanban"),
        type: "kanban",
        config: { groupByPropertyId: propertyId },
      });
    },
    [submitView, t],
  );

  const handleGanttClick = useCallback(() => {
    if (isTasksSurface) {
      submitView({
        name: t("Gantt"),
        type: "gantt",
        config: {
          gantt: {
            startPropertyId: "sys:startDate",
            endPropertyId: "sys:dueDate",
            zoom: "week",
            showToday: true,
            showWeekends: true,
            barPropertyIds: [],
          },
        },
      });
      return;
    }

    if (dateProperties.length >= 2) {
      setPanel("ganttDates");
      return;
    }

    submitView({
      name: t("Gantt"),
      type: "gantt",
      config: {
        gantt: {
          startPropertyId: dateProperties[0]?.id ?? "",
          endPropertyId: dateProperties[1]?.id ?? dateProperties[0]?.id ?? "",
          zoom: "week",
          showToday: true,
          showWeekends: true,
          barPropertyIds: [],
        },
      },
    });
  }, [isTasksSurface, dateProperties, submitView, t]);

  const handleGanttStartPick = useCallback((propertyId: string) => {
    setGanttStartId(propertyId);
  }, []);

  const handleGanttEndPick = useCallback(
    (endPropertyId: string) => {
      if (!ganttStartId) return;
      submitView({
        name: t("Gantt"),
        type: "gantt",
        config: {
          gantt: {
            startPropertyId: ganttStartId,
            endPropertyId,
            zoom: "week",
            showToday: true,
            showWeekends: true,
            barPropertyIds: [],
          },
        },
      });
    },
    [ganttStartId, submitView, t],
  );

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      dropdownRef.current
        ?.querySelector<HTMLElement>("[data-menu-item]:not([data-disabled])")
        ?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [panel, ganttStartId]);

  return (
    <Menu
      opened={opened}
      onChange={(o) => {
        setOpened(o);
        if (!o) {
          setPanel("types");
          setGanttStartId(null);
        }
      }}
      position="bottom-start"
      shadow="md"
      width={220}
      withinPortal
      closeOnItemClick={false}
    >
      <Menu.Target>
        <Tooltip label={t("Add view")}>
          <ActionIcon variant="subtle" size="sm" color="gray" aria-label={t("Add view")}>
            <IconPlus size={14} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown ref={dropdownRef}>
        {panel === "types" && (
          <>
            <Menu.Item leftSection={<IconTable size={14} />} onClick={handleCreateTable}>
              {t("Table")}
            </Menu.Item>
            <Menu.Item leftSection={<IconLayoutKanban size={14} />} onClick={handleBoardClick}>
              {t("Kanban")}
            </Menu.Item>
            <Menu.Item leftSection={<IconTimeline size={14} />} onClick={handleGanttClick}>
              {t("Gantt")}
            </Menu.Item>
          </>
        )}

        {panel === "groupBy" && (
          <>
            <Menu.Item leftSection={<IconArrowLeft size={14} />} onClick={() => setPanel("types")}>
              {t("Group by")}
            </Menu.Item>
            <Menu.Divider />
            {groupable.map((p) => {
              const Icon = getDescriptor(p.type)?.icon;
              return (
                <Menu.Item
                  key={p.id}
                  leftSection={Icon ? <Icon size={14} /> : undefined}
                  onClick={() => handleGroupByPick(p.id)}
                >
                  {p.name}
                </Menu.Item>
              );
            })}
          </>
        )}

        {panel === "ganttDates" && (
          <>
            <Menu.Item
              leftSection={<IconArrowLeft size={14} />}
              onClick={() => {
                if (ganttStartId) setGanttStartId(null);
                else setPanel("types");
              }}
            >
              {ganttStartId ? t("Date de fin") : t("Date de début")}
            </Menu.Item>
            <Menu.Divider />
            {(ganttStartId
              ? dateProperties.filter((p) => p.id !== ganttStartId)
              : dateProperties
            ).map((p) => {
              const Icon = getDescriptor(p.type)?.icon;
              return (
                <Menu.Item
                  key={p.id}
                  leftSection={Icon ? <Icon size={14} /> : undefined}
                  onClick={() =>
                    ganttStartId
                      ? handleGanttEndPick(p.id)
                      : handleGanttStartPick(p.id)
                  }
                >
                  {p.name}
                </Menu.Item>
              );
            })}
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
