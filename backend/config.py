# ═══════════════════════════════════════════════════════════
#  Built with ♥ by Avdesh Jadon
#  GitHub: https://github.com/avdeshjadon
#
#  This software is free to use. If you find it helpful:
#  ⭐ Star the repository | 🍴 Fork the project | 🤝 Contribute
# ═══════════════════════════════════════════════════════════
"""
Configuration constants for Disk Visualizer.
"""

# Directories to skip during scanning (virtual filesystems, caches, etc.)
SKIP_DIRS = {
    "/dev", "/proc", "/sys", "/private/var/vm",
    "/System/Volumes/Data/.Spotlight-V100",
    "/System/Volumes/Data/.fseventsd",
    ".Spotlight-V100", ".fseventsd",
    ".git", "__pycache__",
}

SKIP_NAMES = {
    ".DS_Store", ".localized",
}

# File extension → category mapping for storage breakdown
CATEGORY_EXTENSIONS = {
    "Apps": {".app", ".dmg", ".pkg", ".ipa"},
    "Documents": {
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
        ".txt", ".rtf", ".pages", ".numbers", ".keynote", ".csv",
        ".odt", ".ods", ".odp",
    },
    "Archives": {
        ".zip", ".tar", ".gz", ".rar", ".7z", ".bz2", ".xz",
        ".tgz", ".iso",
    },
}

# Colors for each storage category (used in the storage bar)
CATEGORY_COLORS = {
    "Apps":        "#ff3b30", # Red
    "Documents":   "#ff9500", # Orange
    "System Data": "#8e8e93", # Gray
    "macOS":       "#48484a", # Dark Gray
    "Other":       "#c7c7cc", # Silver
    "Archives":    "#5ac8fa", # Light Blue
}

# Server config
HOST = "127.0.0.1"
PORT = 5005
