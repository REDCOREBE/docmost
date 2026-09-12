import { useCallback, useState } from "react";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useRowSelection } from "@/ee/base/hooks/use-row-selection";
import { useDeleteRowsMutation } from "@/ee/base/queries/base-row-query";
import { useBaseDataPorts } from "@/ee/base/context/base-data-ports";

const BATCH_SIZE = 500;

export function useDeleteSelectedRows(pageId: string) {
  const { t } = useTranslation();
  const { selectedIds, clear } = useRowSelection(pageId);
  const mutation = useDeleteRowsMutation();
  const ports = useBaseDataPorts();
  const [portPending, setPortPending] = useState(false);

  const runDelete = useCallback(
    async (ids: string[]) => {
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        chunks.push(ids.slice(i, i + BATCH_SIZE));
      }
      try {
        if (ports?.deleteRows) {
          setPortPending(true);
          try {
            for (const chunk of chunks) {
              await ports.deleteRows(pageId, chunk);
            }
          } finally {
            setPortPending(false);
          }
        } else {
          for (const chunk of chunks) {
            await mutation.mutateAsync({ pageId, rowIds: chunk });
          }
        }
        notifications.show({
          message: t("{{count}} rows deleted", { count: ids.length }),
        });
        clear();
      } catch {
        // mutation onError already shows notification (Base path);
        // Tasks ports should surface their own errors if needed.
      }
    },
    [pageId, mutation, clear, t, ports],
  );

  const deleteSelected = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    modals.openConfirmModal({
      title: t("Delete {{count}} rows?", { count: ids.length }),
      centered: true,
      children: (
        <Text size="sm">
          {t("This action cannot be undone.")}
        </Text>
      ),
      labels: { confirm: t("Delete"), cancel: t("Cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => void runDelete(ids),
    });
  }, [selectedIds, runDelete, t]);

  return {
    deleteSelected,
    isPending: ports?.deleteRows ? portPending : mutation.isPending,
  };
}
