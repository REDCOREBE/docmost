import { useEffect, useRef, useState } from "react";
import { Button, Group, Stack, TextInput } from "@mantine/core";
import { modals } from "@mantine/modals";
import type { Editor } from "@tiptap/core";
import { isOnePasswordItemUrl } from "@docmost/editor-ext";
import { insertOnePasswordSmartLink } from "@/features/editor/components/slash-menu/insert-onepassword-link";

export const ONEPASSWORD_LINK_MODAL_ID = "onepassword-slash-link-modal";

export const ONEPASSWORD_INVALID_PERMALINK_MSG =
  "Ce lien n'est pas un permalink 1Password valide.";

type OnePasswordLinkFormProps = {
  onSubmit: (href: string) => void;
  onCancel: () => void;
};

/** Docmost-native permalink form (Modal body) — link mark only, never an embed. */
export function OnePasswordLinkForm({
  onSubmit,
  onCancel,
}: OnePasswordLinkFormProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus Permalink field; Tab order: input → Annuler → Ajouter
    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const submit = () => {
    const permalink = value.trim();
    if (!isOnePasswordItemUrl(permalink)) {
      setError(ONEPASSWORD_INVALID_PERMALINK_MSG);
      return;
    }
    onSubmit(permalink);
  };

  return (
    <Stack gap="md">
      <TextInput
        ref={inputRef}
        label="Permalink"
        placeholder="https://start.1password.com/open/i?…"
        value={value}
        error={error}
        data-autofocus
        onChange={(e) => {
          setValue(e.currentTarget.value);
          if (error) setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            submit();
          }
        }}
      />
      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={onCancel}>
          Annuler
        </Button>
        <Button onClick={submit}>Ajouter</Button>
      </Group>
    </Stack>
  );
}

/**
 * Open the native 1Password permalink modal, then insert at cursor on success.
 * Escape / overlay close cancels and restores editor focus (Mantine default + onClose).
 */
export function openOnePasswordLinkModal(editor: Editor): void {
  const closeAndFocus = () => {
    modals.close(ONEPASSWORD_LINK_MODAL_ID);
    // Keep editor focus after cancel / success
    requestAnimationFrame(() => {
      editor.commands.focus();
    });
  };

  modals.open({
    modalId: ONEPASSWORD_LINK_MODAL_ID,
    title: "Ajouter un lien 1Password",
    centered: true,
    closeOnEscape: true,
    closeOnClickOutside: true,
    onClose: () => {
      editor.commands.focus();
    },
    children: (
      <OnePasswordLinkForm
        onCancel={closeAndFocus}
        onSubmit={(href) => {
          insertOnePasswordSmartLink(editor, href);
          modals.close(ONEPASSWORD_LINK_MODAL_ID);
        }}
      />
    ),
  });
}
