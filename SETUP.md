#  Setup Guide

##  Prerequisites

-  Python 3.9+
-  Node.js 18+

---

##  First-Time Setup

```bash
# 1 Clone
git clone https://github.com/avdeshjadon/JmacVisualizer.git
cd JmacVisualizer

# 2️ Backend deps
cd backend && pip install -r requirements.txt

# 3 Frontend deps + build
cd ../frontend && npm install && npm run build
```

---

##  Run

```bash
cd backend && python app.py
```

Open → **http://127.0.0.1:5005** 

---

##  Permissions (macOS)

For full disk analysis, grant **Full Disk Access** to Terminal (or the app such as Vscode or any other IDE):

> System Settings → Privacy & Security → Full Disk Access →  Terminal

The app will prompt you automatically if access is missing.

---


