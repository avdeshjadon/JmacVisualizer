#!/bin/bash

# ═══════════════════════════════════════════════════════════
#  Built with ♥ by Avdesh Jadon
#  GitHub: https://github.com/avdeshjadon
#
#  This software is free to use. If you find it helpful:
#  ⭐ Star the repository | 🍴 Fork the project | 🤝 Contribute
# ═══════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════
#  Jmac Visualizer — One-Click Launcher
# ═══════════════════════════════════════════════════════════

set -e

# ─── Colors & Styles ─────────────────────────────────────────
R='\033[0;31m'    # Red
G='\033[0;32m'    # Green
Y='\033[1;33m'    # Yellow
B='\033[0;34m'    # Blue
P='\033[0;35m'    # Magenta/Purple
C='\033[0;36m'    # Cyan
W='\033[1;37m'    # Bright White
D='\033[0;90m'    # Dark Grey
N='\033[0m'       # Reset
BOLD='\033[1m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATIC_DIR="$SCRIPT_DIR/frontend"
URL="http://127.0.0.1:5005"

# ─── Timestamp ───────────────────────────────────────────────
ts() { date "+%H:%M:%S"; }

# ─── Log Helpers ─────────────────────────────────────────────
log_info() {
    echo -e "${D}$(ts)${N}  ${C}INFO ${N}  $1"
}

log_ok() {
    echo -e "${D}$(ts)${N}  ${G}DONE ${N}  $1"
}

log_warn() {
    echo -e "${D}$(ts)${N}  ${Y}WARN ${N}  $1"
}

log_fail() {
    echo -e "${D}$(ts)${N}  ${R}FAIL ${N}  $1"
    exit 1
}

log_step() {
    echo ""
    echo -e "${D}$(ts)${N}  ${P}STEP ${N}  ${BOLD}$1${N}"
}

log_sub() {
    echo -e "${D}$(ts)${N}  ${D}.... ${N}  ${D}$1${N}"
}

log_data() {
    local key="$1"
    local val="$2"
    printf "${D}%s${N}  ${D}....${N}  %-24s ${W}%s${N}\n" "$(ts)" "$key" "$val"
}

log_div() {
    echo -e "${D}──────────────────────────────────────────────────────────────${N}"
}

log_divthick() {
    echo -e "${D}══════════════════════════════════════════════════════════════${N}"
}

# ─── Progress Bar ────────────────────────────────────────────
progress() {
    local label="$1"
    local pct="$2"
    local width=28
    local filled=$(( pct * width / 100 ))
    local empty=$(( width - filled ))
    local bar=""
    for ((i=0; i<filled; i++)); do bar+="█"; done
    for ((i=0; i<empty; i++));  do bar+="░"; done
    printf "${D}%s${N}  ${B}PROG${N}  %-24s [${G}%s${D}%s${N}] ${W}%3d%%${N}\n" \
        "$(ts)" "$label" "$bar" "" "$pct"
}

# ─── Cleanup ─────────────────────────────────────────────────
cleanup() {
    echo ""
    log_divthick
    if [ -n "$FLASK_PID" ]; then
        log_info "Sending SIGTERM to PID ${W}$FLASK_PID${N}"
        kill "$FLASK_PID" 2>/dev/null && wait "$FLASK_PID" 2>/dev/null
        log_ok "Server process terminated cleanly"
    fi
    if [ -d "$USER_DATA_DIR" ]; then
        log_info "Cleaning up browser profile..."
        rm -rf "$USER_DATA_DIR" 2>/dev/null
        log_ok "Profile deleted: $USER_DATA_DIR"
    fi
    log_divthick
    echo -e "                  ${P}${BOLD}SYSTEM HALTED${N}"
    log_divthick
    echo ""
}
trap cleanup EXIT INT TERM


# ═══════════════════════════════════════════════════════════
#  BOOT
# ═══════════════════════════════════════════════════════════
clear
echo ""
log_divthick

echo -e "${P}"
echo "     ██╗███╗   ███╗ █████╗  ██████╗"
echo "     ██║████╗ ████║██╔══██╗██╔════╝"
echo "     ██║██╔████╔██║███████║██║"
echo "██   ██║██║╚██╔╝██║██╔══██║██║"
echo "╚█████╔╝██║ ╚═╝ ██║██║  ██║╚██████╗"
echo " ╚════╝ ╚═╝     ╚═╝╚═╝  ╚═╝ ╚═════╝"
echo -e "${N}"
echo -e "${C}"
echo " ██╗   ██╗██╗███████╗██╗   ██╗ █████╗ ██╗     ██╗███████╗███████╗██████╗"
echo " ██║   ██║██║██╔════╝██║   ██║██╔══██╗██║     ██║╚══███╔╝██╔════╝██╔══██╗"
echo " ██║   ██║██║███████╗██║   ██║███████║██║     ██║  ███╔╝ █████╗  ██████╔╝"
echo " ╚██╗ ██╔╝██║╚════██║██║   ██║██╔══██║██║     ██║ ███╔╝  ██╔══╝  ██╔══██╗"
echo "  ╚████╔╝ ██║███████║╚██████╔╝██║  ██║███████╗██║███████╗███████╗██║  ██║"
echo "   ╚═══╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝╚══════╝╚══════╝╚═╝  ╚═╝"
echo -e "${N}"

log_divthick
printf "  ${D}%-20s${N}  ${W}%-38s${N}\n" "SYSTEM"    "MacOS Disk Space Visualizer"
printf "  ${D}%-20s${N}  ${W}%-38s${N}\n" "DEV"       "Avdesh Jadon"
printf "  ${D}%-20s${N}  ${W}%-38s${N}\n" "ENDPOINT"  "$URL"
printf "  ${D}%-20s${N}  ${W}%-38s${N}\n" "BOOT TIME" "$(date '+%Y-%m-%d %H:%M:%S')"
log_divthick


# ─── 1. System Check ─────────────────────────────────────────
log_step "System Prerequisites"
log_div

python3 --version &>/dev/null || log_fail "Python3 not found — install via brew or python.org"
PY_VER=$(python3 --version 2>&1 | cut -d' ' -f2)
log_ok   "Python detected"
log_data "python.version" "$PY_VER"

node --version &>/dev/null || log_fail "Node.js not found — install via brew or nodejs.org"
NODE_VER=$(node --version 2>&1)
log_ok   "Node.js detected"
log_data "node.version" "$NODE_VER"

NPX_VER=$(npx --version 2>&1)
log_ok   "npx detected"
log_data "npx.version" "$NPX_VER"


# ─── 2. Dependencies ─────────────────────────────────────────
log_step "Dependency Resolution"
log_div

log_info "Checking Python packages..."
pip3 install -q flask 2>/dev/null || pip install -q flask 2>/dev/null || true
FLASK_VER=$(python3 -c "import flask; print(flask.__version__)" 2>/dev/null || echo "unknown")
log_ok   "Flask ready"
log_data "flask.version" "$FLASK_VER"

if [ ! -d "$STATIC_DIR/node_modules" ]; then
    log_info "node_modules not found — running npm install"
    progress "npm install" 10
    (cd "$STATIC_DIR" && npm install --silent 2>&1 >/dev/null)
    progress "npm install" 100
    log_ok   "Node modules installed"
    log_data "modules.path" "$STATIC_DIR/node_modules"
else
    log_ok   "Node modules cache hit"
    log_data "modules.path" "$STATIC_DIR/node_modules"
    NODE_COUNT=$(ls "$STATIC_DIR/node_modules" 2>/dev/null | wc -l | tr -d ' ')
    log_data "modules.count" "$NODE_COUNT packages"
fi


# ─── 3. Build ────────────────────────────────────────────────
log_step "Interface Compilation  [Vite]"
log_div

log_info "Starting Vite production build..."
progress "vite build" 25
sleep 0.1

BUILD_OUTPUT=$(cd "$STATIC_DIR" && npx vite build 2>&1)
BUILD_EXIT=$?

progress "vite build" 100

if [ $BUILD_EXIT -ne 0 ]; then
    log_fail "Vite build failed — check frontend/src for errors"
fi

BUILD_TIME=$(echo "$BUILD_OUTPUT"  | grep -oE 'built in [0-9]+(\.[0-9]+)?(ms|s)'  | head -1 || echo "—")
BUILD_SIZE=$(echo "$BUILD_OUTPUT"  | grep -oE '[0-9]+\.[0-9]+ kB'                 | head -1 || echo "—")
CHUNK_COUNT=$(echo "$BUILD_OUTPUT" | grep -c 'dist/' 2>/dev/null                  || echo "—")

log_ok   "Build succeeded"
log_data "build.time"   "$BUILD_TIME"
log_data "build.size"   "$BUILD_SIZE"
log_data "build.chunks" "$CHUNK_COUNT files emitted"
log_data "build.output" "$STATIC_DIR/dist"


# ─── 4. Network ──────────────────────────────────────────────
log_step "Network Initialization"
log_div

log_info "Releasing port 5005..."
KILLED_PIDS=$(lsof -ti:5005 2>/dev/null || true)
if [ -n "$KILLED_PIDS" ]; then
    echo "$KILLED_PIDS" | xargs kill -9 2>/dev/null || true
    log_warn "Evicted stale process(es): ${Y}$KILLED_PIDS${N}"
else
    log_ok "Port 5005 is free"
fi


# ─── 5. Server Launch ────────────────────────────────────────
log_step "Flask Server Boot"
log_div

LOG_FILE="$SCRIPT_DIR/backend/server.log"
rm -f "$LOG_FILE"

log_info "Spawning Python WSGI process..."
log_data "server.log" "$LOG_FILE"

python3 "$SCRIPT_DIR/backend/app.py" >> "$LOG_FILE" 2>&1 &
FLASK_PID=$!

log_sub "Polling health endpoint (max 10s)..."

ATTEMPTS=0
SERVER_UP=false
while [ $ATTEMPTS -lt 10 ]; do
    if curl -s "http://127.0.0.1:5005/health" > /dev/null 2>&1; then
        SERVER_UP=true
        break
    fi
    ATTEMPTS=$(( ATTEMPTS + 1 ))
    printf "\r${D}$(ts)${N}  ${C}WAIT ${N}  ${D}attempt %d/10 — retrying in 1s...${N}" "$ATTEMPTS"
    sleep 1
done
printf "\r\033[2K"

if [ "$SERVER_UP" = false ]; then
    log_warn "Health check timed out after 10 attempts"
    log_fail "Server failed to respond — see $LOG_FILE"
fi

if ! kill -0 "$FLASK_PID" 2>/dev/null; then
    log_fail "Flask process exited unexpectedly — see $LOG_FILE"
fi

log_ok   "Flask server is alive"
log_data "server.pid"    "$FLASK_PID"
log_data "server.host"   "127.0.0.1"
log_data "server.port"   "5005"
log_data "server.url"    "$URL"
log_data "server.health" "$URL/health  →  200 OK"


# ─── 6. Browser Launch ───────────────────────────────────────
log_step "Display Layer"
log_div

CHROME_APP="/Applications/Google Chrome.app"
CHROMIUM_APP="/Applications/Chromium.app"
BRAVE_APP="/Applications/Brave Browser.app"
USER_DATA_DIR="/tmp/jmac-visualizer-profile"
FLAGS="--app=$URL --user-data-dir=$USER_DATA_DIR --no-first-run --no-default-browser-check --window-size=1280,820 --disable-background-mode"

mkdir -p "$USER_DATA_DIR"
log_sub  "Isolated browser profile: $USER_DATA_DIR"

BROWSER=""
if   [ -d "$CHROME_APP" ];   then BROWSER="Google Chrome"
elif [ -d "$CHROMIUM_APP" ]; then BROWSER="Chromium"
elif [ -d "$BRAVE_APP" ];    then BROWSER="Brave"
else                               BROWSER="System Default"
fi

if [ "$BROWSER" = "System Default" ]; then
    log_warn "Chromium-based browser not found — falling back to system default"
else
    log_ok "Browser resolved"
fi

log_data "browser.engine"  "$BROWSER"
log_data "browser.mode"    "--app (standalone window)"
log_data "browser.size"    "1280×820"
log_data "browser.profile" "$USER_DATA_DIR"

echo ""
log_divthick
echo -e "  ${G}${BOLD}▶  VISUALIZER ONLINE${N}   ${D}─${N}   ${W}$URL${N}"
log_divthick
echo -e "  ${D}Close the app window or press Ctrl+C to stop the server.${N}"
log_divthick
echo ""

# ─── Open Browser ────────────────────────────────────────────
CHROME_BIN="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CHROMIUM_BIN="/Applications/Chromium.app/Contents/MacOS/Chromium"
BRAVE_BIN="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"

BROWSER_EXE=""
if   [ -f "$CHROME_BIN" ];   then BROWSER_EXE="$CHROME_BIN"
elif [ -f "$CHROMIUM_BIN" ]; then BROWSER_EXE="$CHROMIUM_BIN"
elif [ -f "$BRAVE_BIN" ];    then BROWSER_EXE="$BRAVE_BIN"
fi

if [ -z "$BROWSER_EXE" ]; then
    log_warn "Chromium-based browser not found — falling back to 'open' utility"
    log_data "browser.engine" "System Default"
    open "$URL" 2>/dev/null || true
    log_info "Blocking on Flask server process..."
    wait "$FLASK_PID"
else
    log_ok "Browser resolved"
    log_data "browser.path"    "$BROWSER_EXE"
    log_data "browser.mode"    "--app (standalone window)"
    log_data "browser.size"    "1280×820"

    echo ""
    log_divthick
    echo -e "  ${G}${BOLD}▶  VISUALIZER ONLINE${N}   ${D}─${N}   ${W}$URL${N}"
    log_divthick
    echo -e "  ${D}Close the app window to stop the server.${N}"
    log_divthick
    echo ""

    # Launch browser directly and wait for its completion
    "$BROWSER_EXE" $FLAGS >/dev/null 2>&1 &
    BROWSER_PID=$!
    wait $BROWSER_PID
    exit 0
fi
