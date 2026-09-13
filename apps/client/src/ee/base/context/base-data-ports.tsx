/**
 * Optional data-plane overrides for Base presentation components.
 * Default = real Base React Query / BaseService.
 * Alternate adapters (e.g. Tasks) supply ports so UI never hits /api/bases.
 * When ports are absent, Base behavior is unchanged.
 */
import { createContext, useContext } from "react";
import type {
  BasePropertyType,
  BaseViewType,
  FilterNode,
  IBaseProperty,
  IBaseRow,
  IBaseView,
  TypeOptions,
  ViewConfig,
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

  /**
   * Optional footer below card properties (e.g. structural context).
   * When set, KanbanCard renders it after visible CardField rows.
   */
  renderKanbanCardFooter?: (row: IBaseRow) => React.ReactNode;
  /**
   * Property ids already shown in renderKanbanCardFooter — skipped in CardField
   * to avoid duplicate rows when those properties are also in visiblePropertyIds.
   */
  kanbanCardFooterPropertyIds?: string[];

  addRowLabel?: string;
  addCardLabel?: string;

  /**
   * View lifecycle (ViewTabs / ViewCreateMenu).
   * When set, Base mutations must not call /bases/views/*.
   */
  createView?: (input: {
    pageId: string;
    name: string;
    type: BaseViewType;
    config?: ViewConfig;
  }) => Promise<IBaseView>;
  updateViewMeta?: (input: {
    pageId: string;
    viewId: string;
    name?: string;
    type?: BaseViewType;
    position?: string;
    config?: ViewConfigPatch;
  }) => Promise<IBaseView>;
  deleteView?: (input: {
    pageId: string;
    viewId: string;
  }) => Promise<void>;
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
