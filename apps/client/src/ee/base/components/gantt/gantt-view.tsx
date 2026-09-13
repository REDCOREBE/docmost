import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Badge, Select, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type {
  GanttViewConfig,
  GanttZoom,
  IBaseProperty,
  IBaseRow,
  ViewConfig,
} from "@/ee/base/types/base.types";
import { choiceColor } from "@/ee/base/components/cells/choice-color";
import {
  buildHeaders,
  dayIndex,
  daysBetweenInclusive,
  resolveRowSpan,
  type GanttDatedRow,
} from "./gantt-timeline";
import { computeFilledTimeline } from "./gantt-scale";
import {
  maxBarExtras,
  resolveBarExtras,
  resolveEffectiveBarPropertyIds,
} from "./gantt-bar-label";
import {
  applyPreviewToDated,
  useGanttPointerEdit,
  type GanttCommitDates,
} from "./use-gantt-pointer-edit";
import classes from "./gantt.module.css";

const VIRTUALIZE_THRESHOLD = 40;
const ROW_HEIGHT = 34;

export type GanttViewProps = {
  rows: IBaseRow[];
  properties: IBaseProperty[];
  viewConfig: ViewConfig;
  startPropertyId?: string;
  endPropertyId?: string;
  editable?: boolean;
  onOpenRow?: (rowId: string) => void;
  onGanttConfigChange?: (gantt: GanttViewConfig) => void;
  /** Persist start/end date cells (Tasks ports or Base updateRow). */
  onCommitDates?: GanttCommitDates;
};

function defaultGanttConfig(
  partial?: Partial<GanttViewConfig> | null,
): GanttViewConfig | null {
  if (!partial?.startPropertyId || !partial?.endPropertyId) return null;
  return {
    startPropertyId: partial.startPropertyId,
    endPropertyId: partial.endPropertyId,
    zoom: partial.zoom ?? "week",
    showToday: partial.showToday ?? true,
    showWeekends: partial.showWeekends ?? true,
    barPropertyIds: partial.barPropertyIds ?? [],
  };
}

function resolveTitle(row: IBaseRow, properties: IBaseProperty[]): string {
  const primary = properties.find((p) => p.isPrimary);
  if (primary) {
    const v = row.cells?.[primary.id];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "Untitled";
}

function resolveProgress(
  row: IBaseRow,
  properties: IBaseProperty[],
  enabledPropertyIds: string[],
): number | null {
  const progressProp = properties.find(
    (p) =>
      p.type === "number" &&
      (p.typeOptions as { format?: string } | undefined)?.format === "progress",
  );
  if (!progressProp) return null;
  if (!enabledPropertyIds.includes(progressProp.id)) return null;
  const raw = row.cells?.[progressProp.id];
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, n));
}

function resolveBarStyle(
  row: IBaseRow,
  properties: IBaseProperty[],
): React.CSSProperties {
  const statusProp = properties.find((p) => p.type === "status");
  if (statusProp) {
    const choiceId = row.cells?.[statusProp.id];
    const choices =
      (statusProp.typeOptions as { choices?: { id: string; color: string }[] })
        ?.choices ?? [];
    const choice = choices.find((c) => c.id === choiceId);
    if (choice?.color) {
      return {
        ...choiceColor(choice.color),
      };
    }
  }
  return {
    backgroundColor: `light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))`,
    color: `light-dark(var(--mantine-color-gray-8), var(--mantine-color-gray-1))`,
  };
}

function GanttConfigEmpty({
  dateProperties,
  gantt,
  editable,
  onGanttConfigChange,
}: {
  dateProperties: IBaseProperty[];
  gantt: GanttViewConfig | null;
  editable: boolean;
  onGanttConfigChange?: (gantt: GanttViewConfig) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={classes.root} data-gantt-empty>
      <div className={classes.empty}>
        <Text fw={600}>{t("Configurez les dates du Gantt")}</Text>
        <Text size="sm" c="dimmed">
          {t("Choose a start date and end date property for this view.")}
        </Text>
        <div className={classes.emptyActions}>
          <Select
            size="xs"
            label={t("Date de début")}
            placeholder={t("Date de début")}
            data={dateProperties.map((p) => ({
              value: p.id,
              label: p.name,
            }))}
            value={gantt?.startPropertyId || null}
            onChange={(v) => {
              if (!v || !onGanttConfigChange) return;
              onGanttConfigChange({
                startPropertyId: v,
                endPropertyId:
                  gantt?.endPropertyId ||
                  dateProperties.find((p) => p.id !== v)?.id ||
                  v,
                zoom: gantt?.zoom ?? "week",
                showToday: gantt?.showToday ?? true,
                showWeekends: gantt?.showWeekends ?? true,
                barPropertyIds: gantt?.barPropertyIds ?? [],
              });
            }}
            disabled={!editable || !onGanttConfigChange}
            w={200}
          />
          <Select
            size="xs"
            label={t("Date de fin")}
            placeholder={t("Date de fin")}
            data={dateProperties.map((p) => ({
              value: p.id,
              label: p.name,
            }))}
            value={gantt?.endPropertyId || null}
            onChange={(v) => {
              if (!v || !onGanttConfigChange) return;
              onGanttConfigChange({
                startPropertyId:
                  gantt?.startPropertyId ||
                  dateProperties.find((p) => p.id !== v)?.id ||
                  v,
                endPropertyId: v,
                zoom: gantt?.zoom ?? "week",
                showToday: gantt?.showToday ?? true,
                showWeekends: gantt?.showWeekends ?? true,
                barPropertyIds: gantt?.barPropertyIds ?? [],
              });
            }}
            disabled={!editable || !onGanttConfigChange}
            w={200}
          />
        </div>
        {dateProperties.length < 2 && (
          <Text size="xs" c="dimmed">
            {t("Add at least two date properties to configure this Gantt.")}
          </Text>
        )}
      </div>
    </div>
  );
}

export function GanttView({
  rows,
  properties,
  viewConfig,
  startPropertyId: startOverride,
  endPropertyId: endOverride,
  editable = false,
  onOpenRow,
  onGanttConfigChange,
  onCommitDates,
}: GanttViewProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [bodyMinHeight, setBodyMinHeight] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const dateProperties = useMemo(
    () => properties.filter((p) => p.type === "date"),
    [properties],
  );

  const gantt = useMemo(
    () =>
      defaultGanttConfig({
        ...viewConfig.gantt,
        startPropertyId: startOverride ?? viewConfig.gantt?.startPropertyId,
        endPropertyId: endOverride ?? viewConfig.gantt?.endPropertyId,
      }),
    [viewConfig.gantt, startOverride, endOverride],
  );

  const startOk =
    !!gantt && dateProperties.some((p) => p.id === gantt.startPropertyId);
  const endOk =
    !!gantt && dateProperties.some((p) => p.id === gantt.endPropertyId);
  const configured = !!gantt && startOk && endOk;

  const zoom: GanttZoom = gantt?.zoom ?? "week";
  const showToday = gantt?.showToday ?? true;
  const showWeekends = gantt?.showWeekends ?? true;
  const barPropertyIds = gantt?.barPropertyIds ?? [];
  const visiblePropertyIds = viewConfig.visiblePropertyIds;
  const propertyOrder = viewConfig.propertyOrder;

  const {
    preview,
    dragging,
    canEdit,
    beginEdit,
    shouldSuppressClick,
    clearPreviewIfSynced,
  } = useGanttPointerEdit({
    editable: editable && configured,
    startPropertyId: gantt?.startPropertyId ?? "",
    endPropertyId: gantt?.endPropertyId ?? "",
    onCommitDates,
  });
  const draggingRef = useRef(false);
  draggingRef.current = dragging;

  const { dated: datedRaw, undatedCount } = useMemo(() => {
    if (!configured || !gantt)
      return { dated: [] as GanttDatedRow[], undatedCount: 0 };
    const next: GanttDatedRow[] = [];
    let missing = 0;
    for (const row of rows) {
      const span = resolveRowSpan(
        row,
        gantt.startPropertyId,
        gantt.endPropertyId,
      );
      if (span) next.push(span);
      else missing += 1;
    }
    return { dated: next, undatedCount: missing };
  }, [rows, configured, gantt]);

  const dated = useMemo(
    () => applyPreviewToDated(datedRaw, preview),
    [datedRaw, preview],
  );

  useEffect(() => {
    if (dragging) return;
    clearPreviewIfSynced(datedRaw);
  }, [datedRaw, clearPreviewIfSynced, dragging]);

  const {
    rangeStart,
    dayCount,
    effectivePxPerDay: dayWidth,
    timelineWidth: totalWidth,
    clamped,
  } = useMemo(
    () =>
      computeFilledTimeline({
        // Scale from committed rows only so a drag preview cannot
        // retune effectivePxPerDay / rangeStart mid-gesture (R24 EPMF).
        dated: datedRaw,
        zoom,
        containerWidthPx: containerWidth,
      }),
    [datedRaw, zoom, containerWidth],
  );
  const { months, days } = useMemo(
    () => buildHeaders(rangeStart, dayCount, zoom),
    [rangeStart, dayCount, zoom],
  );

  const todayIdx = dayIndex(rangeStart, new Date());
  const todayVisible = todayIdx >= 0 && todayIdx < dayCount;

  const virtualizer = useVirtualizer({
    count: dated.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
    enabled: configured && dated.length >= VIRTUALIZE_THRESHOLD,
  });

  // Measure viewport for full-height body + full-width scale.
  useEffect(() => {
    if (!configured) return;
    const el = scrollRef.current;
    if (!el) return;

    const measure = () => {
      if (draggingRef.current) return;
      const header = el.querySelector("[data-gantt-header]");
      const headerH = header?.getBoundingClientRect().height ?? 46;
      setBodyMinHeight(Math.max(0, el.clientHeight - headerH));
      setContainerWidth(el.clientWidth);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [configured, dated.length, zoom]);

  if (!configured) {
    return (
      <GanttConfigEmpty
        dateProperties={dateProperties}
        gantt={gantt}
        editable={editable}
        onGanttConfigChange={onGanttConfigChange}
      />
    );
  }

  const useVirtual = dated.length >= VIRTUALIZE_THRESHOLD;
  const virtualRows = useVirtual ? virtualizer.getVirtualItems() : null;
  const todayLeft = todayIdx * dayWidth + dayWidth / 2;
  const contentHeight = useVirtual
    ? virtualizer.getTotalSize()
    : dated.length * ROW_HEIGHT;
  const bodyHeight = Math.max(contentHeight, bodyMinHeight);

  return (
    <div
      className={classes.root}
      data-gantt-root
      data-gantt-ux="r24"
      data-gantt-edit="r26"
      data-gantt-zoom={zoom}
    >
      {(undatedCount > 0 || clamped) && (
        <div className={classes.metaBar}>
          {undatedCount > 0 && (
            <Badge size="sm" variant="light" color="gray">
              {undatedCount} {t("sans dates")}
            </Badge>
          )}
          {clamped && (
            <span className={classes.clampedHint}>
              {t("Timeline window limited for performance")}
            </span>
          )}
        </div>
      )}

      <div className={classes.scroll} ref={scrollRef} data-gantt-scroll>
        <div className={classes.inner} style={{ width: totalWidth }}>
          <div className={classes.header} data-gantt-header>
            <div className={classes.monthRow}>
              {months.map((m) => (
                <div
                  key={m.key}
                  className={classes.monthCell}
                  style={{ width: m.spanDays * dayWidth }}
                >
                  {m.label}
                </div>
              ))}
              {showToday && todayVisible && (
                <Badge
                  className={classes.todayBadge}
                  size="xs"
                  color="red"
                  variant="filled"
                  style={{ left: todayLeft }}
                  data-gantt-today-badge
                >
                  {t("Aujourd'hui")}
                </Badge>
              )}
            </div>
            <div className={classes.dayRow}>
              {days.map((d) => (
                <div
                  key={d.key}
                  className={[
                    classes.dayCell,
                    showWeekends && d.isWeekend ? classes.dayWeekend : "",
                    d.isToday ? classes.dayToday : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ width: dayWidth }}
                >
                  {d.label}
                </div>
              ))}
            </div>
          </div>

          <div
            className={classes.body}
            data-gantt-body
            style={
              {
                width: totalWidth,
                height: bodyHeight,
                position: "relative",
                ["--gantt-day-w" as string]: `${dayWidth}px`,
                ["--gantt-body-min" as string]: `${bodyMinHeight}px`,
              } as React.CSSProperties
            }
          >
            {showWeekends &&
              days
                .filter((d) => d.isWeekend)
                .map((d) => (
                  <div
                    key={`we-${d.key}`}
                    className={classes.weekendCol}
                    style={{
                      left: d.index * dayWidth,
                      width: dayWidth,
                    }}
                  />
                ))}

            {showToday && todayVisible && (
              <div
                className={classes.todayLine}
                style={{ left: todayLeft }}
                data-gantt-today-line
              />
            )}

            {useVirtual && virtualRows
              ? virtualRows.map((vr) => {
                  const item = dated[vr.index];
                  return (
                    <GanttBarRow
                      key={item.row.id}
                      item={item}
                      top={vr.start}
                      rangeStart={rangeStart}
                      dayWidth={dayWidth}
                      properties={properties}
                      barPropertyIds={barPropertyIds}
                      visiblePropertyIds={visiblePropertyIds}
                      propertyOrder={propertyOrder}
                      onOpenRow={onOpenRow}
                      canEdit={canEdit}
                      dragging={dragging && preview?.rowId === item.row.id}
                      onBeginEdit={beginEdit}
                      shouldSuppressClick={shouldSuppressClick}
                    />
                  );
                })
              : dated.map((item, index) => (
                  <GanttBarRow
                    key={item.row.id}
                    item={item}
                    top={index * ROW_HEIGHT}
                    rangeStart={rangeStart}
                    dayWidth={dayWidth}
                    properties={properties}
                    barPropertyIds={barPropertyIds}
                    visiblePropertyIds={visiblePropertyIds}
                    propertyOrder={propertyOrder}
                    onOpenRow={onOpenRow}
                    canEdit={canEdit}
                    dragging={dragging && preview?.rowId === item.row.id}
                    onBeginEdit={beginEdit}
                    shouldSuppressClick={shouldSuppressClick}
                  />
                ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GanttBarRow({
  item,
  top,
  rangeStart,
  dayWidth,
  properties,
  barPropertyIds,
  visiblePropertyIds,
  propertyOrder,
  onOpenRow,
  canEdit,
  dragging,
  onBeginEdit,
  shouldSuppressClick,
}: {
  item: GanttDatedRow;
  top: number;
  rangeStart: Date;
  dayWidth: number;
  properties: IBaseProperty[];
  barPropertyIds: string[];
  visiblePropertyIds?: string[];
  propertyOrder?: string[];
  onOpenRow?: (rowId: string) => void;
  canEdit: boolean;
  dragging: boolean;
  onBeginEdit: (
    e: React.PointerEvent,
    item: GanttDatedRow,
    mode: "drag" | "resize-left" | "resize-right" | "milestone",
    dayWidth: number,
  ) => void;
  shouldSuppressClick: () => boolean;
}) {
  const title = resolveTitle(item.row, properties);
  const enabledBarPropIds = resolveEffectiveBarPropertyIds({
    properties,
    visiblePropertyIds,
    barPropertyIds,
    propertyOrder,
  });
  const progress = resolveProgress(item.row, properties, enabledBarPropIds);
  const style = resolveBarStyle(item.row, properties);

  const open = () => {
    if (shouldSuppressClick()) return;
    onOpenRow?.(item.row.id);
  };

  if (item.kind === "milestone") {
    const left = dayIndex(rangeStart, item.start) * dayWidth + dayWidth / 2;
    const showLabel = dayWidth >= 18;
    return (
      <div
        className={classes.row}
        style={{ top, position: "absolute", width: "100%" }}
        data-gantt-row={item.row.id}
        data-gantt-kind="milestone"
      >
        <div className={classes.milestoneWrap} style={{ left }}>
          <button
            type="button"
            className={[
              classes.milestone,
              canEdit ? classes.editable : "",
              dragging ? classes.dragging : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={style}
            onClick={open}
            onPointerDown={(e) => {
              if (!canEdit) return;
              onBeginEdit(e, item, "milestone", dayWidth);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                open();
              }
            }}
            title={title}
            aria-label={title}
            data-gantt-milestone={item.row.id}
            data-gantt-editable={canEdit ? "true" : "false"}
          />
          {showLabel && (
            <span className={classes.milestoneLabel} aria-hidden>
              {title}
            </span>
          )}
        </div>
      </div>
    );
  }

  const left = dayIndex(rangeStart, item.start) * dayWidth;
  const width = daysBetweenInclusive(item.start, item.end) * dayWidth - 4;
  const barWidth = Math.max(width, 6);
  const extras = resolveBarExtras(
    item.row,
    properties,
    barPropertyIds,
    visiblePropertyIds,
    maxBarExtras(barWidth),
    propertyOrder,
  );

  return (
    <div
      className={classes.row}
      style={{ top, position: "absolute", width: "100%" }}
      data-gantt-row={item.row.id}
      data-gantt-kind="bar"
    >
      <button
        type="button"
        className={[
          classes.bar,
          canEdit ? classes.editable : "",
          dragging ? classes.dragging : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          left: left + 2,
          width: barWidth,
          ...style,
        }}
        onClick={open}
        onPointerDown={(e) => {
          if (!canEdit) return;
          const target = e.target as HTMLElement;
          if (target.closest("[data-gantt-resize]")) return;
          onBeginEdit(e, item, "drag", dayWidth);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        }}
        title={
          extras.length > 0 ? `${title} · ${extras.join(" · ")}` : title
        }
        aria-label={title}
        data-gantt-bar={item.row.id}
        data-gantt-editable={canEdit ? "true" : "false"}
      >
        {canEdit && (
          <>
            <span
              className={classes.resizeHandle}
              data-gantt-resize="left"
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize start date"
              tabIndex={-1}
              onPointerDown={(e) => {
                e.stopPropagation();
                onBeginEdit(e, item, "resize-left", dayWidth);
              }}
            />
            <span
              className={[classes.resizeHandle, classes.resizeHandleRight].join(
                " ",
              )}
              data-gantt-resize="right"
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize due date"
              tabIndex={-1}
              onPointerDown={(e) => {
                e.stopPropagation();
                onBeginEdit(e, item, "resize-right", dayWidth);
              }}
            />
          </>
        )}
        {progress != null && progress > 0 && (
          <span
            className={classes.barProgress}
            style={{
              width: `${progress}%`,
              backgroundColor: "currentColor",
            }}
            aria-hidden
          />
        )}
        <span className={classes.barLabel}>{title}</span>
        {extras.length > 0 && (
          <span className={classes.barMeta} aria-hidden>
            {extras.map((label, i) => (
              <span key={`${label}-${i}`} style={{ display: "contents" }}>
                {i > 0 && <span className={classes.barMetaSep}>·</span>}
                <span className={classes.barMetaItem}>{label}</span>
              </span>
            ))}
          </span>
        )}
      </button>
    </div>
  );
}

/** Compact toolbar controls for Gantt (zoom + date props). Bar fields removed — Card properties drives bar metas. */
export function GanttToolbarControls({
  properties,
  gantt,
  onChange,
}: {
  properties: IBaseProperty[];
  gantt: GanttViewConfig | undefined;
  onChange: (next: GanttViewConfig) => void;
}) {
  const { t } = useTranslation();
  const dateProperties = properties.filter((p) => p.type === "date");
  if (!gantt) return null;

  return (
    <>
      <Select
        size="xs"
        w={100}
        aria-label={t("Zoom")}
        data={[
          { value: "day", label: t("Day") },
          { value: "week", label: t("Week") },
          { value: "month", label: t("Month") },
        ]}
        value={gantt.zoom ?? "week"}
        onChange={(v) => {
          if (!v) return;
          onChange({ ...gantt, zoom: v as GanttZoom });
        }}
        allowDeselect={false}
      />
      <Select
        size="xs"
        w={132}
        aria-label={t("Date de début")}
        placeholder={t("Start")}
        data={dateProperties.map((p) => ({ value: p.id, label: p.name }))}
        value={gantt.startPropertyId}
        onChange={(v) => {
          if (!v) return;
          onChange({ ...gantt, startPropertyId: v });
        }}
        allowDeselect={false}
      />
      <Select
        size="xs"
        w={132}
        aria-label={t("Date de fin")}
        placeholder={t("End")}
        data={dateProperties.map((p) => ({ value: p.id, label: p.name }))}
        value={gantt.endPropertyId}
        onChange={(v) => {
          if (!v) return;
          onChange({ ...gantt, endPropertyId: v });
        }}
        allowDeselect={false}
      />
    </>
  );
}
