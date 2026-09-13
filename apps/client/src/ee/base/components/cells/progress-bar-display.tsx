import { Group, Progress, Text } from "@mantine/core";
import { clampProgressPercent } from "@/ee/base/components/cells/progress-utils";
import cellClasses from "@/ee/base/styles/cells.module.css";

export { clampProgressPercent } from "@/ee/base/components/cells/progress-utils";

type ProgressBarDisplayProps = {
  value: number;
  /** Compact density for grid cells vs row detail. */
  size?: "xs" | "sm";
};

/**
 * Native-looking progress: thin track + blue fill + percent on the right.
 * Reuses Mantine Progress (Docmost / Mantine tokens).
 */
export function ProgressBarDisplay({
  value,
  size = "sm",
}: ProgressBarDisplayProps) {
  const pct = clampProgressPercent(value);
  return (
    <Group
      gap={8}
      wrap="nowrap"
      className={cellClasses.progressBar}
      style={{ width: "100%" }}
    >
      <Progress
        value={pct}
        size={size}
        radius="xl"
        color="blue"
        className={cellClasses.progressTrack}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      />
      <Text
        size="xs"
        c="dimmed"
        ta="right"
        className={cellClasses.progressLabel}
      >
        {pct}%
      </Text>
    </Group>
  );
}
