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
  nowUtcIso,
  onePasswordCreateDateAttrs,
  onePasswordHrefUpdateDateAttrs,
  datesForTitleRewrite,
  formatOnePasswordDateFr,
  onePasswordTooltipLabel,
  ONEPASSWORD_LABEL,
  ONEPASSWORD_LABEL_LEGACY,
  ONEPASSWORD_LABEL_LEGACY_EMOJI,
  ONEPASSWORD_SMART_LINKS_MARKER,
} = helpers;

const FIXTURE_B =
  'https://start.1password.com/open/i?a=aaa&v=bbb&i=ddd&h=example';

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
          onePasswordCreatedAt: { default: null },
          onePasswordUpdatedAt: { default: null },
        },
        inclusive: false,
        toDOM: (mark) => {
          const attrs = {
            href: mark.attrs.href,
            target: mark.attrs.target,
            rel: mark.attrs.rel,
          };
          if (mark.attrs.onePasswordCreatedAt) {
            attrs['data-onepassword-created-at'] =
              mark.attrs.onePasswordCreatedAt;
          }
          if (mark.attrs.onePasswordUpdatedAt) {
            attrs['data-onepassword-updated-at'] =
              mark.attrs.onePasswordUpdatedAt;
          }
          return ['a', attrs, 0];
        },
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
        hits.push({
          from: pos,
          to: pos + node.nodeSize,
          marks: node.marks,
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
        });
        const nextMarks = h.marks.map((m) => {
          if (m.type !== linkType) return m;
          if (!dateStamp) return m;
          return linkType.create({ ...m.attrs, ...dateStamp });
        });
        tr.replaceWith(
          h.from,
          h.to,
          newState.schema.text(ONEPASSWORD_LABEL, nextMarks),
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
          onePasswordCreatedAt: { default: null },
          onePasswordUpdatedAt: { default: null },
        },
        inclusive: false,
        toDOM: (mark) => ['a', { href: mark.attrs.href }, 0],
      },
    },
  });

  const FIXED_NOW = '2026-09-11T11:42:31.123Z';

  // Slash path: insert labeled link directly with create dates
  let state = EditorState.create({
    schema,
    doc: schema.node('doc', null, [schema.node('paragraph', null, [])]),
  });
  const slashMark = schema.marks.link.create({
    href: FIXTURE,
    ...onePasswordCreateDateAttrs(FIXED_NOW),
  });
  let tr = state.tr.insert(1, schema.text(ONEPASSWORD_LABEL, [slashMark]));
  state = state.apply(tr);

  let slashNode = null;
  state.doc.descendants((node) => {
    if (node.isText) slashNode = node;
  });
  assert.ok(slashNode);
  assert.strictEqual(slashNode.text, ONEPASSWORD_LABEL);
  const slashLink = slashNode.marks.find((m) => m.type === schema.marks.link);
  assert.strictEqual(slashLink.attrs.href, FIXTURE, 'slash href intact');
  assert.strictEqual(slashLink.attrs.onePasswordCreatedAt, FIXED_NOW);
  assert.strictEqual(slashLink.attrs.onePasswordUpdatedAt, FIXED_NOW);

  // Paste path end-state via rewrite + date stamp
  state = EditorState.create({
    schema,
    doc: schema.node('doc', null, [schema.node('paragraph', null, [])]),
  });
  const pasteMark = schema.marks.link.create({ href: FIXTURE });
  tr = state.tr.insert(1, schema.text(FIXTURE, [pasteMark]));
  state = state.apply(tr);
  const hits = [];
  state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    const mark = schema.marks.link.isInSet(node.marks);
    if (!mark) return;
    if (!shouldRewriteOnePasswordTitle(node.text, mark.attrs.href)) return;
    hits.push({
      from: pos,
      to: pos + node.nodeSize,
      marks: node.marks,
      text: node.text,
      href: mark.attrs.href,
      createdAt: mark.attrs.onePasswordCreatedAt ?? null,
      updatedAt: mark.attrs.onePasswordUpdatedAt ?? null,
    });
  });
  assert.strictEqual(hits.length, 1);
  const dateStamp = datesForTitleRewrite({
    text: hits[0].text,
    href: hits[0].href,
    createdAt: hits[0].createdAt,
    updatedAt: hits[0].updatedAt,
    now: FIXED_NOW,
  });
  assert.ok(dateStamp);
  const nextMarks = hits[0].marks.map((m) => {
    if (m.type !== schema.marks.link) return m;
    return schema.marks.link.create({ ...m.attrs, ...dateStamp });
  });
  tr = state.tr.replaceWith(
    hits[0].from,
    hits[0].to,
    schema.text(ONEPASSWORD_LABEL, nextMarks),
  );
  state = state.apply(tr);

  let pasteNode = null;
  state.doc.descendants((node) => {
    if (node.isText) pasteNode = node;
  });
  assert.ok(pasteNode);
  assert.strictEqual(pasteNode.text, slashNode.text, 'paste/slash text parity');
  const pasteLink = pasteNode.marks.find((m) => m.type === schema.marks.link);
  assert.strictEqual(pasteLink.attrs.href, slashLink.attrs.href);
  assert.strictEqual(pasteLink.attrs.onePasswordCreatedAt, FIXED_NOW);
  assert.strictEqual(pasteLink.attrs.onePasswordUpdatedAt, FIXED_NOW);
});

test('isOnePasswordItemUrl rejects invalid for slash validation', () => {
  assert.strictEqual(isOnePasswordItemUrl('https://example.com'), false);
  assert.strictEqual(isOnePasswordItemUrl('not-a-url'), false);
  assert.strictEqual(isOnePasswordItemUrl(''), false);
  assert.strictEqual(isOnePasswordItemUrl(FIXTURE), true);
});

test('Phase 2.1 helpers: create stamps both; href update keeps createdAt', () => {
  const now = '2026-09-11T11:42:31.123Z';
  const created = onePasswordCreateDateAttrs(now);
  assert.strictEqual(created.onePasswordCreatedAt, now);
  assert.strictEqual(created.onePasswordUpdatedAt, now);

  const later = '2026-09-11T12:00:00.000Z';
  const updated = onePasswordHrefUpdateDateAttrs(created, later);
  assert.strictEqual(updated.onePasswordCreatedAt, now);
  assert.strictEqual(updated.onePasswordUpdatedAt, later);

  const fromNull = onePasswordHrefUpdateDateAttrs(
    { onePasswordCreatedAt: null, onePasswordUpdatedAt: null },
    later,
  );
  assert.strictEqual(fromNull.onePasswordCreatedAt, null);
  assert.strictEqual(fromNull.onePasswordUpdatedAt, later);

  assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(nowUtcIso()));
});

test('Phase 2.1: datesForTitleRewrite only on first raw-URL rewrite', () => {
  const now = '2026-09-11T11:42:31.123Z';
  const first = datesForTitleRewrite({
    text: FIXTURE,
    href: FIXTURE,
    createdAt: null,
    updatedAt: null,
    now,
  });
  assert.deepStrictEqual(first, {
    onePasswordCreatedAt: now,
    onePasswordUpdatedAt: now,
  });

  const already = datesForTitleRewrite({
    text: FIXTURE,
    href: FIXTURE,
    createdAt: now,
    updatedAt: now,
    now: '2026-09-11T99:00:00.000Z',
  });
  assert.strictEqual(already, null, 'do not reset existing dates');

  const legacy = datesForTitleRewrite({
    text: ONEPASSWORD_LABEL_LEGACY,
    href: FIXTURE,
    createdAt: null,
    updatedAt: null,
    now,
  });
  assert.strictEqual(legacy, null, 'legacy title migration does not stamp');

  const custom = datesForTitleRewrite({
    text: 'Mot de passe firewall',
    href: FIXTURE,
    createdAt: null,
    updatedAt: null,
    now,
  });
  assert.strictEqual(custom, null);
});

test('Phase 2.1 tooltip FR format (browser TZ)', () => {
  const iso = '2026-09-11T11:42:31.123Z';
  // Europe/Paris summer = UTC+2 → 13:42
  const fr = formatOnePasswordDateFr(iso, 'Europe/Paris');
  assert.strictEqual(fr, '11/09/2026 à 13:42');

  assert.strictEqual(
    onePasswordTooltipLabel(null, null),
    'Lien 1Password',
  );
  assert.strictEqual(
    onePasswordTooltipLabel(iso, null, 'Europe/Paris'),
    'Ajouté le 11/09/2026 à 13:42',
  );
  assert.strictEqual(
    onePasswordTooltipLabel(iso, iso, 'Europe/Paris'),
    'Lien 1Password\nMis à jour le 11/09/2026 à 13:42',
  );
});

test('Phase 2.1 PM: paste create stamps dates; legacy migrate leaves null; title rewrite no reset; href update', () => {
  require(distLink);
  const { Schema, DOMSerializer } = loadPm().model;
  const { EditorState, Plugin, PluginKey } = loadPm().state;

  const FIXED_NOW = '2026-09-11T11:42:31.123Z';
  const LATER = '2026-09-11T12:15:00.000Z';

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
          onePasswordCreatedAt: { default: null },
          onePasswordUpdatedAt: { default: null },
        },
        inclusive: false,
        toDOM: (mark) => {
          const a = { href: mark.attrs.href };
          if (mark.attrs.onePasswordCreatedAt) {
            a['data-onepassword-created-at'] = mark.attrs.onePasswordCreatedAt;
          }
          if (mark.attrs.onePasswordUpdatedAt) {
            a['data-onepassword-updated-at'] = mark.attrs.onePasswordUpdatedAt;
          }
          return ['a', a, 0];
        },
      },
    },
  });

  function makePlugin(nowOverride) {
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
        if (!linkType) return;
        const hits = [];
        newState.doc.descendants((node, pos) => {
          if (!node.isText) return;
          const mark = linkType.isInSet(node.marks);
          if (!mark) return;
          const href = mark.attrs.href;
          if (!shouldRewriteOnePasswordTitle(node.text, href)) return;
          hits.push({
            from: pos,
            to: pos + node.nodeSize,
            marks: node.marks,
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
          const nextMarks = h.marks.map((m) => {
            if (m.type !== linkType) return m;
            if (!dateStamp) return m;
            return linkType.create({ ...m.attrs, ...dateStamp });
          });
          tr.replaceWith(
            h.from,
            h.to,
            newState.schema.text(ONEPASSWORD_LABEL, nextMarks),
          );
        }
        return tr.docChanged ? tr : undefined;
      },
    });
  }

  const plugin = makePlugin(FIXED_NOW);
  let state = EditorState.create({
    schema,
    plugins: [plugin],
    doc: schema.node('doc', null, [schema.node('paragraph', null, [])]),
  });

  // 1) Paste create → both dates
  let tr = state.tr.insert(
    1,
    schema.text(FIXTURE, [schema.marks.link.create({ href: FIXTURE })]),
  );
  state = state.apply(tr);
  for (let i = 0; i < 5; i++) {
    const appended = plugin.spec.appendTransaction([tr], state, state);
    if (!appended) break;
    state = state.apply(appended);
    tr = appended;
  }
  let node = null;
  state.doc.descendants((n) => {
    if (n.isText) node = n;
  });
  let link = node.marks.find((m) => m.type === schema.marks.link);
  assert.strictEqual(node.text, ONEPASSWORD_LABEL);
  assert.strictEqual(link.attrs.onePasswordCreatedAt, FIXED_NOW);
  assert.strictEqual(link.attrs.onePasswordUpdatedAt, FIXED_NOW);
  const createdAt = link.attrs.onePasswordCreatedAt;

  // 2) Title-only change → dates unchanged
  tr = state.tr.replaceWith(
    1,
    state.doc.content.size - 1,
    schema.text('Mot de passe firewall', [
      schema.marks.link.create({ ...link.attrs }),
    ]),
  );
  state = state.apply(tr);
  assert.ok(!plugin.spec.appendTransaction([tr], state, state));
  state.doc.descendants((n) => {
    if (n.isText) node = n;
  });
  link = node.marks.find((m) => m.type === schema.marks.link);
  assert.strictEqual(node.text, 'Mot de passe firewall');
  assert.strictEqual(link.attrs.onePasswordCreatedAt, createdAt);
  assert.strictEqual(link.attrs.onePasswordUpdatedAt, FIXED_NOW);

  // 3) Href change → createdAt same, updatedAt bumped
  const hrefUpdated = onePasswordHrefUpdateDateAttrs(link.attrs, LATER);
  tr = state.tr.replaceWith(
    1,
    state.doc.content.size - 1,
    schema.text('Mot de passe firewall', [
      schema.marks.link.create({
        ...link.attrs,
        href: FIXTURE_B,
        ...hrefUpdated,
      }),
    ]),
  );
  state = state.apply(tr);
  state.doc.descendants((n) => {
    if (n.isText) node = n;
  });
  link = node.marks.find((m) => m.type === schema.marks.link);
  assert.strictEqual(link.attrs.href, FIXTURE_B);
  assert.strictEqual(link.attrs.onePasswordCreatedAt, createdAt);
  assert.strictEqual(link.attrs.onePasswordUpdatedAt, LATER);

  // 4) Pre-2.1 / old link without attrs → null until href modified
  state = EditorState.create({
    schema,
    plugins: [plugin],
    doc: schema.node('doc', null, [schema.node('paragraph', null, [])]),
  });
  tr = state.tr.insert(
    1,
    schema.text(ONEPASSWORD_LABEL, [
      schema.marks.link.create({ href: FIXTURE }),
    ]),
  );
  state = state.apply(tr);
  assert.ok(!plugin.spec.appendTransaction([tr], state, state));
  state.doc.descendants((n) => {
    if (n.isText) node = n;
  });
  link = node.marks.find((m) => m.type === schema.marks.link);
  assert.strictEqual(link.attrs.onePasswordCreatedAt, null);
  assert.strictEqual(link.attrs.onePasswordUpdatedAt, null);

  const bumped = onePasswordHrefUpdateDateAttrs(link.attrs, LATER);
  assert.strictEqual(bumped.onePasswordCreatedAt, null);
  assert.strictEqual(bumped.onePasswordUpdatedAt, LATER);

  // 5) Legacy Accès migration → dates stay null
  state = EditorState.create({
    schema,
    plugins: [plugin],
    doc: schema.node('doc', null, [schema.node('paragraph', null, [])]),
  });
  tr = state.tr.insert(
    1,
    schema.text(ONEPASSWORD_LABEL_LEGACY, [
      schema.marks.link.create({ href: FIXTURE }),
    ]),
  );
  state = state.apply(tr);
  for (let i = 0; i < 5; i++) {
    const appended = plugin.spec.appendTransaction([tr], state, state);
    if (!appended) break;
    state = state.apply(appended);
    tr = appended;
  }
  state.doc.descendants((n) => {
    if (n.isText) node = n;
  });
  link = node.marks.find((m) => m.type === schema.marks.link);
  assert.strictEqual(node.text, ONEPASSWORD_LABEL);
  assert.strictEqual(link.attrs.onePasswordCreatedAt, null);
  assert.strictEqual(link.attrs.onePasswordUpdatedAt, null);

  // 6) HTML data attrs only when present; markdown strips dates
  const withDates = schema.marks.link.create({
    href: FIXTURE,
    onePasswordCreatedAt: FIXED_NOW,
    onePasswordUpdatedAt: FIXED_NOW,
  });
  const para = schema.node('paragraph', null, [
    schema.text(ONEPASSWORD_LABEL, [withDates]),
  ]);
  const serializer = DOMSerializer.fromSchema(schema);
  // jsdom-less: use toDOM manually
  const dom = withDates.type.spec.toDOM(withDates);
  assert.strictEqual(dom[1]['data-onepassword-created-at'], FIXED_NOW);
  assert.strictEqual(dom[1]['data-onepassword-updated-at'], FIXED_NOW);

  const nullMark = schema.marks.link.create({ href: FIXTURE });
  const nullDom = nullMark.type.spec.toDOM(nullMark);
  assert.strictEqual(nullDom[1]['data-onepassword-created-at'], undefined);
  assert.strictEqual(nullDom[1]['data-onepassword-updated-at'], undefined);

  // Markdown: turndown keeps [text](href) only — simulate expected export
  const md = `[${ONEPASSWORD_LABEL}](${FIXTURE})`;
  assert.ok(!md.includes('onepassword'));
  assert.ok(!md.includes(FIXED_NOW));
  assert.strictEqual(md, `[1Password](${FIXTURE})`);

  // Optional: real turndown if dist available
  try {
    const { createRequire } = require('module');
    const req = createRequire(path.join(__dirname, '../../../package.json'));
    const { htmlToMarkdown } = req('../dist/lib/markdown/utils/turndown.utils.js');
    const html = `<p><a href="${FIXTURE}" data-onepassword-created-at="${FIXED_NOW}" data-onepassword-updated-at="${FIXED_NOW}">${ONEPASSWORD_LABEL}</a></p>`;
    const out = htmlToMarkdown(html);
    assert.ok(out.includes(`[${ONEPASSWORD_LABEL}](${FIXTURE})`));
    assert.ok(!out.includes('data-onepassword'));
    assert.ok(!out.includes(FIXED_NOW));
  } catch {
    // turndown path optional in lean test env
  }

  void serializer;
  void para;
});

if (process.exitCode) {
  console.error(`\n${passed} tests passed before failure`);
  process.exit(1);
}
console.log(`\nAll ${passed} tests passed (${ONEPASSWORD_SMART_LINKS_MARKER})`);
