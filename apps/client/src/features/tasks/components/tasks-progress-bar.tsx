import { Progress } from "@mantine/core";

export function TasksProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value ?? 0));
  return (
    <Progress
      value={clamped}
      size="sm"
      radius="sm"
      aria-label={`${clamped}%`}
    />
  );
}
