# ╔══════════════════════════════════════════════════════════════════╗
# ║              J M A C   V I S U A L I Z E R                      ║
# ║         macOS Disk Usage Analyzer & Storage Manager             ║
# ╠══════════════════════════════════════════════════════════════════╣
# ║  Author      : Avdesh Jadon                                      ║
# ║  GitHub      : https://github.com/avdeshjadon                   ║
# ║  License     : MIT — Free to use, modify, and distribute        ║
# ╠══════════════════════════════════════════════════════════════════╣
# ║  If this project helped you:                                     ║
# ║  ⭐ Star the repo  🍴 Fork it  🐛 Report bugs  🤝 Contribute   ║
# ╚══════════════════════════════════════════════════════════════════╝
"""
scanner.py — High-Performance Filesystem Scanner
=================================================
Provides fast, recursive directory scanning optimised for macOS.
Uses physical block size (st_blocks × 512) to accurately match
the "Size on Disk" reported by macOS Finder.

Scanning Strategy (priority order):
    1. Pure Python  os.scandir()  — fastest, zero subprocess overhead
    2. Finder AppleScript fallback — for SIP-protected VIP folders
       (Messages, Safari, Mail, Photos Library)
    3. BSD  du -sk  fallback      — when PermissionError is raised

Caching:
    Results are cached in-process with a 5-minute TTL to avoid
    redundant disk I/O on repeated API calls for the same path.

Public API:
    scan_directory(path, depth, max_children)  → dict tree
    fast_dir_size(path)                         → int bytes
    format_size(bytes)                          → str  (e.g. "1.23 GB")
    log_scan(msg)                               → stderr pretty-print
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


def get_finder_size(path):
    """Fallback to osascript to get size from Finder for SIP-protected folders."""
    try:
        abs_path = os.path.abspath(path)
        # We use POSIX file to handle paths correctly in AppleScript
        script = f'tell application "Finder" to get size of (POSIX file "{abs_path}")'
        r = subprocess.run(['osascript', '-e', script], capture_output=True, text=True, timeout=5)
        if r.stdout.strip() and r.stdout.strip() != 'missing value':
            return int(r.stdout.strip())
    except Exception:
        pass
    return 0


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
        # We use -sk to get size in 1024-byte blocks, then multiply to get bytes.
        # This matches physical disk usage more closely than logical size.
        r = subprocess.run(['du', '-sk', path], capture_output=True, text=True, timeout=60)
        if r.stdout.strip():
            return int(r.stdout.split()[0]) * 1024
    except Exception:
        pass
    return 0


def fast_dir_size(path):
    """Fast recursive physical size using pure Python. Falls back to Finder/du on errors."""
    total = 0
    # known SIP-protected folders that often report 0 but have data
    VIP_FOLDERS = {"Messages", "Safari", "Mail", "Photos Library.photoslibrary"}
    
    try:
        with os.scandir(path) as it:
            for entry in it:
                try:
                    st = entry.stat(follow_symlinks=False)
                    if entry.is_file(follow_symlinks=False):
                        total += st.st_blocks * 512
                    elif entry.is_dir(follow_symlinks=False) and not entry.is_symlink():
                        size = fast_dir_size(entry.path)
                        # If Python reports nearly 0 for a VIP folder, try Finder fallback
                        if size < 1024 and entry.name in VIP_FOLDERS:
                             size = get_finder_size(entry.path)
                        total += size
                except (PermissionError, OSError):
                    # Try du or Finder
                    if entry.name in VIP_FOLDERS:
                         total += get_finder_size(entry.path)
                    elif entry.is_dir(follow_symlinks=False):
                        total += du_size(entry.path)
    except (PermissionError, OSError):
        if os.path.basename(path) in VIP_FOLDERS:
            total = get_finder_size(path)
        else:
            total = du_size(path)
    return total


import time

# Simple backend cache: { path_depth_key: (timestamp, data) }
_SCAN_RESULTS_CACHE = {}
_CACHE_TTL = 300  # 5 minutes

def scan_directory(path, depth=3, max_children=500, _level=0):
    """Fast recursive directory scan with backend caching."""
    path = os.path.abspath(path)
    
    # Check cache at top level
    cache_key = f"{path}_{depth}_{max_children}"
    if _level == 0:
        if cache_key in _SCAN_RESULTS_CACHE:
            ts, cached_data = _SCAN_RESULTS_CACHE[cache_key]
            if time.time() - ts < _CACHE_TTL:
                log_scan(f"{CYAN}Cache Hit:{NC} {path}")
                return cached_data

    name = os.path.basename(path) or path
    result = {"name": name, "path": path, "size": 0, "type": "directory", "children": []}

    if _level == 0:
        log_scan(f"{CYAN}Scanning:{NC} {path}")
    
    # ... (rest of the original function logic, replacing 'scan_directory' calls recursively)
    # Note: I need to be careful with the recursive call context.
    # I'll rename the internal logic to _scan_internal and use scan_directory as the entry point with caching.

def _scan_internal(path, depth=3, max_children=500, _level=0):
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
            
            st = entry.stat(follow_symlinks=False)
            # Physical size for accuracy
            s = st.st_blocks * 512

            if entry.is_symlink():
                try:
                    # For symlinks, we still want to show where they point but use their own tiny block size
                    ext = os.path.splitext(entry.name)[1].lower()
                    files.append({"name": entry.name, "path": entry.path, "size": s,
                                  "type": "file", "extension": ext or ".none"})
                except (OSError, PermissionError):
                    pass
                continue
            
            if entry.is_file(follow_symlinks=False):
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
            if depth > 1: # Increased threshold for deeper fast scans
                child = _scan_internal(entry.path, depth - 1, max_children, _level + 1)
            else:
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
    all_children = dir_results + files
    scanned_total = sum(c["size"] for c in all_children)

    if _level <= 1:
        true_size = du_size(path)
        gap = true_size - scanned_total
        if gap > 102400:
            all_children.append({
                "name": f"🔒 Protected data ({denied_count} restricted)",
                "path": path, "size": gap, "type": "protected",
            })
            scanned_total = true_size

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

def scan_directory(path, depth=3, max_children=500, _level=0):
    """Entry point for scanning with cache."""
    path = os.path.abspath(path)
    cache_key = f"{path}_{depth}_{max_children}"
    
    if cache_key in _SCAN_RESULTS_CACHE:
        ts, cached_data = _SCAN_RESULTS_CACHE[cache_key]
        if time.time() - ts < _CACHE_TTL:
            return cached_data

    data = _scan_internal(path, depth, max_children, _level)
    _SCAN_RESULTS_CACHE[cache_key] = (time.time(), data)
    return data
