# ----------------------------------------------------------------------------
# Jmac Visualizer -- macOS Disk Usage Analyzer and Storage Manager
# ----------------------------------------------------------------------------
# Author   : Avdesh Jadon
# GitHub   : https://github.com/avdeshjadon
# License  : MIT License -- free to use, modify, and distribute.
#            See LICENSE file in the project root for full license text.
# ----------------------------------------------------------------------------
# If this project helped you, consider starring the repository, opening a
# pull request, or reporting issues on GitHub. Contributions are welcome.
# ----------------------------------------------------------------------------
"""
routes.py -- REST API Route Handlers
======================================
Defines and registers all HTTP endpoints for the Jmac Visualizer backend
on a given Flask application instance. Every incoming request is logged to
stderr with colour-coded output so the developer can monitor activity in the
terminal without needing a separate log file.

All routes are registered inside register_routes(app) to keep the app
factory pattern clean and testable.

Endpoints
---------
GET  /
    Serve the compiled frontend single-page application (index.html).
    Static assets (JS, CSS) are served automatically by Flask from the
    configured static_folder.

GET  /health
    Lightweight liveness probe. Returns {"status": "OK", "port": 5005}.

GET  /api/scan
    Recursively scan a directory tree and return a JSON node tree with
    name, path, size (bytes), type, and children for each entry.
    Query params: path (default /Users), depth (default 4, max 10).

GET  /api/roots
    Return a list of common filesystem roots and user directories that
    are used to populate the root-selector dropdown in the UI.

GET  /api/disk-info
    Return total, used, and free disk space for the root volume along
    with a categorized breakdown (Apps, Documents, System Data, etc.).

GET  /api/clean-targets
    Calculate sizes of well-known cleanup targets: User Caches, User
    Logs, Trash, and Downloads folder.

GET  /api/check-permissions
    Probe whether the process has Full Disk Access by attempting to list
    ~/Library/Messages. Returns {"fullDiskAccess": true|false}.

POST /api/request-permissions
    Open the macOS System Settings Privacy pane so the user can grant
    Full Disk Access. Uses 'open' with an x-apple.systempreferences URL.

POST /api/delete
    Delete a file or directory. Supports two modes:
      permanent=true  -- shutil.rmtree / os.remove (irreversible)
      permanent=false -- AppleScript Finder trash (recoverable)
    Critical system paths are blocked with a 403 response.
"""

import os
import sys
import shutil
import time
import json
import subprocess
from flask import jsonify, request, send_from_directory, Response, stream_with_context
from flask import jsonify, request, send_from_directory, Response, stream_with_context
from scanner import scan_directory, format_size, log_scan, fast_dir_size, invalidate_cache
from disk_info import get_full_disk_info
try:
    from watcher import SSE_QUEUE
except ImportError:
    import queue
    SSE_QUEUE = queue.Queue()  # fallback if watchdog not installed

# ─── Terminal Colors ─────────────────────────────────────────
CYAN = "\033[0;36m"
DIM = "\033[0;90m"
GREEN = "\033[0;32m"
YELLOW = "\033[1;33m"
RED = "\033[0;31m"
PURPLE = "\033[0;35m"
WHITE = "\033[1;37m"
NC = "\033[0m"


def log_api(method, endpoint, detail=""):
    """Log API requests to terminal."""
    ts = time.strftime("%H:%M:%S")
    extra = f" {DIM}─{NC} {detail}" if detail else ""
    sys.stderr.write(f"  {DIM}{ts}{NC}  {PURPLE}{method:4s}{NC}  {WHITE}{endpoint}{NC}{extra}\n")
    sys.stderr.flush()


def _rm_robust(target: str):
    """Remove *target* as robustly as possible on macOS.

    Strategy
    --------
    1.  /bin/rm -rf  (BSD rm — handles xattrs / immutable flags better than Python)
        - exit 0  → fully deleted → success
        - exit 1  → partially blocked (SIP protected some children) → partial success
                    rm DID delete everything it could; what remains is SIP-locked

    2.  Single-file fallback — if target is not a dir and rm failed, report blocked.

    3.  After partial rm: collect what's still there (the SIP survivors) as skipped_paths.
        Also try Python rmdir on any now-empty parent dirs rm left behind.

    Returns
    -------
    (deleted_count, skipped_paths)
        deleted_count > 0  → at least some content was removed
        deleted_count == 0 → nothing could be removed at all (fully SIP-blocked)
        skipped_paths      → list of paths rm / Python could not remove
    """
    target = os.path.abspath(target)
    skipped_paths = []

    # ── Tier 1: native /bin/rm -rf ───────────────────────────────────────────
    result = subprocess.run(
        ["/bin/rm", "-rf", target],
        capture_output=True, text=True
    )

    # ── Fully gone → complete success ────────────────────────────────────────
    if not os.path.exists(target):
        return 1, []

    # ── Single file that rm couldn't touch → fully blocked ───────────────────
    if not os.path.isdir(target):
        return 0, [target]

    # ── Directory still exists after rm ──────────────────────────────────────
    # rm already deleted everything it could (exit 1 = partial SIP block).
    # Collect what's left (the protected survivors) as skipped.
    # Also try Python rmdir() on any directories rm left empty.
    deleted_count = 1
    for dirpath, dirnames, filenames in os.walk(target, topdown=False):
        for f in filenames:
            skipped_paths.append(os.path.join(dirpath, f))
        for d in dirnames:
            d_path = os.path.join(dirpath, d)
            try:
                os.rmdir(d_path)
            except OSError:
                skipped_paths.append(d_path)

    try:
        os.rmdir(target)
        skipped_paths = []
    except OSError:
        skipped_paths.append(target)

    return deleted_count, skipped_paths


def _trash_robust(target: str):
    """Move *target* to ~/.Trash robustly, handling SIP-protected partial blocks.

    Strategy
    --------
    1.  Try shutil.move() whole directory to Trash.
    2.  If OSError (e.g. Operation not permitted), iterate deep and move
        what we can file-by-file, recreating the folder structure in Trash.

    Returns
    -------
    (deleted_count, skipped_paths)
    """
    target = os.path.abspath(target)
    home = os.path.expanduser("~")
    trash_dir = os.path.join(home, ".Trash")
    skipped_paths = []

    def get_safe_dest(base_dest_path):
        """Returns a unique path in Truth without overwriting."""
        if not os.path.exists(base_dest_path):
            return base_dest_path
        folder = os.path.dirname(base_dest_path)
        basename = os.path.basename(base_dest_path)
        name_base, ext = os.path.splitext(basename)
        counter = 1
        new_dest = os.path.join(folder, f"{name_base} {counter}{ext}")
        while os.path.exists(new_dest):
            counter += 1
            new_dest = os.path.join(folder, f"{name_base} {counter}{ext}")
        return new_dest

    basename = os.path.basename(target)
    primary_dest = get_safe_dest(os.path.join(trash_dir, basename))

    try:
        shutil.move(target, primary_dest)
        return 1, []  # success entirely
    except Exception:
        # Move failed (likely SIP blocking part of it). Fallback to deep iteration.
        pass

    if not os.path.isdir(target):
        return 0, [target]

    moved_count = 0
    # Walk bottom-up to clean up empty dirs
    for dirpath, dirnames, filenames in os.walk(target, topdown=False):
        rel_dir = os.path.relpath(dirpath, target)
        if rel_dir == ".":
            dest_dir = primary_dest
        else:
            dest_dir = os.path.join(primary_dest, rel_dir)

        # Ensure destination directory structure exists in Trash
        os.makedirs(dest_dir, exist_ok=True)

        for fname in filenames:
            src_file = os.path.join(dirpath, fname)
            dest_file = get_safe_dest(os.path.join(dest_dir, fname))
            try:
                shutil.move(src_file, dest_file)
                moved_count += 1
            except Exception as e:
                skipped_paths.append((src_file, dest_file, str(e)))

        for dname in list(dirnames):
            src_d = os.path.join(dirpath, dname)
            if os.path.exists(src_d):
                try:
                    os.rmdir(src_d)
                except OSError:
                    # Directory not empty, means SIP protected files are inside
                    skipped_paths.append((src_d, "", "Dir not empty"))

    # Try root itself
    if os.path.exists(target):
        try:
            os.rmdir(target)
        except OSError:
            skipped_paths.append((target, "", "Root dir not empty"))

    return moved_count, skipped_paths






def _push_sse_deleted(path: str):
    """Push a 'deleted' SSE event into the queue for connected browser clients."""
    try:
        event = json.dumps({
            "type": "deleted",
            "path": path,
            "root": os.path.dirname(path),
        })
        SSE_QUEUE.put_nowait(f"data: {event}\n\n")
    except Exception:
        pass  # Non-fatal — SSE is best-effort


def register_routes(app):
    """Register all routes on the Flask app."""

    @app.route("/")
    def index():
        log_api("GET", "/", "Serving app")
        return send_from_directory(app.static_folder, "index.html")

    @app.route("/health")
    def health():
        return jsonify({"status": "OK", "port": 5005})

    @app.route("/api/events")
    def api_events():
        """Server-Sent Events endpoint — streams filesystem change events.

        Clients (browser EventSource) connect once and receive a continuous
        stream of newline-delimited JSON objects:

            data: {"type": "connected", "message": "Live updates active"}\n\n
            data: {"type": "deleted",   "path": "...", "root": "..."}\n\n

        The browser reconnects automatically if the connection drops.
        """
        log_api("GET", "/api/events", "SSE client connected")

        def event_stream():
            # Send a heartbeat immediately so the browser knows the connection is alive
            yield f"data: {json.dumps({'type': 'connected', 'message': 'Live updates active'})}\n\n"
            while True:
                try:
                    # Block up to 20 s waiting for an event, then send a keepalive
                    msg = SSE_QUEUE.get(timeout=20)
                    yield msg
                except Exception:
                    # Timeout — send a keepalive comment so nginx/proxies don't close idle connections
                    yield ": keepalive\n\n"

        return Response(
            stream_with_context(event_stream()),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",  # disable nginx buffering
                "Connection": "keep-alive",
            }
        )

    @app.route("/api/scan")
    def api_scan():
        """
        Scan a directory tree.
        Query params:
            path  — directory to scan (default: home)
            depth — recursion depth (default: 4, max: 10)
        """
        scan_path = request.args.get("path", "/Users")
        depth = int(request.args.get("depth", 4))
        depth = min(depth, 10)

        if not os.path.isdir(scan_path):
            return jsonify({"error": f"Not a directory: {scan_path}"}), 400

        log_api("GET", "/api/scan", f"path={scan_path}  depth={depth}")
        sys.stderr.write(f"  {DIM}├──────────────────────────────────────────{NC}\n")
        sys.stderr.flush()

        start = time.time()
        data = scan_directory(scan_path, depth=depth)
        elapsed = time.time() - start

        sys.stderr.write(f"  {DIM}├──────────────────────────────────────────{NC}\n")
        log_api("  OK", "/api/scan", f"{GREEN}{format_size(data['size'])} in {elapsed:.1f}s{NC}")
        sys.stderr.write(f"  {DIM}│{NC}\n")
        sys.stderr.flush()

        return jsonify(data)

    @app.route("/api/roots")
    def api_roots():
        """Return list of root mount points."""
        log_api("GET", "/api/roots", "Loading mount points")
        home = os.path.expanduser("~")
        roots = [
            {"name": "Home", "path": home},
            {"name": "/", "path": "/"},
        ]
        # Add common directories
        for name in ["Desktop", "Documents", "Downloads", "Movies", "Music", "Pictures", "Library"]:
            p = os.path.join(home, name)
            if os.path.isdir(p):
                roots.append({"name": name, "path": p})
        return jsonify(roots)

    @app.route("/api/disk-info")
    def api_disk_info():
        """Return disk usage info."""
        log_api("GET", "/api/disk-info", "Analyzing disk usage")
        info = get_full_disk_info()
        log_api("  OK", "/api/disk-info", f"{GREEN}Total: {format_size(info.get('total', 0))}{NC}")
        return jsonify(info)

    @app.route("/api/clean-targets")
    def api_clean_targets():
        """Get sizes of common cleanup targets."""
        log_api("GET", "/api/clean-targets", "Calculating cleanup sizes")
        home = os.path.expanduser("~")
        
        targets = [
            {"id": "user_caches", "name": "User Caches", "path": os.path.join(home, "Library/Caches"), "icon": "⚡"},
            {"id": "user_logs", "name": "User Logs", "path": os.path.join(home, "Library/Logs"), "icon": "📄"},
            {"id": "trash", "name": "Trash", "path": os.path.join(home, ".Trash"), "icon": "🗑️"},
            {"id": "downloads", "name": "Downloads", "path": os.path.join(home, "Downloads"), "icon": "📥"},
        ]
        
        results = []
        for t in targets:
            if os.path.exists(t["path"]):
                size = fast_dir_size(t["path"])
                results.append({**t, "size": size, "exists": True})
            else:
                results.append({**t, "size": 0, "exists": False})
                
        return jsonify(results)

    @app.route("/api/check-permissions")
    def api_check_permissions():
        """Test for Full Disk Access by attempting to list a protected directory."""
        log_api("GET", "/api/check-permissions", "Testing Full Disk Access")
        test_dir = os.path.expanduser("~/Library/Messages")
        
        try:
            # We attempt to list the contents directly. If SIP blocks it, it throws PermissionError.
            os.listdir(test_dir)
            log_api("  OK", "/api/check-permissions", f"{GREEN}Access Granted{NC}")
            return jsonify({"fullDiskAccess": True})
        except PermissionError:
            log_api("  ✖", "/api/check-permissions", f"{RED}Access Denied{NC}")
            return jsonify({"fullDiskAccess": False})
        except Exception:
            # If the folder truly doesn't exist for some rare reason, we assume granted.
            log_api("  OK", "/api/check-permissions", f"{GREEN}Folder Missing (Allowed){NC}")
            return jsonify({"fullDiskAccess": True})

    @app.route("/api/request-permissions", methods=["POST"])
    def api_request_permissions():
        """Open System Settings > Privacy > Full Disk Access on macOS."""
        log_api("POST", "/api/request-permissions", "Opening System Settings")
        try:
            subprocess.run(["open", "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"], check=True)
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/delete", methods=["POST"])
    def api_delete():
        """Delete a file or directory."""
        data = request.get_json()
        if not data or "path" not in data:
            return jsonify({"error": "No path specified"}), 400

        target = data["path"]
        permanent = data.get("permanent", False)
        log_api("DEL", "/api/delete", f"{RED}{target}{NC} (permanent={permanent})")

        # Safety checks
        home = os.path.expanduser("~")
        critical = {"/", "/Users", home, "/System", "/Library", "/Applications",
                    "/usr", "/bin", "/sbin", "/etc", "/var", "/tmp", "/private"}
        if os.path.abspath(target) in critical:
            log_api("  ✖", "/api/delete", f"{RED}BLOCKED — critical path{NC}")
            return jsonify({"error": "Cannot delete critical system path"}), 403

        try:
            abs_target = os.path.abspath(target)
            basename   = os.path.basename(abs_target)

            if permanent:
                deleted_count, skipped_paths = _rm_robust(abs_target)

                if deleted_count == 0 and skipped_paths:
                    msg = "Operation not permitted — all items are SIP-protected"
                    log_api("  ✔", "/api/delete", f"{YELLOW}{msg}{NC}")
                    invalidate_cache(abs_target)
                    invalidate_cache(os.path.dirname(abs_target))
                    _push_sse_deleted(abs_target)
                    return jsonify({"success": True, "message": msg, "skipped": [str(p) for p in skipped_paths]})

                if skipped_paths:
                    msg = f"Partially deleted ({len(skipped_paths)} protected item(s) skipped)"
                    log_api("  ✔", "/api/delete", f"{GREEN}{msg}: {basename}{NC}")
                    invalidate_cache(abs_target)
                    invalidate_cache(os.path.dirname(abs_target))
                    _push_sse_deleted(abs_target)
                    return jsonify({"success": True, "message": msg, "skipped": [str(p) for p in skipped_paths]})

                log_api("  ✔", "/api/delete", f"{GREEN}Permanently deleted: {basename}{NC}")
                invalidate_cache(abs_target)
                invalidate_cache(os.path.dirname(abs_target))
                _push_sse_deleted(abs_target)
                return jsonify({"success": True, "message": f"Permanently deleted: {basename}"})

            else:
                # ── Move to Trash (Python-native robust fallback) ──────────────
                deleted_count, skipped_paths = _trash_robust(abs_target)

                if deleted_count == 0 and skipped_paths:
                    msg = "Operation not permitted — all items are SIP-protected"
                    log_api("  ✔", "/api/delete", f"{YELLOW}{msg}{NC}")
                    sys.stderr.write(f"  {DIM}└─ {skipped_paths[0]}{NC}\n")
                    invalidate_cache(abs_target)
                    invalidate_cache(os.path.dirname(abs_target))
                    _push_sse_deleted(abs_target)
                    return jsonify({"success": True, "message": msg, "skipped": [str(p) for p in skipped_paths]})

                if skipped_paths:
                    msg = f"Partially trashed ({len(skipped_paths)} protected item(s) skipped)"
                    log_api("  ✔", "/api/delete", f"{GREEN}{msg}: {basename}{NC}")
                    invalidate_cache(abs_target)
                    invalidate_cache(os.path.dirname(abs_target))
                    _push_sse_deleted(abs_target)
                    return jsonify({"success": True, "message": msg, "skipped": [str(p) for p in skipped_paths]})

                log_api("  ✔", "/api/delete", f"{GREEN}Moved to Trash: {basename}{NC}")
                invalidate_cache(abs_target)
                invalidate_cache(os.path.dirname(abs_target))
                _push_sse_deleted(abs_target)
                return jsonify({"success": True, "message": f"Moved to Trash: {basename}"})

        except Exception as e:
            log_api("  ✖", "/api/delete", f"{RED}{str(e)}{NC}")
            return jsonify({"error": str(e)}), 500

