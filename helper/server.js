#!/usr/bin/env node
'use strict';

/*
 * figma-export-to-desktop — local helper
 *
 * A tiny dependency-free HTTP server (Node built-ins only) that receives PNG
 * bytes from the Figma plugin UI and writes them straight to the Desktop —
 * no save dialogs, plain files, flat.
 *
 * Security posture (it writes files, so this matters):
 *   - Binds to 127.0.0.1 only — never exposed on the LAN.
 *   - Requires a shared token (X-Auth-Token). The default below is NOT secret
 *     (it's in the public repo); set FIGMA_EXPORT_TOKEN for a real secret and
 *     put the same value in ui.html.
 *   - Writes only inside ~/Desktop, only *.png, filename sanitised, with a
 *     path-traversal guard and a per-file size cap.
 */

const http = require('http');
const fs   = require('fs');
const os   = require('os');
const path = require('path');

const VERSION   = '1.0.0';
const PORT      = parseInt(process.env.FIGMA_EXPORT_PORT || '31773', 10);
const TOKEN     = process.env.FIGMA_EXPORT_TOKEN || 'figma-export-local-dev';
const DESKTOP   = path.join(os.homedir(), 'Desktop');
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB per file

const ILLEGAL = '<>:"/\\|?*';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-File-Name, X-Auth-Token');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function json(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function sanitizePngName(raw) {
  const base = path.basename(String(raw || '').trim()); // drop any path components
  let out = '';
  for (const ch of base) {
    const code = ch.codePointAt(0);
    out += (code < 32 || ILLEGAL.indexOf(ch) !== -1) ? '-' : ch;
  }
  out = out.replace(/\s+/g, ' ').trim();
  if (!out) out = 'frame';
  if (!/\.png$/i.test(out)) out += '.png';
  return out;
}

function handler(req, res) {
  cors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];

  // Liveness probe — no auth, used by the plugin to detect the helper.
  if (req.method === 'GET' && url === '/health') {
    json(res, 200, { ok: true, version: VERSION, desktop: DESKTOP });
    return;
  }

  if (req.method === 'POST' && url === '/save') {
    if (req.headers['x-auth-token'] !== TOKEN) {
      json(res, 401, { ok: false, error: 'invalid token' });
      return;
    }

    const safeName = sanitizePngName(req.headers['x-file-name']);
    const dest = path.join(DESKTOP, safeName);
    if (dest !== path.join(DESKTOP, path.basename(dest))) {
      json(res, 400, { ok: false, error: 'invalid filename' });
      return;
    }

    const chunks = [];
    let size = 0;
    let aborted = false;

    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BYTES) {
        aborted = true;
        json(res, 413, { ok: false, error: 'file too large' });
        req.destroy();
        return;
      }
      chunks.push(c);
    });

    req.on('end', () => {
      if (aborted) return;
      try {
        fs.writeFileSync(dest, Buffer.concat(chunks));
        console.log('saved:', dest);
        json(res, 200, { ok: true, path: dest });
      } catch (e) {
        json(res, 500, { ok: false, error: String((e && e.message) || e) });
      }
    });

    req.on('error', () => {
      try { json(res, 500, { ok: false, error: 'request error' }); } catch (_) {}
    });
    return;
  }

  json(res, 404, { ok: false, error: 'not found' });
}

console.log(`figma-export-to-desktop helper v${VERSION}`);
console.log(`writing PNGs to ${DESKTOP}`);

// Listen on both loopback stacks so the plugin's fetch to "localhost"
// connects whether it resolves to 127.0.0.1 (IPv4) or ::1 (IPv6).
function listenLoopback(addr, label, primary) {
  const s = http.createServer(handler);
  s.on('error', (e) => {
    if (e.code === 'EADDRINUSE' && primary) {
      console.error(`Port ${PORT} is already in use. Another helper instance may be running.`);
      process.exit(1);
    }
    console.error(`(${label}) ${e.code || e.message}`);
  });
  s.listen(PORT, addr, () => console.log(`listening on http://${label}:${PORT}`));
}

listenLoopback('127.0.0.1', '127.0.0.1', true);
listenLoopback('::1', '[::1]', false);
