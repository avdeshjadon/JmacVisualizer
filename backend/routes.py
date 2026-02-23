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
import subprocess
from flask import jsonify, request, send_from_directory
from scanner import scan_directory, format_size, log_scan, fast_dir_size
from disk_info import get_full_disk_info

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
    """Remove *target* (file or directory) as robustly as possible on macOS.

    Strategy
    --------
    1.  Try macOS native ``/bin/rm -rf`` via subprocess.  The BSD rm binary
        handles SIP-locked xattrs and immutable flags better than Python's
        shutil.rmtree.  If rm exits 0 the item is completely gone.

    2.  If the target still exists after rm (meaning rm was entirely blocked
        by SIP / kernel protection), report 0 deleted and return immediately
        so the caller can surface a clear 403.

    3.  If the target *partially* exists (rm deleted some children but not
        all), fall back to a depth-first walk that attempts each leaf
        individually and records what it could or could not remove.

    Returns
    -------
    (deleted_count, skipped_paths) where:
        deleted_count   -- number of items (files + dirs) successfully removed.
        skipped_paths   -- list[str] of paths that could not be removed.
    """
    target = os.path.abspath(target)
    deleted_count = 0
    skipped_paths = []

    # ── Tier 1: native rm -rf ────────────────────────────────────────────────
    result = subprocess.run(
        ["/bin/rm", "-rf", target],
        capture_output=True,
        text=True
    )

    # ── Tier 2: check if target is fully gone ────────────────────────────────
    if not os.path.exists(target):
        # rm succeeded completely
        deleted_count = 1
        return deleted_count, skipped_paths

    if result.returncode != 0 and not os.path.isdir(target):
        # Single file / not a dir — rm failed entirely
        skipped_paths.append(target)
        return 0, skipped_paths

    # ── Tier 3: partial deletion — walk and clean up what's left ─────────────
    # rm already removed what it could; now handle the leftovers one-by-one.
    for dirpath, dirnames, filenames in os.walk(target, topdown=False):
        for fname in filenames:
            fpath = os.path.join(dirpath, fname)
            try:
                os.remove(fpath)
                deleted_count += 1
            except OSError:
                skipped_paths.append(fpath)

        for dname in list(dirnames):
            dpath = os.path.join(dirpath, dname)
            if os.path.exists(dpath):
                # Attempt rmdir (works if directory is now empty)
                try:
                    os.rmdir(dpath)
                    deleted_count += 1
                except OSError:
                    skipped_paths.append(dpath)

    # Try to remove the root dir now (it may be empty after the walk)
    if os.path.exists(target):
        try:
            os.rmdir(target)
            deleted_count += 1
        except OSError:
            skipped_paths.append(target)

    return deleted_count, skipped_paths


def register_routes(app):
    """Register all routes on the Flask app."""

    @app.route("/")
    def index():
        log_api("GET", "/", "Serving app")
        return send_from_directory(app.static_folder, "index.html")

    @app.route("/health")
    def health():
        return jsonify({"status": "OK", "port": 5005})

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
            if permanent:
                deleted_count, skipped_paths = _rm_robust(abs_target)

                if deleted_count == 0 and skipped_paths:
                    # Nothing could be deleted at all
                    msg = f"Operation not permitted — all items are SIP-protected"
                    log_api("  ✖", "/api/delete", f"{RED}{msg}{NC}")
                    return jsonify({"error": msg}), 403

                if skipped_paths:
                    msg = f"Partially deleted ({len(skipped_paths)} protected item(s) skipped)"
                    log_api("  ✔", "/api/delete", f"{GREEN}{msg}: {os.path.basename(target)}{NC}")
                    return jsonify({"success": True, "message": msg, "skipped": [str(p) for p in skipped_paths]})

                log_api("  ✔", "/api/delete", f"{GREEN}Permanently deleted: {os.path.basename(target)}{NC}")
                return jsonify({"success": True, "message": f"Permanently deleted: {os.path.basename(target)}"})
            else:
                # Native macOS Move to Trash via AppleScript
                script = f'tell application "Finder" to move (POSIX file "{abs_target}") to trash'
                subprocess.run(["osascript", "-e", script], check=True)
                log_api("  ✔", "/api/delete", f"{GREEN}Moved to Trash: {os.path.basename(target)}{NC}")
                return jsonify({"success": True, "message": f"Moved to Trash: {os.path.basename(target)}"})
        except subprocess.CalledProcessError:
            log_api("  ✖", "/api/delete", f"{RED}AppleScript failed (check permissions){NC}")
            return jsonify({"error": "macOS blocked the trash operation. Check permissions."}), 403
        except Exception as e:
            log_api("  ✖", "/api/delete", f"{RED}{str(e)}{NC}")
            return jsonify({"error": str(e)}), 500

