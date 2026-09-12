import { useCallback, useEffect, useRef } from "react";
import type { Table as TanstackTable } from "@tanstack/react-table";
import type { IBase, IBaseRow, IBaseView } from "@/ee/base/types/base.types";
import { BaseTable } from "@/ee/base/components/base-table";
import { useBaseTable } from "@/ee/base/hooks/use-base-table";
import { RowExpandProvider } from "@/ee/base/context/row-expand";
import {
  useSetTaskPropertyValueMutation,
  useUpdateTaskMutation,
} from "../../queries/task-query";
import { cellUpdateToTaskMutation } from "../../adapter/tasks-native-ui-adapter";
import type { TaskProperty } from "../../types/task.types";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";

type Props = {
  base: IBase;
  rows: IBaseRow[];
  view: IBaseView | undefined;
  customProperties: TaskProperty[];
  canCreate: boolean;
  canManageProperties: boolean;
  propertySpaceId?: string;
  onOpen: (rowId: string) => void;
  onAddRow: () => void;
  onTableReady?: (table: TanstackTable<IBaseRow> | null) => void;
};

/** Native BaseTable + grid; mutations → Task API via parent BaseDataPorts + cell handlers. */
export function TasksNativeTable({
  base,
  rows,
  view,
  customProperties,
  canCreate,
  onOpen,
  onAddRow,
  onTableReady,
}: Props) {
  const { t } = useTranslation();
  const { table, persistViewConfig } = useBaseTable(base, rows, view);
  const scrollportRef = useRef<HTMLDivElement>(null);
  const updateTask = useUpdateTaskMutation();
  const setPropertyValue = useSetTaskPropertyValueMutation();

  useEffect(() => {
    onTableReady?.(table);
    return () => onTableReady?.(null);
  }, [table, onTableReady]);

  const handleCellUpdate = useCallback(
    async (rowId: string, propertyId: string, value: unknown) => {
      const mutation = cellUpdateToTaskMutation(
        propertyId,
        value,
        customProperties,
      );
      if (!mutation) return;
      try {
        if (mutation.kind === "system") {
          await updateTask.mutateAsync({ taskId: rowId, ...mutation.patch });
        } else {
          await setPropertyValue.mutateAsync({ taskId: rowId, ...mutation });
        }
      } catch (err: any) {
        notifications.show({
          color: "red",
          message: err?.response?.data?.message ?? t("Failed to save"),
        });
      }
    },
    [customProperties, updateTask, setPropertyValue, t],
  );

  const handleAddRow = useCallback(() => {
    if (!canCreate) return;
    onAddRow();
  }, [canCreate, onAddRow]);

  const handleExpand = useCallback(
    (rowId: string) => {
      onOpen(rowId);
    },
    [onOpen],
  );

  const handleColumnReorder = useCallback(
    (_columnId: string, _finishIndex: number) => {
      persistViewConfig();
    },
    [persistViewConfig],
  );

  return (
    <RowExpandProvider value={handleExpand}>
      <div
        ref={scrollportRef}
        style={{ height: "calc(100vh - 180px)", minHeight: 320 }}
      >
        <BaseTable
          base={base}
          rows={rows}
          effectiveView={view}
          table={table}
          pageId={base.id}
          isFiltered={false}
          hasNextPage={false}
          isFetchingNextPage={false}
          onFetchNextPage={() => {}}
          onCellUpdate={handleCellUpdate}
          onAddRow={handleAddRow}
          onColumnReorder={handleColumnReorder}
          onResizeEnd={() => persistViewConfig()}
          onRowReorder={() => {}}
          persistViewConfig={persistViewConfig}
          scrollportRef={scrollportRef}
          addRowLabel={t("New task")}
        />
      </div>
    </RowExpandProvider>
  );
}
