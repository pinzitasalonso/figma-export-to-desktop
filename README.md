# figma-export-to-desktop

A Figma plugin that exports selected frames (or all frames on the current page) as PNG files — flat, no subdirectories, at 2× scale, named after each frame (e.g. `Hero Section.png`).

It has **two ways** to get the files onto your machine:

| Mode | Dialogs | Setup | Output |
|------|---------|-------|--------|
| **Helper** (recommended) | none | run a tiny local server | plain PNGs written straight to `~/Desktop` |
| **Downloads** (fallback) | one save dialog per file | none | plain PNGs to wherever you save them |

The plugin auto-detects whether the helper is running and picks the mode for you.

---

## Why the helper exists

Figma plugin UIs run in a sandboxed webview that **does not expose the File System Access API** (`showDirectoryPicker`/`showSaveFilePicker`), and routes every browser download through a native "Save As" dialog. So a pure plugin can't write files silently to a chosen folder.

The helper sidesteps the sandbox: the plugin `POST`s the PNG bytes to a small server on `127.0.0.1`, and that server writes them to your Desktop. No dialogs, plain files, flat.

---

## Quick start

### 1. Build the plugin

```bash
npm install
npm run build       # compiles code.ts → code.js
```

### 2. (Recommended) Start the helper

```bash
cd helper
node server.js      # foreground, Ctrl+C to stop
# — or — auto-start at login (macOS launchd agent):
./install.sh
```

The helper needs **only Node 16+** — it has zero npm dependencies (Node built-ins only).

### 3. Load the plugin in Figma

1. Open the **Figma desktop app**
2. **Plugins → Development → Import plugin from manifest…**
3. Select `manifest.json` in this folder

### 4. Export

1. *(Optional)* Select frames. If nothing is selected, all top-level frames on the page are exported.
2. Run **Plugins → Development → Export to Desktop**.
3. The banner shows the mode:
   - **Helper connected** → click **Export to Desktop**; files appear on your Desktop instantly.
   - **Helper not running** → click **How to start the helper**, follow it, then **Retry connection**; or click **Export via downloads** and save each file (the first save asks where — pick Desktop, macOS reuses it for the rest).

---

## The helper in detail

- **Endpoint:** `127.0.0.1:31773` (override the port with `FIGMA_EXPORT_PORT`).
- **`GET /health`** — liveness probe the plugin uses for detection.
- **`POST /save`** — body is raw PNG bytes; `X-File-Name` header sets the name; `X-Auth-Token` must match.
- **Logs** (when run via launchd): `/tmp/figma-export-helper.log`.
- **Uninstall the launchd agent:** `cd helper && ./uninstall.sh`.

### Security

A localhost server that writes files is a small attack surface, so the helper:

- binds to **`127.0.0.1` only** (never the LAN);
- requires a shared **token** (`X-Auth-Token`);
- writes **only** inside `~/Desktop`, **only** `*.png`, with filename sanitisation, a path-traversal guard, and a 50 MB/file cap.

The default token (`figma-export-local-dev`) is **in this public repo, so it is not secret**. For real protection set a private token in both places — they must match:

```bash
# helper: export before starting (or set it in the launchd plist)
export FIGMA_EXPORT_TOKEN="your-long-random-secret"
node server.js
```

…and change `TOKEN` near the top of `ui.html` to the same value, then `Retry connection`.

---

## Installing on another machine (copy-paste recipe for an LLM)

The helper must run on whatever machine runs the Figma desktop app (`localhost`). On a fresh macOS machine, from a clone of this repo:

```bash
# 1. Clone
git clone https://github.com/pinzitasalonso/figma-export-to-desktop.git
cd figma-export-to-desktop

# 2. Build the plugin (prebuilt code.js is committed, but rebuild to be safe)
npm install
npm run build

# 3. Start the helper and register it to auto-start at login
cd helper
./install.sh

# 4. Verify the helper is up (expect: {"ok":true,...})
curl -s http://127.0.0.1:31773/health

# 5. In the Figma desktop app:
#    Plugins → Development → Import plugin from manifest…
#    → select  <repo>/manifest.json
```

Requirements on the target machine: **Node 16+**, the **Figma desktop app**, and `git`/`curl`.
Other OSes: `node server.js` works anywhere Node runs; only the auto-start step (`install.sh`, launchd) is macOS-specific — on Windows/Linux run the server manually or wire up a Task Scheduler entry / systemd user service.

---

## Project layout

```
figma-export-to-desktop/
├── manifest.json     Figma plugin manifest (declares localhost networkAccess)
├── code.ts / code.js Plugin sandbox: exportAsync at 2×, posts bytes to the UI
├── ui.html           UI: detects the helper, server export + download fallback
├── tsconfig.json
├── package.json
└── helper/
    ├── server.js     Dependency-free local server → writes PNGs to ~/Desktop
    ├── package.json
    ├── install.sh    Registers a launchd agent (auto-start at login)
    └── uninstall.sh  Removes the launchd agent
```

## Notes

- The `id` in `manifest.json` is a local development placeholder. Figma assigns a real numeric ID when you publish through the Figma Community portal.
- Illegal filename characters (`/ \ ? % * : | " < >`) are replaced with `-` in both the plugin and the helper.

## License

MIT
