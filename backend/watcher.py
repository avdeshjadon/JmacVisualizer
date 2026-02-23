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
watcher.py -- macOS FSEvents Real-Time Filesystem Watcher
==========================================================
Uses the `watchdog` library (which wraps the macOS FSEvents API) to
monitor the filesystem for any changes — deletions, creations, moves —
and publishes change events to the SSE broadcast queue.

The observer is started by app.py on backend startup and runs in a
daemon thread so it terminates automatically when the Flask process exits.

Architecture
------------
- One watchdog Observer thread watches ~/  (user home directory tree)
- On any event: the affected path is normalised to its nearest cached
  scan root and a JSON message is pushed onto `SSE_QUEUE`
- The `/api/events` SSE endpoint in routes.py drains `SSE_QUEUE` and
  streams each item to all connected browser clients via Server-Sent Events
- Clients use the native `EventSource` browser API (no library required)

Thread safety
-------------
`SSE_QUEUE` is a `queue.Queue` — all put/get operations are thread-safe.
The `_clients` list in routes.py uses a Lock for concurrent access.

Public API
----------
SSE_QUEUE           -- thread-safe queue.Queue; routes.py drains this
start_watcher()     -- start the Observer daemon thread
stop_watcher()      -- stop the Observer (called on shutdown)
"""

import os
import json
import queue
import threading
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler


# Shared SSE event queue — routes.py drains this for /api/events
SSE_QUEUE: queue.Queue = queue.Queue(maxsize=500)

_observer: Observer | None = None


class _ChangeHandler(FileSystemEventHandler):
    """Handle all watchdog filesystem events and push to SSE_QUEUE."""

    # Directories that generate too much noise (e.g. browser caches)
    _NOISY_PATTERNS = (
        "/Library/Caches/",
        "/Library/Logs/",
        "/.Trash/",
        "/node_modules/",
        "/__pycache__/",
        "/.git/",
    )

    def _is_noisy(self, path: str) -> bool:
        """Return True for high-frequency paths we don't want to broadcast."""
        for pattern in self._NOISY_PATTERNS:
            if pattern in path:
                return True
        return False

    def _emit(self, event_type: str, path: str) -> None:
        if self._is_noisy(path):
            return

        # Find the nearest parent that is a scan root (depth ≤ 2 from home)
        home   = os.path.expanduser("~")
        rel    = os.path.relpath(path, home)
        parts  = rel.split(os.sep)
        # Broadcast the top-2-level ancestor so the frontend knows which
        # chart subtree needs refreshing without over-invalidating.
        if len(parts) >= 2:
            affected_root = os.path.join(home, parts[0])
        else:
            affected_root = home

        payload = json.dumps({
            "type":    event_type,
            "path":    path,
            "root":    affected_root,
        })
        try:
            SSE_QUEUE.put_nowait(f"data: {payload}\n\n")
        except queue.Full:
            pass   # drop oldest events under heavy load

    def on_deleted(self, event):
        self._emit("deleted", event.src_path)

    def on_created(self, event):
        self._emit("created", event.src_path)

    def on_moved(self, event):
        self._emit("moved", event.dest_path)


def start_watcher(watch_path: str | None = None) -> None:
    """Start the macOS FSEvents observer as a daemon thread."""
    global _observer

    if _observer is not None and _observer.is_alive():
        return  # already running

    watch_path = watch_path or os.path.expanduser("~")
    handler    = _ChangeHandler()
    _observer  = Observer()
    _observer.schedule(handler, watch_path, recursive=True)
    _observer.daemon = True
    _observer.start()


def stop_watcher() -> None:
    """Gracefully stop the FSEvents observer."""
    global _observer
    if _observer and _observer.is_alive():
        _observer.stop()
        _observer.join(timeout=3)
        _observer = None
