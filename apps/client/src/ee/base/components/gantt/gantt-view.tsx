import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Badge, MultiSelect, Select, Text } from "@mantine/core";
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
  computeTimelineRange,
  dayIndex,
  daysBetweenInclusive,
  pxPerDay,
  resolveRowSpan,
  type GanttDatedRow,
} from "./gantt-timeline";
import {
  maxBarExtras,
  resolveBarExtras,
} from "./gantt-bar-label";
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
): number | null {
  const progressProp = properties.find(
    (p) =>
      p.type === "number" &&
      (p.typeOptions as { format?: string } | undefined)?.format === "progress",
  );
  if (!progressProp) return null;
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
}: GanttViewProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [bodyMinHeight, setBodyMinHeight] = useState(0);

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

  const { dated, undatedCount } = useMemo(() => {
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

  const { rangeStart, dayCount, clamped } = useMemo(
    () => computeTimelineRange(dated, zoom),
    [dated, zoom],
  );
  const { months, days } = useMemo(
    () => buildHeaders(rangeStart, dayCount, zoom),
    [rangeStart, dayCount, zoom],
  );

  const dayWidth = pxPerDay(zoom);
  const totalWidth = dayCount * dayWidth;
  const todayIdx = dayIndex(rangeStart, new Date());
  const todayVisible = todayIdx >= 0 && todayIdx < dayCount;

  const virtualizer = useVirtualizer({
    count: dated.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
    enabled: configured && dated.length >= VIRTUALIZE_THRESHOLD,
  });

  // Stretch timeline grid to fill the scroll viewport (no blank gap under last row).
  useEffect(() => {
    if (!configured) return;
    const el = scrollRef.current;
    if (!el) return;

    const measure = () => {
      const header = el.querySelector("[data-gantt-header]");
      const headerH = header?.getBoundingClientRect().height ?? 46;
      setBodyMinHeight(Math.max(0, el.clientHeight - headerH));
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
    <div className={classes.root} data-gantt-root data-gantt-zoom={zoom}>
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
                      onOpenRow={onOpenRow}
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
                    onOpenRow={onOpenRow}
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
  onOpenRow,
}: {
  item: GanttDatedRow;
  top: number;
  rangeStart: Date;
  dayWidth: number;
  properties: IBaseProperty[];
  barPropertyIds: string[];
  visiblePropertyIds?: string[];
  onOpenRow?: (rowId: string) => void;
}) {
  const title = resolveTitle(item.row, properties);
  const progress = resolveProgress(item.row, properties);
  const style = resolveBarStyle(item.row, properties);

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
        <div
          className={classes.milestoneWrap}
          style={{ left }}
        >
          <button
            type="button"
            className={classes.milestone}
            style={style}
            onClick={() => onOpenRow?.(item.row.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpenRow?.(item.row.id);
              }
            }}
            title={title}
            aria-label={title}
            data-gantt-milestone={item.row.id}
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
        className={classes.bar}
        style={{
          left: left + 2,
          width: barWidth,
          ...style,
        }}
        onClick={() => onOpenRow?.(item.row.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenRow?.(item.row.id);
          }
        }}
        title={
          extras.length > 0 ? `${title} · ${extras.join(" · ")}` : title
        }
        aria-label={title}
        data-gantt-bar={item.row.id}
      >
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

/** Compact toolbar controls for Gantt (zoom + date props + bar fields). */
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

  const barCandidates = properties.filter(
    (p) =>
      !p.isPrimary &&
      p.type !== "file" &&
      p.id !== gantt.startPropertyId &&
      p.id !== gantt.endPropertyId,
  );

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
      <MultiSelect
        size="xs"
        w={168}
        aria-label={t("Bar properties")}
        placeholder={t("Bar fields")}
        data={barCandidates.map((p) => ({ value: p.id, label: p.name }))}
        value={gantt.barPropertyIds ?? []}
        onChange={(ids) => onChange({ ...gantt, barPropertyIds: ids })}
        searchable
        clearable
        maxValues={4}
        hidePickedOptions
      />
    </>
  );
}
