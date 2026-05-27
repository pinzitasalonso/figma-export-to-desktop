#!/usr/bin/env node
// Inline the auth token from secret.js into ui.html.
//
// Relative <script src="secret.js"> doesn't load inside Figma's plugin
// sandbox iframe, so the token has to be baked into ui.html at build time.
// Template lives in ui.template.html (committed, no real token); the built
// ui.html is gitignored.

const fs = require('fs');
const path = require('path');

const ROOT     = path.resolve(__dirname, '..');
const TEMPLATE = path.join(ROOT, 'ui.template.html');
const OUTPUT   = path.join(ROOT, 'ui.html');
const SECRET   = path.join(ROOT, 'secret.js');
const MARKER   = '<!--SECRET_TOKEN_INLINE-->';

function readToken() {
  if (!fs.existsSync(SECRET)) return null;
  const src = fs.readFileSync(SECRET, 'utf8');
  const m = src.match(/window\.SECRET_TOKEN\s*=\s*['"]([^'"]+)['"]/);
  return m ? m[1] : null;
}

const tpl = fs.readFileSync(TEMPLATE, 'utf8');
if (!tpl.includes(MARKER)) {
  console.error(`build-ui: marker ${MARKER} not found in ui.template.html`);
  process.exit(1);
}

const token = readToken();
const inlined = token
  ? `<script>window.SECRET_TOKEN=${JSON.stringify(token)};</script>`
  : '<!-- no secret.js found; ui.html will fall back to the public default token -->';

fs.writeFileSync(OUTPUT, tpl.replace(MARKER, inlined));
console.log(`build-ui: wrote ui.html ${token ? '(token inlined)' : '(no token; using default)'}`);
