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
    Categorize files in the user's home directory by type.
    Uses a shallow walk (depth 2) to maintain performance.
    """
    home = os.path.expanduser("~")
    ext_to_category = {}
    for category, extensions in CATEGORY_EXTENSIONS.items():
        for ext in extensions:
            ext_to_category[ext] = category

    category_sizes = {cat: 0 for cat in CATEGORY_EXTENSIONS}
    category_sizes["Other"] = 0

    # Common folder paths to categories
    path_categories = {
        "Pictures": "Photos",
        "Music": "Music",
        "Movies": "Videos",
        "Downloads": "Other",
        "Documents": "Documents",
        "Desktop": "Documents",
        "Applications": "Apps",
    }

    # Specifically check important folders
    for folder, category in path_categories.items():
        folder_path = os.path.join(home, folder)
        if os.path.isdir(folder_path):
            try:
                # Use fast_dir_size for performance
                from scanner import fast_dir_size
                size = fast_dir_size(folder_path)
                category_sizes[category] += size
            except Exception:
                pass

    # Shallow walk for anything else in home root
    try:
        for f in os.listdir(home):
            if f.startswith("."): continue
            filepath = os.path.join(home, f)
            if os.path.isfile(filepath):
                try:
                    size = os.path.getsize(filepath)
                    ext = os.path.splitext(f)[1].lower()
                    cat = ext_to_category.get(ext, "Other")
                    category_sizes[cat] += size
                except (OSError, PermissionError):
                    continue
            elif os.path.isdir(filepath) and f not in path_categories:
                # For unknown folders, just add to "Other"
                from scanner import fast_dir_size
                category_sizes["Other"] += fast_dir_size(filepath)
    except (PermissionError, OSError):
        pass

    # Build result list sorted by size
    categories = []
    for name, size in sorted(category_sizes.items(), key=lambda x: -x[1]):
        if size > 0:
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

    # Calculate system/other storage (used - sum of categorized)
    categorized_total = sum(c["size"] for c in categories)
    system_size = max(0, usage["used"] - categorized_total)

    if system_size > 0:
        categories.append({
            "name": "System",
            "size": system_size,
            "color": CATEGORY_COLORS["System"],
        })
        # Re-sort
        categories.sort(key=lambda c: -c["size"])

    return {
        "total": usage["total"],
        "used": usage["used"],
        "free": usage["free"],
        "categories": categories,
    }
