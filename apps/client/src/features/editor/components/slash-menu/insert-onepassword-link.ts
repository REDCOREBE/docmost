import type { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import {
  isOnePasswordItemUrl,
  ONEPASSWORD_LABEL,
  onePasswordCreateDateAttrs,
} from "@docmost/editor-ext";

/**
 * Insert a 1Password smart link at the current selection.
 * PM structure matches paste end-state: text ONEPASSWORD_LABEL + link mark.
 * href is stored exactly (no query normalize / no fetch).
 * Phase 2.1: stamps onePasswordCreatedAt + onePasswordUpdatedAt = now UTC.
 */
export function insertOnePasswordSmartLink(
  editor: Editor,
  href: string,
): boolean {
  const permalink = href.trim();
  if (!editor || !isOnePasswordItemUrl(permalink)) return false;

  const { state, view } = editor;
  const linkType = state.schema.marks.link;
  if (!linkType) return false;

  const mark = linkType.create({
    href: permalink,
    ...onePasswordCreateDateAttrs(),
  });
  const textNode = state.schema.text(ONEPASSWORD_LABEL, [mark]);
  const from = state.selection.from;
  const to = state.selection.to;

  let tr = state.tr.replaceWith(from, to, textNode);
  const after = from + textNode.nodeSize;
  tr = tr.setSelection(TextSelection.create(tr.doc, after));
  view.dispatch(tr.scrollIntoView());
  editor.commands.focus();
  return true;
}
