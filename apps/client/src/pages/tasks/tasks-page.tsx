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
  useTasksQuery,
  useUpdateTaskMutation,
} from "@/features/tasks/queries/task-query";
import { TasksViewTabs } from "@/features/tasks/components/tasks-view-tabs";
import { TasksToolbar } from "@/features/tasks/components/tasks-toolbar";
import { TasksTable } from "@/features/tasks/components/tasks-table";
import { TasksKanban } from "@/features/tasks/components/tasks-kanban";
import { TasksSavedViews } from "@/features/tasks/components/tasks-saved-views";
import {
  TaskEditorModal,
  TaskEditorValues,
} from "@/features/tasks/components/task-editor-modal";
import {
  TaskDueFilter,
  TaskItem,
  TaskStatus,
  TaskViewType,
} from "@/features/tasks/types/task.types";
import { useGetSpacesQuery } from "@/features/space/queries/space-query";
import { useSpaceAbility } from "@/features/space/permissions/use-space-ability";
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from "@/features/space/permissions/permissions.type";

type TasksPageProps = {
  spaceId?: string;
  spaceSlug?: string;
  title?: string;
  defaultAssignee?: "me";
};

export function TasksPageContent({
  spaceId,
  title,
  defaultAssignee,
  spacePermissions,
}: TasksPageProps & { spacePermissions?: any }) {
  const { t } = useTranslation();
  const [view, setView] = useState<TaskViewType>("table");
  const [status, setStatus] = useState<TaskStatus | null>(null);
  const [due, setDue] = useState<TaskDueFilter | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<TaskItem | null>(null);

  const listParams = useMemo(
    () => ({
      spaceId,
      assignee: !spaceId ? defaultAssignee ?? "me" : undefined,
      status: status ?? undefined,
      due: due ?? undefined,
      limit: 100,
    }),
    [spaceId, defaultAssignee, status, due],
  );

  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useTasksQuery(listParams);
  const createMutation = useCreateTaskMutation();
  const updateMutation = useUpdateTaskMutation();
  const { data: spacesData } = useGetSpacesQuery({ limit: 100 });

  const tasks = data?.pages.flatMap((p) => p.items) ?? [];
  const spaceOptions =
    spacesData?.items?.map((s: any) => ({
      value: s.id,
      label: s.name,
    })) ?? [];

  const ability = useSpaceAbility(spacePermissions);
  const canCreate = spaceId
    ? ability.can(SpaceCaslAction.Edit, SpaceCaslSubject.Page) ||
      ability.can(SpaceCaslAction.Manage, SpaceCaslSubject.Page)
    : true;
  const canManageShared = spaceId
    ? ability.can(SpaceCaslAction.Manage, SpaceCaslSubject.Settings)
    : false;

  async function handleSubmit(values: TaskEditorValues) {
    if (editing) {
      await updateMutation.mutateAsync({
        taskId: editing.id,
        title: values.title,
        description: values.description,
        status: values.status,
        priority: values.priority,
        progress: values.progress,
        dueDate: values.dueDate
          ? new Date(values.dueDate).toISOString()
          : null,
      });
    } else {
      await createMutation.mutateAsync({
        spaceId: values.spaceId!,
        title: values.title,
        description: values.description,
        status: values.status,
        priority: values.priority,
        progress: values.progress,
        dueDate: values.dueDate
          ? new Date(values.dueDate).toISOString()
          : null,
      });
    }
    setEditorOpen(false);
    setEditing(null);
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
          due={due}
          onStatusChange={setStatus}
          onDueChange={setDue}
          canCreate={canCreate}
          onCreate={() => {
            setEditing(null);
            setEditorOpen(true);
          }}
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
            onOpen={(task) => {
              setEditing(task);
              setEditorOpen(true);
            }}
          />
        ) : (
          <TasksKanban
            tasks={tasks}
            onOpen={(task) => {
              setEditing(task);
              setEditorOpen(true);
            }}
            onStatusChange={(taskId, nextStatus) => {
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

      <TaskEditorModal
        opened={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        task={editing}
        spaceId={spaceId}
        spaceOptions={spaceOptions}
        saving={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
      />
    </Container>
  );
}

export default function TasksPage() {
  const { t } = useTranslation();
  return (
    <TasksPageContent title={t("My tasks")} defaultAssignee="me" />
  );
}
