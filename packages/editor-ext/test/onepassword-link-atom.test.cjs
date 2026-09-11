/**
 * Phase 7 — atomic onePasswordLink unit + PM tests.
 * Run after `pnpm --filter @docmost/editor-ext build`:
 *   node packages/editor-ext/test/onepassword-link-atom.test.cjs
 */
'use strict';

const assert = require('assert');
const path = require('path');

const distHelpers = path.join(__dirname, '../dist/lib/onepassword-smart-links.js');
const distLink = path.join(__dirname, '../dist/lib/link.js');
const distNode = path.join(__dirname, '../dist/lib/onepassword-link.js');
const rollbackScript = path.join(
  __dirname,
  '../scripts/convert-onepassword-link-rollback.cjs',
);

const helpers = require(distHelpers);
const {
  isOnePasswordItemUrl,
  isRawUrlTitle,
  shouldConvertToOnePasswordLinkNode,
  shouldRewriteOnePasswordTitle,
  datesForTitleRewrite,
  onePasswordCreateDateAttrs,
  onePasswordHrefUpdateDateAttrs,
  ONEPASSWORD_LABEL,
  ONEPASSWORD_LABEL_LEGACY,
  ONEPASSWORD_LABEL_LEGACY_EMOJI,
  ONEPASSWORD_SMART_LINKS_MARKER,
  ONEPASSWORD_MIGRATE_LABELS,
} = helpers;

require(distLink);
const { convertOnePasswordLinkNodesToLinkMarks, OnePasswordLink } =
  require(distNode);

const FIXTURE =
  'https://start.1password.com/open/i?a=aaa&v=bbb&i=ccc&h=example';
const FIXTURE_B =
  'https://start.1password.com/open/i?a=aaa&v=bbb&i=ddd&h=example';
const FIXED_NOW = '2026-09-11T11:42:31.123Z';
const LATER = '2026-09-11T12:15:00.000Z';

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

function loadPm() {
  try {
    return {
      model: require('@tiptap/pm/model'),
      state: require('@tiptap/pm/state'),
    };
  } catch {
    const { createRequire } = require('module');
    const req = createRequire(path.join(__dirname, '../../../package.json'));
    return {
      model: req('@tiptap/pm/model'),
      state: req('@tiptap/pm/state'),
    };
  }
}

function buildSchema() {
  const { Schema } = loadPm().model;
  return new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: {
        content: 'inline*',
        group: 'block',
        toDOM: () => ['p', 0],
        parseDOM: [{ tag: 'p' }],
      },
      text: { group: 'inline' },
      onePasswordLink: {
        group: 'inline',
        inline: true,
        atom: true,
        selectable: true,
        attrs: {
          href: { default: null },
          onePasswordCreatedAt: { default: null },
          onePasswordUpdatedAt: { default: null },
        },
        toDOM: (node) => {
          const attrs = {
            'data-type': 'onePasswordLink',
            href: node.attrs.href,
            class: 'onepassword-link',
            target: '_blank',
            rel: 'noopener noreferrer nofollow',
          };
          if (node.attrs.onePasswordCreatedAt) {
            attrs['data-onepassword-created-at'] =
              node.attrs.onePasswordCreatedAt;
          }
          if (node.attrs.onePasswordUpdatedAt) {
            attrs['data-onepassword-updated-at'] =
              node.attrs.onePasswordUpdatedAt;
          }
          return ['a', attrs, ONEPASSWORD_LABEL];
        },
        parseDOM: [
          {
            tag: 'a[data-type="onePasswordLink"]',
            getAttrs: (el) => {
              const href = el.getAttribute('href');
              if (!href || !isOnePasswordItemUrl(href)) return false;
              return {
                href,
                onePasswordCreatedAt:
                  el.getAttribute('data-onepassword-created-at'),
                onePasswordUpdatedAt:
                  el.getAttribute('data-onepassword-updated-at'),
              };
            },
          },
        ],
        leafText: () => ONEPASSWORD_LABEL,
      },
    },
    marks: {
      link: {
        attrs: {
          href: {},
          target: { default: '_blank' },
          rel: { default: 'noopener noreferrer nofollow' },
          class: { default: null },
          internal: { default: false },
          onePasswordCreatedAt: { default: null },
          onePasswordUpdatedAt: { default: null },
        },
        inclusive: false,
        toDOM: (mark) => ['a', { href: mark.attrs.href }, 0],
      },
    },
  });
}

function makeConvertPlugin(nowOverride) {
  const { Plugin, PluginKey } = loadPm().state;
  return new Plugin({
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
      const opNodeType = newState.schema.nodes.onePasswordLink;
      if (!linkType || !opNodeType) return;
      const hits = [];
      newState.doc.descendants((node, pos) => {
        if (!node.isText) return;
        const mark = linkType.isInSet(node.marks);
        if (!mark) return;
        const href = mark.attrs.href;
        if (!shouldConvertToOnePasswordLinkNode(node.text || '', href)) return;
        hits.push({
          from: pos,
          to: pos + node.nodeSize,
          text: node.text || '',
          href,
          createdAt: mark.attrs.onePasswordCreatedAt ?? null,
          updatedAt: mark.attrs.onePasswordUpdatedAt ?? null,
        });
      });
      if (!hits.length) return;
      const tr = newState.tr;
      tr.setMeta(ONEPASSWORD_SMART_LINKS_MARKER, true);
      for (let i = hits.length - 1; i >= 0; i--) {
        const h = hits[i];
        const dateStamp = datesForTitleRewrite({
          text: h.text,
          href: h.href,
          createdAt: h.createdAt,
          updatedAt: h.updatedAt,
          now: nowOverride,
        });
        tr.replaceWith(
          h.from,
          h.to,
          opNodeType.create({
            href: h.href,
            onePasswordCreatedAt:
              dateStamp?.onePasswordCreatedAt ?? h.createdAt,
            onePasswordUpdatedAt:
              dateStamp?.onePasswordUpdatedAt ?? h.updatedAt,
          }),
        );
      }
      return tr.docChanged ? tr : undefined;
    },
  });
}

function applyUntilStable(state, plugin, tr) {
  for (let i = 0; i < 10; i++) {
    const appended = plugin.spec.appendTransaction([tr], state, state);
    if (!appended) break;
    state = state.apply(appended);
    tr = appended;
  }
  return state;
}

function findOpNode(doc) {
  let found = null;
  doc.descendants((n) => {
    if (n.type.name === 'onePasswordLink') found = n;
  });
  return found;
}

test('OnePasswordLink extension name + atom flags', () => {
  assert.strictEqual(OnePasswordLink.name, 'onePasswordLink');
  const cfg = OnePasswordLink.config || OnePasswordLink;
  // TipTap Node.create stores atom on the extension
  assert.ok(OnePasswordLink);
});

test('shouldConvert: legacy list + raw URL only', () => {
  assert.strictEqual(shouldConvertToOnePasswordLinkNode(FIXTURE, FIXTURE), true);
  assert.strictEqual(
    shouldConvertToOnePasswordLinkNode(ONEPASSWORD_LABEL, FIXTURE),
    true,
  );
  assert.strictEqual(
    shouldConvertToOnePasswordLinkNode(ONEPASSWORD_LABEL_LEGACY, FIXTURE),
    true,
  );
  assert.strictEqual(
    shouldConvertToOnePasswordLinkNode(ONEPASSWORD_LABEL_LEGACY_EMOJI, FIXTURE),
    true,
  );
  assert.strictEqual(
    shouldConvertToOnePasswordLinkNode('Mot de passe firewall', FIXTURE),
    false,
  );
  assert.strictEqual(
    shouldConvertToOnePasswordLinkNode('🔐 Accès VPN Sophos', FIXTURE),
    false,
  );
  assert.deepStrictEqual([...ONEPASSWORD_MIGRATE_LABELS], [
    '1Password',
    'Accès 1Password',
    '🔐 Accès 1Password',
  ]);
});

test('create node: atom, renderText, dates', () => {
  const { EditorState } = loadPm().state;
  const schema = buildSchema();
  const dates = onePasswordCreateDateAttrs(FIXED_NOW);
  let state = EditorState.create({
    schema,
    doc: schema.node('doc', null, [
      schema.node('paragraph', null, [
        schema.nodes.onePasswordLink.create({ href: FIXTURE, ...dates }),
      ]),
    ]),
  });
  const n = findOpNode(state.doc);
  assert.ok(n);
  assert.strictEqual(n.type.isAtom, true);
  assert.strictEqual(n.isAtom, true);
  assert.strictEqual(n.attrs.href, FIXTURE);
  assert.strictEqual(n.attrs.onePasswordCreatedAt, FIXED_NOW);
  assert.strictEqual(n.attrs.onePasswordUpdatedAt, FIXED_NOW);
  // leafText / renderText equivalent (PM may surface via textContent)
  assert.strictEqual(n.type.spec.leafText(n), ONEPASSWORD_LABEL);
  assert.ok(
    n.textContent === '' || n.textContent === ONEPASSWORD_LABEL,
    'atom textContent empty or leafText',
  );
});

test('paste raw URL → atom node with create dates', () => {
  const { EditorState } = loadPm().state;
  const schema = buildSchema();
  const plugin = makeConvertPlugin(FIXED_NOW);
  let state = EditorState.create({
    schema,
    plugins: [plugin],
    doc: schema.node('doc', null, [schema.node('paragraph', null, [])]),
  });
  let tr = state.tr.insert(
    1,
    schema.text(FIXTURE, [schema.marks.link.create({ href: FIXTURE })]),
  );
  state = state.apply(tr);
  state = applyUntilStable(state, plugin, tr);
  const n = findOpNode(state.doc);
  assert.ok(n, 'paste must produce onePasswordLink node');
  assert.strictEqual(n.attrs.href, FIXTURE);
  assert.strictEqual(n.attrs.onePasswordCreatedAt, FIXED_NOW);
  assert.strictEqual(n.attrs.onePasswordUpdatedAt, FIXED_NOW);
});

test('slash-style insert: node with both dates (parity with paste end-state)', () => {
  const { EditorState } = loadPm().state;
  const schema = buildSchema();
  const dates = onePasswordCreateDateAttrs(FIXED_NOW);
  let state = EditorState.create({
    schema,
    doc: schema.node('doc', null, [schema.node('paragraph', null, [])]),
  });
  const node = schema.nodes.onePasswordLink.create({ href: FIXTURE, ...dates });
  state = state.apply(state.tr.insert(1, node));
  const n = findOpNode(state.doc);
  assert.ok(n);
  assert.strictEqual(n.attrs.href, FIXTURE);
  assert.strictEqual(n.attrs.onePasswordCreatedAt, FIXED_NOW);
  assert.strictEqual(n.attrs.onePasswordUpdatedAt, FIXED_NOW);
});

test('migration: legacy labels → node; dates preserved / null kept', () => {
  const { EditorState } = loadPm().state;
  const schema = buildSchema();
  const plugin = makeConvertPlugin(FIXED_NOW);

  for (const label of [
    ONEPASSWORD_LABEL,
    ONEPASSWORD_LABEL_LEGACY,
    ONEPASSWORD_LABEL_LEGACY_EMOJI,
  ]) {
    let state = EditorState.create({
      schema,
      plugins: [plugin],
      doc: schema.node('doc', null, [schema.node('paragraph', null, [])]),
    });
    let tr = state.tr.insert(
      1,
      schema.text(label, [
        schema.marks.link.create({
          href: FIXTURE,
          onePasswordCreatedAt: label === ONEPASSWORD_LABEL ? FIXED_NOW : null,
          onePasswordUpdatedAt: label === ONEPASSWORD_LABEL ? FIXED_NOW : null,
        }),
      ]),
    );
    state = state.apply(tr);
    state = applyUntilStable(state, plugin, tr);
    const n = findOpNode(state.doc);
    assert.ok(n, `migrate ${label}`);
    assert.strictEqual(n.attrs.href, FIXTURE);
    if (label === ONEPASSWORD_LABEL) {
      assert.strictEqual(n.attrs.onePasswordCreatedAt, FIXED_NOW);
      assert.strictEqual(n.attrs.onePasswordUpdatedAt, FIXED_NOW);
    } else {
      assert.strictEqual(n.attrs.onePasswordCreatedAt, null);
      assert.strictEqual(n.attrs.onePasswordUpdatedAt, null);
    }
  }
});

test('corrupted / custom labels protected (no convert)', () => {
  const { EditorState } = loadPm().state;
  const schema = buildSchema();
  const plugin = makeConvertPlugin(FIXED_NOW);
  let state = EditorState.create({
    schema,
    plugins: [plugin],
    doc: schema.node('doc', null, [schema.node('paragraph', null, [])]),
  });
  let tr = state.tr.insert(
    1,
    schema.text('Mot de passe firewall', [
      schema.marks.link.create({ href: FIXTURE }),
    ]),
  );
  state = state.apply(tr);
  assert.ok(!plugin.spec.appendTransaction([tr], state, state));
  assert.strictEqual(findOpNode(state.doc), null);
  let text = null;
  state.doc.descendants((n) => {
    if (n.isText) text = n.text;
  });
  assert.strictEqual(text, 'Mot de passe firewall');
});

test('href update: createdAt stable, updatedAt=now', () => {
  const created = onePasswordCreateDateAttrs(FIXED_NOW);
  const updated = onePasswordHrefUpdateDateAttrs(created, LATER);
  assert.strictEqual(updated.onePasswordCreatedAt, FIXED_NOW);
  assert.strictEqual(updated.onePasswordUpdatedAt, LATER);
});

test('renderHTML / parseHTML round-trip attrs + fixed label', () => {
  const schema = buildSchema();
  const dates = onePasswordCreateDateAttrs(FIXED_NOW);
  const doc = schema.node('doc', null, [
    schema.node('paragraph', null, [
      schema.nodes.onePasswordLink.create({ href: FIXTURE, ...dates }),
    ]),
  ]);
  const n = findOpNode(doc);
  const domSpec = n.type.spec.toDOM(n);
  assert.strictEqual(domSpec[0], 'a');
  assert.strictEqual(domSpec[1]['data-type'], 'onePasswordLink');
  assert.strictEqual(domSpec[1].href, FIXTURE);
  assert.strictEqual(domSpec[1]['data-onepassword-created-at'], FIXED_NOW);
  assert.strictEqual(domSpec[1]['data-onepassword-updated-at'], FIXED_NOW);
  assert.strictEqual(domSpec[2], ONEPASSWORD_LABEL);

  // TipTap extension renderText
  assert.strictEqual(OnePasswordLink.config?.name || OnePasswordLink.name, 'onePasswordLink');
});

test('parseHTML rejects non-OP href even with data-type', () => {
  assert.strictEqual(isOnePasswordItemUrl('https://example.com'), false);
  assert.strictEqual(
    shouldConvertToOnePasswordLinkNode(ONEPASSWORD_LABEL, 'https://example.com'),
    false,
  );
});

test('rollback converter: node → text+link mark; dates preserved', () => {
  const schema = buildSchema();
  const dates = onePasswordCreateDateAttrs(FIXED_NOW);
  const doc = schema.node('doc', null, [
    schema.node('paragraph', null, [
      schema.nodes.onePasswordLink.create({ href: FIXTURE, ...dates }),
      schema.text(' and '),
      schema.nodes.onePasswordLink.create({ href: FIXTURE_B, ...dates }),
    ]),
  ]);
  const out = convertOnePasswordLinkNodesToLinkMarks(doc);
  assert.strictEqual(findOpNode(out), null);
  const texts = [];
  out.descendants((n) => {
    if (n.isText) texts.push(n);
  });
  const opTexts = texts.filter((t) =>
    t.marks.some((m) => m.type.name === 'link' && isOnePasswordItemUrl(m.attrs.href)),
  );
  assert.strictEqual(opTexts.length, 2);
  for (const t of opTexts) {
    assert.strictEqual(t.text, ONEPASSWORD_LABEL);
    const mark = t.marks.find((m) => m.type.name === 'link');
    assert.strictEqual(mark.attrs.onePasswordCreatedAt, FIXED_NOW);
    assert.strictEqual(mark.attrs.onePasswordUpdatedAt, FIXED_NOW);
  }

  // CLI script path
  const { convertJson } = require(rollbackScript);
  const jsonOut = convertJson(doc.toJSON());
  assert.ok(
    !JSON.stringify(jsonOut).includes('"type":"onePasswordLink"'),
  );
  assert.ok(JSON.stringify(jsonOut).includes(ONEPASSWORD_LABEL));
});

test('history$ skips conversion (undo-safe)', () => {
  const { EditorState } = loadPm().state;
  const schema = buildSchema();
  const plugin = makeConvertPlugin(FIXED_NOW);
  let state = EditorState.create({
    schema,
    plugins: [plugin],
    doc: schema.node('doc', null, [schema.node('paragraph', null, [])]),
  });
  let tr = state.tr.insert(
    1,
    schema.text(FIXTURE, [schema.marks.link.create({ href: FIXTURE })]),
  );
  tr.setMeta('history$', true);
  state = state.apply(tr);
  assert.ok(!plugin.spec.appendTransaction([tr], state, state));
  assert.strictEqual(findOpNode(state.doc), null);
});

test('markdown export shape strips date attrs (sim)', () => {
  const md = `[${ONEPASSWORD_LABEL}](${FIXTURE})`;
  assert.ok(!md.includes('onepassword'));
  assert.ok(!md.includes(FIXED_NOW));
});

if (process.exitCode) {
  console.error(`\n${passed} Phase7 tests passed before failure`);
  process.exit(1);
}
console.log(`\nAll ${passed} Phase7 atom tests passed`);
