/**
 * Source-level checks for Phase 2 slash /1Password (no React mount).
 * Run: node packages/editor-ext/test/onepassword-slash-menu.test.cjs
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../../..');
const menuItemsPath = path.join(
  root,
  'apps/client/src/features/editor/components/slash-menu/menu-items.ts',
);
const formPath = path.join(
  root,
  'apps/client/src/features/editor/components/slash-menu/onepassword-link-form.tsx',
);
const insertPath = path.join(
  root,
  'apps/client/src/features/editor/components/slash-menu/insert-onepassword-link.ts',
);
const iconPath = path.join(
  root,
  'apps/client/src/components/icons/onepassword-icon.tsx',
);

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

const menu = fs.readFileSync(menuItemsPath, 'utf8');
const form = fs.readFileSync(formPath, 'utf8');
const insert = fs.readFileSync(insertPath, 'utf8');
const icon = fs.readFileSync(iconPath, 'utf8');

test('slash item title + description present', () => {
  assert.ok(menu.includes('title: "1Password"'));
  assert.ok(
    menu.includes('description: "Ajouter un lien vers un accès 1Password"'),
  );
  assert.ok(menu.includes('OnePasswordIcon'));
  assert.ok(menu.includes('openOnePasswordLinkModal'));
});

test('slash command does NOT use setEmbed', () => {
  const idx = menu.indexOf('title: "1Password"');
  assert.ok(idx > 0);
  const nextTitle = menu.indexOf('title: "', idx + 10);
  const chunk = menu.slice(idx, nextTitle > idx ? nextTitle : idx + 600);
  assert.ok(!chunk.includes('setEmbed'), '1Password item must not call setEmbed');
  assert.ok(chunk.includes('openOnePasswordLinkModal'));
});

test('popup copy + validation message', () => {
  assert.ok(form.includes('Ajouter un lien 1Password'));
  assert.ok(form.includes('Permalink'));
  assert.ok(form.includes('Annuler'));
  assert.ok(form.includes('Ajouter'));
  assert.ok(
    form.includes(
      "Ce lien n'est pas un permalink 1Password valide.",
    ),
  );
  assert.ok(form.includes('isOnePasswordItemUrl'));
  assert.ok(form.includes('closeOnEscape'));
});

test('insert uses onePasswordLink node + exact href (no normalize)', () => {
  assert.ok(insert.includes('isOnePasswordItemUrl'));
  assert.ok(!insert.includes('normalizeUrl'));
  assert.ok(insert.includes('onePasswordCreateDateAttrs'));
  assert.ok(insert.includes('onePasswordLink'));
  assert.ok(insert.includes('opType.create'));
  assert.ok(!insert.includes('linkType.create'));
  assert.ok(!insert.includes('ONEPASSWORD_LABEL'));
});

test('icon uses local logo asset', () => {
  assert.ok(icon.includes('/icons/onepassword-logo.png'));
});

test('no fetch / iframe / unfurl in slash feature files', () => {
  const idx = menu.indexOf('title: "1Password"');
  const nextTitle = menu.indexOf('title: "', idx + 10);
  const menuChunk = menu.slice(idx, nextTitle > idx ? nextTitle : idx + 600);
  for (const [name, src] of [
    ['form', form],
    ['insert', insert],
    ['menu', menuChunk],
  ]) {
    assert.ok(!/\bfetch\s*\(/.test(src), `${name}: no fetch`);
    assert.ok(!/<iframe/i.test(src), `${name}: no iframe`);
    assert.ok(!/unfurl/i.test(src), `${name}: no unfurl`);
    assert.ok(!/setEmbed/.test(src), `${name}: no setEmbed`);
  }
});

if (process.exitCode) {
  console.error(`\n${passed} tests passed before failure`);
  process.exit(1);
}
console.log(`\nAll ${passed} slash-menu source tests passed`);
