import { useEffect, useState } from "react";
import {
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  TextInput,
  Textarea,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useTranslation } from "react-i18next";
import {
  TaskItem,
  TaskPriority,
  TaskStatus,
} from "../types/task.types";

export type TaskEditorValues = {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  dueDate?: Date | null;
  spaceId?: string;
};

export function TaskEditorModal({
  opened,
  onClose,
  task,
  spaceId,
  spaceOptions,
  onSubmit,
  saving,
}: {
  opened: boolean;
  onClose: () => void;
  task?: TaskItem | null;
  spaceId?: string;
  spaceOptions?: { value: string; label: string }[];
  onSubmit: (values: TaskEditorValues) => Promise<void> | void;
  saving?: boolean;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("none");
  const [progress, setProgress] = useState(0);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState(spaceId ?? "");

  useEffect(() => {
    if (!opened) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setStatus(task?.status ?? "todo");
    setPriority(task?.priority ?? "none");
    setProgress(task?.progress ?? 0);
    setDueDate(task?.dueDate ? new Date(task.dueDate) : null);
    setSelectedSpaceId(task?.spaceId ?? spaceId ?? "");
  }, [opened, task, spaceId]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={task ? t("Edit task") : t("New task")}
      size="lg"
    >
      <Stack>
        {!spaceId && (
          <Select
            label={t("Space")}
            data={spaceOptions ?? []}
            value={selectedSpaceId || null}
            onChange={(v) => setSelectedSpaceId(v ?? "")}
            required
            searchable
          />
        )}
        <TextInput
          label={t("Title")}
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          required
        />
        <Textarea
          label={t("Description")}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          minRows={3}
        />
        <Group grow>
          <Select
            label={t("Status")}
            data={[
              { value: "todo", label: t("To do") },
              { value: "in_progress", label: t("In progress") },
              { value: "done", label: t("Done") },
            ]}
            value={status}
            onChange={(v) => setStatus((v as TaskStatus) || "todo")}
          />
          <Select
            label={t("Priority")}
            data={[
              { value: "none", label: t("None") },
              { value: "low", label: t("Low") },
              { value: "medium", label: t("Medium") },
              { value: "high", label: t("High") },
              { value: "urgent", label: t("Urgent") },
            ]}
            value={priority}
            onChange={(v) => setPriority((v as TaskPriority) || "none")}
          />
        </Group>
        <NumberInput
          label={t("Progress")}
          value={progress}
          onChange={(v) => setProgress(typeof v === "number" ? v : 0)}
          min={0}
          max={100}
        />
        <DateInput
          label={t("Due date")}
          value={dueDate}
          onChange={setDueDate}
          clearable
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button
            loading={saving}
            disabled={!title.trim() || !(spaceId || selectedSpaceId)}
            onClick={() =>
              onSubmit({
                title: title.trim(),
                description,
                status,
                priority,
                progress,
                dueDate,
                spaceId: spaceId || selectedSpaceId,
              })
            }
          >
            {t("Save")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
