/**
 * ═══════════════════════════════════════════════════════════
 *  Built with ♥ by Avdesh Jadon
 *  GitHub: https://github.com/avdeshjadon
 *
 *  This software is free to use. If you find it helpful:
 *  ⭐ Star the repository | 🍴 Fork the project | 🤝 Contribute
 * ═══════════════════════════════════════════════════════════
 */

export function formatSize(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = bytes / Math.pow(k, i);
  return val.toFixed(val < 10 ? 2 : 1) + " " + units[i];
}

export function formatSizeGB(bytes) {
  return (bytes / (1000 * 1000 * 1000)).toFixed(1) + " GB";
}

export function getPercentage(d, root) {
  if (!root || root.value === 0) return 0;
  return (d.value / root.value) * 100;
}
