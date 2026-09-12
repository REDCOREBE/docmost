import { useMemo, useState } from "react";
import { Container, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { notifications } from "@mantine/notifications";
import PageListSkeleton from "@/components/ui/page-list-skeleton";
import {
  useCreateTaskMutation,
  useTaskPropertiesQuery,
  useTaskViewsQuery,
  useTasksQuery,
  useUpdateTaskMutation,
} from "@/features/tasks/queries/task-query";
import { TasksNativeShell } from "@/features/tasks/components/native/tasks-native-shell";
import {
  TaskScopeFilter,
  TaskStatus,
} from "@/features/tasks/types/task.types";
import {
  buildTasksBase,
  mapTaskToBaseRow,
} from "@/features/tasks/adapter/tasks-native-ui-adapter";
import { useGetSpacesQuery } from "@/features/space/queries/space-query";
import { useSpaceAbility } from "@/features/space/permissions/use-space-ability";
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from "@/features/space/permissions/permissions.type";
import { ISpace } from "@/features/space/types/space.types";
import { SpaceRole } from "@/lib/types";
import useCurrentUser from "@/features/user/hooks/use-current-user";

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
  const { data: currentUser } = useCurrentUser();
  const [scope, setScope] = useState<TaskScopeFilter>("all");
  const [openRowId, setOpenRowId] = useState<string | null>(null);

  const listParams = useMemo(() => {
    const isGlobal = !spaceId;
    return {
      spaceId: spaceId ?? undefined,
      assignee: isGlobal && scope === "mine" ? ("me" as const) : undefined,
      due: isGlobal && scope === "overdue" ? ("overdue" as const) : undefined,
      limit: 100,
    };
  }, [spaceId, scope]);

  const { data, isLoading, isError } = useTasksQuery(listParams);
  const createMutation = useCreateTaskMutation();
  const updateMutation = useUpdateTaskMutation();
  const { data: spacesData } = useGetSpacesQuery({ limit: 100 });
  const { data: spaceProperties } = useTaskPropertiesQuery(spaceId);
  const { data: views } = useTaskViewsQuery(spaceId);

  const tasks = data?.pages.flatMap((p) => p.items) ?? [];
  const allSpaces = (spacesData?.items ?? []) as ISpace[];
  const writableSpaces = useMemo(
    () => allSpaces.filter((s) => isWritableSpaceRole(s.membership?.role)),
    [allSpaces],
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
  const canManageProperties = spaceId ? canManageInSpace : false;

  const workspaceId =
    currentUser?.user?.workspaceId ?? tasks[0]?.workspaceId ?? "";

  const pageId = spaceId ?? `workspace-tasks:${workspaceId || "global"}`;
  const customProperties = spaceProperties ?? [];

  const base = useMemo(
    () =>
      buildTasksBase({
        pageId,
        workspaceId: workspaceId || "unknown",
        spaceId: spaceId ?? pageId,
        name: title ?? t("Tasks"),
        includeSpace: !spaceId,
        customProperties,
        views: views ?? [],
        canEdit: spaceId ? canEditInSpace : writableSpaces.length > 0,
      }),
    [
      pageId,
      workspaceId,
      spaceId,
      title,
      t,
      customProperties,
      views,
      canEditInSpace,
      writableSpaces.length,
    ],
  );

  const rows = useMemo(
    () => tasks.map((task) => mapTaskToBaseRow(task, pageId, customProperties)),
    [tasks, pageId, customProperties],
  );

  async function handleCreate(preset?: { status?: TaskStatus }) {
    const targetSpaceId = spaceId ?? writableSpaces[0]?.id;
    if (!targetSpaceId) {
      notifications.show({
        color: "red",
        message: t("No writable space available"),
      });
      return;
    }
    try {
      const created = await createMutation.mutateAsync({
        spaceId: targetSpaceId,
        title: "",
        status: preset?.status ?? "todo",
      });
      setOpenRowId(created.id);
    } catch (err: any) {
      notifications.show({
        color: "red",
        message: err?.response?.data?.message ?? t("Failed to create task"),
      });
    }
  }

  async function handleStatusChange(rowId: string, status: TaskStatus) {
    try {
      await updateMutation.mutateAsync({ taskId: rowId, status });
    } catch (err: any) {
      notifications.show({
        color: "red",
        message: err?.response?.data?.message ?? t("Failed to update task"),
      });
    }
  }

  if (isLoading) {
    return (
      <Container fluid p="md">
        <Title order={3} mb="md">
          {title ?? t("Tasks")}
        </Title>
        <PageListSkeleton />
      </Container>
    );
  }

  if (isError) {
    return (
      <Container fluid p="md">
        <Title order={3} mb="md">
          {title ?? t("Tasks")}
        </Title>
        <Text>{t("Failed to load tasks")}</Text>
      </Container>
    );
  }

  return (
    <Container
      fluid
      p="md"
      style={{
        height: "calc(100vh - 60px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Title order={3} mb="xs">
        {title ?? t("Tasks")}
      </Title>
      <TasksNativeShell
        base={base}
        rows={rows}
        customProperties={customProperties}
        isGlobal={!spaceId}
        scope={scope}
        canCreate={canCreate}
        canManageProperties={canManageProperties}
        propertySpaceId={spaceId}
        createSpaceId={spaceId ?? writableSpaces[0]?.id}
        onCreate={handleCreate}
        onStatusChange={handleStatusChange}
        onScopeChange={setScope}
        openRowId={openRowId}
        onOpenRow={setOpenRowId}
      />
    </Container>
  );
}

export default function TasksPage() {
  return <TasksPageContent />;
}
