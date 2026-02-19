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

import threading
import webbrowser
import time
from flask import Flask
from routes import register_routes
from config import HOST, PORT

import os

# Use absolute paths for stability
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend", "dist"))

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="/static")

# Register all API routes
register_routes(app)


if __name__ == "__main__":
    print("\n🔍 Jmac Visualizer")
    print("=" * 40)
    print(f"Starting server at http://{HOST}:{PORT}")
    print("Press Ctrl+C to stop\n")

    app.run(host="127.0.0.1", port=PORT, debug=False)

