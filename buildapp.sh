#!/bin/bash
# ----------------------------------------------------------------------------
# buildapp.sh -- Jmac Visualizer Full Build Script
# ----------------------------------------------------------------------------
set -e

# ── Colors ───────────────────────────────────────────────────────────────────
BOLD="\033[1m"
DIM="\033[2m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log()  { echo -e "${CYAN}◆${NC} ${BOLD}$1${NC}"; }
ok()   { echo -e "${GREEN}✔${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
err()  { echo -e "${RED}✖${NC} $1"; exit 1; }
sep()  { echo -e "${DIM}────────────────────────────────────────────────────${NC}"; }

# ── Header ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}  🔨 Jmac Visualizer — Build${NC}"
echo -e "${DIM}  $(date '+%Y-%m-%d %H:%M:%S')${NC}"
sep

# ── Clean: Remove old build artifacts ────────────────────────────────────────
echo ""
log "Clean — Removing old build artifacts"
sep

echo -e "${DIM}  Deleting backend/build, backend/dist ...${NC}"
rm -rf "$SCRIPT_DIR/backend/build" "$SCRIPT_DIR/backend/dist"

echo -e "${DIM}  Deleting frontend/dist, frontend/release ...${NC}"
rm -rf "$SCRIPT_DIR/frontend/dist" "$SCRIPT_DIR/frontend/release"

echo ""
ok "Old artifacts removed — starting fresh build"

# ── Step 1: Backend (PyInstaller) ─────────────────────────────────────────────
echo ""
log "Step 1/3 — Backend: PyInstaller"
sep

cd "$SCRIPT_DIR/backend"
echo -e "${DIM}  Working dir : $(pwd)${NC}"

if ! command -v pyinstaller &>/dev/null; then
  warn "pyinstaller not found — installing..."
  pip install pyinstaller --break-system-packages || err "Failed to install pyinstaller"
fi

echo -e "${DIM}  Running: pyinstaller --name app --clean --noconfirm --onedir app.py${NC}"
echo ""

pyinstaller --name app --clean --noconfirm --onedir app.py

echo ""
ok "Backend binary built → backend/dist/app/app"

# ── Step 2: Frontend (npm install) ────────────────────────────────────────────
sep
echo ""
log "Step 2/3 — Frontend: Installing dependencies"
sep

cd "$SCRIPT_DIR/frontend"
echo -e "${DIM}  Working dir : $(pwd)${NC}"
echo -e "${DIM}  Running: npm install${NC}"
echo ""

npm install

echo ""
ok "Node dependencies ready"

# ── Step 3: Frontend (npm run dist) ───────────────────────────────────────────
sep
echo ""
log "Step 3/3 — Frontend: Packaging macOS app"
sep

echo -e "${DIM}  Running: npm run dist${NC}"
echo ""

npm run dist

echo ""
ok "macOS app packaged → frontend/release/mac-arm64/JmacVisualizer.app"

# ── Step 4: Ad-hoc Code Sign + DMG ───────────────────────────────────────────
sep
echo ""
log "Step 4/4 — Ad-hoc Code Sign + DMG Creation"
sep

APP_PATH="$SCRIPT_DIR/frontend/release/mac-arm64/JmacVisualizer.app"
DMG_PATH="$SCRIPT_DIR/frontend/release/JmacVisualizer.dmg"

if [ ! -d "$APP_PATH" ]; then
  err "App not found at $APP_PATH — build may have failed"
fi

echo -e "${DIM}  Signing: $APP_PATH${NC}"
echo ""

# Ad-hoc sign the entire app bundle (deep = all nested binaries)
codesign --deep --force --sign - "$APP_PATH" \
  || err "codesign failed — make sure Xcode Command Line Tools are installed (xcode-select --install)"

echo ""
ok "App signed with ad-hoc identity"

# Remove old DMG if exists
[ -f "$DMG_PATH" ] && rm "$DMG_PATH"

echo -e "${DIM}  Creating DMG: $DMG_PATH${NC}"
echo ""

# Create DMG from the signed .app
hdiutil create \
  -volname "JmacVisualizer" \
  -srcfolder "$APP_PATH" \
  -ov \
  -format UDZO \
  "$DMG_PATH" \
  || err "hdiutil failed — could not create DMG"

echo ""
ok "Signed DMG created → frontend/release/JmacVisualizer.dmg"

# ── Done ──────────────────────────────────────────────────────────────────────
sep
echo ""
echo -e "${GREEN}${BOLD}  🎉 Build complete!${NC}"
echo ""
echo -e "  📦 drag ${BOLD}frontend/release/mac-arm64/JmacVisualizer.app${NC} to /Applications"
echo ""

