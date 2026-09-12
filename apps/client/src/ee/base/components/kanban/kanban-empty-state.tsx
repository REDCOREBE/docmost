import { useCallback } from "react";
import { Stack, Text, Select, Button } from "@mantine/core";
import { generateBaseChoiceId } from "@/ee/base/utils/generate-base-id";
import { useTranslation } from "react-i18next";
import { IBase, IBaseView } from "@/ee/base/types/base.types";
import { useUpdateViewMutation } from "@/ee/base/queries/base-view-query";
import { useCreatePropertyMutation } from "@/ee/base/queries/base-property-query";
import { useBaseDataPorts } from "@/ee/base/context/base-data-ports";

type KanbanEmptyStateProps = {
  base: IBase;
  view: IBaseView;
  pageId: string;
  editable: boolean;
};

export function KanbanEmptyState({ base, view, pageId, editable }: KanbanEmptyStateProps) {
  const { t } = useTranslation();
  const ports = useBaseDataPorts();
  const updateView = useUpdateViewMutation();
  const createProperty = useCreatePropertyMutation();

  const groupableProperties = base.properties.filter(
    (p) => p.type === "select" || p.type === "status",
  );

  const selectData = groupableProperties.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const handleSelect = useCallback(
    (value: string | null) => {
      if (!value) return;
      updateView.mutate({ viewId: view.id, pageId, config: { groupByPropertyId: value } });
    },
    [updateView, view.id, pageId],
  );

  const handleCreateStatus = useCallback(() => {
    if (ports?.disableSchemaMutations) return;
    const todoId = generateBaseChoiceId();
    const inProgressId = generateBaseChoiceId();
    const completeId = generateBaseChoiceId();
    const payload = {
      pageId,
      name: t("Status"),
      type: "status" as const,
      typeOptions: {
        choices: [
          { id: todoId, name: t("Not started"), color: "gray", category: "todo" as const },
          { id: inProgressId, name: t("In progress"), color: "blue", category: "inProgress" as const },
          { id: completeId, name: t("Done"), color: "green", category: "complete" as const },
        ],
        choiceOrder: [todoId, inProgressId, completeId],
      },
    };
    const onCreated = (newProperty: { id: string }) => {
      updateView.mutate({
        viewId: view.id,
        pageId,
        config: { groupByPropertyId: newProperty.id },
      });
    };
    if (ports?.createProperty) {
      void ports.createProperty(payload).then(onCreated);
      return;
    }
    createProperty.mutate(payload, { onSuccess: onCreated });
  }, [ports, createProperty, updateView, view.id, pageId, t]);

  if (!editable) {
    return (
      <Stack align="center" gap="md" style={{ flex: 1, paddingTop: "15vh" }}>
        <Text fw={500}>{t("This board has no grouping property yet.")}</Text>
      </Stack>
    );
  }

  return (
    <Stack align="center" gap="md" style={{ flex: 1, paddingTop: "15vh" }}>
      <Text fw={500}>{t("Group this board by a select or status property.")}</Text>
      {groupableProperties.length > 0 ? (
        <Select
          placeholder={t("Choose a property")}
          data={selectData}
          value={view.config?.groupByPropertyId ?? null}
          onChange={handleSelect}
          w={240}
        />
      ) : ports?.disableSchemaMutations ? (
        <Text c="dimmed" size="sm">
          {t("No grouping property available.")}
        </Text>
      ) : (
        <Button
          variant="light"
          size="sm"
          onClick={handleCreateStatus}
          loading={createProperty.isPending}
        >
          {t("Create a status property")}
        </Button>
      )}
    </Stack>
  );
}
