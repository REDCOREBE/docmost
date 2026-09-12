import {
  MultiSelect,
  NumberInput,
  Select,
  TextInput,
  Textarea,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useTranslation } from "react-i18next";
import {
  TaskProperty,
  TaskPropertyValue,
} from "../../types/task.types";

type CommonProps = {
  property: TaskProperty;
  value?: TaskPropertyValue | null;
  disabled?: boolean;
  onChange: (patch: Partial<TaskPropertyValue>) => void;
  personOptions?: { value: string; label: string }[];
  pageOptions?: { value: string; label: string }[];
};

function emptyPatch(): Partial<TaskPropertyValue> {
  return {
    valueText: null,
    valueNumber: null,
    valueTimestamptz: null,
    valueJson: null,
  };
}

export function TaskTextProperty({
  value,
  disabled,
  onChange,
}: CommonProps) {
  return (
    <TextInput
      variant="unstyled"
      size="sm"
      disabled={disabled}
      value={value?.valueText ?? ""}
      onChange={(e) =>
        onChange({ ...emptyPatch(), valueText: e.currentTarget.value || null })
      }
      placeholder="—"
      styles={{ input: { minHeight: 32 } }}
    />
  );
}

export function TaskLongTextProperty({
  value,
  disabled,
  onChange,
}: CommonProps) {
  return (
    <Textarea
      variant="unstyled"
      size="sm"
      disabled={disabled}
      value={value?.valueText ?? ""}
      onChange={(e) =>
        onChange({ ...emptyPatch(), valueText: e.currentTarget.value || null })
      }
      autosize
      minRows={1}
      maxRows={6}
      placeholder="—"
    />
  );
}

export function TaskNumberProperty({
  value,
  disabled,
  onChange,
}: CommonProps) {
  return (
    <NumberInput
      variant="unstyled"
      size="sm"
      disabled={disabled}
      value={value?.valueNumber ?? undefined}
      onChange={(v) =>
        onChange({
          ...emptyPatch(),
          valueNumber: typeof v === "number" ? v : null,
        })
      }
      hideControls
      placeholder="—"
    />
  );
}

export function TaskSelectProperty({
  property,
  value,
  disabled,
  onChange,
}: CommonProps) {
  const data = (property.options ?? []).map((o) => ({
    value: o.id,
    label: o.name,
  }));
  return (
    <Select
      variant="unstyled"
      size="sm"
      disabled={disabled}
      data={data}
      value={value?.valueText ?? null}
      onChange={(v) => onChange({ ...emptyPatch(), valueText: v })}
      clearable
      searchable
      placeholder="—"
    />
  );
}

export function TaskMultiSelectProperty({
  property,
  value,
  disabled,
  onChange,
}: CommonProps) {
  const data = (property.options ?? []).map((o) => ({
    value: o.id,
    label: o.name,
  }));
  const selected = Array.isArray(value?.valueJson)
    ? (value!.valueJson as string[])
    : [];
  return (
    <MultiSelect
      variant="unstyled"
      size="sm"
      disabled={disabled}
      data={data}
      value={selected}
      onChange={(v) =>
        onChange({ ...emptyPatch(), valueJson: v.length ? v : null })
      }
      searchable
      placeholder="—"
    />
  );
}

export function TaskDateProperty({
  value,
  disabled,
  onChange,
}: CommonProps) {
  const raw = value?.valueTimestamptz
    ? value.valueTimestamptz.slice(0, 10)
    : null;
  return (
    <DateInput
      variant="unstyled"
      size="sm"
      disabled={disabled}
      value={raw || undefined}
      onChange={(val) =>
        onChange({
          ...emptyPatch(),
          valueTimestamptz: val ? `${val}T00:00:00.000Z` : null,
        })
      }
      clearable
      placeholder="—"
    />
  );
}

export function TaskPersonProperty({
  value,
  disabled,
  onChange,
  personOptions = [],
}: CommonProps) {
  const { t } = useTranslation();
  const selected = Array.isArray(value?.valueJson)
    ? (value!.valueJson as string[])
    : [];
  return (
    <MultiSelect
      variant="unstyled"
      size="sm"
      disabled={disabled}
      data={personOptions}
      value={selected}
      onChange={(v) =>
        onChange({ ...emptyPatch(), valueJson: v.length ? v : null })
      }
      searchable
      placeholder={t("Assignees")}
    />
  );
}

export function TaskPageProperty({
  value,
  disabled,
  onChange,
  pageOptions = [],
}: CommonProps) {
  const { t } = useTranslation();
  const pageId =
    value?.valueJson &&
    typeof value.valueJson === "object" &&
    !Array.isArray(value.valueJson)
      ? String((value.valueJson as { pageId?: string }).pageId ?? "")
      : typeof value?.valueJson === "string"
        ? value.valueJson
        : null;
  return (
    <Select
      variant="unstyled"
      size="sm"
      disabled={disabled}
      data={pageOptions}
      value={pageId}
      onChange={(v) =>
        onChange({
          ...emptyPatch(),
          valueJson: v ? { pageId: v } : null,
        })
      }
      clearable
      searchable
      placeholder={t("Linked page")}
    />
  );
}

export function TaskPropertyEditor(props: CommonProps) {
  switch (props.property.type) {
    case "text":
      return <TaskTextProperty {...props} />;
    case "long_text":
      return <TaskLongTextProperty {...props} />;
    case "number":
      return <TaskNumberProperty {...props} />;
    case "select":
      return <TaskSelectProperty {...props} />;
    case "multi_select":
      return <TaskMultiSelectProperty {...props} />;
    case "date":
      return <TaskDateProperty {...props} />;
    case "person":
      return <TaskPersonProperty {...props} />;
    case "page":
      return <TaskPageProperty {...props} />;
    default:
      return null;
  }
}
