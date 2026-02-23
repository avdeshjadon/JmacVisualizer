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
// api.js -- Backend API Client
// ==============================
// Provides async helper functions for every REST endpoint exposed by the
// Flask backend (http://127.0.0.1:5005). All functions return the parsed
// JSON response and throw a descriptive Error on non-2xx HTTP status codes.
//
// Exported functions:
//   fetchScan(path, depth)      -- GET /api/scan
//   fetchRoots()                -- GET /api/roots
//   fetchDiskInfo()             -- GET /api/disk-info
//   fetchCleanTargets()         -- GET /api/clean-targets
//   deleteItem(path, permanent) -- POST /api/delete
//   checkPermissions()          -- GET /api/check-permissions
//   requestPermissions()        -- POST /api/request-permissions
// ----------------------------------------------------------------------------

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

export async function deleteItem(path, permanent = false) {
  const res = await fetch(`${API_BASE}/api/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, permanent }),
  });
  return res.json();
}

export async function checkPermissions() {
  const res = await fetch(`${API_BASE}/api/check-permissions`);
  if (!res.ok) throw new Error(`Check permissions failed: ${res.statusText}`);
  return res.json();
}

export async function requestPermissions() {
  const res = await fetch(`${API_BASE}/api/request-permissions`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Request permissions failed: ${res.statusText}`);
  return res.json();
}

export async function fetchCleanTargets() {
  const res = await fetch(`${API_BASE}/api/clean-targets`);
  if (!res.ok) throw new Error(`Fetch clean targets failed: ${res.statusText}`);
  return res.json();
}

/**
 * subscribeToEvents(onEvent) -- Connect to the /api/events SSE stream.
 *
 * The browser's native EventSource automatically reconnects on disconnect.
 * onEvent receives a parsed JSON object for each event from the server.
 *
 * Returns a cleanup function: call it to close the connection.
 */
export function subscribeToEvents(onEvent) {
  const source = new EventSource(`${API_BASE}/api/events`);

  source.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onEvent(data);
    } catch (_) {
      // ignore malformed messages
    }
  };

  source.onerror = () => {
    // EventSource handles reconnection automatically — no action needed
  };

  return () => source.close();
}
