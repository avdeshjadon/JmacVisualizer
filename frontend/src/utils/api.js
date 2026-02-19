/**
 * ═══════════════════════════════════════════════════════════
 *  Built with ♥ by Avdesh Jadon
 *  GitHub: https://github.com/avdeshjadon
 *
 *  This software is free to use. If you find it helpful:
 *  ⭐ Star the repository | 🍴 Fork the project | 🤝 Contribute
 * ═══════════════════════════════════════════════════════════
 */

export async function fetchScan(path, depth = 3) {
  const params = new URLSearchParams();
  if (path) params.set("path", path);
  if (depth) params.set("depth", depth);
  const res = await fetch(`/api/scan?${params}`);
  if (!res.ok) throw new Error(`Scan failed: ${res.statusText}`);
  return res.json();
}

export async function fetchRoots() {
  const res = await fetch("/api/roots");
  return res.json();
}

export async function fetchDiskInfo() {
  const res = await fetch("/api/disk-info");
  return res.json();
}

export async function deleteItem(path) {
  const res = await fetch("/api/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  return res.json();
}
