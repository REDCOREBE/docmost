/**
 * Optional data-plane overrides for Base presentation components.
 * Default = real Base React Query / BaseService.
 * Alternate adapters (e.g. Tasks) supply ports so UI never hits /api/bases.
 * When ports are absent, Base behavior is unchanged.
 */
import { createContext, useContext } from "react";
import type {
  BasePropertyType,
  FilterNode,
  IBaseProperty,
  IBaseRow,
  TypeOptions,
  ViewConfigPatch,
} from "@/ee/base/types/base.types";

export type BaseDataPorts = {
  /** Row deletes (selection bar / bulk). */
  deleteRows?: (pageId: string, rowIds: string[]) => Promise<void>;
  /** Persist view layout / kanban config patches. */
  persistViewConfig?: (input: {
    viewId: string;
    pageId: string;
    config: ViewConfigPatch;
  }) => void;
  createProperty?: (input: {
    pageId: string;
    name: string;
    type: BasePropertyType;
    typeOptions?: TypeOptions;
  }) => Promise<IBaseProperty>;
  /** Hide/disable schema-mutating property menus (rename/type/delete). */
  disableSchemaMutations?: boolean;

  /** KanbanColumn: supply rows for a column filter instead of useBaseRowsQuery. */
  filterRows?: (pageId: string, filter: FilterNode | undefined) => IBaseRow[];
  /** KanbanColumn: create card in column. */
  createKanbanCard?: (input: {
    pageId: string;
    groupByPropertyId: string;
    columnKey: string;
    position?: string;
  }) => Promise<IBaseRow>;
  /** BaseKanban: move/reorder card after pragmatic drop. */
  moveKanbanCard?: (input: {
    pageId: string;
    rowId: string;
    groupByPropertyId: string;
    destChoiceValue: string | null;
    position: string;
    columnChanged: boolean;
  }) => Promise<void>;
  /** Override row-detail open (default: useRowDetailModal URL). */
  openRow?: (rowId: string) => void;

  /** RowDetailModal cell updates. */
  updateRowCells?: (input: {
    pageId: string;
    rowId: string;
    cells: Record<string, unknown>;
  }) => Promise<void>;
  /** RowDetailModal delete. */
  deleteRow?: (input: { pageId: string; rowId: string }) => Promise<void>;
  /** RowDetailModal deep-link fetch when row not in list. */
  getRow?: (pageId: string, rowId: string) => Promise<IBaseRow | undefined>;

  addRowLabel?: string;
  addCardLabel?: string;
};

const BaseDataPortsContext = createContext<BaseDataPorts | null>(null);

export function BaseDataPortsProvider({
  ports,
  children,
}: {
  ports: BaseDataPorts;
  children: React.ReactNode;
}) {
  return (
    <BaseDataPortsContext.Provider value={ports}>
      {children}
    </BaseDataPortsContext.Provider>
  );
}

export function useBaseDataPorts(): BaseDataPorts | null {
  return useContext(BaseDataPortsContext);
}
