# ═══════════════════════════════════════════════════════════
#  Built with ♥ by Avdesh Jadon
#  GitHub: https://github.com/avdeshjadon
#
#  This software is free to use. If you find it helpful:
#  ⭐ Star the repository | 🍴 Fork the project | 🤝 Contribute
# ═══════════════════════════════════════════════════════════
"""
Filesystem scanner — fast recursive scanning with du fallback only for permission-denied dirs.
"""

import os
import sys
import subprocess
from config import SKIP_NAMES


# ─── Terminal Colors ────────────────────────────────────────────
CYAN = "\033[0;36m"
DIM = "\033[0;90m"
GREEN = "\033[0;32m"
YELLOW = "\033[1;33m"
NC = "\033[0m"


def log_scan(msg):
    sys.stderr.write(f"  {DIM}│{NC}  {msg}\n")
    sys.stderr.flush()


def format_size(b):
    """Format bytes using SI units (1000-based) to match macOS Finder."""
    if b >= 1000**3:
        return f"{b/1000**3:.2f} GB"
    elif b >= 1000**2:
        return f"{b/1000**2:.1f} MB"
    elif b >= 1000:
        return f"{b/1000:.1f} KB"
    return f"{b} B"


def du_size(path):
    """Use du -sk as fallback for permission-denied dirs. Ignores exit code."""
    try:
        r = subprocess.run(['du', '-sk', path], capture_output=True, text=True, timeout=60)
        if r.stdout.strip():
            return int(r.stdout.split()[0]) * 1024
    except Exception:
        pass
    return 0


def fast_dir_size(path):
    """Fast recursive size using pure Python. Falls back to du on PermissionError."""
    total = 0
    try:
        with os.scandir(path) as it:
            for entry in it:
                try:
                    if entry.is_file(follow_symlinks=False):
                        total += entry.stat(follow_symlinks=False).st_size
                    elif entry.is_dir(follow_symlinks=False) and not entry.is_symlink():
                        total += fast_dir_size(entry.path)
                except (PermissionError, OSError):
                    # Single child failed — try du on it
                    if entry.is_dir(follow_symlinks=False):
                        total += du_size(entry.path)
    except (PermissionError, OSError):
        # Entire dir unreadable — du fallback
        total = du_size(path)
    return total


def scan_directory(path, depth=3, max_children=500, _level=0):
    """Fast recursive directory scan. Uses du only for permission-denied dirs."""
    path = os.path.abspath(path)
    name = os.path.basename(path) or path

    result = {"name": name, "path": path, "size": 0, "type": "directory", "children": []}

    if _level == 0:
        log_scan(f"{CYAN}Scanning:{NC} {path}")

    # Try listing contents
    try:
        entries = list(os.scandir(path))
    except (PermissionError, OSError):
        size = du_size(path)
        result["size"] = size
        return result

    files = []
    dir_entries = []

    for entry in entries:
        try:
            if entry.name in SKIP_NAMES:
                continue
            if entry.is_symlink():
                try:
                    if os.path.isfile(entry.path):
                        s = os.stat(entry.path).st_size
                        ext = os.path.splitext(entry.name)[1].lower()
                        files.append({"name": entry.name, "path": entry.path, "size": s,
                                      "type": "file", "extension": ext or ".none"})
                except (OSError, PermissionError):
                    pass
                continue
            if entry.is_file(follow_symlinks=False):
                s = entry.stat(follow_symlinks=False).st_size
                ext = os.path.splitext(entry.name)[1].lower()
                files.append({"name": entry.name, "path": entry.path, "size": s,
                              "type": "file", "extension": ext or ".none"})
            elif entry.is_dir(follow_symlinks=False):
                dir_entries.append(entry)
        except (PermissionError, OSError):
            continue

    files.sort(key=lambda f: f["size"], reverse=True)

    # Process subdirectories
    dir_results = []
    denied_count = 0

    for entry in dir_entries:
        try:
            if depth > 0:
                child = scan_directory(entry.path, depth - 1, max_children, _level + 1)
            else:
                # At depth limit — get size fast with Python, du fallback
                child_size = fast_dir_size(entry.path)
                child = {"name": entry.name, "path": entry.path, "size": child_size,
                         "type": "directory", "children": [], "has_children": True}
            dir_results.append(child)
        except (PermissionError, OSError):
            child_size = du_size(entry.path)
            dir_results.append({"name": entry.name, "path": entry.path, "size": child_size,
                                "type": "directory", "children": [], "has_children": True})
            denied_count += 1

        if _level == 0:
            c = dir_results[-1]
            log_scan(f"  📁 {c['name']:30s} {GREEN}{format_size(c['size']):>10s}{NC}")

    dir_results.sort(key=lambda d: d["size"], reverse=True)

    # Combine children
    all_children = dir_results + files

    # Get true total via du for the scanned path (at top level only, for gap detection)
    scanned_total = sum(c["size"] for c in all_children)

    if _level <= 1:
        true_size = du_size(path)
        gap = true_size - scanned_total
        if gap > 102400:  # > 100 KB gap
            all_children.append({
                "name": f"🔒 Protected data ({denied_count} restricted)",
                "path": path, "size": gap, "type": "protected",
            })
            if _level == 0:
                log_scan(f"  🔒 {'Protected data':30s} {YELLOW}{format_size(gap):>10s}{NC}")
            scanned_total = true_size

    # Limit children
    if len(all_children) > max_children:
        kept = all_children[:max_children]
        extra = sum(c["size"] for c in all_children[max_children:])
        kept.append({"name": f"... {len(all_children) - max_children} more", "path": "", "size": extra, "type": "other"})
        all_children = kept

    result["children"] = all_children
    result["size"] = max(scanned_total, sum(c["size"] for c in all_children))
    result["has_children"] = len(all_children) > 0

    if _level == 0:
        log_scan(f"{GREEN}✔ Total: {format_size(result['size'])} ({len(all_children)} items){NC}")

    return result
