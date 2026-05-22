# figma-export-to-desktop

A Figma plugin that exports selected frames (or all frames on the current page) as PNG files directly to a folder you pick — flat output, no subdirectories, at 2× scale by default.

## Features

- Exports **selected frames**, or **all frames on the page** if nothing is selected
- **PNG format, 2× scale** — ready for @2x assets or high-DPI screens
- **Flat output** — all files land in one folder, no subdirectories
- Files are named after the frame (e.g. `Hero Section.png`)
- Uses the **File System Access API** — you pick the destination folder (defaults to Desktop)

## Requirements

- **Figma desktop app** — the File System Access API (`showDirectoryPicker`) is not available in the web version of Figma

## Development setup

```bash
npm install
npm run build   # compiles code.ts → code.js
```

Watch mode:

```bash
npm run watch
```

## Loading in Figma

1. Open the **Figma desktop app**
2. Go to **Plugins → Development → Import plugin from manifest…**
3. Select `manifest.json` in this folder

## Usage

1. *(Optional)* Select the frames you want to export. If nothing is selected all top-level frames on the current page are exported.
2. Open the plugin via **Plugins → Export to Desktop**
3. Click **Export to Desktop**
4. A folder picker opens, defaulting to your Desktop — choose a destination and click **Select**
5. PNG files are written there immediately, named after each frame

## Notes

- The `id` in `manifest.json` is a local development placeholder. Figma assigns a real numeric ID when you publish a plugin through the Figma Community portal.
- Characters that are illegal in file names (`/ \ ? % * : | " < >`) are automatically replaced with `-`.

## License

MIT
