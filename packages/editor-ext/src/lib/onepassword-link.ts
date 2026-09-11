import { mergeAttributes, Node } from '@tiptap/core';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import {
  isOnePasswordItemUrl,
  ONEPASSWORD_LABEL,
} from './onepassword-smart-links';

export type OnePasswordLinkAttrs = {
  href: string | null;
  onePasswordCreatedAt: string | null;
  onePasswordUpdatedAt: string | null;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    onePasswordLink: {
      setOnePasswordLink: (attributes: {
        href: string;
        onePasswordCreatedAt?: string | null;
        onePasswordUpdatedAt?: string | null;
      }) => ReturnType;
    };
  }
}

/**
 * Atomic inline 1Password smart-link chip (Phase 7).
 * Fixed visible label via renderText — never editable content.
 */
export const OnePasswordLink = Node.create({
  name: 'onePasswordLink',

  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      href: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('href'),
        renderHTML: (attributes: OnePasswordLinkAttrs) => {
          if (!attributes.href) return {};
          return { href: attributes.href };
        },
      },
      onePasswordCreatedAt: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-onepassword-created-at'),
        renderHTML: (attributes: OnePasswordLinkAttrs) =>
          attributes.onePasswordCreatedAt
            ? {
                'data-onepassword-created-at': attributes.onePasswordCreatedAt,
              }
            : {},
      },
      onePasswordUpdatedAt: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-onepassword-updated-at'),
        renderHTML: (attributes: OnePasswordLinkAttrs) =>
          attributes.onePasswordUpdatedAt
            ? {
                'data-onepassword-updated-at': attributes.onePasswordUpdatedAt,
              }
            : {},
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `a[data-type="${this.name}"]`,
        getAttrs: (element: HTMLElement) => {
          const href = element.getAttribute('href');
          if (!href || !isOnePasswordItemUrl(href)) return false;
          return {
            href,
            onePasswordCreatedAt:
              element.getAttribute('data-onepassword-created-at') || null,
            onePasswordUpdatedAt:
              element.getAttribute('data-onepassword-updated-at') || null,
          };
        },
      },
      {
        // a[href OP] that already carries data-type=onePasswordLink
        tag: 'a[href]',
        getAttrs: (element: HTMLElement) => {
          if (element.getAttribute('data-type') !== this.name) return false;
          const href = element.getAttribute('href');
          if (!href || !isOnePasswordItemUrl(href)) return false;
          return {
            href,
            onePasswordCreatedAt:
              element.getAttribute('data-onepassword-created-at') || null,
            onePasswordUpdatedAt:
              element.getAttribute('data-onepassword-updated-at') || null,
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const href = (node.attrs.href as string) || '';
    const attrs: Record<string, string> = {
      'data-type': this.name,
      href,
      target: '_blank',
      rel: 'noopener noreferrer nofollow',
      class: 'onepassword-link',
    };
    if (node.attrs.onePasswordCreatedAt) {
      attrs['data-onepassword-created-at'] = node.attrs.onePasswordCreatedAt;
    }
    if (node.attrs.onePasswordUpdatedAt) {
      attrs['data-onepassword-updated-at'] = node.attrs.onePasswordUpdatedAt;
    }
    return [
      'a',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, attrs),
      ONEPASSWORD_LABEL,
    ];
  },

  renderText() {
    return ONEPASSWORD_LABEL;
  },

  addCommands() {
    return {
      setOnePasswordLink:
        (attributes) =>
        ({ commands }) => {
          if (!isOnePasswordItemUrl(attributes.href)) return false;
          return commands.insertContent({
            type: this.name,
            attrs: {
              href: attributes.href,
              onePasswordCreatedAt: attributes.onePasswordCreatedAt ?? null,
              onePasswordUpdatedAt: attributes.onePasswordUpdatedAt ?? null,
            },
          });
        },
    };
  },
});

/**
 * Cold-rollback helper: replace onePasswordLink atoms with text + link mark
 * so a schema without the node can load the document.
 * MUST run before deploying an image whose schema lacks onePasswordLink
 * (NEVER Hub / pre-r9 image without conversion).
 */
export function convertOnePasswordLinkNodesToLinkMarks(
  doc: ProseMirrorNode,
): ProseMirrorNode {
  const linkType = doc.type.schema.marks.link;
  if (!linkType) return doc;

  const convertJson = (n: any): any => {
    if (!n || typeof n !== 'object') return n;
    if (n.type === 'onePasswordLink') {
      return {
        type: 'text',
        text: ONEPASSWORD_LABEL,
        marks: [
          {
            type: 'link',
            attrs: {
              href: n.attrs?.href ?? '',
              target: '_blank',
              rel: 'noopener noreferrer nofollow',
              class: null,
              internal: false,
              onePasswordCreatedAt: n.attrs?.onePasswordCreatedAt ?? null,
              onePasswordUpdatedAt: n.attrs?.onePasswordUpdatedAt ?? null,
            },
          },
        ],
      };
    }
    if (Array.isArray(n.content)) {
      return { ...n, content: n.content.map(convertJson) };
    }
    return n;
  };

  return ProseMirrorNode.fromJSON(doc.type.schema, convertJson(doc.toJSON()));
}
