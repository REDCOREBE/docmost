import { useCallback, useEffect, useRef, useState } from "react";
import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import {
  ActionIcon,
  Button,
  Group,
  Popover,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconExternalLink, IconPencil } from "@tabler/icons-react";
import {
  isOnePasswordItemUrl,
  ONEPASSWORD_LABEL,
  onePasswordCreateDateAttrs,
  onePasswordHrefUpdateDateAttrs,
  onePasswordTooltipLabel,
  nowUtcIso,
} from "@docmost/editor-ext";

/**
 * Atomic onePasswordLink NodeView — badge chip, contenteditable=false.
 * Click opens href; edit via popup (permalink + dates). Label never editable.
 */
export default function OnePasswordLinkView(props: NodeViewProps) {
  const { node, updateAttributes, editor, selected } = props;
  const href = (node.attrs.href as string) || "";
  const createdAt = (node.attrs.onePasswordCreatedAt as string) || null;
  const updatedAt = (node.attrs.onePasswordUpdatedAt as string) || null;
  const isEditable = editor.isEditable;

  const [opened, setOpened] = useState(false);
  const [editUrl, setEditUrl] = useState(href);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const tooltip = onePasswordTooltipLabel(createdAt, updatedAt);

  useEffect(() => {
    if (opened) {
      setEditUrl(href);
      setError(null);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [opened, href]);

  const openHref = useCallback(
    (e?: React.MouseEvent | React.KeyboardEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      if (!href) return;
      window.open(href, "_blank", "noopener,noreferrer");
    },
    [href],
  );

  const save = useCallback(() => {
    const permalink = editUrl.trim();
    if (!isOnePasswordItemUrl(permalink)) {
      setError("Ce lien n'est pas un permalink 1Password valide.");
      return;
    }
    const hrefChanged = permalink !== href;
    let dateAttrs = {
      onePasswordCreatedAt: createdAt,
      onePasswordUpdatedAt: updatedAt,
    };
    if (hrefChanged) {
      dateAttrs = createdAt
        ? onePasswordHrefUpdateDateAttrs(dateAttrs)
        : onePasswordCreateDateAttrs(nowUtcIso());
    }
    updateAttributes({
      href: permalink,
      ...dateAttrs,
    });
    setOpened(false);
  }, [editUrl, href, createdAt, updatedAt, updateAttributes]);

  return (
    <NodeViewWrapper
      as="span"
      style={{ display: "inline" }}
      data-drag-handle
      className={selected ? "ProseMirror-selectednode" : undefined}
    >
      <Popover
        opened={opened}
        onChange={setOpened}
        width={340}
        position="bottom"
        withArrow
        shadow="md"
        trapFocus
      >
        <Popover.Target>
          <Tooltip
            label={
              <Text size="xs" style={{ whiteSpace: "pre-line" }}>
                {tooltip}
              </Text>
            }
            multiline
            withArrow
            disabled={opened}
          >
            <a
              href={href}
              data-type="onePasswordLink"
              data-onepassword-created-at={createdAt || undefined}
              data-onepassword-updated-at={updatedAt || undefined}
              className="onepassword-link"
              contentEditable={false}
              suppressContentEditableWarning
              draggable={false}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isEditable && (e.metaKey || e.ctrlKey)) {
                  openHref(e);
                  return;
                }
                if (isEditable) {
                  setOpened(true);
                  return;
                }
                openHref(e);
              }}
              onAuxClick={(e) => {
                if (e.button === 1) openHref(e);
              }}
              role="link"
              tabIndex={0}
              aria-label={ONEPASSWORD_LABEL}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (isEditable) setOpened(true);
                  else openHref(e);
                }
              }}
            >
              {ONEPASSWORD_LABEL}
            </a>
          </Tooltip>
        </Popover.Target>

        <Popover.Dropdown>
          <Stack gap="sm">
            <TextInput
              ref={inputRef}
              label="Permalink"
              value={editUrl}
              error={error}
              onChange={(e) => {
                setEditUrl(e.currentTarget.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  save();
                }
              }}
            />
            {updatedAt ? (
              <Text size="xs" c="dimmed">
                Mis à jour : {updatedAt}
              </Text>
            ) : createdAt ? (
              <Text size="xs" c="dimmed">
                Créé : {createdAt}
              </Text>
            ) : null}
            <Group justify="space-between" gap="xs">
              <ActionIcon
                variant="subtle"
                aria-label="Ouvrir le lien"
                onClick={() => openHref()}
              >
                <IconExternalLink size={16} />
              </ActionIcon>
              <Group gap="xs">
                <Button variant="default" size="xs" onClick={() => setOpened(false)}>
                  Annuler
                </Button>
                <Button size="xs" leftSection={<IconPencil size={14} />} onClick={save}>
                  Enregistrer
                </Button>
              </Group>
            </Group>
          </Stack>
        </Popover.Dropdown>
      </Popover>
    </NodeViewWrapper>
  );
}
