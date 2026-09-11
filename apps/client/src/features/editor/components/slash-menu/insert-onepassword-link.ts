import type { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import {
  isOnePasswordItemUrl,
  onePasswordCreateDateAttrs,
} from "@docmost/editor-ext";

/**
 * Insert an atomic onePasswordLink node at the current selection.
 * href is stored exactly (no query normalize / no fetch).
 * Stamps onePasswordCreatedAt + onePasswordUpdatedAt = now UTC.
 */
export function insertOnePasswordSmartLink(
  editor: Editor,
  href: string,
): boolean {
  const permalink = href.trim();
  if (!editor || !isOnePasswordItemUrl(permalink)) return false;

  const { state, view } = editor;
  const opType = state.schema.nodes.onePasswordLink;
  if (!opType) return false;

  const node = opType.create({
    href: permalink,
    ...onePasswordCreateDateAttrs(),
  });
  const from = state.selection.from;
  const to = state.selection.to;

  let tr = state.tr.replaceWith(from, to, node);
  const after = from + node.nodeSize;
  tr = tr.setSelection(TextSelection.create(tr.doc, after));
  view.dispatch(tr.scrollIntoView());
  editor.commands.focus();
  return true;
}
