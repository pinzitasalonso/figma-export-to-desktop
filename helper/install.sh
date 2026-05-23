#!/usr/bin/env bash
#
# Installs the figma-export-to-desktop helper as a macOS launchd agent so it
# starts now and auto-starts at every login. Idempotent — safe to re-run.
#
set -euo pipefail

LABEL="com.figma-export-to-desktop.helper"
HELPER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER="$HELPER_DIR/server.js"
NODE_BIN="$(command -v node || true)"
AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST="$AGENTS_DIR/$LABEL.plist"
LOG="/tmp/figma-export-helper.log"
PORT="${FIGMA_EXPORT_PORT:-31773}"

if [ -z "$NODE_BIN" ]; then
  echo "Error: 'node' not found on PATH. Install Node 16+ first (https://nodejs.org)." >&2
  exit 1
fi

mkdir -p "$AGENTS_DIR"

cat > "$PLIST" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$SERVER</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>FIGMA_EXPORT_PORT</key>
    <string>$PORT</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$LOG</string>
  <key>StandardErrorPath</key>
  <string>$LOG</string>
</dict>
</plist>
PLIST_EOF

# Reload if already loaded, then load fresh.
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"

echo "Installed launchd agent: $LABEL"
echo "  node:  $NODE_BIN"
echo "  server: $SERVER"
echo "  plist: $PLIST"
echo "  log:   $LOG"
echo ""
echo "Verifying (give it a second)…"
sleep 1
if curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
  echo "Helper is up: http://127.0.0.1:$PORT/health"
else
  echo "Could not reach the helper yet. Check the log: $LOG"
fi
