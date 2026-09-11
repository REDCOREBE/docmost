import TiptapLink from '@tiptap/extension-link';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
import {
  ONEPASSWORD_LABEL,
  ONEPASSWORD_NATIVE_BUILD_HINT,
  ONEPASSWORD_SMART_LINKS_MARKER,
  shouldRewriteOnePasswordTitle,
} from './onepassword-smart-links';

export {
  isOnePasswordItemUrl,
  isRawUrlTitle,
  nextVisibleText,
  shouldRewriteOnePasswordTitle,
  ONEPASSWORD_LABEL,
  ONEPASSWORD_LABEL_LEGACY,
  ONEPASSWORD_LABEL_LEGACY_EMOJI,
  ONEPASSWORD_SMART_LINKS_MARKER,
  ONEPASSWORD_NATIVE_BUILD_HINT,
} from './onepassword-smart-links';

// Keep marker string referenced so it survives minification for smoke greps.
void ONEPASSWORD_NATIVE_BUILD_HINT;

export const LinkExtension = TiptapLink.extend({
  inclusive: false,

  addAttributes() {
    return {
      ...this.parent?.(),
      internal: {
        default: false,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-internal') === 'true',
        renderHTML: (attributes) =>
          attributes.internal ? { 'data-internal': 'true' } : {},
      },
    };
  },

  addProseMirrorPlugins() {
    const { editor } = this;

    return [
      ...(this.parent?.() || []),
      new Plugin({
        props: {
          handleKeyDown: (view: EditorView, event: KeyboardEvent) => {
            const { selection } = editor.state;

            if (event.key === 'Escape' && selection.empty !== true) {
              editor.commands.focus(selection.to, { scrollIntoView: false });
            }

            return false;
          },
        },
      }),
      // Fix for Firefox: when the cursor is at a boundary of a link,
      // Firefox's contenteditable inserts new text *inside* the <a> element.
      // ProseMirror then rejects the mutation because inclusive is false,
      // causing keystrokes to be silently swallowed. Firefox also does not
      // fire handleTextInput in this state, so we intercept at handleKeyDown.
      // This handles both:
      //   - right boundary: cursor just after a link (typing appends to link)
      //   - left boundary: cursor just before a link, e.g. at the start of a
      //     line (#1748), where Firefox places new text inside the link node
      new Plugin({
        key: new PluginKey('linkBoundaryInput'),
        props: {
          handleKeyDown: (view: EditorView, event: KeyboardEvent) => {
            // Only handle single printable characters
            if (event.key.length !== 1) return false;
            // Don't handle modified keys (shortcuts) or composing (IME)
            if (
              event.ctrlKey ||
              event.metaKey ||
              event.altKey ||
              event.isComposing
            )
              return false;

            const { state } = view;
            const linkType = state.schema.marks.link;
            if (!linkType) return false;

            // Don't interfere if the user has explicitly set storedMarks
            if (state.storedMarks !== null) return false;

            const { from, to } = state.selection;
            const $from = state.doc.resolve(from);
            const nodeBefore = $from.nodeBefore;
            const nodeAfter = $from.nodeAfter;

            const linkBefore = nodeBefore && linkType.isInSet(nodeBefore.marks);
            const linkAfter = nodeAfter && linkType.isInSet(nodeAfter.marks);

            // If both sides have link marks we're in the middle — don't interfere
            if (linkBefore && linkAfter) return false;

            // Not at any link boundary — nothing to do
            if (!linkBefore && !linkAfter) return false;

            // We're at a link boundary (left or right).
            // Prevent native input and insert text without the link mark.
            event.preventDefault();
            const tr = state.tr.insertText(event.key, from, to);
            tr.removeMark(from, from + event.key.length, linkType);
            view.dispatch(tr.scrollIntoView());
            return true;
          },
        },
      }),
      // OnePassword smart links — appendTransaction-only mutations (V1.2)
      new Plugin({
        key: new PluginKey(ONEPASSWORD_SMART_LINKS_MARKER),
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((tr) => tr.docChanged)) return;
          if (
            transactions.some(
              (tr) =>
                tr.getMeta(ONEPASSWORD_SMART_LINKS_MARKER) ||
                tr.getMeta('history$'),
            )
          ) {
            return;
          }

          const linkType = newState.schema.marks.link;
          if (!linkType) return;

          const hits: { from: number; to: number; marks: readonly import('@tiptap/pm/model').Mark[] }[] =
            [];

          newState.doc.descendants((node, pos) => {
            if (!node.isText) return;
            const mark = linkType.isInSet(node.marks);
            if (!mark) return;
            const href = mark.attrs?.href as string | undefined;
            if (!href || !shouldRewriteOnePasswordTitle(node.text, href)) {
              return;
            }
            hits.push({
              from: pos,
              to: pos + node.nodeSize,
              marks: node.marks,
            });
          });

          if (!hits.length) return;

          const tr = newState.tr;
          tr.setMeta(ONEPASSWORD_SMART_LINKS_MARKER, true);
          for (let i = hits.length - 1; i >= 0; i--) {
            const h = hits[i];
            // Preserve marks/attrs byte-intact (href, target, rel, …)
            tr.replaceWith(
              h.from,
              h.to,
              newState.schema.text(ONEPASSWORD_LABEL, h.marks),
            );
          }
          return tr.docChanged ? tr : undefined;
        },
      }),
    ];
  },
});
