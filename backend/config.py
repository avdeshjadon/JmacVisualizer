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
config.py — Application Configuration & Constants
==================================================
Central configuration file for Jmac Visualizer. All tuneable
parameters, category mappings, and colour tokens live here so
that the rest of the codebase stays free of magic values.

Constants defined:
    SKIP_DIRS            — Virtual/system directories excluded from scanning
    SKIP_NAMES           — File/folder names always ignored (e.g. .DS_Store)
    CATEGORY_EXTENSIONS  — Maps file extensions to storage categories
    CATEGORY_COLORS      — Hex colour codes for each storage category
    HOST                 — Flask bind address (127.0.0.1)
    PORT                 — Flask listen port  (5005)
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
