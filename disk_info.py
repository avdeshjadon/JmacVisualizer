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
    Walk the user's home directory and categorize files by type.
    Returns a list of categories with name, size, and color.
    """
    home = os.path.expanduser("~")
    # Build a reverse map: extension → category
    ext_to_category = {}
    for category, extensions in CATEGORY_EXTENSIONS.items():
        for ext in extensions:
            ext_to_category[ext] = category

    category_sizes = {cat: 0 for cat in CATEGORY_EXTENSIONS}
    category_sizes["Other"] = 0

    try:
        for root, dirs, files in os.walk(home, followlinks=False):
            # Skip hidden dirs and known heavy system dirs
            dirs[:] = [
                d for d in dirs
                if not d.startswith(".")
                and d not in {"node_modules", "__pycache__", "venv", ".Trash"}
            ]
            for f in files:
                if f.startswith("."):
                    continue
                filepath = os.path.join(root, f)
                try:
                    size = os.path.getsize(filepath)
                except (OSError, PermissionError):
                    continue

                ext = os.path.splitext(f)[1].lower()
                cat = ext_to_category.get(ext, "Other")
                category_sizes[cat] += size
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
