#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════
#  Built with ♥ by Avdesh Jadon
#  GitHub: https://github.com/avdeshjadon
#
#  This software is free to use. If you find it helpful:
#  ⭐ Star the repository | 🍴 Fork the project | 🤝 Contribute
# ═══════════════════════════════════════════════════════════
"""
Jmac Visualizer — Entry Point
A Flask web application that scans your filesystem and presents
an interactive animated sunburst chart with storage management.
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

