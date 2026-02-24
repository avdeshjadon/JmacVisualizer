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

# ── Done ──────────────────────────────────────────────────────────────────────
sep
echo ""
echo -e "${GREEN}${BOLD}  🎉 Build complete!${NC}"
echo ""
echo -e "  📦 Drag ${BOLD}frontend/release/mac-arm64/JmacVisualizer.app${NC} to /Applications"
echo ""
