import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Group,
  Tooltip,
} from "@mantine/core";
import {
  IconAdjustments,
  IconEye,
  IconFilter,
  IconLayoutColumns,
  IconSortAscending,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useAtom } from "jotai";
import { notifications } from "@mantine/notifications";
import { generateJitteredKeyBetween } from "fractional-indexing-jittered";
import { useQueryClient } from "@tanstack/react-query";
import type { Table as TanstackTable } from "@tanstack/react-table";
import type {
  BasePropertyType,
  FilterCondition,
  FilterGroup,
  FilterNode,
  IBase,
  IBaseProperty,
  IBaseView,
  TypeOptions,
  ViewConfig,
  ViewConfigPatch,
} from "@/ee/base/types/base.types";
import { ViewTabs } from "@/ee/base/components/views/view-tabs";
import { ViewFilterConfigPopover } from "@/ee/base/components/views/view-filter-config";
import { ViewSortConfigPopover } from "@/ee/base/components/views/view-sort-config";
import { ViewPropertyVisibility } from "@/ee/base/components/views/view-property-visibility";
import { KanbanGroupByPicker } from "@/ee/base/components/kanban/kanban-group-by-picker";
import { KanbanCardProperties } from "@/ee/base/components/kanban/kanban-card-properties";
import { RowDetailModal } from "@/ee/base/components/row-detail-modal/row-detail-modal";
import { BaseViewDraftBanner } from "@/ee/base/components/base-view-draft-banner";
import { BaseEditableProvider } from "@/ee/base/context/base-editable";
import {
  BaseDataPortsProvider,
  type BaseDataPorts,
} from "@/ee/base/context/base-data-ports";
import { activeViewIdAtomFamily } from "@/ee/base/atoms/base-atoms";
import { useViewDraft } from "@/ee/base/hooks/use-view-draft";
import { useHydrateUsers } from "@/ee/base/reference/reference-store";
import useCurrentUser from "@/features/user/hooks/use-current-user";
import { TasksNativeTable } from "./tasks-native-table";
import { TasksNativeKanban } from "./tasks-native-kanban";
import { TasksNativeGantt } from "./tasks-native-gantt";
import { TasksKanbanCardFooter } from "./tasks-kanban-card-footer";
import {
  TasksQuickFiltersToolbar,
  useTasksQuickFiltersFromUrl,
} from "./tasks-quick-filters-toolbar";
import { composeTaskDisplayFilter } from "./tasks-quick-filters";
import { GanttToolbarControls } from "@/ee/base/components/gantt/gantt-view";
import type { GanttViewConfig, IBaseRow } from "@/ee/base/types/base.types";
import type { TaskItem, TaskProperty, TaskStatus } from "../../types/task.types";
import {
  SYS,
  cellUpdateToTaskMutation,
  collectAssigneeUserRefs,
  filterTaskRows,
  mapBasePropertyTypeToTask,
  mapTaskPropertyToBase,
  mapTaskToBaseRow,
  mapTaskViewToBaseView,
  viewTypeFromBase,
} from "../../adapter/tasks-native-ui-adapter";
import { useGetSpacesQuery } from "@/features/space/queries/space-query";
import {
  useCreateTaskMutation,
  useCreateTaskPropertyMutation,
  useCreateTaskViewMutation,
  useDeleteTaskMutation,
  useDeleteTaskViewMutation,
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
  tasks: TaskItem[];
  customProperties: TaskProperty[];
  isGlobal: boolean;
  canCreate: boolean;
  canManageProperties: boolean;
  propertySpaceId?: string;
  createSpaceId?: string;
  onCreate: (preset?: { status?: TaskStatus }) => void | Promise<void>;
  onStatusChange: (rowId: string, status: TaskStatus) => void | Promise<void>;
  openRowId: string | null;
  onOpenRow: (rowId: string | null) => void;
};

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

function sortViewsByPosition(views: IBaseView[]): IBaseView[] {
  return [...views].sort((a, b) =>
    a.position < b.position ? -1 : a.position > b.position ? 1 : 0,
  );
}

export function TasksNativeShell({
  base,
  rows,
  tasks,
  customProperties,
  isGlobal,
  canCreate,
  canManageProperties,
  propertySpaceId,
  createSpaceId,
  onCreate,
  onStatusChange,
  openRowId,
  onOpenRow,
}: Props) {
  const { t } = useTranslation();
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [activeViewId, setActiveViewId] = useAtom(
    activeViewIdAtomFamily(base.id),
  ) as unknown as [string | null, (val: string | null) => void];
  const [filterOpened, setFilterOpened] = useState(false);
  const [sortOpened, setSortOpened] = useState(false);
  const [propertiesOpened, setPropertiesOpened] = useState(false);
  const [cardPropertiesOpened, setCardPropertiesOpened] = useState(false);
  const [draftViewConfigs, setDraftViewConfigs] = useState<
    Record<string, ViewConfig>
  >({});
  const [table, setTable] = useState<TanstackTable<IBaseRow> | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);

  const { data: spacesData } = useGetSpacesQuery({ limit: 100 });
  const accessibleSpaces = useMemo(
    () =>
      isGlobal
        ? (spacesData?.items ?? []).map((s) => ({ id: s.id, name: s.name }))
        : [],
    [isGlobal, spacesData],
  );
  const [quickFilters, setQuickFilters] =
    useTasksQuickFiltersFromUrl(accessibleSpaces);

  const createTask = useCreateTaskMutation();
  const updateTask = useUpdateTaskMutation();
  const setPropertyValue = useSetTaskPropertyValueMutation();
  const deleteTask = useDeleteTaskMutation();
  const createProperty = useCreateTaskPropertyMutation();
  const updateView = useUpdateTaskViewMutation();
  const createViewMutation = useCreateTaskViewMutation();
  const deleteViewMutation = useDeleteTaskViewMutation();

  const hydrateUsers = useHydrateUsers(base.id);

  useEffect(() => {
    const refs = collectAssigneeUserRefs(tasks);
    if (refs.length > 0) hydrateUsers(refs);
  }, [tasks, hydrateUsers]);

  const views: IBaseView[] = base.views;
  const orderedViews = useMemo(() => sortViewsByPosition(views), [views]);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("view");
    if (fromUrl && orderedViews.some((v) => v.id === fromUrl)) {
      setActiveViewId(fromUrl);
      return;
    }
    if (activeViewId && orderedViews.some((v) => v.id === activeViewId)) {
      return;
    }
    if (orderedViews[0]) {
      setActiveViewId(orderedViews[0].id);
    }
  }, [orderedViews, activeViewId, setActiveViewId]);

  const activeViewBase = useMemo(() => {
    if (!orderedViews.length) return undefined;
    return orderedViews.find((v) => v.id === activeViewId) ?? orderedViews[0];
  }, [orderedViews, activeViewId]);

  const {
    effectiveFilter,
    effectiveSorts,
    isDirty,
    setFilter: setDraftFilter,
    setSorts: setDraftSorts,
    reset: resetDraft,
    buildPromotedConfig,
  } = useViewDraft({
    userId: currentUser?.user?.id,
    pageId: base.id,
    viewId: activeViewBase?.id,
    baselineFilter: activeViewBase?.config?.filter,
    baselineSorts: activeViewBase?.config?.sorts,
  });

  const activeView = useMemo(() => {
    if (!activeViewBase) return undefined;
    const layoutDraft = draftViewConfigs[activeViewBase.id];
    return {
      ...activeViewBase,
      config: {
        ...activeViewBase.config,
        ...(layoutDraft ?? {}),
        filter: effectiveFilter,
        sorts: effectiveSorts,
      },
    };
  }, [activeViewBase, draftViewConfigs, effectiveFilter, effectiveSorts]);

  const viewType = activeView ? viewTypeFromBase(activeView.type) : "table";

  const handleViewChange = useCallback(
    (viewId: string) => {
      setActiveViewId(viewId);
    },
    [setActiveViewId],
  );

  const conditions = useMemo<FilterCondition[]>(() => {
    const filter = effectiveFilter;
    if (!filter || filter.op !== "and") return [];
    return filter.children.filter(
      (c): c is FilterCondition => !("children" in c),
    );
  }, [effectiveFilter]);

  const sorts = effectiveSorts ?? [];
  /** Persisted/draft view filter only — never includes quick filters. */
  const viewFilter: FilterGroup | undefined = effectiveFilter;

  /** Ephemeral Person/Space quick filters (Global Tasks). URL-backed; not dirty. */
  const displayFilter = useMemo(
    () =>
      isGlobal
        ? composeTaskDisplayFilter(viewFilter, quickFilters)
        : viewFilter,
    [isGlobal, viewFilter, quickFilters],
  );

  const filteredRows = useMemo(
    () => filterTaskRows(rows, base.id, displayFilter),
    [rows, base.id, displayFilter],
  );

  const hiddenPropertyCount = useMemo(() => {
    if (!table) return 0;
    const cols = table
      .getAllLeafColumns()
      .filter((col) => col.id !== "__row_number");
    return cols.filter((col) => col.getCanHide() && !col.getIsVisible()).length;
  }, [table, table?.getState().columnVisibility]);

  const viewsQueryKey = ["task-views", propertySpaceId ?? "global"] as const;

  const canSaveView = useMemo(() => {
    if (!activeViewBase || !currentUser?.user?.id) return false;
    if (activeViewBase.creatorId) {
      return activeViewBase.creatorId === currentUser.user.id;
    }
    return canManageProperties;
  }, [activeViewBase, currentUser?.user?.id, canManageProperties]);

  const handleSaveDraft = useCallback(async () => {
    if (!activeViewBase) return;
    const config = buildPromotedConfig(activeViewBase.config);
    setSavingDraft(true);
    try {
      await updateView.mutateAsync({
        viewId: activeViewBase.id,
        config: config as any,
      });
      resetDraft();
      await queryClient.invalidateQueries({ queryKey: ["task-views"] });
      notifications.show({ message: t("View updated for everyone") });
    } catch {
      // mutation toast
    } finally {
      setSavingDraft(false);
    }
  }, [
    activeViewBase,
    buildPromotedConfig,
    updateView,
    resetDraft,
    queryClient,
    t,
  ]);

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
      updateView.mutate({
        viewId: input.viewId,
        config: input.config as any,
      });
    },
    [updateView, views],
  );

  const getViewShareUrl = useCallback((viewId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", viewId);
    return url.pathname + url.search;
  }, []);

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
      createView: async (input) => {
        const last = sortViewsByPosition(views).at(-1);
        const position = generateJitteredKeyBetween(
          last?.position ?? null,
          null,
        );
        const created = await createViewMutation.mutateAsync({
          spaceId: propertySpaceId,
          name: input.name,
          type:
            input.type === "kanban"
              ? "kanban"
              : input.type === "gantt"
                ? "gantt"
                : "table",
          config: (input.config ?? {}) as any,
          position,
          shared: false,
        });
        await queryClient.invalidateQueries({ queryKey: viewsQueryKey });
        const mapped = mapTaskViewToBaseView(created, input.pageId);
        setActiveViewId(mapped.id);
        return mapped;
      },
      updateViewMeta: async (input) => {
        const updated = await updateView.mutateAsync({
          viewId: input.viewId,
          name: input.name,
          type:
            input.type === "kanban"
              ? "kanban"
              : input.type === "gantt"
                ? "gantt"
                : input.type === "table"
                  ? "table"
                  : undefined,
          position: input.position,
          config: input.config as any,
        });
        await queryClient.invalidateQueries({ queryKey: ["task-views"] });
        if (input.config) {
          setDraftViewConfigs((prev) => {
            const baseCfg =
              prev[input.viewId] ??
              views.find((v) => v.id === input.viewId)?.config ??
              {};
            return {
              ...prev,
              [input.viewId]: applyConfigPatch(baseCfg, input.config!),
            };
          });
        }
        return mapTaskViewToBaseView(updated, input.pageId);
      },
      deleteView: async (input) => {
        await deleteViewMutation.mutateAsync(input.viewId);
        await queryClient.invalidateQueries({ queryKey: ["task-views"] });
        if (activeViewId === input.viewId) {
          const remaining = orderedViews.filter((v) => v.id !== input.viewId);
          setActiveViewId(remaining[0]?.id ?? null);
        }
      },
      createProperty: async (input: {
        pageId: string;
        name: string;
        type: BasePropertyType;
        typeOptions?: TypeOptions;
      }): Promise<IBaseProperty> => {
        const openTask = openRowId
          ? tasks.find((t) => t.id === openRowId)
          : undefined;
        const spaceId =
          propertySpaceId ?? openTask?.spaceId ?? createSpaceId;
        if (!spaceId) {
          notifications.show({
            color: "red",
            message: t("Open a task in a space to add properties"),
          });
          throw new Error("No space for property create");
        }
        const taskType = mapBasePropertyTypeToTask(input.type);
        if (!taskType) {
          notifications.show({
            color: "red",
            message: t("Unsupported property type"),
          });
          throw new Error("Unsupported property type");
        }
        try {
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
          return mapTaskPropertyToBase(created, input.pageId);
        } catch (err: unknown) {
          const message =
            (err as { response?: { data?: { message?: string } } })?.response
              ?.data?.message ?? t("Failed to create property");
          notifications.show({ color: "red", message });
          throw err;
        }
      },
      renderKanbanCardFooter: (row) => {
        const visiblePropertyIds =
          activeView?.config?.visiblePropertyIds ?? [];
        return (
          <TasksKanbanCardFooter
            row={row}
            visiblePropertyIds={visiblePropertyIds}
          />
        );
      },
      // Suppress CardField duplicates only for ids the footer may render.
      kanbanCardFooterPropertyIds: [SYS.space, SYS.dueDate],
      filterRows: (_pageId: string, filter: FilterNode | undefined) =>
        filterTaskRows(filteredRows, _pageId, filter),
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
        hydrateUsers(collectAssigneeUserRefs([created]));
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
        hydrateUsers(collectAssigneeUserRefs([task]));
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
    filteredRows,
    createTask,
    base.id,
    customProperties,
    updateTask,
    onStatusChange,
    onOpenRow,
    openRowId,
    tasks,
    activeView?.config?.visiblePropertyIds,
    setPropertyValue,
    views,
    createViewMutation,
    deleteViewMutation,
    updateView,
    queryClient,
    viewsQueryKey,
    setActiveViewId,
    activeViewId,
    orderedViews,
    hydrateUsers,
  ]);

  const editable = base.permissions?.canEdit ?? false;

  return (
    <BaseEditableProvider editable={editable}>
      <BaseDataPortsProvider ports={ports}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            height: "100%",
          }}
        >
        <div className={gridClasses.toolbar}>
          <Group gap={4} wrap="nowrap" style={{ overflowX: "auto" }}>
            <ViewTabs
              views={orderedViews}
              activeViewId={activeView?.id}
              pageId={base.id}
              onViewChange={handleViewChange}
              base={base}
              canAddView
              getViewShareUrl={getViewShareUrl}
            />
          </Group>

          <div className={gridClasses.toolbarRight}>
            {isGlobal && (
              <TasksQuickFiltersToolbar
                value={quickFilters}
                onChange={setQuickFilters}
              />
            )}

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
                onPersist={() => {}}
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

            {(viewType === "kanban" || viewType === "gantt") && activeView && (
              <>
                {viewType === "kanban" && (
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
                )}

                <KanbanCardProperties
                  opened={cardPropertiesOpened}
                  onClose={() => setCardPropertiesOpened(false)}
                  base={base}
                  view={activeView}
                  pageId={base.id}
                >
                  <Tooltip
                    label={
                      viewType === "gantt"
                        ? t("Visible properties")
                        : t("Card properties")
                    }
                  >
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

            {viewType === "gantt" && activeView && (
              <GanttToolbarControls
                properties={base.properties}
                gantt={activeView.config?.gantt}
                onChange={(gantt: GanttViewConfig) => {
                  persistViewConfig({
                    viewId: activeView.id,
                    pageId: base.id,
                    config: { gantt },
                  });
                }}
              />
            )}
          </div>
        </div>

        <BaseViewDraftBanner
          isDirty={isDirty}
          canSave={canSaveView}
          onReset={resetDraft}
          onSave={() => void handleSaveDraft()}
          saving={savingDraft}
        />

        <div
          style={{
            marginTop: 8,
            minHeight: 0,
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {viewType === "kanban" && activeView ? (
            <TasksNativeKanban
              base={base}
              view={activeView}
              viewFilter={viewFilter}
              editable={canCreate && editable}
            />
          ) : viewType === "gantt" && activeView ? (
            <TasksNativeGantt
              base={base}
              view={activeView}
              rows={filteredRows}
              viewFilter={viewFilter}
              editable={canCreate && editable}
            />
          ) : (
            <TasksNativeTable
              base={base}
              rows={filteredRows}
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
          rows={filteredRows}
          openRowId={openRowId}
          onClose={() => onOpenRow(null)}
          onNavigate={(id) => onOpenRow(id)}
        />
        </div>
      </BaseDataPortsProvider>
    </BaseEditableProvider>
  );
}
