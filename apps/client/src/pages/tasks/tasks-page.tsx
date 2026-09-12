import { useMemo, useState } from "react";
import {
  Button,
  Container,
  Group,
  Stack,
  Title,
  Text,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { IconChecklist } from "@tabler/icons-react";
import { EmptyState } from "@/components/ui/empty-state";
import PageListSkeleton from "@/components/ui/page-list-skeleton";
import {
  useCreateTaskMutation,
  useTaskPropertiesQuery,
  useTaskViewsQuery,
  useTasksQuery,
  useUpdateTaskMutation,
} from "@/features/tasks/queries/task-query";
import { TasksViewTabs } from "@/features/tasks/components/tasks-view-tabs";
import { TasksScopeTabs } from "@/features/tasks/components/tasks-scope-tabs";
import { TasksToolbar } from "@/features/tasks/components/tasks-toolbar";
import { TasksTable } from "@/features/tasks/components/tasks-table";
import { TasksKanban } from "@/features/tasks/components/tasks-kanban";
import { TasksSavedViews } from "@/features/tasks/components/tasks-saved-views";
import { TaskDetailDrawer } from "@/features/tasks/components/task-detail-drawer";
import {
  TaskItem,
  TaskScopeFilter,
  TaskStatus,
  TaskViewType,
} from "@/features/tasks/types/task.types";
import { useGetSpacesQuery } from "@/features/space/queries/space-query";
import { useSpaceAbility } from "@/features/space/permissions/use-space-ability";
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from "@/features/space/permissions/permissions.type";
import { ISpace } from "@/features/space/types/space.types";
import { SpaceRole } from "@/lib/types";

type TasksPageProps = {
  spaceId?: string;
  spaceSlug?: string;
  title?: string;
};

function isWritableSpaceRole(role?: SpaceRole | string | null): boolean {
  return role === SpaceRole.ADMIN || role === SpaceRole.WRITER;
}

export function TasksPageContent({
  spaceId,
  title,
  spacePermissions,
}: TasksPageProps & { spacePermissions?: any }) {
  const { t } = useTranslation();
  const [view, setView] = useState<TaskViewType>("table");
  const [scope, setScope] = useState<TaskScopeFilter>("all");
  const [status, setStatus] = useState<TaskStatus | null>(null);
  const [spaceFilter, setSpaceFilter] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<TaskItem | null>(null);
  const [createPreset, setCreatePreset] = useState<{
    status?: TaskStatus;
    spaceId?: string;
  } | null>(null);

  const listParams = useMemo(() => {
    const isGlobal = !spaceId;
    return {
      spaceId: spaceId ?? spaceFilter ?? undefined,
      assignee: isGlobal && scope === "mine" ? ("me" as const) : undefined,
      due: isGlobal && scope === "overdue" ? ("overdue" as const) : undefined,
      status: status ?? undefined,
      limit: 100,
    };
  }, [spaceId, spaceFilter, scope, status]);

  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useTasksQuery(listParams);
  const createMutation = useCreateTaskMutation();
  const updateMutation = useUpdateTaskMutation();
  const { data: spacesData } = useGetSpacesQuery({ limit: 100 });
  const { data: spaceProperties } = useTaskPropertiesQuery(spaceId);
  const { data: views } = useTaskViewsQuery(spaceId);
  const visiblePropertyIds = useMemo(() => {
    const cfg = views?.find((v) => v.type === view)?.config;
    return cfg?.visiblePropertyIds;
  }, [views, view]);

  const tasks = data?.pages.flatMap((p) => p.items) ?? [];
  const allSpaces = (spacesData?.items ?? []) as ISpace[];
  const writableSpaces = useMemo(
    () => allSpaces.filter((s) => isWritableSpaceRole(s.membership?.role)),
    [allSpaces],
  );
  const spaceOptions = writableSpaces.map((s) => ({
    value: s.id,
    label: s.name,
  }));
  const spaceFilterOptions = allSpaces.map((s) => ({
    value: s.id,
    label: s.name,
  }));
  const writableSpaceIds = useMemo(
    () => new Set(writableSpaces.map((s) => s.id)),
    [writableSpaces],
  );

  const ability = useSpaceAbility(spacePermissions);
  const canEditInSpace = spaceId
    ? ability.can(SpaceCaslAction.Edit, SpaceCaslSubject.Page) ||
      ability.can(SpaceCaslAction.Manage, SpaceCaslSubject.Page)
    : false;
  const canManageInSpace = spaceId
    ? ability.can(SpaceCaslAction.Manage, SpaceCaslSubject.Settings)
    : false;
  const canCreate = spaceId ? canEditInSpace : writableSpaces.length > 0;
  const canManageShared = canManageInSpace;

  const canWriteTask = (task: TaskItem) => {
    if (spaceId) return canEditInSpace;
    return writableSpaceIds.has(task.spaceId);
  };

  const canManageTaskSpace = (task: TaskItem) => {
    if (spaceId) return canManageInSpace;
    const space = allSpaces.find((s) => s.id === task.spaceId);
    return space?.membership?.role === SpaceRole.ADMIN;
  };

  function openCreate(preset?: { status?: TaskStatus; spaceId?: string }) {
    setEditing(null);
    setCreatePreset(preset ?? null);
    setDrawerOpen(true);
  }

  function openTask(task: TaskItem) {
    setCreatePreset(null);
    setEditing(task);
    setDrawerOpen(true);
  }

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <Title order={2} mb="lg">
          {title ?? t("Tasks")}
        </Title>
        <PageListSkeleton />
      </Container>
    );
  }

  if (isError) {
    return (
      <Container size="xl" py="xl">
        <Title order={2} mb="lg">
          {title ?? t("Tasks")}
        </Title>
        <Text>{t("Failed to load tasks")}</Text>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        <Title order={2}>{title ?? t("Tasks")}</Title>
        {!spaceId && (
          <TasksScopeTabs value={scope} onChange={setScope} />
        )}
        <Group justify="space-between" wrap="wrap">
          <TasksViewTabs value={view} onChange={setView} />
          <TasksSavedViews
            spaceId={spaceId}
            currentType={view}
            onSelectType={setView}
            canManageShared={canManageShared}
          />
        </Group>
        <TasksToolbar
          status={status}
          onStatusChange={setStatus}
          canCreate={canCreate}
          onCreate={() => openCreate()}
          showSpaceFilter={!spaceId}
          spaceFilter={spaceFilter}
          onSpaceFilterChange={setSpaceFilter}
          spaceFilterOptions={spaceFilterOptions}
        />
        {tasks.length === 0 ? (
          <EmptyState
            icon={IconChecklist}
            title={t("No tasks yet")}
            description={t("Create a task to get started")}
          />
        ) : view === "table" ? (
          <TasksTable
            tasks={tasks}
            showSpace={!spaceId}
            canWriteTask={canWriteTask}
            onOpen={openTask}
          />
        ) : (
          <TasksKanban
            tasks={tasks}
            showSpace={!spaceId}
            canWriteTask={canWriteTask}
            canCreate={canCreate}
            properties={spaceProperties}
            visiblePropertyIds={visiblePropertyIds}
            onOpen={openTask}
            onAddInColumn={(status) =>
              openCreate({
                status,
                spaceId: spaceId ?? spaceFilter ?? undefined,
              })
            }
            onStatusChange={(taskId, nextStatus) => {
              const task = tasks.find((item) => item.id === taskId);
              if (!task || !canWriteTask(task)) return;
              updateMutation.mutate({ taskId, status: nextStatus });
            }}
          />
        )}
        {hasNextPage && (
          <Button
            variant="default"
            loading={isFetchingNextPage}
            onClick={() => fetchNextPage()}
          >
            {t("Load more")}
          </Button>
        )}
      </Stack>

      <TaskDetailDrawer
        opened={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
          setCreatePreset(null);
        }}
        task={editing}
        tasks={tasks}
        onNavigate={(task) => setEditing(task)}
        spaceId={spaceId ?? createPreset?.spaceId}
        spaceOptions={spaceOptions}
        presetStatus={createPreset?.status}
        canEdit={
          editing
            ? canWriteTask(editing)
            : Boolean(spaceId ? canEditInSpace : writableSpaces.length > 0)
        }
        canManageProperties={
          editing
            ? canManageTaskSpace(editing)
            : Boolean(spaceId && canManageInSpace)
        }
        createMutation={createMutation}
        updateMutation={updateMutation}
      />
    </Container>
  );
}

export default function TasksPage() {
  const { t } = useTranslation();
  return <TasksPageContent title={t("Tasks")} />;
}
