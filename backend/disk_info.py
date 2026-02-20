# ═══════════════════════════════════════════════════════════
#  Built with ♥ by Avdesh Jadon
#  GitHub: https://github.com/avdeshjadon
#
#  This software is free to use. If you find it helpful:
#  ⭐ Star the repository | 🍴 Fork the project | 🤝 Contribute
# ═══════════════════════════════════════════════════════════
"""
Disk information — total/used/free space and storage categorization.
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

    # 1. System-wide Folders
    system_paths = {
        "/Applications": "Apps",
        "/Users/Shared": "Other",
    }
    for path, category in system_paths.items():
        if os.path.isdir(path):
            try:
                category_sizes[category] += fast_dir_size(path)
            except Exception:
                pass

    # 2. User-specific Folders
    user_paths = {
        "Documents": "Documents",
        "Desktop": "Documents",
        "Applications": "Apps",
    }

    for folder, category in user_paths.items():
        folder_path = os.path.join(home, folder)
        if os.path.isdir(folder_path):
            try:
                size = fast_dir_size(folder_path)
                category_sizes[category] += size
            except Exception:
                pass

    # 3. Categorize other folders as "Other"
    media_folders = ["Pictures", "Music", "Movies", "Downloads", "Public", "Library/Developer"]
    for folder in media_folders:
        folder_path = os.path.join(home, folder)
        if os.path.isdir(folder_path):
            try:
                category_sizes["Other"] += fast_dir_size(folder_path)
            except Exception:
                pass

    # 4. Scan ~/Library (excluding specific folders handled if any) for System Data
    library_path = os.path.join(home, "Library")
    if os.path.isdir(library_path):
        try:
            # We already handled Library/Developer in media_folders (now Other)
            # So just scan Library as a whole and add to System Data
            category_sizes["System Data"] += fast_dir_size(library_path)
        except Exception:
            pass

    # 5. Shallow walk for anything else in home root (files in ~)
    try:
        # We skip directories that were already handled
        skip_dirs = set(user_paths.keys()) | set(media_folders) | {"Library"}
        for f in os.listdir(home):
            if f.startswith(".") or f in skip_dirs: continue
            filepath = os.path.join(home, f)
            if os.path.isfile(filepath):
                try:
                    size = os.path.getsize(filepath)
                    ext = os.path.splitext(f)[1].lower()
                    cat = ext_to_category.get(ext, "Other")
                    category_sizes[cat] += size
                except (OSError, PermissionError):
                    continue
            elif os.path.isdir(filepath):
                # Unknown subfolder in ~
                category_sizes["Other"] += fast_dir_size(filepath)
    except (PermissionError, OSError):
        pass

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
    macos_size = 0
    try:
        from scanner import fast_dir_size
        macos_size += fast_dir_size("/System")
        # Note: /Library is usually shared between system and apps, 
        # but macOS Disk Utility often lumps some of it into System Data.
        # We'll put root /Library into macOS for simplicity or System Data?
        # Let's put /Library into macOS as it contains OS-level support.
        macos_size += fast_dir_size("/Library")
    except Exception:
        pass

    if macos_size > 0:
        # Check if macOS category already exists (it shouldn't from categorize_home_storage)
        found = False
        for cat in categories:
            if cat["name"] == "macOS":
                cat["size"] += macos_size
                found = True
                break
        if not found:
            categories.append({
                "name": "macOS",
                "size": macos_size,
                "color": CATEGORY_COLORS.get("macOS", "#48484a"),
            })

    # Calculate remaining for System Data
    categorized_total = sum(c["size"] for c in categories)
    # used is total used on disk. categorized_total is what we found.
    # The gap is "Other System Data" (like hidden root folders, Swap, Sleepimage, etc.)
    remaining_used = max(0, usage["used"] - categorized_total)

    found_sys_data = False
    for cat in categories:
        if cat["name"] == "System Data":
            cat["size"] += remaining_used
            found_sys_data = True
            break
    
    if not found_sys_data and remaining_used > 0:
        categories.append({
            "name": "System Data",
            "size": remaining_used,
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
