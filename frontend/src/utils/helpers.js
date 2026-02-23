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
// helpers.js -- General-Purpose Utility Functions
// =================================================
// Pure utility functions shared across multiple components and modules.
// Contains no React-specific code, no side effects, and no imports; safe
// to use in any context including tests and server-side rendering.
//
// Exports:
//   formatSize(bytes)        -- Convert raw bytes to a human-readable string
//                               using SI (1000-based) units matching macOS
//                               Finder display (e.g. 1500000 -> "1.5 MB").
//   formatSizeGB(bytes)      -- Convenience wrapper that always formats into
//                               gigabytes (e.g. for total disk size labels).
//   getPercentage(d, root)   -- Compute what percentage of the root node's
//                               total size a given D3 hierarchy node occupies.
//                               Returns a float in the range [0, 100].
// ----------------------------------------------------------------------------

export function formatSize(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1000;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = bytes / Math.pow(k, i);
  return val.toFixed(val < 10 ? 2 : 1) + " " + units[i];
}

export function formatSizeGB(bytes) {
  return (bytes / (1000 * 1000 * 1000)).toFixed(1) + " GB";
}

export function getPercentage(d, root) {
  const val =
    d && d.data && d.data.size !== undefined ? d.data.size : d ? d.value : 0;
  const total =
    root && root.data && root.data.size !== undefined
      ? root.data.size
      : root
        ? root.value
        : 0;
  if (!total || total === 0) return 0;
  return (val / total) * 100;
}
