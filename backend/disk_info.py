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
disk_info.py — Disk Usage & Storage Categorization
====================================================
Provides high-level disk information functions used by the /api/disk-info
endpoint. Combines shutil-based total/used/free reporting with a
parallel-threaded, extension-aware categorization scan of the user's
home directory and common system locations.

Categorization approach:
    • Apps        — /Applications + ~/Applications  (parallel scan)
    • Documents   — ~/Documents + ~/Desktop         (parallel scan)
    • System Data — ~/Library                        (parallel scan)
    • Other       — ~/Downloads, ~/Movies, ~/Music … (parallel scan)
    • macOS       — Estimated from remaining used space (capped 20 GB)

Public API:
    get_disk_usage()     → {total, used, free}
    get_full_disk_info() → {total, used, free, categories: [...]}
"""

import os
import shutil
from config import CATEGORY_EXTENSIONS, CATEGORY_COLORS


def get_disk_usage():
    """Get total, used, and free disk space for the root volume."""
    total, used, free = shutil.disk_usage("/")
    return {
        "total": total,
        "used": used,
        "free": free,
    }


def categorize_home_storage():
    """
    Categorize storage by scanning both user home and system-wide locations.
    """
    home = os.path.expanduser("~")
    ext_to_category = {}
    for category, extensions in CATEGORY_EXTENSIONS.items():
        for ext in extensions:
            ext_to_category[ext] = category

    category_sizes = {cat: 0 for cat in CATEGORY_EXTENSIONS}
    category_sizes["System Data"] = 0
    category_sizes["Other"] = 0

    from scanner import fast_dir_size
    from concurrent.futures import ThreadPoolExecutor, as_completed

    # Prepare lists of tasks for the thread pool: (category, path)
    tasks = []

    # 1. System-wide Folders
    system_paths = {
        "/Applications": "Apps",
        "/Users/Shared": "Other",
    }
    for path, category in system_paths.items():
        if os.path.isdir(path):
            tasks.append((category, path))

    # 2. User-specific Folders
    user_paths = {
        "Documents": "Documents",
        "Desktop": "Documents",
        "Applications": "Apps",
    }
    for folder, category in user_paths.items():
        folder_path = os.path.join(home, folder)
        if os.path.isdir(folder_path):
            tasks.append((category, folder_path))

    # 3. Categorize other media folders as "Other"
    media_folders = ["Pictures", "Music", "Movies", "Downloads", "Public", "Library/Developer"]
    for folder in media_folders:
        folder_path = os.path.join(home, folder)
        if os.path.isdir(folder_path):
            tasks.append(("Other", folder_path))

    # 4. Scan ~/Library (excluding specific folders handled) for System Data
    library_path = os.path.join(home, "Library")
    if os.path.isdir(library_path):
        tasks.append(("System Data", library_path))

    # 5. Shallow walk for anything else in home root (files in ~ and unknown dirs)
    # We will compute files strictly in the main thread (fast) but offload unknown dirs.
    try:
        skip_dirs = set(user_paths.keys()) | set(media_folders) | {"Library"}
        for f in os.listdir(home):
            if f in skip_dirs or f == ".DS_Store": continue
            filepath = os.path.join(home, f)
            try:
                st = os.stat(filepath, follow_symlinks=False)
                if os.path.isfile(filepath):
                    size = st.st_blocks * 512
                    ext = os.path.splitext(f)[1].lower()
                    cat = ext_to_category.get(ext, "Other")
                    category_sizes[cat] += size
                elif os.path.isdir(filepath):
                    tasks.append(("Other", filepath))
            except (OSError, PermissionError):
                continue
    except (PermissionError, OSError):
        pass

    # Execute all directory scans in parallel
    def _scan_task(cat, path):
        try:
            return cat, fast_dir_size(path)
        except Exception:
            return cat, 0

    with ThreadPoolExecutor(max_workers=8) as executor:
        future_to_task = {executor.submit(_scan_task, cat, p): cat for cat, p in tasks}
        for future in as_completed(future_to_task):
            cat, size = future.result()
            category_sizes[cat] += size

    # Build result list sorted by size
    categories = []
    important_cats = ["Apps", "Documents", "System Data", "macOS", "Other"]
    
    for name, size in sorted(category_sizes.items(), key=lambda x: -x[1]):
        if size > 0 or name in important_cats:
            categories.append({
                "name": name,
                "size": size,
                "color": CATEGORY_COLORS.get(name, "#b2bec3"),
            })

    return categories


def get_full_disk_info():
    """
    Get complete disk info: total/used/free + categorized breakdown.
    """
    usage = get_disk_usage()
    categories = categorize_home_storage()

    # Detect macOS Size (Root system folders)
    # We remove explicit deep scanning of /System and /Library as it takes too long.
    # Instead, we distribute the remaining used space.
    
    categorized_total = sum(c["size"] for c in categories)
    remaining_used = max(0, usage["used"] - categorized_total)

    # Distribute remaining_used roughly: MacOS usually takes around 15-20GB.
    macos_estimated_size = 20 * 1024 * 1024 * 1024 # 20 GB
    
    macos_size = min(macos_estimated_size, remaining_used)
    sys_data_size = remaining_used - macos_size

    if macos_size > 0:
        categories.append({
            "name": "macOS",
            "size": macos_size,
            "color": CATEGORY_COLORS.get("macOS", "#48484a"),
        })

    if sys_data_size > 0:
        found_sys_data = False
        for cat in categories:
            if cat["name"] == "System Data":
                cat["size"] += sys_data_size
                found_sys_data = True
                break
        
        if not found_sys_data:
            categories.append({
                "name": "System Data",
                "size": sys_data_size,
                "color": CATEGORY_COLORS.get("System Data", "#8e8e93"),
            })

    # Final Sort
    categories.sort(key=lambda c: -c["size"])

    return {
        "total": usage["total"],
        "used": usage["used"],
        "free": usage["free"],
        "categories": categories,
    }
