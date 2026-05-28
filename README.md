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

## Setup (macOS, ~2 min)

```bash
# 1. Clone & install
git clone https://github.com/pinzitasalonso/figma-export-to-desktop.git
cd figma-export-to-desktop
npm install

# 2. Build the plugin
npm run build

# 3. Auto-start the helper at login
cd helper && ./install.sh && cd ..

# 4. Verify the helper is running
curl -s http://localhost:31773/health   # expect {"ok":true,...}
```

Then in the **Figma desktop app**: **Plugins → Development → Import plugin from manifest…** and select `manifest.json` from this repo.

Want to lock the helper down so only your plugin can call it? See [Optional: private auth token](#optional-private-auth-token) below.

## Use

1. Select layers in Figma — or select nothing to export every top-level frame on the page (including frames inside Sections).
2. Run **Plugins → Development → Desktop Exporter** (or **⌘⌥P** to re-run the last plugin).
3. Press **Enter** or click the button.

Files land on `~/Desktop` named `<layer>.png` at 2× scale. Duplicate names get ` 2`, ` 3`, … appended (Finder-style).

**Windows/Linux**: everything works except `helper/install.sh` (macOS launchd). Run `node helper/server.js` manually, or wire up a systemd user service / Task Scheduler entry.

---

## Optional: private auth token

Out of the box the helper accepts a public token shipped in the repo. That's fine for a single-user personal machine — the helper is loopback-only and only writes `*.png` files to `~/Desktop` with a 50 MB cap, so the worst a misbehaving caller could do is clutter your Desktop. Set a private token if you'd rather a random localhost-probing browser tab couldn't even do that.

```bash
# 1. Generate a random value
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 2. Plugin side — paste it into a gitignored secret.js, then rebuild
cp secret.example.js secret.js   # edit window.SECRET_TOKEN to your value
npm run build                    # inlines it into ui.html
```

**3. Helper side** — set `FIGMA_EXPORT_TOKEN` to the same value.

- *If you haven't run `helper/install.sh` yet*: add a `FIGMA_EXPORT_TOKEN` entry to the plist block inside `install.sh` first, then run it.
- *If the launchd agent is already installed*: edit the live plist at `~/Library/LaunchAgents/com.figma-export-to-desktop.helper.plist`, add the entry to its `EnvironmentVariables` dict, then reload:

```bash
launchctl unload ~/Library/LaunchAgents/com.figma-export-to-desktop.helper.plist
launchctl load   ~/Library/LaunchAgents/com.figma-export-to-desktop.helper.plist
```

**4. Re-open the plugin in Figma** (or click "Retry connection"). Verify the old default token is now rejected:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" \
  -H "X-Auth-Token: figma-export-local-dev" \
  -X POST http://127.0.0.1:31773/save     # expect 401
```

Re-run `npm run build` whenever you change the token, so the new value gets inlined into `ui.html`.

---

## Why this exists

Figma's export panel makes you click through a save dialog every time, and a plugin **can't** silently write files to disk on its own — Figma's webview sandboxes the File System Access API and routes browser downloads through a native save dialog.

Desktop Exporter ships a tiny **local helper** to get around that. The plugin sends PNG bytes to a small server on `localhost`, which writes them to your Desktop. No dialogs, plain files, flat. If the helper isn't running, the plugin automatically falls back to ordinary downloads.

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
- If **nothing is selected**, every top-level frame on the page, including frames nested in Sections.
- Each file is `<layer name>.png` at **2× scale**, written **flat** (no subdirectories).
- Illegal filename characters (`/ \ ? % * : | " < >`) become `-`. Duplicate names are disambiguated as `name 2.png`, `name 3.png`, ….

## Keyboard tips

- **Enter** runs the export from inside the plugin window (no click needed).
- Want a hotkey to *open* the plugin? Figma re-runs your last plugin with **⌘⌥P**. For a dedicated key, add a macOS **System Settings → Keyboard → Keyboard Shortcuts → App Shortcuts** entry for Figma with menu title `Desktop Exporter`.

---

## The helper in detail

A dependency-free Node server (`helper/server.js`) that listens on loopback and writes PNGs to your Desktop.

- **Address:** `localhost:31773` (override with `FIGMA_EXPORT_PORT`); listens on both IPv4 and IPv6 loopback.
- **`GET /health`** — liveness probe the plugin uses to detect the helper.
- **`POST /save`** — raw PNG bytes in the body, `X-File-Name` for the name, `X-Auth-Token` for auth.
- **Logs** (when run via launchd): `/tmp/figma-export-helper.log`.
- **Uninstall the auto-start agent:** `cd helper && ./uninstall.sh`.
- **Zero npm dependencies** — only needs **Node 16+**.

### Security model

A localhost server that writes files deserves care, so the helper:

- binds to **loopback only** — never exposed on your network;
- requires a shared **token** (`X-Auth-Token`);
- writes **only** inside `~/Desktop`, **only** `*.png`, with filename sanitisation, a path-traversal guard, and a 50 MB-per-file cap.

The default token (`figma-export-local-dev`) shipped in the repo is a placeholder, **not a secret**. The helper reads `FIGMA_EXPORT_TOKEN` from the environment; the plugin UI reads it from a gitignored `secret.js` that the build inlines into `ui.html`. Both must match. See [Optional: private auth token](#optional-private-auth-token) for the full setup.

#### Why a `secret.js` and not a `.env` file?

`ui.html` runs inside Figma's plugin sandbox — a browser iframe with no Node, no `process.env`, no filesystem access. It also can't fetch relative resources, so a runtime `<script src="secret.js">` silently fails. `scripts/build-ui.js` sidesteps that by reading `secret.js` and **inlining** `window.SECRET_TOKEN` into `ui.html` before Figma loads it. The helper runs in Node and reads `FIGMA_EXPORT_TOKEN` from a real env var — strictly stronger than dotenv, since there's no file on disk to leak.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| **Manifest error about `allowedDomains`** | Already handled — localhost lives in `devAllowedDomains`. Re-import the manifest. |
| **Banner stays amber "Helper not running"** | Start the helper (`node helper/server.js`), then click **Retry connection**. Check the log at `/tmp/figma-export-helper.log`. |
| **An error appears instead of exporting** | The plugin reports the reason. Common causes: the layer is **hidden** or has **zero size** — those can't be rasterised. |
| **Enter doesn't trigger export** | Click the plugin window once so it has focus, then press Enter. |
| **Files go to Downloads, not Desktop** | That's downloads mode (helper not connected). Start the helper for direct-to-Desktop writes. |
| **Banner is green but exports 401** | Token mismatch. The helper's `FIGMA_EXPORT_TOKEN` env var must match the token in `secret.js`. After editing either, run `npm run build` and re-open the plugin in Figma. |
| **No frames exported when nothing is selected** | Make sure you're on the latest build (`npm run build`). The page must contain top-level frames or frames inside Sections — empty pages export nothing. |

---

## Project layout

```
figma-export-to-desktop/
├── manifest.json        Plugin manifest (declares localhost networkAccess)
├── code.ts / code.js    Sandbox: exportAsync at 2×, posts bytes to the UI
├── ui.template.html     UI source — built into ui.html with the token inlined
├── ui.html              Built artifact (gitignored)
├── secret.example.js    Template for the gitignored secret.js (your real token)
├── scripts/
│   └── build-ui.js      Reads secret.js, inlines window.SECRET_TOKEN into ui.html
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
