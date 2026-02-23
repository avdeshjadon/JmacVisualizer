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
// Palette design: midnight-aurora jewel tones.
// All colors tested against the deep-navy background (#0c0c1e).
// Lime, neon-yellow, and violent clashing hue combos are excluded.
//
// Exports:
//   FILE_COLORS  -- Map of file extension -> hex color
//   DIR_COLORS   -- Premium jewel-tone palette cycled for directory segments.
//   hashString() -- djb2-style hash used to deterministically pick colors.
//   getColor(d)  -- Returns the appropriate color for a given D3 node.
// ----------------------------------------------------------------------------

export const FILE_COLORS = {
  // Media -- warm rose/coral family
  ".jpg": "#f06292",
  ".jpeg": "#f06292",
  ".png": "#ec407a",
  ".gif": "#f48fb1",
  ".svg": "#ff8a65",
  ".webp": "#ef5350",
  ".mp4": "#e53935",
  ".mov": "#f44336",
  ".avi": "#ef9a9a",
  ".mp3": "#e91e63",
  ".wav": "#f48fb1",
  ".flac": "#ad1457",
  ".aac": "#f8bbd0",
  ".heic": "#f06292",
  // Documents -- violet / indigo family
  ".pdf": "#ba68c8",
  ".doc": "#7e57c2",
  ".docx": "#7e57c2",
  ".xls": "#26a69a",
  ".xlsx": "#26a69a",
  ".ppt": "#ff7043",
  ".pptx": "#ff7043",
  ".txt": "#78909c",
  ".md": "#90a4ae",
  ".csv": "#4fc3f7",
  // Code -- blue / cyan family
  ".py": "#42a5f5",
  ".js": "#ffca28",
  ".ts": "#29b6f6",
  ".jsx": "#ffa726",
  ".tsx": "#26c6da",
  ".html": "#ef6c00",
  ".css": "#ab47bc",
  ".scss": "#9c27b0",
  ".json": "#4dd0e1",
  ".xml": "#ff7043",
  ".yaml": "#ff8f00",
  ".yml": "#ff8f00",
  ".sh": "#66bb6a",
  ".swift": "#ef5350",
  ".java": "#ff7043",
  ".c": "#42a5f5",
  ".cpp": "#1e88e5",
  ".h": "#4dd0e1",
  ".rb": "#e53935",
  ".go": "#26c6da",
  ".rs": "#ff7043",
  ".php": "#7c4dff",
  // Archives -- deep purple family
  ".zip": "#7e57c2",
  ".tar": "#673ab7",
  ".gz": "#9575cd",
  ".rar": "#7b1fa2",
  ".7z": "#8e24aa",
  ".dmg": "#5c6bc0",
  ".pkg": "#7986cb",
  // System -- slate / teal
  ".app": "#26c6da",
  ".dylib": "#546e7a",
  ".so": "#546e7a",
  ".framework": "#00acc1",
  ".plist": "#ffd54f",
  ".log": "#b0bec5",
  ".db": "#ff8a65",
  ".sqlite": "#ff7043",
  // Default
  ".none": "#455a64",
  directory: "#7c6df5",
};

// DIR_COLORS -- curated jewel-tone palette for directory ring segments.
// 16 hues at similar perceived brightness and chroma so adjacent segments
// complement rather than clash. No lime, neon yellow, or near-white included.
export const DIR_COLORS = [
  "#7c6df5", // electric violet
  "#5b9cf6", // cobalt blue
  "#f472b6", // rose pink
  "#34d399", // emerald
  "#f97316", // rich amber
  "#a78bfa", // soft lavender
  "#22d3ee", // sky cyan
  "#fb923c", // coral
  "#60a5fa", // periwinkle
  "#e879f9", // fuchsia
  "#2dd4bf", // teal
  "#c084fc", // lilac purple
  "#38bdf8", // light sky blue
  "#f43f5e", // crimson rose
  "#818cf8", // indigo
  "#fb7185", // salmon pink
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
  if (!d.data) return "#1e1e3f";
  if (d.data.type === "directory") {
    return DIR_COLORS[Math.abs(hashString(d.data.name)) % DIR_COLORS.length];
  }
  const ext = d.data.extension || ".none";
  // For unknown extensions use a harmonious mid-blue/purple hue range (180-300)
  return (
    FILE_COLORS[ext] ||
    `hsl(${(Math.abs(hashString(ext)) % 120) + 200}, 60%, 60%)`
  );
}
