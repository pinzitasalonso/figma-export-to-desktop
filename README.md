<div align="center">

# Desktop Exporter

**A Figma plugin that exports your layers to PNG and drops them straight onto your Desktop.**

Flat output · 2× scale · named after each layer · no dialogs (with the helper running)

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)
![Figma plugin](https://img.shields.io/badge/Figma-plugin-F24E1E?logo=figma&logoColor=white)
![Node](https://img.shields.io/badge/node-%E2%89%A516-3C873A?logo=node.js&logoColor=white)

</div>

---

Select some layers, hit **Export** (or just press **Enter**), and the PNGs appear on your Desktop — already named, no folders to dig through, no "Save As" dialog for every file.

## Why this exists

Figma's own export panel makes you click through a save dialog and pick a destination every time. Worse, a plugin **can't** silently write files to disk on its own: Figma's plugin webview sandboxes the File System Access API and routes every browser download through a native save dialog.

Desktop Exporter ships a tiny **local helper** to get around that. The plugin sends the PNG bytes to a small server on `localhost`, and the server writes them to your Desktop. No dialogs, plain files, flat. If the helper isn't running, the plugin automatically falls back to ordinary downloads.

## Two ways to export

The plugin detects the helper on launch and shows you which mode is active.

| | **Helper mode** (recommended) | **Downloads mode** (fallback) |
|---|---|---|
| Dialogs | none | one per file |
| Setup | run a small local server once | nothing |
| Where files land | straight to `~/Desktop` | wherever you save them |
| Status banner | green "Helper connected" | amber "Helper not running" |

## What gets exported

- **Selected layers** of any kind — frames, groups, components, instances, shapes, text, vectors.
- If **nothing is selected**, every top-level frame on the current page.
- Each file is `<layer name>.png` at **2× scale**, written **flat** (no subdirectories).
- Illegal filename characters (`/ \ ? % * : | " < >`) become `-`.

---

## Quick start

### 1. Build the plugin

```bash
npm install
npm run build        # compiles code.ts → code.js
```

### 2. Start the helper (for zero-dialog export)

```bash
cd helper
node server.js       # foreground; Ctrl+C to stop
```

…or install it once so it auto-starts at every login (macOS):

```bash
cd helper
./install.sh
```

The helper has **zero npm dependencies** — it only needs **Node 16+**.

### 3. Load the plugin in Figma

1. Open the **Figma desktop app**.
2. **Plugins → Development → Import plugin from manifest…**
3. Select `manifest.json` from this folder.

### 4. Export

1. *(Optional)* Select the layers you want. With nothing selected, all top-level frames are exported.
2. Run **Plugins → Development → Desktop Exporter**.
3. Press **Enter** or click the button. In helper mode the files appear on your Desktop instantly; in downloads mode you confirm each save (the first one asks where — pick Desktop, macOS reuses it).

## Keyboard tips

- **Enter** runs the export from inside the plugin window (no click needed).
- Want a hotkey to *open* the plugin? Figma re-runs your last plugin with **⌘⌥P**. For a dedicated key, add a macOS **System Settings → Keyboard → Keyboard Shortcuts → App Shortcuts** entry for Figma with the menu title `Desktop Exporter`.

---

## The helper in detail

A dependency-free Node server (`helper/server.js`) that listens on loopback and writes PNGs to your Desktop.

- **Address:** `localhost:31773` (override with `FIGMA_EXPORT_PORT`); listens on both IPv4 and IPv6 loopback.
- **`GET /health`** — liveness probe the plugin uses to detect the helper.
- **`POST /save`** — raw PNG bytes in the body, `X-File-Name` for the name, `X-Auth-Token` for auth.
- **Logs** (when run via launchd): `/tmp/figma-export-helper.log`.
- **Uninstall the auto-start agent:** `cd helper && ./uninstall.sh`.

### Security

A localhost server that writes files deserves care, so the helper:

- binds to **loopback only** — never exposed on your network;
- requires a shared **token** (`X-Auth-Token`);
- writes **only** inside `~/Desktop`, **only** `*.png`, with filename sanitisation, a path-traversal guard, and a 50 MB-per-file cap.

The default token (`figma-export-local-dev`) is in this public repo, so it is **not secret**. For real protection set a private one in both places (they must match):

```bash
export FIGMA_EXPORT_TOKEN="your-long-random-secret"   # before starting the helper
```

…and set the same value for `TOKEN` near the top of `ui.html`, then click **Retry connection**.

---

## Installing on another machine

The helper must run on whatever machine runs the Figma desktop app (it's `localhost`). On a fresh **macOS** machine, from a clone of this repo:

```bash
# 1. Clone
git clone https://github.com/pinzitasalonso/figma-export-to-desktop.git
cd figma-export-to-desktop

# 2. Build the plugin
npm install && npm run build

# 3. Start the helper and register it to auto-start at login
cd helper && ./install.sh

# 4. Verify (expect: {"ok":true,...})
curl -s http://localhost:31773/health

# 5. In the Figma desktop app:
#    Plugins → Development → Import plugin from manifest…  →  select <repo>/manifest.json
```

Requirements on the target machine: **Node 16+**, the **Figma desktop app**, plus `git` and `curl`.
Other OSes: `node server.js` runs anywhere Node does — only the auto-start step (`install.sh`, launchd) is macOS-specific. On Windows/Linux start the server manually or wire up a Task Scheduler entry / systemd user service.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| **Manifest error about `allowedDomains`** | Already handled — localhost lives in `devAllowedDomains`. Re-import the manifest. |
| **Banner stays amber "Helper not running"** | Start the helper (`node server.js`), then click **Retry connection**. Check the log at `/tmp/figma-export-helper.log`. |
| **An error appears instead of exporting** | The plugin now reports the reason. Common causes: the layer is **hidden** or has **zero size** — those can't be rasterised. Make it visible / give it size and retry. |
| **Enter doesn't trigger export** | Click the plugin window once so it has focus, then press Enter. |
| **Files go to Downloads, not Desktop** | That's downloads mode (helper not connected). Start the helper for direct-to-Desktop writes. |

---

## Project layout

```
figma-export-to-desktop/
├── manifest.json     Plugin manifest (declares localhost networkAccess)
├── code.ts / code.js Sandbox: exportAsync at 2×, posts bytes to the UI
├── ui.html           UI: helper detection, server export + download fallback
├── tsconfig.json
├── package.json
└── helper/
    ├── server.js     Dependency-free local server → writes PNGs to ~/Desktop
    ├── package.json
    ├── install.sh    Registers a launchd agent (auto-start at login)
    └── uninstall.sh  Removes the launchd agent
```

## Notes

- The `id` in `manifest.json` is a development placeholder. Figma assigns a real numeric ID when you publish through the Figma Community portal.

## License

[MIT](LICENSE)
