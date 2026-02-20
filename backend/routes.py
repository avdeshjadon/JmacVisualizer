# ═══════════════════════════════════════════════════════════
#  Built with ♥ by Avdesh Jadon
#  GitHub: https://github.com/avdeshjadon
#
#  This software is free to use. If you find it helpful:
#  ⭐ Star the repository | 🍴 Fork the project | 🤝 Contribute
# ═══════════════════════════════════════════════════════════
"""
Flask route handlers for the Jmac Visualizer API.
Includes terminal logging for all API requests.
"""

import os
import sys
import shutil
import time
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

    @app.route("/api/delete", methods=["POST"])
    def api_delete():
        """Delete a file or directory."""
        data = request.get_json()
        if not data or "path" not in data:
            return jsonify({"error": "No path specified"}), 400

        target = data["path"]
        log_api("DEL", "/api/delete", f"{RED}{target}{NC}")

        # Safety checks
        home = os.path.expanduser("~")
        critical = {"/", "/Users", home, "/System", "/Library", "/Applications",
                    "/usr", "/bin", "/sbin", "/etc", "/var", "/tmp", "/private"}
        if os.path.abspath(target) in critical:
            log_api("  ✖", "/api/delete", f"{RED}BLOCKED — critical path{NC}")
            return jsonify({"error": "Cannot delete critical system path"}), 403

        if not os.path.exists(target):
            return jsonify({"error": "Path does not exist"}), 404

        try:
            if os.path.isdir(target):
                shutil.rmtree(target)
            else:
                os.remove(target)

            log_api("  ✔", "/api/delete", f"{GREEN}Deleted successfully{NC}")
            return jsonify({"success": True, "message": f"Deleted: {os.path.basename(target)}"})
        except PermissionError:
            log_api("  ✖", "/api/delete", f"{RED}Permission denied{NC}")
            return jsonify({"error": "Permission denied"}), 403
        except Exception as e:
            log_api("  ✖", "/api/delete", f"{RED}{str(e)}{NC}")
            return jsonify({"error": str(e)}), 500
