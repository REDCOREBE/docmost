import { useId, useState } from "react";
import { Popover } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { ContextUsageView } from "../hooks/use-context-usage";
import classes from "../styles/context-usage-ring.module.css";

const SIZE = 20;
const STROKE = 2;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Props = {
  view: ContextUsageView;
  isStreaming?: boolean;
};

function formatTokens(n: number, locale: string) {
  return Math.round(n).toLocaleString(locale);
}

export default function ContextUsageRing({ view, isStreaming }: Props) {
  const { t, i18n } = useTranslation();
  const [opened, setOpened] = useState(false);
  const dropdownId = useId();
  const locale = i18n.language || "en";
  const fillPercent = view.isKnown ? (view.percent ?? 0) : 0;
  const dashOffset = CIRCUMFERENCE * (1 - fillPercent / 100);
  const ariaLabel = view.isKnown
    ? t("Context ~{{percent}}%", { percent: view.roundedPercent })
    : t("Context available after the first message");

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="top-end"
      width={280}
      shadow="md"
      withinPortal
      withRoles={false}
      trapFocus
      returnFocus
      closeOnEscape
      closeOnClickOutside
    >
      <Popover.Target>
        <button
          type="button"
          className={classes.ringButton}
          data-context-usage-ring
          data-context-usage-level={view.visualLevel}
          data-context-usage-known={view.isKnown ? "true" : "false"}
          data-context-usage-compacted={view.compacted ? "true" : "false"}
          aria-label={ariaLabel}
          aria-haspopup="dialog"
          aria-expanded={opened}
          aria-controls={opened ? dropdownId : undefined}
          aria-busy={isStreaming || undefined}
          onClick={() => setOpened((o) => !o)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && opened) {
              event.preventDefault();
              event.stopPropagation();
              setOpened(false);
            }
          }}
        >
          <svg
            className={classes.ringSvg}
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            aria-hidden
          >
            <circle
              className={classes.track}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
            />
            <circle
              className={classes.fill}
              data-level={view.visualLevel}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={view.isKnown ? dashOffset : CIRCUMFERENCE}
            />
          </svg>
        </button>
      </Popover.Target>
      <Popover.Dropdown id={dropdownId} p="sm" className={classes.popover}>
        {view.isKnown && view.usage ? (
          <>
            <div className={classes.header}>
              <span className={classes.title}>{t("Context")}</span>
              <span className={classes.percent}>
                {t("~{{percent}}%", { percent: view.roundedPercent })}
              </span>
            </div>
            <div className={classes.bar} aria-hidden>
              <div
                className={classes.barFill}
                data-level={view.visualLevel}
                style={{ width: `${fillPercent}%` }}
              />
            </div>
            <div className={classes.used}>
              {t("{{used}} / {{limit}} tokens", {
                used: formatTokens(view.usage.estimatedUsedTokens, locale),
                limit: formatTokens(view.usage.contextLimit, locale),
              })}
            </div>
            <div className={classes.rows}>
              {typeof view.usage.systemPromptTokens === "number" && (
                <div className={classes.row}>
                  <span className={classes.rowLabel}>{t("System prompt")}</span>
                  <span>~{formatTokens(view.usage.systemPromptTokens, locale)}</span>
                </div>
              )}
              {typeof view.usage.toolsTokens === "number" && (
                <div className={classes.row}>
                  <span className={classes.rowLabel}>{t("Tools")}</span>
                  <span>~{formatTokens(view.usage.toolsTokens, locale)}</span>
                </div>
              )}
              {typeof view.usage.historyTokens === "number" && (
                <div className={classes.row}>
                  <span className={classes.rowLabel}>{t("History")}</span>
                  <span>~{formatTokens(view.usage.historyTokens, locale)}</span>
                </div>
              )}
              {typeof view.usage.internalMemoryTokens === "number" && (
                <div className={classes.row}>
                  <span className={classes.rowLabel}>{t("Internal memory")}</span>
                  <span>~{formatTokens(view.usage.internalMemoryTokens, locale)}</span>
                </div>
              )}
              {typeof view.usage.attachmentsTokens === "number" && (
                <div className={classes.row}>
                  <span className={classes.rowLabel}>{t("Attachments")}</span>
                  <span>~{formatTokens(view.usage.attachmentsTokens, locale)}</span>
                </div>
              )}
              <div className={classes.row}>
                <span className={classes.rowLabel}>{t("History compacted")}</span>
                <span>{view.compacted ? t("Yes") : t("No")}</span>
              </div>
              {typeof view.usage.messagesBefore === "number" &&
                typeof view.usage.messagesAfter === "number" && (
                  <div className={classes.row}>
                    <span className={classes.rowLabel}>{t("Messages")}</span>
                    <span>
                      {view.usage.messagesBefore} → {view.usage.messagesAfter}
                    </span>
                  </div>
                )}
            </div>
            {isStreaming && (
              <div className={classes.note}>{t("Updating context…")}</div>
            )}
            {view.compacted && (
              <div className={classes.note}>
                {t("History was compacted to free space.")}{" "}
                {t("Context can decrease after compaction.")}
              </div>
            )}
          </>
        ) : (
          <>
            <div className={classes.baseline}>{t("Base context loaded")}</div>
            <div className={classes.baselineHint}>
              {t("Details will be available after the first message.")}
            </div>
          </>
        )}
      </Popover.Dropdown>
    </Popover>
  );
}
