import { useCallback, useEffect, useRef, useState } from "react";
import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import {
  Box,
  Button,
  Divider,
  Group,
  Image,
  Popover,
  Stack,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCopy,
  IconExternalLink,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import {
  isOnePasswordItemUrl,
  ONEPASSWORD_LABEL,
  onePasswordCreateDateAttrs,
  onePasswordHrefUpdateDateAttrs,
  onePasswordTooltipLabel,
  nowUtcIso,
} from "@docmost/editor-ext";

type PanelMode = "menu" | "edit";

type MenuItemProps = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color?: string;
  onClick: () => void;
};

function MenuItem({ icon, title, subtitle, color, onClick }: MenuItemProps) {
  return (
    <UnstyledButton
      onClick={onClick}
      p="10px 8px"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        width: "100%",
        borderRadius: 8,
      }}
      styles={{
        root: {
          "&:hover": {
            backgroundColor: "var(--mantine-color-gray-0)",
          },
        },
      }}
    >
      <Box
        style={{
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {icon}
      </Box>
      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm" fw={600} c={color || "dark"}>
          {title}
        </Text>
        <Text size="xs" c="dimmed">
          {subtitle}
        </Text>
      </Stack>
    </UnstyledButton>
  );
}

/**
 * Atomic onePasswordLink NodeView — badge chip, contenteditable=false.
 * Editable mode: action menu (open / copy / edit / delete), then permalink form.
 */
export default function OnePasswordLinkView(props: NodeViewProps) {
  const { node, updateAttributes, deleteNode, editor, selected } = props;
  const href = (node.attrs.href as string) || "";
  const createdAt = (node.attrs.onePasswordCreatedAt as string) || null;
  const updatedAt = (node.attrs.onePasswordUpdatedAt as string) || null;
  const isEditable = editor.isEditable;

  const [opened, setOpened] = useState(false);
  const [mode, setMode] = useState<PanelMode>("menu");
  const [editUrl, setEditUrl] = useState(href);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const tooltip = onePasswordTooltipLabel(createdAt, updatedAt);

  useEffect(() => {
    if (!opened) {
      setMode("menu");
      return;
    }
    setEditUrl(href);
    setError(null);
  }, [opened, href]);

  useEffect(() => {
    if (opened && mode === "edit") {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [opened, mode]);

  const closePopover = useCallback(() => {
    setOpened(false);
    setMode("menu");
  }, []);

  const openHref = useCallback(
    (e?: React.MouseEvent | React.KeyboardEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      if (!href) return;
      window.open(href, "_blank", "noopener,noreferrer");
    },
    [href],
  );

  const copyHref = useCallback(async () => {
    if (!href) return;
    try {
      await navigator.clipboard.writeText(href);
      notifications.show({ message: "Lien copié" });
      closePopover();
    } catch {
      notifications.show({
        message: "Impossible de copier le lien",
        color: "red",
      });
    }
  }, [href, closePopover]);

  const removeLink = useCallback(() => {
    deleteNode();
    closePopover();
  }, [deleteNode, closePopover]);

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
    closePopover();
  }, [editUrl, href, createdAt, updatedAt, updateAttributes, closePopover]);

  const openMenu = useCallback(() => {
    setMode("menu");
    setOpened(true);
  }, []);

  return (
    <NodeViewWrapper
      as="span"
      style={{ display: "inline" }}
      data-drag-handle
      className={selected ? "ProseMirror-selectednode" : undefined}
    >
      <Popover
        opened={opened}
        onChange={(next) => {
          setOpened(next);
          if (!next) setMode("menu");
        }}
        width={mode === "menu" ? 236 : 340}
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
                  openMenu();
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
                  if (isEditable) openMenu();
                  else openHref(e);
                }
              }}
            >
              {ONEPASSWORD_LABEL}
            </a>
          </Tooltip>
        </Popover.Target>

        <Popover.Dropdown p={mode === "menu" ? "xs" : "md"}>
          {mode === "menu" ? (
            <Stack gap={2}>
              <MenuItem
                icon={
                  <Image
                    src="/icons/onepassword-logo.png"
                    alt=""
                    w={24}
                    h={24}
                    fit="contain"
                  />
                }
                title="Ouvrir dans 1Password"
                subtitle="Accéder à cet élément"
                onClick={() => {
                  openHref();
                  closePopover();
                }}
              />
              <MenuItem
                icon={<IconCopy size={20} stroke={1.6} />}
                title="Copier le lien"
                subtitle="Lien d’accès à partager"
                onClick={() => {
                  void copyHref();
                }}
              />
              <MenuItem
                icon={<IconPencil size={20} stroke={1.6} />}
                title="Modifier le lien"
                subtitle="Gérer le lien 1Password"
                onClick={() => setMode("edit")}
              />
              <Divider my={4} />
              <MenuItem
                icon={
                  <IconTrash
                    size={20}
                    stroke={1.6}
                    color="var(--mantine-color-red-6)"
                  />
                }
                title="Supprimer le lien"
                subtitle="Retirer l’intégration"
                color="red"
                onClick={removeLink}
              />
            </Stack>
          ) : (
            <Stack gap="sm">
              <Text fw={700} size="sm">
                Permalink
              </Text>
              <TextInput
                ref={inputRef}
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
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setMode("menu");
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
              <Group justify="space-between" gap="xs" wrap="nowrap">
                <Button
                  variant="light"
                  color="blue"
                  size="xs"
                  leftSection={<IconExternalLink size={14} />}
                  onClick={() => openHref()}
                >
                  Ouvrir
                </Button>
                <Group gap="xs" wrap="nowrap">
                  <Button
                    variant="default"
                    size="xs"
                    onClick={() => setMode("menu")}
                  >
                    Annuler
                  </Button>
                  <Button
                    size="xs"
                    leftSection={<IconPencil size={14} />}
                    onClick={save}
                  >
                    Enregistrer
                  </Button>
                </Group>
              </Group>
            </Stack>
          )}
        </Popover.Dropdown>
      </Popover>
    </NodeViewWrapper>
  );
}
