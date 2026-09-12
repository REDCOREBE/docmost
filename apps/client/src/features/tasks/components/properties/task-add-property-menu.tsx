import { useMemo, useState } from "react";
import { Popover, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import {
  IconAlignLeft,
  IconCalendar,
  IconHash,
  IconLetterT,
  IconList,
  IconListCheck,
  IconPlus,
  IconUser,
  IconFileText,
} from "@tabler/icons-react";
import { TaskPropertyType } from "../../types/task.types";
import classes from "../../styles/tasks.module.css";

const TYPE_META: {
  type: TaskPropertyType;
  labelKey: string;
  Icon: typeof IconLetterT;
}[] = [
  { type: "text", labelKey: "Text", Icon: IconLetterT },
  { type: "long_text", labelKey: "Long text", Icon: IconAlignLeft },
  { type: "number", labelKey: "Number", Icon: IconHash },
  { type: "select", labelKey: "Select", Icon: IconList },
  { type: "multi_select", labelKey: "Multi-select", Icon: IconListCheck },
  { type: "date", labelKey: "Date", Icon: IconCalendar },
  { type: "person", labelKey: "Person", Icon: IconUser },
  { type: "page", labelKey: "Page", Icon: IconFileText },
];

export function TaskAddPropertyMenu({
  onCreate,
  disabled,
}: {
  onCreate: (type: TaskPropertyType, name: string) => Promise<void> | void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  const [query, setQuery] = useState("");
  const [pendingType, setPendingType] = useState<TaskPropertyType | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TYPE_META;
    return TYPE_META.filter(
      (m) =>
        t(m.labelKey).toLowerCase().includes(q) ||
        m.type.includes(q),
    );
  }, [query, t]);

  function reset() {
    setQuery("");
    setPendingType(null);
    setName("");
    setSaving(false);
  }

  async function submit() {
    if (!pendingType || !name.trim() || saving) return;
    setSaving(true);
    try {
      await onCreate(pendingType, name.trim());
      setOpened(false);
      reset();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Popover
      opened={opened}
      onChange={(o) => {
        setOpened(o);
        if (!o) reset();
      }}
      width={280}
      position="bottom-start"
      shadow="md"
      withinPortal
    >
      <Popover.Target>
        <button
          type="button"
          className={classes.addProperty}
          disabled={disabled}
          onClick={() => setOpened((v) => !v)}
        >
          <IconPlus size={15} />
          {t("Add a property")}
        </button>
      </Popover.Target>
      <Popover.Dropdown>
        {pendingType ? (
          <Stack gap="xs">
            <Text size="sm" fw={600}>
              {t(TYPE_META.find((m) => m.type === pendingType)!.labelKey)}
            </Text>
            <TextInput
              placeholder={t("Property name")}
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
              }}
              autoFocus
            />
            <UnstyledButton
              onClick={() => void submit()}
              disabled={!name.trim() || saving}
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              {t("Create")}
            </UnstyledButton>
          </Stack>
        ) : (
          <Stack gap={4}>
            <TextInput
              placeholder={t("Search")}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              size="xs"
              autoFocus
            />
            {filtered.map(({ type, labelKey, Icon }) => (
              <UnstyledButton
                key={type}
                onClick={() => setPendingType(type)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 4px",
                  borderRadius: 6,
                  fontSize: 13,
                }}
              >
                <Icon size={16} />
                {t(labelKey)}
              </UnstyledButton>
            ))}
          </Stack>
        )}
      </Popover.Dropdown>
    </Popover>
  );
}
