#!/usr/bin/env python3
# ╔══════════════════════════════════════════════════════════════════╗
# ║              J M A C   V I S U A L I Z E R                      ║
# ║         macOS Disk Usage Analyzer & Storage Manager             ║
# ╠══════════════════════════════════════════════════════════════════╣
# ║  Author      : Avdesh Jadon                                      ║
# ║  GitHub      : https://github.com/avdeshjadon                   ║
# ║  License     : MIT — Free to use, modify, and distribute        ║
# ╠══════════════════════════════════════════════════════════════════╣
# ║  If this project helped you:                                     ║
# ║  ⭐ Star the repo  🍴 Fork it  🐛 Report bugs  🤝 Contribute   ║
# ╚══════════════════════════════════════════════════════════════════╝
"""
app.py — Application Entry Point
=================================
Bootstraps the Jmac Visualizer Flask server. Resolves the frontend
dist path for both source and PyInstaller-frozen (compiled) builds,
registers all API routes, and starts the HTTP server.

Usage:
    python app.py                 # Development mode
    ./JmacVisualizer              # Compiled executable (via makeapp.sh)

Server:
    Host : 127.0.0.1  (localhost only — never exposed externally)
    Port : 5005       (configurable via config.py)
"""

import os
import sys
import threading
import time
from flask import Flask
from routes import register_routes
from config import HOST, PORT

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
    print("\n🔍 Jmac Visualizer")
    print("=" * 40)
    print(f"Starting server at http://{HOST}:{PORT}")
    print("Press Ctrl+C to stop\n")

    app.run(host="127.0.0.1", port=PORT, debug=False)

