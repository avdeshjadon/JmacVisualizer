/**
 * ═══════════════════════════════════════════════════════════
 *  Built with ♥ by Avdesh Jadon
 *  GitHub: https://github.com/avdeshjadon
 *
 *  This software is free to use. If you find it helpful:
 *  ⭐ Star the repository | 🍴 Fork the project | 🤝 Contribute
 * ═══════════════════════════════════════════════════════════
 */

const API_BASE = "http://127.0.0.1:5005";

export async function fetchScan(path, depth = 3) {
  const params = new URLSearchParams();
  if (path) params.set("path", path);
  if (depth) params.set("depth", depth);
  const res = await fetch(`${API_BASE}/api/scan?${params}`);
  if (!res.ok) throw new Error(`Scan failed: ${res.statusText}`);
  return res.json();
}

export async function fetchRoots() {
  const res = await fetch(`${API_BASE}/api/roots`);
  return res.json();
}

export async function fetchDiskInfo() {
  const res = await fetch(`${API_BASE}/api/disk-info`);
  return res.json();
}

export async function deleteItem(path) {
  const res = await fetch(`${API_BASE}/api/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  return res.json();
}
