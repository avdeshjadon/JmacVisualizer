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
scanner.py -- High-Performance Parallel Filesystem Scanner
============================================================
Provides fast, accurate, recursive directory scanning optimised for macOS APFS.

Accuracy
--------
All sizes use `st_blocks * 512` (physical disk blocks), NOT `st_size`.
This matches what macOS Finder reports as "Size on Disk" and correctly
handles APFS transparent compression and cloned files.

Speed
-----
Top-level directory children are scanned in parallel using a
ThreadPoolExecutor. On a modern Mac with NVMe storage this typically
delivers 3-5x speed improvement over sequential scanning for large trees.
The pool size adapts to the number of CPU cores.

Fallback strategy (in priority order)
---------------------------------------
1. Pure Python os.scandir()  -- default path, zero subprocess overhead
2. BSD du -sk fallback       -- PermissionError mid-scan
3. Finder AppleScript        -- SIP-protected VIP folders (Messages, Mail…)

Caching
-------
scan_directory() maintains an in-process dict cache keyed on
"<path>_<depth>_<max_children>". Entries expire after CACHE_TTL seconds
(default: 120 s). Call invalidate_cache(path) to immediately evict entries
that start with the given path prefix (e.g. after a delete).

Public API
----------
scan_directory(path, depth=3, max_children=500)
    Entry point. Returns a JSON-serialisable dict tree.

invalidate_cache(path=None)
    Evict cache entries for path (or all entries if path is None).

fast_dir_size(path)
    Recursively compute physical bytes for a directory.

format_size(b)
    Convert bytes -> human-readable string (SI units, matches Finder).

log_scan(msg)
    Write a status line to stderr.
"""

import os
import sys
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from config import SKIP_NAMES


# ─── Terminal Colors ────────────────────────────────────────────
CYAN  = "\033[0;36m"
DIM   = "\033[0;90m"
GREEN = "\033[0;32m"
NC    = "\033[0m"

# SIP-protected folders that often return near-zero via scandir
VIP_FOLDERS = {"Messages", "Safari", "Mail", "Photos Library.photoslibrary"}

# Parallel worker pool — capped at 8 to avoid fd exhaustion
_POOL = ThreadPoolExecutor(max_workers=min(8, (os.cpu_count() or 4)))

# ─── Cache ──────────────────────────────────────────────────────
_SCAN_CACHE: dict = {}   # key -> (timestamp, data)
_CACHE_TTL  = 120        # seconds


def log_scan(msg: str) -> None:
    sys.stderr.write(f"  {DIM}│{NC}  {msg}\n")
    sys.stderr.flush()


def invalidate_cache(path: str | None = None) -> None:
    """Clear the entire cache to ensure all ancestor tree sizes recalculate perfectly."""
    _SCAN_CACHE.clear()


def format_size(b: int) -> str:
    """Format bytes using SI units (1000-based) to match macOS Finder."""
    if b >= 1_000_000_000:
        return f"{b / 1_000_000_000:.2f} GB"
    if b >= 1_000_000:
        return f"{b / 1_000_000:.1f} MB"
    if b >= 1_000:
        return f"{b / 1_000:.1f} KB"
    return f"{b} B"


# ─── Fallback helpers ───────────────────────────────────────────

def du_size(path: str) -> int:
    """BSD du -sk fallback: returns physical bytes (matches Finder on HFS+/APFS)."""
    try:
        r = subprocess.run(
            ["du", "-sk", path],
            capture_output=True, text=True, timeout=60
        )
        if r.stdout.strip():
            return int(r.stdout.split()[0]) * 1024
    except Exception:
        pass
    return 0


def get_finder_size(path: str) -> int:
    """Ask Finder via AppleScript for the size of a SIP-protected folder."""
    try:
        script = (
            f'tell application "Finder" to get size of '
            f'(POSIX file "{os.path.abspath(path)}")'
        )
        r = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True, text=True, timeout=8
        )
        val = r.stdout.strip()
        if val and val != "missing value":
            return int(val)
    except Exception:
        pass
    return 0


def fast_dir_size(path: str) -> int:
    """Recursively compute physical bytes. Prefers scandir, falls back to du/Finder."""
    total = 0
    try:
        with os.scandir(path) as it:
            for entry in it:
                try:
                    st = entry.stat(follow_symlinks=False)
                    if entry.is_file(follow_symlinks=False):
                        total += st.st_blocks * 512
                    elif entry.is_dir(follow_symlinks=False) and not entry.is_symlink():
                        sub = fast_dir_size(entry.path)
                        if sub < 1024 and entry.name in VIP_FOLDERS:
                            sub = get_finder_size(entry.path)
                        total += sub
                except (PermissionError, OSError):
                    if entry.name in VIP_FOLDERS:
                        total += get_finder_size(entry.path)
                    elif entry.is_dir(follow_symlinks=False):
                        total += du_size(entry.path)
    except (PermissionError, OSError):
        name = os.path.basename(path)
        if name in VIP_FOLDERS:
            return get_finder_size(path)
        return du_size(path)
    return total


# ─── Core scan (parallel at top level) ─────────────────────────

def _scan_dir_entry(entry, depth: int, max_children: int, level: int) -> dict:
    """Scan a single DirEntry returned by os.scandir(). Called from _scan."""
    try:
        st = entry.stat(follow_symlinks=False)
    except (PermissionError, OSError):
        # Cannot even stat the entry — use du as size estimate
        if entry.is_dir(follow_symlinks=False):
            return {
                "name": entry.name, "path": entry.path,
                "size": du_size(entry.path),
                "type": "directory", "children": [], "has_children": True
            }
        return None

    if entry.name in SKIP_NAMES:
        return None

    physical = st.st_blocks * 512

    if entry.is_symlink():
        ext = os.path.splitext(entry.name)[1].lower()
        return {
            "name": entry.name, "path": entry.path, "size": physical,
            "type": "file", "extension": ext or ".none"
        }

    if entry.is_file(follow_symlinks=False):
        ext = os.path.splitext(entry.name)[1].lower()
        return {
            "name": entry.name, "path": entry.path, "size": physical,
            "type": "file", "extension": ext or ".none"
        }

    if entry.is_dir(follow_symlinks=False):
        if depth > 1:
            try:
                return _scan(entry.path, depth - 1, max_children, level + 1)
            except (PermissionError, OSError):
                size = du_size(entry.path)
                return {
                    "name": entry.name, "path": entry.path, "size": size,
                    "type": "directory", "children": [], "has_children": True
                }
        else:
            size = fast_dir_size(entry.path)
            if size < 1024 and entry.name in VIP_FOLDERS:
                size = get_finder_size(entry.path)
            return {
                "name": entry.name, "path": entry.path, "size": size,
                "type": "directory", "children": [], "has_children": True
            }
    return None


def _scan(path: str, depth: int, max_children: int, level: int = 0) -> dict:
    """Internal recursive scanner. Top-level subdirs are submitted to the thread pool."""
    path  = os.path.abspath(path)
    name  = os.path.basename(path) or path
    result = {
        "name": name, "path": path, "size": 0,
        "type": "directory", "children": []
    }

    if level == 0:
        log_scan(f"{CYAN}Scanning:{NC} {path}")

    try:
        raw_entries = list(os.scandir(path))
    except (PermissionError, OSError):
        result["size"] = du_size(path)
        return result

    # ── Parallel at level 0, sequential at deeper levels ────────
    children: list[dict] = []
    if level == 0 and len(raw_entries) > 4:
        futures = {
            _POOL.submit(_scan_dir_entry, e, depth, max_children, level): e
            for e in raw_entries
        }
        for future in as_completed(futures):
            try:
                node = future.result()
                if node:
                    children.append(node)
            except Exception:
                pass
    else:
        for entry in raw_entries:
            try:
                node = _scan_dir_entry(entry, depth, max_children, level)
                if node:
                    children.append(node)
            except Exception:
                pass

    # ── Sort: dirs by size desc, then files by size desc ────────
    dirs  = sorted([c for c in children if c["type"] == "directory"],
                   key=lambda x: x["size"], reverse=True)
    files = sorted([c for c in children if c["type"] != "directory"],
                   key=lambda x: x["size"], reverse=True)
    all_children = dirs + files
    scanned_total = sum(c["size"] for c in all_children)

    # ── Gap detection: compare with du for top 2 levels ────────
    if level <= 1:
        true_size = du_size(path)
        gap = true_size - scanned_total
        if gap > 102_400:   # > 100 KB unaccounted
            denied = sum(1 for c in dirs if c.get("children") == [])
            all_children.append({
                "name": f"🔒 Protected data ({denied} restricted)",
                "path": path, "size": gap, "type": "protected",
            })
            scanned_total = true_size

    # ── Truncate if too many children ────────────────────────────
    if len(all_children) > max_children:
        kept  = all_children[:max_children]
        extra = sum(c["size"] for c in all_children[max_children:])
        kept.append({
            "name": f"… {len(all_children) - max_children} more items",
            "path": "", "size": extra, "type": "other"
        })
        all_children = kept

    result["children"]     = all_children
    result["size"]         = max(scanned_total, sum(c["size"] for c in all_children))
    result["has_children"] = bool(all_children)

    if level == 0:
        log_scan(f"{GREEN}✔ Total: {format_size(result['size'])} "
                 f"({len(all_children)} top-level items){NC}")

    return result


def scan_directory(path: str, depth: int = 3, max_children: int = 500) -> dict:
    """Public entry point. Returns a cached result when available."""
    path      = os.path.abspath(path)
    cache_key = f"{path}_{depth}_{max_children}"

    cached = _SCAN_CACHE.get(cache_key)
    if cached:
        ts, data = cached
        if time.time() - ts < _CACHE_TTL:
            log_scan(f"{CYAN}Cache hit:{NC} {path}")
            return data

    data = _scan(path, depth, max_children)
    _SCAN_CACHE[cache_key] = (time.time(), data)
    return data
