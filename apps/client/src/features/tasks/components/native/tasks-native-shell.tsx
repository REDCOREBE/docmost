import { useCallback, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Group,
  Tooltip,
  UnstyledButton,
  Text,
} from "@mantine/core";
import {
  IconAdjustments,
  IconEye,
  IconFilter,
  IconLayoutColumns,
  IconLayoutKanban,
  IconPlus,
  IconSortAscending,
  IconTable,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { notifications } from "@mantine/notifications";
import type { Table as TanstackTable } from "@tanstack/react-table";
import type {
  BasePropertyType,
  FilterCondition,
  FilterGroup,
  FilterNode,
  IBase,
  IBaseProperty,
  IBaseRow,
  IBaseView,
  TypeOptions,
  ViewConfig,
  ViewConfigPatch,
  ViewSortConfig,
} from "@/ee/base/types/base.types";
import { ViewFilterConfigPopover } from "@/ee/base/components/views/view-filter-config";
import { ViewSortConfigPopover } from "@/ee/base/components/views/view-sort-config";
import { ViewPropertyVisibility } from "@/ee/base/components/views/view-property-visibility";
import { KanbanGroupByPicker } from "@/ee/base/components/kanban/kanban-group-by-picker";
import { KanbanCardProperties } from "@/ee/base/components/kanban/kanban-card-properties";
import { RowDetailModal } from "@/ee/base/components/row-detail-modal/row-detail-modal";
import { BaseEditableProvider } from "@/ee/base/context/base-editable";
import {
  BaseDataPortsProvider,
  type BaseDataPorts,
} from "@/ee/base/context/base-data-ports";
import { TasksNativeTable } from "./tasks-native-table";
import { TasksNativeKanban } from "./tasks-native-kanban";
import type { TaskProperty, TaskStatus } from "../../types/task.types";
import {
  SYS,
  cellUpdateToTaskMutation,
  filterTaskRows,
  mapBasePropertyTypeToTask,
  mapTaskToBaseRow,
  viewTypeFromBase,
} from "../../adapter/tasks-native-ui-adapter";
import {
  useCreateTaskMutation,
  useCreateTaskPropertyMutation,
  useDeleteTaskMutation,
  useSetTaskPropertyValueMutation,
  useUpdateTaskMutation,
  useUpdateTaskViewMutation,
} from "../../queries/task-query";
import { getTaskInfo } from "../../services/task-service";
import gridClasses from "@/ee/base/styles/grid.module.css";
import toolbarClasses from "@/ee/base/styles/base-toolbar.module.css";

type Props = {
  base: IBase;
  rows: IBaseRow[];
  customProperties: TaskProperty[];
  isGlobal: boolean;
  scope?: "all" | "mine" | "overdue";
  canCreate: boolean;
  canManageProperties: boolean;
  propertySpaceId?: string;
  /** Space used to create tasks (space page or first writable on global). */
  createSpaceId?: string;
  onCreate: (preset?: { status?: TaskStatus }) => void | Promise<void>;
  onStatusChange: (rowId: string, status: TaskStatus) => void | Promise<void>;
  onScopeChange?: (scope: "all" | "mine" | "overdue") => void;
  openRowId: string | null;
  onOpenRow: (rowId: string | null) => void;
};

function viewTabLabel(view: IBaseView, t: (k: string) => string): string {
  if (view.type === "kanban") return t("Kanban");
  if (view.name === "Table" || view.type === "table") return t("Table");
  return t(view.name);
}

function applyConfigPatch(
  existing: ViewConfig | undefined,
  patch: ViewConfigPatch,
): ViewConfig {
  const merged: Record<string, unknown> = { ...(existing ?? {}) };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete merged[key];
    else if (value !== undefined) merged[key] = value;
  }
  return merged as ViewConfig;
}

export function TasksNativeShell({
  base,
  rows,
  customProperties,
  isGlobal,
  scope = "all",
  canCreate,
  canManageProperties,
  propertySpaceId,
  createSpaceId,
  onCreate,
  onStatusChange,
  onScopeChange,
  openRowId,
  onOpenRow,
}: Props) {
  const { t } = useTranslation();
  const [activeViewId, setActiveViewId] = useState<string | null>(
    base.views[0]?.id ?? null,
  );
  const [filterOpened, setFilterOpened] = useState(false);
  const [sortOpened, setSortOpened] = useState(false);
  const [propertiesOpened, setPropertiesOpened] = useState(false);
  const [cardPropertiesOpened, setCardPropertiesOpened] = useState(false);
  const [draftFilter, setDraftFilter] = useState<FilterGroup | undefined>();
  const [draftSorts, setDraftSorts] = useState<ViewSortConfig[] | undefined>();
  const [draftViewConfigs, setDraftViewConfigs] = useState<
    Record<string, ViewConfig>
  >({});
  const [table, setTable] = useState<TanstackTable<IBaseRow> | null>(null);

  const createTask = useCreateTaskMutation();
  const updateTask = useUpdateTaskMutation();
  const setPropertyValue = useSetTaskPropertyValueMutation();
  const deleteTask = useDeleteTaskMutation();
  const createProperty = useCreateTaskPropertyMutation();
  const updateView = useUpdateTaskViewMutation();

  const views: IBaseView[] = base.views;

  const activeViewBase = useMemo(() => {
    if (!views.length) return undefined;
    return views.find((v) => v.id === activeViewId) ?? views[0];
  }, [views, activeViewId]);

  const activeView = useMemo(() => {
    if (!activeViewBase) return undefined;
    const draft = draftViewConfigs[activeViewBase.id];
    if (!draft) return activeViewBase;
    return {
      ...activeViewBase,
      config: { ...activeViewBase.config, ...draft },
    };
  }, [activeViewBase, draftViewConfigs]);

  const viewType = activeView ? viewTypeFromBase(activeView.type) : "table";

  const handleViewChange = useCallback((viewId: string) => {
    setActiveViewId(viewId);
  }, []);

  const scopeTabs: { id: "all" | "mine" | "overdue"; label: string }[] = [
    { id: "all", label: t("All tasks") },
    { id: "mine", label: t("My tasks") },
    { id: "overdue", label: t("Overdue") },
  ];

  const conditions = useMemo<FilterCondition[]>(() => {
    const filter = draftFilter ?? activeView?.config?.filter;
    if (!filter || filter.op !== "and") return [];
    return filter.children.filter(
      (c): c is FilterCondition => !("children" in c),
    );
  }, [draftFilter, activeView?.config?.filter]);

  const sorts = draftSorts ?? activeView?.config?.sorts ?? [];

  const viewFilter: FilterGroup | undefined =
    draftFilter ?? activeView?.config?.filter;

  const hiddenPropertyCount = useMemo(() => {
    if (!table) return 0;
    const cols = table
      .getAllLeafColumns()
      .filter((col) => col.id !== "__row_number");
    return cols.filter((col) => col.getCanHide() && !col.getIsVisible()).length;
  }, [table, table?.getState().columnVisibility]);

  const persistViewConfig = useCallback(
    (input: {
      viewId: string;
      pageId: string;
      config: ViewConfigPatch;
    }) => {
      setDraftViewConfigs((prev) => {
        const baseCfg =
          prev[input.viewId] ??
          views.find((v) => v.id === input.viewId)?.config ??
          {};
        return {
          ...prev,
          [input.viewId]: applyConfigPatch(baseCfg, input.config),
        };
      });
      if (input.viewId.startsWith("builtin:")) return;
      updateView.mutate({
        viewId: input.viewId,
        config: input.config as any,
      });
    },
    [updateView, views],
  );

  const ports = useMemo((): BaseDataPorts => {
    return {
      disableSchemaMutations: !canManageProperties,
      addRowLabel: t("New task"),
      addCardLabel: t("New task"),
      deleteRows: async (_pageId, rowIds) => {
        for (const id of rowIds) {
          await deleteTask.mutateAsync(id);
        }
      },
      persistViewConfig,
      createProperty: canManageProperties
        ? async (input: {
            pageId: string;
            name: string;
            type: BasePropertyType;
            typeOptions?: TypeOptions;
          }): Promise<IBaseProperty> => {
            const spaceId = propertySpaceId;
            if (!spaceId) throw new Error("No space for property create");
            const taskType = mapBasePropertyTypeToTask(input.type);
            if (!taskType) {
              notifications.show({
                color: "red",
                message: t("Unsupported property type"),
              });
              throw new Error("Unsupported property type");
            }
            const created = await createProperty.mutateAsync({
              spaceId,
              name: input.name,
              type: taskType,
              options:
                input.type === "select" || input.type === "multiSelect"
                  ? (
                      (
                        input.typeOptions as {
                          choices?: { name: string; color?: string }[];
                        }
                      )?.choices ?? []
                    ).map((c) => ({
                      name: c.name,
                      color: c.color ?? "blue",
                    }))
                  : undefined,
            });
            return {
              id: created.id,
              pageId: input.pageId,
              name: created.name,
              type: input.type,
              position: String(created.position ?? ""),
              typeOptions: input.typeOptions,
              isPrimary: false,
              workspaceId: created.workspaceId,
              createdAt: created.createdAt,
              updatedAt: created.updatedAt,
            };
          }
        : undefined,
      filterRows: (_pageId: string, filter: FilterNode | undefined) =>
        filterTaskRows(rows, _pageId, filter),
      createKanbanCard: async (input) => {
        const spaceId = createSpaceId ?? propertySpaceId;
        if (!spaceId) throw new Error("No space");
        const status =
          input.groupByPropertyId === SYS.status &&
          (input.columnKey === "todo" ||
            input.columnKey === "in_progress" ||
            input.columnKey === "done")
            ? (input.columnKey as TaskStatus)
            : "todo";
        const created = await createTask.mutateAsync({
          spaceId,
          title: "",
          status,
        });
        return mapTaskToBaseRow(created, base.id, customProperties);
      },
      moveKanbanCard: async (input) => {
        if (
          input.columnChanged &&
          input.groupByPropertyId === SYS.status &&
          (input.destChoiceValue === "todo" ||
            input.destChoiceValue === "in_progress" ||
            input.destChoiceValue === "done")
        ) {
          await updateTask.mutateAsync({
            taskId: input.rowId,
            status: input.destChoiceValue,
          });
          return;
        }
        if (input.columnChanged && input.destChoiceValue != null) {
          await onStatusChange(
            input.rowId,
            input.destChoiceValue as TaskStatus,
          );
        }
      },
      openRow: (rowId) => onOpenRow(rowId),
      updateRowCells: async ({ rowId, cells }) => {
        for (const [propertyId, value] of Object.entries(cells)) {
          const mutation = cellUpdateToTaskMutation(
            propertyId,
            value,
            customProperties,
          );
          if (!mutation) continue;
          if (mutation.kind === "system") {
            await updateTask.mutateAsync({ taskId: rowId, ...mutation.patch });
          } else {
            await setPropertyValue.mutateAsync({ taskId: rowId, ...mutation });
          }
        }
      },
      deleteRow: async ({ rowId }) => {
        await deleteTask.mutateAsync(rowId);
        onOpenRow(null);
      },
      getRow: async (_pageId, rowId) => {
        const task = await getTaskInfo(rowId);
        return mapTaskToBaseRow(task, base.id, customProperties);
      },
    };
  }, [
    canManageProperties,
    t,
    deleteTask,
    persistViewConfig,
    createProperty,
    propertySpaceId,
    createSpaceId,
    rows,
    createTask,
    base.id,
    customProperties,
    updateTask,
    onStatusChange,
    onOpenRow,
    setPropertyValue,
  ]);

  const editable = base.permissions?.canEdit ?? false;

  return (
    <BaseEditableProvider editable={editable}>
      <BaseDataPortsProvider ports={ports}>
        <div className={gridClasses.toolbar}>
          <Group gap={4} wrap="nowrap" style={{ overflowX: "auto" }}>
            {isGlobal &&
              scopeTabs.map((tab) => {
                const active = scope === tab.id;
                return (
                  <UnstyledButton
                    key={tab.id}
                    onClick={() => onScopeChange?.(tab.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 10px",
                      borderRadius: 6,
                      background: active
                        ? "light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-5))"
                        : "transparent",
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    <Text size="sm" span>
                      {tab.label}
                    </Text>
                  </UnstyledButton>
                );
              })}
            {views.map((view) => {
              const active = view.id === activeView?.id;
              const Icon =
                view.type === "kanban" ? IconLayoutKanban : IconTable;
              return (
                <UnstyledButton
                  key={view.id}
                  onClick={() => handleViewChange(view.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 10px",
                    borderRadius: 6,
                    background: active
                      ? "light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-5))"
                      : "transparent",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  <Icon size={14} />
                  <Text size="sm" span>
                    {viewTabLabel(view, t)}
                  </Text>
                </UnstyledButton>
              );
            })}
            {canManageProperties && !isGlobal && (
              <Tooltip label={t("Add view")}>
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  color="gray"
                  aria-label={t("Add view")}
                >
                  <IconPlus size={16} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>

          <div className={gridClasses.toolbarRight}>
            <ViewFilterConfigPopover
              opened={filterOpened}
              onClose={() => setFilterOpened(false)}
              conditions={conditions}
              properties={base.properties}
              onChange={(next) => {
                setDraftFilter(
                  next.length > 0 ? { op: "and", children: next } : undefined,
                );
              }}
            >
              <Tooltip label={t("Filter")}>
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  color={conditions.length > 0 ? "blue" : "gray"}
                  onClick={() => {
                    setSortOpened(false);
                    setPropertiesOpened(false);
                    setCardPropertiesOpened(false);
                    setFilterOpened((v) => !v);
                  }}
                >
                  <IconFilter size={16} />
                  {conditions.length > 0 && (
                    <Badge
                      size="xs"
                      circle
                      color="blue"
                      className={toolbarClasses.badgeDot}
                    >
                      {conditions.length}
                    </Badge>
                  )}
                </ActionIcon>
              </Tooltip>
            </ViewFilterConfigPopover>

            {viewType !== "kanban" && (
              <ViewSortConfigPopover
                opened={sortOpened}
                onClose={() => setSortOpened(false)}
                sorts={sorts}
                properties={base.properties}
                onChange={(next) => {
                  setDraftSorts(next.length > 0 ? next : undefined);
                }}
              >
                <Tooltip label={t("Sort")}>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    color={sorts.length > 0 ? "blue" : "gray"}
                    onClick={() => {
                      setFilterOpened(false);
                      setPropertiesOpened(false);
                      setCardPropertiesOpened(false);
                      setSortOpened((v) => !v);
                    }}
                  >
                    <IconSortAscending size={16} />
                  </ActionIcon>
                </Tooltip>
              </ViewSortConfigPopover>
            )}

            {viewType === "table" && table && (
              <ViewPropertyVisibility
                opened={propertiesOpened}
                onClose={() => setPropertiesOpened(false)}
                table={table}
                properties={base.properties}
                onPersist={() => {
                  /* layout persist via BaseDataPorts inside table */
                }}
              >
                <Tooltip label={t("Hide properties")}>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    color={hiddenPropertyCount > 0 ? "blue" : "gray"}
                    onClick={() => {
                      setFilterOpened(false);
                      setSortOpened(false);
                      setCardPropertiesOpened(false);
                      setPropertiesOpened((v) => !v);
                    }}
                  >
                    <IconEye size={16} />
                    {hiddenPropertyCount > 0 && (
                      <Badge
                        size="xs"
                        circle
                        color="blue"
                        className={toolbarClasses.badgeDot}
                      >
                        {hiddenPropertyCount}
                      </Badge>
                    )}
                  </ActionIcon>
                </Tooltip>
              </ViewPropertyVisibility>
            )}

            {viewType === "kanban" && activeView && (
              <>
                <KanbanGroupByPicker
                  base={base}
                  view={activeView}
                  pageId={base.id}
                >
                  <Tooltip label={t("Group by")}>
                    <ActionIcon variant="subtle" size="sm" color="gray">
                      <IconLayoutColumns size={16} />
                    </ActionIcon>
                  </Tooltip>
                </KanbanGroupByPicker>

                <KanbanCardProperties
                  opened={cardPropertiesOpened}
                  onClose={() => setCardPropertiesOpened(false)}
                  base={base}
                  view={activeView}
                  pageId={base.id}
                >
                  <Tooltip label={t("Card properties")}>
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      color="gray"
                      onClick={() => {
                        setFilterOpened(false);
                        setSortOpened(false);
                        setPropertiesOpened(false);
                        setCardPropertiesOpened((v) => !v);
                      }}
                    >
                      <IconAdjustments size={16} />
                    </ActionIcon>
                  </Tooltip>
                </KanbanCardProperties>
              </>
            )}
          </div>
        </div>

        <div style={{ marginTop: 8, minHeight: 320, flex: 1 }}>
          {viewType === "kanban" && activeView ? (
            <TasksNativeKanban
              base={base}
              view={activeView}
              viewFilter={viewFilter}
              editable={canCreate && editable}
            />
          ) : (
            <TasksNativeTable
              base={base}
              rows={rows}
              view={activeView}
              customProperties={customProperties}
              canCreate={canCreate}
              canManageProperties={canManageProperties}
              propertySpaceId={propertySpaceId}
              onOpen={(id) => onOpenRow(id)}
              onAddRow={() => void onCreate()}
              onTableReady={setTable}
            />
          )}
        </div>

        <RowDetailModal
          base={base}
          rows={rows}
          openRowId={openRowId}
          onClose={() => onOpenRow(null)}
          onNavigate={(id) => onOpenRow(id)}
        />
      </BaseDataPortsProvider>
    </BaseEditableProvider>
  );
}
