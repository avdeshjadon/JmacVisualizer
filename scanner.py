"""
Filesystem scanner — recursively scans directories and returns nested dicts.
"""

import os
from config import SKIP_DIRS, SKIP_NAMES


def should_skip(name, full_path):
    """Check if a path should be skipped during scanning."""
    if name.startswith(".") and name in SKIP_NAMES:
        return True
    if full_path in SKIP_DIRS or name in SKIP_DIRS:
        return True
    return False


def get_size_safe(path):
    """Get file size safely, returning 0 on error."""
    try:
        return os.path.getsize(path)
    except (OSError, PermissionError):
        return 0


def get_dir_size_fast(path):
    """Get total size of a directory quickly (no child detail)."""
    total = 0
    try:
        for entry in os.scandir(path):
            try:
                if entry.is_file(follow_symlinks=False):
                    total += entry.stat(follow_symlinks=False).st_size
                elif entry.is_dir(follow_symlinks=False) and not entry.is_symlink():
                    total += get_dir_size_fast(entry.path)
            except (PermissionError, OSError):
                continue
    except (PermissionError, OSError):
        pass
    return total


def scan_directory(path, depth=3, max_children=500):
    """
    Recursively scan a directory and return a nested dict.

    Args:
        path: The directory path to scan
        depth: How many levels deep to scan (0 = this level only)
        max_children: Maximum number of children per directory

    Returns:
        dict with keys: name, path, size, children, type
    """
    path = os.path.abspath(path)
    name = os.path.basename(path) or path

    result = {
        "name": name,
        "path": path,
        "size": 0,
        "type": "directory",
        "children": [],
    }

    try:
        entries = list(os.scandir(path))
    except (PermissionError, OSError):
        return result

    files = []
    dirs = []

    for entry in entries:
        try:
            entry_name = entry.name
            entry_path = entry.path

            if should_skip(entry_name, entry_path):
                continue

            if entry.is_symlink():
                continue

            if entry.is_file(follow_symlinks=False):
                size = get_size_safe(entry_path)
                ext = os.path.splitext(entry_name)[1].lower()
                files.append({
                    "name": entry_name,
                    "path": entry_path,
                    "size": size,
                    "type": "file",
                    "extension": ext if ext else ".none",
                })
            elif entry.is_dir(follow_symlinks=False):
                dirs.append(entry)
        except (PermissionError, OSError):
            continue

    # Sort files by size descending
    files.sort(key=lambda f: f["size"], reverse=True)

    # Recurse into subdirectories
    dir_results = []
    for entry in dirs:
        if depth > 0:
            child = scan_directory(
                entry.path, depth=depth - 1, max_children=max_children
            )
        else:
            child = {
                "name": entry.name,
                "path": entry.path,
                "size": get_dir_size_fast(entry.path),
                "type": "directory",
                "children": [],
                "has_children": True,
            }
        dir_results.append(child)

    # Sort directories by size descending
    dir_results.sort(key=lambda d: d["size"], reverse=True)

    # Combine and limit children
    all_children = dir_results + files
    if len(all_children) > max_children:
        kept = all_children[:max_children]
        other_size = sum(c["size"] for c in all_children[max_children:])
        kept.append({
            "name": f"... {len(all_children) - max_children} more items",
            "path": "",
            "size": other_size,
            "type": "other",
        })
        all_children = kept

    result["children"] = all_children
    result["size"] = sum(c["size"] for c in all_children)
    result["has_children"] = len(dirs) > 0 or len(files) > 0

    return result
