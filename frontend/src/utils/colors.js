// ----------------------------------------------------------------------------
// Jmac Visualizer -- macOS Disk Usage Analyzer and Storage Manager
// ----------------------------------------------------------------------------
// Author   : Avdesh Jadon
// GitHub   : https://github.com/avdeshjadon
// License  : MIT License -- free to use, modify, and distribute.
//            See LICENSE file in the project root for full license text.
// ----------------------------------------------------------------------------
// If this project helped you, consider starring the repository, opening a
// pull request, or reporting issues on GitHub. Contributions are welcome.
// ----------------------------------------------------------------------------
//
// colors.js -- Color Mapping and Node Coloring Utilities
// ========================================================
// Defines the color palettes used throughout the SunburstChart and Sidebar
// to represent different file types and directories. Also exports utility
// functions used by the D3 chart to assign colors to individual data nodes.
//
// Exports:
//   FILE_COLORS  -- Map of file extension -> hex color (e.g. ".py": "#3498db")
//   DIR_COLORS   -- Ordered array of hex colors cycled for directory segments.
//   hashString() -- djb2-style hash used to deterministically assign colors
//                   from DIR_COLORS based on a directory or extension name.
//   getColor(d)  -- Returns the appropriate color for a given D3 hierarchy
//                   node, handling directory, file, and unknown types.
// ----------------------------------------------------------------------------

export const FILE_COLORS = {
  // Media
  ".jpg": "#e74c8c",
  ".jpeg": "#e74c8c",
  ".png": "#e84393",
  ".gif": "#fd79a8",
  ".svg": "#fab1a0",
  ".webp": "#e17055",
  ".mp4": "#d63031",
  ".mov": "#e17055",
  ".avi": "#ff7675",
  ".mp3": "#e84393",
  ".wav": "#fd79a8",
  ".flac": "#e74c8c",
  ".aac": "#fab1a0",
  ".heic": "#e84393",
  // Documents
  ".pdf": "#ff6b6b",
  ".doc": "#5f27cd",
  ".docx": "#5f27cd",
  ".xls": "#10ac84",
  ".xlsx": "#10ac84",
  ".ppt": "#ff9f43",
  ".pptx": "#ff9f43",
  ".txt": "#576574",
  ".md": "#576574",
  ".csv": "#10ac84",
  // Code
  ".py": "#3498db",
  ".js": "#f1c40f",
  ".ts": "#2980b9",
  ".jsx": "#f39c12",
  ".tsx": "#2980b9",
  ".html": "#e67e22",
  ".css": "#9b59b6",
  ".scss": "#8e44ad",
  ".json": "#1abc9c",
  ".xml": "#e67e22",
  ".yaml": "#d35400",
  ".yml": "#d35400",
  ".sh": "#2ecc71",
  ".swift": "#e74c3c",
  ".java": "#e74c3c",
  ".c": "#3498db",
  ".cpp": "#2980b9",
  ".h": "#1abc9c",
  ".rb": "#e74c3c",
  ".go": "#00bcd4",
  ".rs": "#ff7043",
  ".php": "#7c4dff",
  // Archives
  ".zip": "#9b59b6",
  ".tar": "#8e44ad",
  ".gz": "#9b59b6",
  ".rar": "#8e44ad",
  ".7z": "#9b59b6",
  ".dmg": "#6c5ce7",
  ".pkg": "#a29bfe",
  // System
  ".app": "#00cec9",
  ".dylib": "#636e72",
  ".so": "#636e72",
  ".framework": "#00cec9",
  ".plist": "#fdcb6e",
  ".log": "#b2bec3",
  ".db": "#e17055",
  ".sqlite": "#e17055",
  // Default
  ".none": "#555577",
  directory: "#7c5cfc",
};

export const DIR_COLORS = [
  "#7c5cfc",
  "#5c8cfc",
  "#00cec9",
  "#00b894",
  "#6c5ce7",
  "#a29bfe",
  "#74b9ff",
  "#55efc4",
  "#fd79a8",
  "#e17055",
  "#ffeaa7",
  "#dfe6e9",
];

export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export function getColor(d) {
  if (!d.data) return "#333";
  if (d.data.type === "directory") {
    return DIR_COLORS[Math.abs(hashString(d.data.name)) % DIR_COLORS.length];
  }
  const ext = d.data.extension || ".none";
  return (
    FILE_COLORS[ext] || `hsl(${Math.abs(hashString(ext)) % 360}, 50%, 55%)`
  );
}
