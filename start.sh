#!/bin/bash

# ═══════════════════════════════════════════════════════════
#  Jmac Visualizer — One-Click Launcher
# ═══════════════════════════════════════════════════════════

set -e

# Colors
R='\033[0;31m'   G='\033[0;32m'   Y='\033[1;33m'
B='\033[0;34m'   P='\033[0;35m'   C='\033[0;36m'
W='\033[1;37m'   D='\033[0;90m'   N='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATIC_DIR="$SCRIPT_DIR/static"

# ─── Helpers ─────────────────────────────────────────────────
step()    { echo -e "  ${D}│${N}"; echo -e "  ${C}◆${N}  $1"; }
ok()      { echo -e "  ${G}✔${N}  ${D}$1${N}"; }
fail()    { echo -e "  ${R}✖${N}  $1"; exit 1; }

# ─── Cleanup ─────────────────────────────────────────────────
cleanup() {
    echo ""
    [ -n "$FLASK_PID" ] && kill "$FLASK_PID" 2>/dev/null && wait "$FLASK_PID" 2>/dev/null
    echo -e "  ${D}───────────────────────────────────────────${N}"
    echo -e "  ${W}Server stopped.${N} Goodbye! 👋"
    echo -e "  ${D}───────────────────────────────────────────${N}"
    echo ""
}
trap cleanup EXIT INT TERM

# ═══════════════════════════════════════════════════════════
#  START
# ═══════════════════════════════════════════════════════════
clear
echo ""
echo -e "  ${P}┌───────────────────────────────────────────┐${N}"
echo -e "  ${P}│${N}  ${W}🔍  J m a c   V i s u a l i z e r${N}        ${P}│${N}"
echo -e "  ${P}│${N}  ${D}Made by Avdesh Jadon${N}                     ${P}│${N}"
echo -e "  ${P}└───────────────────────────────────────────┘${N}"

# ─── 1. Prerequisites ────────────────────────────────────────
step "Checking prerequisites"

python3 --version &>/dev/null || fail "Python3 not found"
ok "Python $(python3 --version 2>&1 | cut -d' ' -f2)"

node --version &>/dev/null || fail "Node.js not found"
ok "Node.js $(node --version 2>&1)"

# ─── 2. Dependencies ─────────────────────────────────────────
step "Installing dependencies"

pip3 install -q flask 2>/dev/null || pip install -q flask 2>/dev/null || true
ok "Flask ready"

if [ ! -d "$STATIC_DIR/node_modules" ]; then
    (cd "$STATIC_DIR" && npm install --silent 2>&1 >/dev/null)
    ok "Node modules installed"
else
    ok "Node modules cached"
fi

# ─── 3. Build ────────────────────────────────────────────────
step "Building React app"

BUILD_OUTPUT=$(cd "$STATIC_DIR" && npx vite build 2>&1)
BUILD_TIME=$(echo "$BUILD_OUTPUT" | grep -o 'built in [0-9]*ms' || echo "built")
ok "Vite $BUILD_TIME"

# ─── 4. Launch ───────────────────────────────────────────────
step "Starting server"
echo ""
echo -e "  ${G}┌───────────────────────────────────────────┐${N}"
echo -e "  ${G}│${N}                                           ${G}│${N}"
echo -e "  ${G}│${N}   ${W}🌐  http://127.0.0.1:5000${N}               ${G}│${N}"
echo -e "  ${G}│${N}                                           ${G}│${N}"
echo -e "  ${G}└───────────────────────────────────────────┘${N}"
echo ""
echo -e "  ${D}Press ${W}Ctrl+C${D} to stop${N}"
echo -e "  ${D}───────────────────────────────────────────${N}"
echo ""

# Kill anything on port 5000 first
lsof -ti:5000 2>/dev/null | xargs kill -9 2>/dev/null || true

# Start Flask — stdout (Flask banner) → hidden, stderr (our logs) → terminal
python3 -c "
import sys, os, logging

sys.path.insert(0, '$SCRIPT_DIR')
os.chdir('$SCRIPT_DIR')

# Suppress werkzeug HTTP request logs
logging.getLogger('werkzeug').setLevel(logging.ERROR)

from app import app
from config import HOST, PORT
app.run(host=HOST, port=PORT, debug=False)
" 1>/dev/null &
FLASK_PID=$!

sleep 2

if kill -0 "$FLASK_PID" 2>/dev/null; then
    ok "Server running  ─  PID $FLASK_PID"
    echo -e "  ${D}│${NC}"
    echo -e "  ${D}│  ${C}Live scan logs below ↓${N}"
    echo -e "  ${D}│${NC}"
    wait "$FLASK_PID"
else
    fail "Server failed to start. Try: python3 app.py"
fi
