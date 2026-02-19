"""
Flask route handlers for the Disk Visualizer API.
"""

import os
import shutil
from flask import jsonify, request, send_from_directory
from scanner import scan_directory
from disk_info import get_full_disk_info


def register_routes(app):
    """Register all routes on the Flask app."""

    @app.route("/")
    def index():
        return send_from_directory("static", "index.html")

    @app.route("/api/scan")
    def api_scan():
        """
        Scan a directory and return the tree as JSON.
        Query params:
            path  — directory to scan (default: user home)
            depth — recursion depth (default: 3, max: 8)
        """
        scan_path = request.args.get("path", os.path.expanduser("~"))
        depth = int(request.args.get("depth", 3))
        depth = min(depth, 8)

        if not os.path.isdir(scan_path):
            return jsonify({"error": f"Not a directory: {scan_path}"}), 400

        tree = scan_directory(scan_path, depth=depth)
        return jsonify(tree)

    @app.route("/api/roots")
    def api_roots():
        """Return available root scan targets for macOS."""
        home = os.path.expanduser("~")
        roots = [
            {"name": "Home (~)", "path": home},
            {"name": "Root (/)", "path": "/"},
            {"name": "Applications", "path": "/Applications"},
            {"name": "Users", "path": "/Users"},
            {"name": "Library", "path": "/Library"},
            {"name": "usr", "path": "/usr"},
            {"name": "private", "path": "/private"},
        ]
        for sub in [
            "Documents", "Downloads", "Desktop", "Library",
            "Movies", "Music", "Pictures",
        ]:
            sub_path = os.path.join(home, sub)
            if os.path.isdir(sub_path):
                roots.append({"name": f"~/{sub}", "path": sub_path})
        return jsonify(roots)

    @app.route("/api/disk-info")
    def api_disk_info():
        """Return total/used/free disk space and category breakdown."""
        info = get_full_disk_info()
        return jsonify(info)

    @app.route("/api/delete", methods=["POST"])
    def api_delete():
        """
        Delete a file or folder.
        Expects JSON: {"path": "/absolute/path"}
        Tries to move to Trash first, falls back to permanent delete.
        """
        data = request.get_json()
        if not data or "path" not in data:
            return jsonify({"error": "Missing 'path' in request body"}), 400

        target_path = data["path"]

        # Safety: prevent deleting critical system paths
        protected = {"/", "/System", "/Library", "/Users", "/usr", "/bin",
                      "/sbin", "/var", "/etc", "/tmp", "/private",
                      "/Applications", "/Volumes"}
        if target_path in protected:
            return jsonify({"error": "Cannot delete protected system path"}), 403

        home = os.path.expanduser("~")
        protected_home = {
            home,
            os.path.join(home, "Desktop"),
            os.path.join(home, "Documents"),
            os.path.join(home, "Downloads"),
            os.path.join(home, "Library"),
            os.path.join(home, "Pictures"),
            os.path.join(home, "Movies"),
            os.path.join(home, "Music"),
        }
        if target_path in protected_home:
            return jsonify({"error": "Cannot delete protected home folder"}), 403

        if not os.path.exists(target_path):
            return jsonify({"error": "Path does not exist"}), 404

        try:
            # Try send2trash first (moves to macOS Trash)
            try:
                from send2trash import send2trash
                send2trash(target_path)
                return jsonify({
                    "success": True,
                    "method": "trash",
                    "message": f"Moved to Trash: {os.path.basename(target_path)}",
                })
            except ImportError:
                # send2trash not installed — permanent delete
                if os.path.isdir(target_path):
                    shutil.rmtree(target_path)
                else:
                    os.remove(target_path)
                return jsonify({
                    "success": True,
                    "method": "permanent",
                    "message": f"Permanently deleted: {os.path.basename(target_path)}",
                })
        except PermissionError:
            return jsonify({"error": f"Permission denied: {target_path}"}), 403
        except OSError as e:
            return jsonify({"error": str(e)}), 500
