import { useState } from "react";
import { Button, Group, Modal, Select, TextInput, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";
import {
  useCreateTaskViewMutation,
  useTaskViewsQuery,
} from "../queries/task-query";
import { TaskViewType } from "../types/task.types";

export function TasksSavedViews({
  spaceId,
  currentType,
  onSelectType,
  canManageShared,
}: {
  spaceId?: string;
  currentType: TaskViewType;
  onSelectType: (type: TaskViewType) => void;
  canManageShared: boolean;
}) {
  const { t } = useTranslation();
  const { data: views = [] } = useTaskViewsQuery(spaceId);
  const createMutation = useCreateTaskViewMutation();
  const [opened, setOpened] = useState(false);
  const [name, setName] = useState("");
  const [shared, setShared] = useState(false);

  return (
    <Group gap="xs">
      <Select
        placeholder={t("Saved views")}
        clearable
        data={views.map((v) => ({
          value: v.id,
          label: `${v.name} (${v.type})`,
        }))}
        onChange={(id) => {
          const view = views.find((v) => v.id === id);
          if (view) onSelectType(view.type);
        }}
        w={200}
      />
      <Button variant="default" size="xs" onClick={() => setOpened(true)}>
        {t("Save view")}
      </Button>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={t("Save view")}
      >
        <Stack>
          <TextInput
            label={t("Name")}
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
          {canManageShared && spaceId && (
            <Select
              label={t("Visibility")}
              data={[
                { value: "personal", label: t("Personal") },
                { value: "shared", label: t("Shared in Space") },
              ]}
              value={shared ? "shared" : "personal"}
              onChange={(v) => setShared(v === "shared")}
            />
          )}
          <Button
            loading={createMutation.isPending}
            disabled={!name.trim()}
            onClick={async () => {
              await createMutation.mutateAsync({
                spaceId,
                name: name.trim(),
                type: currentType,
                shared: shared && Boolean(spaceId),
                config: { groupBy: "status" },
              });
              setOpened(false);
              setName("");
              setShared(false);
            }}
          >
            {t("Save")}
          </Button>
        </Stack>
      </Modal>
    </Group>
  );
}
