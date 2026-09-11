/**
 * Unit + ProseMirror integration tests for native OnePassword Smart Links.
 * Fixtures only — no network. Run after `pnpm --filter @docmost/editor-ext build`
 * from repo root (or inside C2 builder):
 *   node packages/editor-ext/test/onepassword-smart-links.test.cjs
 */

'use strict';

const assert = require('assert');
const path = require('path');

const distLink = path.join(__dirname, '../dist/lib/link.js');
const distHelpers = path.join(__dirname, '../dist/lib/onepassword-smart-links.js');

const helpers = require(distHelpers);
const {
  isOnePasswordItemUrl,
  isRawUrlTitle,
  nextVisibleText,
  shouldRewriteOnePasswordTitle,
  ONEPASSWORD_LABEL,
  ONEPASSWORD_LABEL_LEGACY,
  ONEPASSWORD_LABEL_LEGACY_EMOJI,
  ONEPASSWORD_SMART_LINKS_MARKER,
} = helpers;

const FIXTURE =
  'https://start.1password.com/open/i?a=aaa&v=bbb&i=ccc&h=example';

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`OK  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

test('exports marker + label', () => {
  assert.strictEqual(ONEPASSWORD_SMART_LINKS_MARKER, 'REDCORE_ONEPASSWORD_SMART_LINKS_NATIVE');
  assert.strictEqual(ONEPASSWORD_LABEL, '1Password');
  assert.ok(!ONEPASSWORD_LABEL.includes('🔐'));
  assert.ok(!ONEPASSWORD_LABEL.includes('Accès'));
});

test('valid item URL', () => {
  assert.strictEqual(isOnePasswordItemUrl(FIXTURE), true);
});

test('trailing slash pathname', () => {
  assert.strictEqual(
    isOnePasswordItemUrl(
      'https://start.1password.com/open/i/?a=aaa&v=bbb&i=ccc&h=example',
    ),
    true,
  );
});

test('http rejected', () => {
  assert.strictEqual(
    isOnePasswordItemUrl(
      'http://start.1password.com/open/i?a=aaa&v=bbb&i=ccc&h=example',
    ),
    false,
  );
});

test('wrong host rejected', () => {
  assert.strictEqual(
    isOnePasswordItemUrl(
      'https://my.1password.com/open/i?a=aaa&v=bbb&i=ccc&h=example',
    ),
    false,
  );
});

test('false positive 1password in query rejected', () => {
  assert.strictEqual(
    isOnePasswordItemUrl('https://example.com/path?ref=1password&x=1'),
    false,
  );
});

test('wrong path rejected', () => {
  assert.strictEqual(
    isOnePasswordItemUrl('https://start.1password.com/open/other?a=1'),
    false,
  );
});

test('text==href -> transform to 1Password', () => {
  assert.strictEqual(nextVisibleText(FIXTURE, FIXTURE), ONEPASSWORD_LABEL);
  assert.strictEqual(shouldRewriteOnePasswordTitle(FIXTURE, FIXTURE), true);
});

test('legacy Accès label migrates', () => {
  assert.strictEqual(
    nextVisibleText(ONEPASSWORD_LABEL_LEGACY, FIXTURE),
    ONEPASSWORD_LABEL,
  );
});

test('legacy emoji label migrates', () => {
  assert.strictEqual(
    nextVisibleText(ONEPASSWORD_LABEL_LEGACY_EMOJI, FIXTURE),
    ONEPASSWORD_LABEL,
  );
});

test('custom text conserved', () => {
  assert.strictEqual(
    nextVisibleText('Mot de passe firewall', FIXTURE),
    'Mot de passe firewall',
  );
  assert.strictEqual(
    shouldRewriteOnePasswordTitle('Mot de passe firewall', FIXTURE),
    false,
  );
});

test('already labeled is no-op', () => {
  assert.strictEqual(
    nextVisibleText(ONEPASSWORD_LABEL, FIXTURE),
    ONEPASSWORD_LABEL,
  );
  assert.strictEqual(
    shouldRewriteOnePasswordTitle(ONEPASSWORD_LABEL, FIXTURE),
    false,
  );
});

test('href intact (helpers never mutate href)', () => {
  const href = FIXTURE;
  nextVisibleText(href, href);
  assert.strictEqual(href, FIXTURE);
});

test('isRawUrlTitle trailing-slash autolink equivalent', () => {
  const href = FIXTURE;
  const text =
    'https://start.1password.com/open/i/?a=aaa&v=bbb&i=ccc&h=example';
  assert.strictEqual(isRawUrlTitle(text, href), true);
});

function loadPm() {
  try {
    return {
      model: require('@tiptap/pm/model'),
      state: require('@tiptap/pm/state'),
      history: require('@tiptap/pm/history'),
    };
  } catch {
    const { createRequire } = require('module');
    const req = createRequire(path.join(__dirname, '../../../package.json'));
    return {
      model: req('@tiptap/pm/model'),
      state: req('@tiptap/pm/state'),
      history: req('@tiptap/pm/history'),
    };
  }
}

test('prosemirror: appendTransaction transforms text==href; href intact; custom unchanged; undo meta skipped', () => {
  // Ensure link module loads (side-effect free for helpers; plugin factory in LinkExtension)
  require(distLink);

  const { Schema } = loadPm().model;
  const { EditorState, Plugin, PluginKey } = loadPm().state;

  const schema = new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: {
        content: 'inline*',
        group: 'block',
        toDOM: () => ['p', 0],
      },
      text: { group: 'inline' },
    },
    marks: {
      link: {
        attrs: {
          href: {},
          target: { default: '_blank' },
          rel: { default: 'noopener noreferrer nofollow' },
          class: { default: null },
          internal: { default: false },
        },
        inclusive: false,
        toDOM: (mark) => [
          'a',
          {
            href: mark.attrs.href,
            target: mark.attrs.target,
            rel: mark.attrs.rel,
          },
          0,
        ],
      },
      bold: {
        toDOM: () => ['strong', 0],
      },
    },
  });

  const plugin = new Plugin({
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
      const hits = [];
      newState.doc.descendants((node, pos) => {
        if (!node.isText) return;
        const mark = linkType.isInSet(node.marks);
        if (!mark) return;
        const href = mark.attrs.href;
        if (!shouldRewriteOnePasswordTitle(node.text, href)) return;
        hits.push({ from: pos, to: pos + node.nodeSize, marks: node.marks });
      });
      if (!hits.length) return;
      const tr = newState.tr;
      tr.setMeta(ONEPASSWORD_SMART_LINKS_MARKER, true);
      for (let i = hits.length - 1; i >= 0; i--) {
        const h = hits[i];
        tr.replaceWith(
          h.from,
          h.to,
          newState.schema.text(ONEPASSWORD_LABEL, h.marks),
        );
      }
      return tr.docChanged ? tr : undefined;
    },
  });

  assert.ok(plugin.spec.appendTransaction, 'appendTransaction: yes');
  assert.strictEqual(plugin.spec.filterTransaction, undefined, 'filterTransaction: no');
  assert.ok(!plugin.props || !plugin.props.handlePaste, 'handlePaste: no');

  let state = EditorState.create({
    schema,
    plugins: [plugin],
    doc: schema.node('doc', null, [schema.node('paragraph', null, [])]),
  });

  const linkMark = schema.marks.link.create({
    href: FIXTURE,
    target: '_blank',
    rel: 'noopener noreferrer nofollow',
  });
  const boldMark = schema.marks.bold.create();

  // Paste-like: insert linked URL with text === href (+ extra bold mark)
  let tr = state.tr.insert(1, schema.text(FIXTURE, [linkMark, boldMark]));
  state = state.apply(tr);

  for (let i = 0; i < 10; i++) {
    const appended = plugin.spec.appendTransaction([tr], state, state);
    if (!appended) break;
    state = state.apply(appended);
    tr = appended;
  }

  let found = null;
  state.doc.descendants((node) => {
    if (node.isText) found = node;
  });
  assert.ok(found);
  assert.strictEqual(found.text, ONEPASSWORD_LABEL);
  assert.strictEqual(found.marks.find((m) => m.type === schema.marks.link).attrs.href, FIXTURE);
  assert.strictEqual(
    found.marks.find((m) => m.type === schema.marks.link).attrs.target,
    '_blank',
  );
  assert.strictEqual(
    found.marks.find((m) => m.type === schema.marks.link).attrs.rel,
    'noopener noreferrer nofollow',
  );
  assert.ok(
    schema.marks.bold.isInSet(found.marks),
    'non-link marks preserved on replaceWith',
  );

  // Custom title must not be rewritten
  tr = state.tr.replaceWith(
    1,
    state.doc.content.size - 1,
    schema.text('🔐 Accès VPN Sophos', [
      schema.marks.link.create({ href: FIXTURE, target: '_blank' }),
    ]),
  );
  state = state.apply(tr);
  const again = plugin.spec.appendTransaction([tr], state, state);
  assert.ok(!again, 'custom title => no-op');
  let custom = null;
  state.doc.descendants((node) => {
    if (node.isText) custom = node;
  });
  assert.strictEqual(custom.text, '🔐 Accès VPN Sophos');
  assert.strictEqual(custom.marks[0].attrs.href, FIXTURE);

  // Normal external link untouched
  const normalHref = 'https://example.com/docs';
  tr = state.tr.replaceWith(
    1,
    state.doc.content.size - 1,
    schema.text(normalHref, [
      schema.marks.link.create({ href: normalHref }),
    ]),
  );
  state = state.apply(tr);
  assert.ok(!plugin.spec.appendTransaction([tr], state, state), 'normal URL => no-op');

  // Internal-style link (non-OP) untouched
  tr = state.tr.replaceWith(
    1,
    state.doc.content.size - 1,
    schema.text('Page interne', [
      schema.marks.link.create({ href: '/p/abc', internal: true }),
    ]),
  );
  state = state.apply(tr);
  assert.ok(!plugin.spec.appendTransaction([tr], state, state), 'internal => no-op');

  // history$ meta skips rewrite (undo path)
  tr = state.tr.replaceWith(
    1,
    state.doc.content.size - 1,
    schema.text(FIXTURE, [schema.marks.link.create({ href: FIXTURE })]),
  );
  tr.setMeta('history$', true);
  state = state.apply(tr);
  assert.ok(
    !plugin.spec.appendTransaction([tr], state, state),
    'history$ => no rewrite (undo-safe)',
  );
  let undoNode = null;
  state.doc.descendants((node) => {
    if (node.isText) undoNode = node;
  });
  assert.strictEqual(undoNode.text, FIXTURE, 'history$ leaves raw URL for undo restore');
});

test('slash-style insert: text=1Password + link href exact (paste end-state parity)', () => {
  require(distLink);
  const { Schema } = loadPm().model;
  const { EditorState } = loadPm().state;

  const schema = new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: {
        content: 'inline*',
        group: 'block',
        toDOM: () => ['p', 0],
      },
      text: { group: 'inline' },
    },
    marks: {
      link: {
        attrs: {
          href: {},
          target: { default: '_blank' },
          rel: { default: 'noopener noreferrer nofollow' },
          class: { default: null },
          internal: { default: false },
        },
        inclusive: false,
        toDOM: (mark) => ['a', { href: mark.attrs.href }, 0],
      },
    },
  });

  // Slash path: insert labeled link directly (no rewrite needed)
  let state = EditorState.create({
    schema,
    doc: schema.node('doc', null, [schema.node('paragraph', null, [])]),
  });
  const slashMark = schema.marks.link.create({ href: FIXTURE });
  let tr = state.tr.insert(1, schema.text(ONEPASSWORD_LABEL, [slashMark]));
  state = state.apply(tr);

  let slashNode = null;
  state.doc.descendants((node) => {
    if (node.isText) slashNode = node;
  });
  assert.ok(slashNode);
  assert.strictEqual(slashNode.text, ONEPASSWORD_LABEL);
  assert.strictEqual(
    slashNode.marks.find((m) => m.type === schema.marks.link).attrs.href,
    FIXTURE,
    'slash href intact (no query normalize)',
  );

  // Paste path end-state via rewrite
  state = EditorState.create({
    schema,
    doc: schema.node('doc', null, [schema.node('paragraph', null, [])]),
  });
  const pasteMark = schema.marks.link.create({ href: FIXTURE });
  tr = state.tr.insert(1, schema.text(FIXTURE, [pasteMark]));
  state = state.apply(tr);
  // Simulate appendTransaction rewrite
  const hits = [];
  state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    const mark = schema.marks.link.isInSet(node.marks);
    if (!mark) return;
    if (!shouldRewriteOnePasswordTitle(node.text, mark.attrs.href)) return;
    hits.push({ from: pos, to: pos + node.nodeSize, marks: node.marks });
  });
  assert.strictEqual(hits.length, 1);
  tr = state.tr.replaceWith(
    hits[0].from,
    hits[0].to,
    schema.text(ONEPASSWORD_LABEL, hits[0].marks),
  );
  state = state.apply(tr);

  let pasteNode = null;
  state.doc.descendants((node) => {
    if (node.isText) pasteNode = node;
  });
  assert.ok(pasteNode);
  assert.strictEqual(pasteNode.text, slashNode.text, 'paste/slash text parity');
  assert.strictEqual(
    pasteNode.marks.find((m) => m.type === schema.marks.link).attrs.href,
    slashNode.marks.find((m) => m.type === schema.marks.link).attrs.href,
    'paste/slash href parity',
  );
});

test('isOnePasswordItemUrl rejects invalid for slash validation', () => {
  assert.strictEqual(isOnePasswordItemUrl('https://example.com'), false);
  assert.strictEqual(isOnePasswordItemUrl('not-a-url'), false);
  assert.strictEqual(isOnePasswordItemUrl(''), false);
  assert.strictEqual(isOnePasswordItemUrl(FIXTURE), true);
});

if (process.exitCode) {
  console.error(`\n${passed} tests passed before failure`);
  process.exit(1);
}
console.log(`\nAll ${passed} tests passed (${ONEPASSWORD_SMART_LINKS_MARKER})`);
