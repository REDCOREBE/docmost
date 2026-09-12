import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Drawer,
  Menu,
  NumberInput,
  Select,
  Text,
  Textarea,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useWindowEvent } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import {
  IconCalendar,
  IconChartBar,
  IconChevronDown,
  IconChevronUp,
  IconDotsVertical,
  IconFileText,
  IconFlag,
  IconProgress,
  IconTrash,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { UseMutationResult } from "@tanstack/react-query";
import {
  CreateTaskParams,
  TaskItem,
  TaskPriority,
  TaskProperty,
  TaskPropertyType,
  TaskPropertyValue,
  TaskStatus,
  UpdateTaskParams,
} from "../types/task.types";
import {
  useCreateTaskPropertyMutation,
  useDeleteTaskMutation,
  useDeleteTaskPropertyMutation,
  useSetTaskPropertyValueMutation,
  useTaskPropertiesQuery,
} from "../queries/task-query";
import { useSpaceMembersInfiniteQuery } from "@/features/space/queries/space-query";
import { useGetSidebarPagesQuery } from "@/features/page/queries/page-query";
import { TaskAddPropertyMenu } from "./properties/task-add-property-menu";
import { TaskPropertyEditor } from "./properties/task-property-editors";
import classes from "../styles/tasks.module.css";

type Props = {
  opened: boolean;
  onClose: () => void;
  task?: TaskItem | null;
  tasks: TaskItem[];
  onNavigate: (task: TaskItem) => void;
  spaceId?: string;
  spaceOptions?: { value: string; label: string }[];
  presetStatus?: TaskStatus;
  canEdit: boolean;
  canManageProperties: boolean;
  createMutation: UseMutationResult<TaskItem, Error, CreateTaskParams, unknown>;
  updateMutation: UseMutationResult<TaskItem, Error, UpdateTaskParams, unknown>;
};

function PropertyRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={classes.propertyRow}>
      <div className={classes.propertyLabel}>
        <span className={classes.propertyLabelIcon}>{icon}</span>
        <span>{label}</span>
      </div>
      <div className={classes.propertyValue}>{children}</div>
    </div>
  );
}

export function TaskDetailDrawer({
  opened,
  onClose,
  task,
  tasks,
  onNavigate,
  spaceId,
  spaceOptions,
  presetStatus,
  canEdit,
  canManageProperties,
  createMutation,
  updateMutation,
}: Props) {
  const { t } = useTranslation();
  const deleteMutation = useDeleteTaskMutation();
  const createPropertyMutation = useCreateTaskPropertyMutation();
  const deletePropertyMutation = useDeleteTaskPropertyMutation();
  const setValueMutation = useSetTaskPropertyValueMutation();

  const isCreate = !task;
  const effectiveSpaceId = task?.spaceId ?? spaceId ?? "";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("none");
  const [progress, setProgress] = useState(0);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [localValues, setLocalValues] = useState<
    Record<string, TaskPropertyValue>
  >({});

  const { data: properties = [] } = useTaskPropertiesQuery(
    opened && effectiveSpaceId ? effectiveSpaceId : undefined,
  );

  const { data: membersPages } = useSpaceMembersInfiniteQuery(
    effectiveSpaceId || "",
  );
  const personOptions = useMemo(() => {
    const items =
      membersPages?.pages.flatMap((p: any) => p.items ?? []) ?? [];
    return items
      .map((m: any) => m.user ?? m)
      .filter((u: any) => u?.id)
      .map((u: any) => ({ value: u.id as string, label: u.name as string }));
  }, [membersPages]);

  const { data: sidebarData } = useGetSidebarPagesQuery(
    effectiveSpaceId ? { spaceId: effectiveSpaceId } : null,
  );
  const pageOptions = useMemo(() => {
    const list =
      sidebarData?.pages.flatMap((p) => p.items ?? []) ?? [];
    return list
      .filter((p: any) => p?.id)
      .map((p: any) => ({
        value: p.id as string,
        label: (p.title as string) || t("Untitled"),
      }));
  }, [sidebarData, t]);

  const index = task ? tasks.findIndex((x) => x.id === task.id) : -1;
  const prev = index > 0 ? tasks[index - 1] : null;
  const next =
    index >= 0 && index < tasks.length - 1 ? tasks[index + 1] : null;

  useEffect(() => {
    if (!opened) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setStatus(task?.status ?? presetStatus ?? "todo");
    setPriority(task?.priority ?? "none");
    setProgress(task?.progress ?? 0);
    setDueDate(task?.dueDate ? task.dueDate.slice(0, 10) : null);
    setSelectedSpaceId(task?.spaceId ?? spaceId ?? "");
    const map: Record<string, TaskPropertyValue> = {};
    for (const v of (task as any)?.propertyValues ?? []) {
      map[v.propertyId] = v;
    }
    setLocalValues(map);
  }, [opened, task, spaceId, presetStatus]);

  const persistSystem = useCallback(
    async (patch: Partial<UpdateTaskParams>) => {
      if (!task || !canEdit) return;
      try {
        await updateMutation.mutateAsync({ taskId: task.id, ...patch });
      } catch {
        notifications.show({
          color: "red",
          message: t("Failed to save"),
        });
      }
    },
    [task, canEdit, updateMutation, t],
  );

  async function handleCreate() {
    const sid = spaceId || selectedSpaceId;
    if (!title.trim() || !sid) return;
    try {
      const created = await createMutation.mutateAsync({
        spaceId: sid,
        title: title.trim(),
        description,
        status,
        priority,
        progress,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      });
      onNavigate(created);
    } catch {
      notifications.show({ color: "red", message: t("Failed to save") });
    }
  }

  async function handleTitleBlur() {
    if (isCreate) return;
    const nextTitle = title.trim();
    if (!nextTitle || nextTitle === task?.title) return;
    await persistSystem({ title: nextTitle });
  }

  useWindowEvent("keydown", (event) => {
    if (!opened) return;
    if (event.key !== "Escape") return;
    const target = event.target as HTMLElement | null;
    if (target?.closest?.("[data-task-nested-dialog]")) return;
    onClose();
  });

  async function handlePropertyValue(
    property: TaskProperty,
    patch: Partial<TaskPropertyValue>,
  ) {
    if (!task || !canEdit) return;
    setLocalValues((prev) => ({
      ...prev,
      [property.id]: {
        taskId: task.id,
        propertyId: property.id,
        ...prev[property.id],
        ...patch,
      },
    }));
    try {
      await setValueMutation.mutateAsync({
        taskId: task.id,
        propertyId: property.id,
        ...patch,
      });
    } catch {
      notifications.show({ color: "red", message: t("Failed to save") });
    }
  }

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size={520}
      padding={0}
      withCloseButton={false}
      closeOnEscape={false}
      styles={{ body: { height: "100%", padding: 0 } }}
    >
      <div className={classes.drawerContent}>
        <div className={classes.drawerTopBar}>
          <div className={classes.drawerTopGroup}>
            <button
              type="button"
              className={classes.iconButton}
              disabled={!prev}
              onClick={() => prev && onNavigate(prev)}
              aria-label={t("Previous")}
            >
              <IconChevronUp size={16} />
            </button>
            <button
              type="button"
              className={classes.iconButton}
              disabled={!next}
              onClick={() => next && onNavigate(next)}
              aria-label={t("Next")}
            >
              <IconChevronDown size={16} />
            </button>
          </div>
          <div className={classes.drawerTopGroup}>
            {task && (
              <Menu withinPortal position="bottom-end">
                <Menu.Target>
                  <button
                    type="button"
                    className={classes.iconButton}
                    aria-label={t("More")}
                  >
                    <IconDotsVertical size={16} />
                  </button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    color="red"
                    leftSection={<IconTrash size={14} />}
                    disabled={!canManageProperties}
                    onClick={() => {
                      modals.openConfirmModal({
                        title: t("Delete task"),
                        children: (
                          <Text size="sm">{t("This cannot be undone.")}</Text>
                        ),
                        labels: { confirm: t("Delete"), cancel: t("Cancel") },
                        confirmProps: { color: "red" },
                        onConfirm: async () => {
                          await deleteMutation.mutateAsync(task.id);
                          onClose();
                        },
                      });
                    }}
                  >
                    {t("Delete")}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}
            <button
              type="button"
              className={classes.iconButton}
              onClick={onClose}
              aria-label={t("Close")}
            >
              <IconX size={16} />
            </button>
          </div>
        </div>

        <div className={classes.drawerHeader}>
          <input
            className={classes.titleInput}
            value={title}
            disabled={!canEdit && !isCreate}
            placeholder={t("Untitled")}
            onChange={(e) => setTitle(e.currentTarget.value)}
            onBlur={() => void handleTitleBlur()}
            onKeyDown={(e) => {
              if (e.key === "Enter" && isCreate) {
                e.preventDefault();
                void handleCreate();
              }
            }}
          />
          {isCreate && (
            <Text size="xs" c="dimmed" mt={6}>
              {t("Press Enter or blur fields to create")}
            </Text>
          )}
        </div>

        <div className={classes.drawerBody}>
          {isCreate && !spaceId && (
            <PropertyRow icon={<IconFileText size={15} />} label={t("Space")}>
              <Select
                variant="unstyled"
                data={spaceOptions ?? []}
                value={selectedSpaceId || null}
                onChange={(v) => setSelectedSpaceId(v ?? "")}
                searchable
                placeholder={t("Space")}
              />
            </PropertyRow>
          )}

          <PropertyRow icon={<IconProgress size={15} />} label={t("Status")}>
            <Select
              variant="unstyled"
              disabled={!canEdit && !isCreate}
              data={[
                { value: "todo", label: t("To do") },
                { value: "in_progress", label: t("In progress") },
                { value: "done", label: t("Done") },
              ]}
              value={status}
              onChange={(v) => {
                const nextStatus = (v as TaskStatus) || "todo";
                setStatus(nextStatus);
                if (!isCreate) void persistSystem({ status: nextStatus });
              }}
            />
          </PropertyRow>

          <PropertyRow icon={<IconFlag size={15} />} label={t("Priority")}>
            <Select
              variant="unstyled"
              disabled={!canEdit && !isCreate}
              data={[
                { value: "none", label: t("None") },
                { value: "low", label: t("Low") },
                { value: "medium", label: t("Medium") },
                { value: "high", label: t("High") },
                { value: "urgent", label: t("Urgent") },
              ]}
              value={priority}
              onChange={(v) => {
                const nextPriority = (v as TaskPriority) || "none";
                setPriority(nextPriority);
                if (!isCreate) void persistSystem({ priority: nextPriority });
              }}
            />
          </PropertyRow>

          <PropertyRow icon={<IconUsers size={15} />} label={t("Assignees")}>
            <Text size="sm" c="dimmed">
              {(task?.assignees ?? []).map((a) => a.name).join(", ") || "—"}
            </Text>
          </PropertyRow>

          <PropertyRow icon={<IconChartBar size={15} />} label={t("Progress")}>
            <NumberInput
              variant="unstyled"
              disabled={!canEdit && !isCreate}
              value={progress}
              min={0}
              max={100}
              onChange={(v) => {
                const next = typeof v === "number" ? v : 0;
                setProgress(next);
              }}
              onBlur={() => {
                if (!isCreate) void persistSystem({ progress });
              }}
            />
          </PropertyRow>

          <PropertyRow icon={<IconCalendar size={15} />} label={t("Due date")}>
            <DateInput
              variant="unstyled"
              disabled={!canEdit && !isCreate}
              value={dueDate || undefined}
              clearable
              onChange={(val) => {
                setDueDate(val ?? null);
                if (!isCreate) {
                  void persistSystem({
                    dueDate: val ? new Date(val).toISOString() : null,
                  });
                }
              }}
            />
          </PropertyRow>

          <PropertyRow icon={<IconFileText size={15} />} label={t("Linked page")}>
            <Text size="sm" c="dimmed">
              {task?.linkedPage?.title || "—"}
            </Text>
          </PropertyRow>

          <PropertyRow icon={<IconFileText size={15} />} label={t("Description")}>
            <Textarea
              variant="unstyled"
              disabled={!canEdit && !isCreate}
              value={description}
              autosize
              minRows={2}
              maxRows={8}
              onChange={(e) => setDescription(e.currentTarget.value)}
              onBlur={() => {
                if (isCreate) {
                  if (title.trim() && (spaceId || selectedSpaceId)) {
                    void handleCreate();
                  }
                  return;
                }
                if (description !== (task?.description ?? "")) {
                  void persistSystem({ description });
                }
              }}
            />
          </PropertyRow>

          {!isCreate &&
            properties.map((property: TaskProperty) => (
              <PropertyRow
                key={property.id}
                icon={<IconFlag size={15} />}
                label={property.name}
              >
                <div style={{ display: "flex", width: "100%", gap: 4 }}>
                  <div style={{ flex: 1 }}>
                    <TaskPropertyEditor
                      property={property}
                      value={localValues[property.id]}
                      disabled={!canEdit}
                      personOptions={personOptions}
                      pageOptions={pageOptions}
                      onChange={(patch) =>
                        void handlePropertyValue(property, patch)
                      }
                    />
                  </div>
                  {canManageProperties && (
                    <Menu withinPortal>
                      <Menu.Target>
                        <button type="button" className={classes.iconButton}>
                          <IconDotsVertical size={14} />
                        </button>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          color="red"
                          onClick={() =>
                            void deletePropertyMutation.mutateAsync(
                              property.id,
                            )
                          }
                        >
                          {t("Delete property")}
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  )}
                </div>
              </PropertyRow>
            ))}

          {!isCreate && canManageProperties && effectiveSpaceId && (
            <TaskAddPropertyMenu
              onCreate={async (type: TaskPropertyType, name: string) => {
                await createPropertyMutation.mutateAsync({
                  spaceId: effectiveSpaceId,
                  name,
                  type,
                });
              }}
            />
          )}

          {isCreate && (
            <Text size="sm" c="dimmed" mt="md">
              {t("Save the task to add custom properties")}
            </Text>
          )}
        </div>
      </div>
    </Drawer>
  );
}
