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
    "Photos": {
        ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".tif",
        ".heic", ".heif", ".raw", ".cr2", ".nef", ".webp", ".svg",
        ".ico", ".psd", ".ai",
    },
    "Videos": {
        ".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm",
        ".m4v", ".mpg", ".mpeg", ".3gp",
    },
    "Music": {
        ".mp3", ".wav", ".flac", ".aac", ".ogg", ".wma", ".m4a",
        ".aiff", ".alac",
    },
    "Developer": {
        ".py", ".js", ".ts", ".jsx", ".tsx", ".html", ".css",
        ".scss", ".json", ".xml", ".yaml", ".yml", ".sh", ".swift",
        ".java", ".c", ".cpp", ".h", ".rb", ".go", ".rs", ".php",
        ".kt", ".m", ".dart", ".r", ".sql", ".graphql", ".proto",
        ".toml", ".ini", ".cfg", ".conf", ".env", ".gitignore",
        ".dockerfile", ".makefile", ".gradle", ".cmake",
        ".o", ".so", ".dylib", ".a", ".class", ".jar", ".war",
    },
    "Archives": {
        ".zip", ".tar", ".gz", ".rar", ".7z", ".bz2", ".xz",
        ".tgz", ".iso",
    },
}

# Colors for each storage category (used in the storage bar)
CATEGORY_COLORS = {
    "Apps":       "#00cec9",
    "Documents":  "#6c5ce7",
    "Photos":     "#e84393",
    "Videos":     "#d63031",
    "Music":      "#e17055",
    "Developer":  "#0984e3",
    "Archives":   "#fdcb6e",
    "System":     "#636e72",
    "Other":      "#b2bec3",
}

# Server config
HOST = "127.0.0.1"
PORT = 5000
