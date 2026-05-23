#!/usr/bin/env bash
#
# Removes the figma-export-to-desktop launchd agent and stops the helper.
#
set -euo pipefail

LABEL="com.figma-export-to-desktop.helper"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

launchctl unload "$PLIST" 2>/dev/null || true
rm -f "$PLIST"

echo "Removed launchd agent: $LABEL"
echo "(If a manually-started 'node server.js' is still running, stop it with Ctrl+C.)"
