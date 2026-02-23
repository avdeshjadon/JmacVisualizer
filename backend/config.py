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
config.py -- Application Configuration and Constants
======================================================
Single source of truth for all tuneable parameters, category definitions,
colour tokens, and server settings used across the Jmac Visualizer backend.
Keeping all magic values here makes them easy to find, change, and test
without touching business logic in other modules.

Constants
---------
SKIP_DIRS : set of str
    Absolute paths and directory names that are always excluded from
    filesystem scans. Includes virtual filesystems (/dev, /proc), macOS
    Spotlight index directories, and version-control internals (.git).

SKIP_NAMES : set of str
    Individual file or folder names to silently skip regardless of their
    location (e.g. .DS_Store, .localized). These contribute no meaningful
    storage information but would otherwise clutter scan results.

CATEGORY_EXTENSIONS : dict[str, set[str]]
    Maps human-readable category labels to the set of file extensions that
    belong to that category. Used by disk_info.py to produce the categorized
    storage breakdown shown in the StorageOverview bar chart in the UI.

CATEGORY_COLORS : dict[str, str]
    Hex colour codes assigned to each storage category for consistent
    rendering in the frontend StorageOverview and disk-info API response.

HOST : str
    The IP address Flask binds to. Fixed to 127.0.0.1 (loopback) so the
    server is never accidentally accessible from the local network.

PORT : int
    The TCP port Flask listens on. Default is 5005.
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
