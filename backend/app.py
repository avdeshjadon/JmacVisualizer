#!/usr/bin/env python3
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
app.py -- Application Entry Point
==================================
Bootstraps the Jmac Visualizer Flask HTTP server. This module is
responsible for two things:

  1. Resolving the frontend 'dist/' directory at runtime. The path differs
     between running from source (development) and running as a compiled
     PyInstaller executable (production bundle built via makeapp.sh).

  2. Creating the Flask application instance, registering all REST API
     routes via routes.register_routes(), and starting the development
     server on localhost.

Usage:
    python app.py            -- Start in development mode (hot-reloadable)
    ./JmacVisualizer         -- Run the compiled standalone executable

Server configuration:
    Host : 127.0.0.1         -- Bound to loopback only; never exposed to LAN
    Port : 5005              -- Configurable via HOST / PORT in config.py
    Mode : Production        -- Debug mode is always disabled (debug=False)
"""

import os
import sys
from flask import Flask
from routes import register_routes
from config import HOST, PORT

try:
    from watcher import start_watcher, stop_watcher
    _WATCHER_AVAILABLE = True
except ImportError:
    _WATCHER_AVAILABLE = False

# Determine frontend directory path
if getattr(sys, 'frozen', False):
    # Running as compiled executable
    frontend_dir = os.path.join(sys._MEIPASS, "dist")
else:
    # Running from source
    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))

app = Flask(__name__, static_folder=frontend_dir, static_url_path="")

# Register all API routes
register_routes(app)


if __name__ == "__main__":
    print("\nJmac Visualizer")
    print("=" * 40)
    print(f"Server    : http://{HOST}:{PORT}")

    # Start the macOS FSEvents watcher for live UI updates
    if _WATCHER_AVAILABLE:
        try:
            start_watcher()
            print("Watcher   : FSEvents live updates active")
        except Exception as e:
            print(f"Watcher   : disabled ({e})")
    else:
        print("Watcher   : disabled (watchdog not installed)")

    print("Press Ctrl+C to stop\n")
    app.run(host="127.0.0.1", port=PORT, debug=False, threaded=True)

