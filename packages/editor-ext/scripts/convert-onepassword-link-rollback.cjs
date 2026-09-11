#!/usr/bin/env node
/**
 * Cold-rollback: convert onePasswordLink atoms → text + link marks in a TipTap JSON doc.
 *
 * Usage (fixture):
 *   node packages/editor-ext/scripts/convert-onepassword-link-rollback.cjs < input.json > output.json
 *
 * Or with path args:
 *   node packages/editor-ext/scripts/convert-onepassword-link-rollback.cjs in.json out.json
 *
 * MUST run on all pages that may contain onePasswordLink BEFORE rolling back
 * to an image whose collab schema lacks the node (NEVER Hub without conversion).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const LABEL = '1Password';

function convertJson(n) {
  if (!n || typeof n !== 'object') return n;
  if (n.type === 'onePasswordLink') {
    return {
      type: 'text',
      text: LABEL,
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
}

function main() {
  const inPath = process.argv[2];
  const outPath = process.argv[3];
  let raw;
  if (inPath && inPath !== '-') {
    raw = fs.readFileSync(inPath, 'utf8');
  } else {
    raw = fs.readFileSync(0, 'utf8');
  }
  const doc = JSON.parse(raw);
  const converted = convertJson(doc);
  const out = JSON.stringify(converted, null, 2) + '\n';
  if (outPath) {
    fs.writeFileSync(outPath, out);
  } else {
    process.stdout.write(out);
  }
}

if (require.main === module) {
  main();
}

module.exports = { convertJson, LABEL };
