# 🖥️ Jmac Visualizer

> **A beautiful, interactive disk space analyzer for macOS.**  
> See exactly what's eating your storage — explore, analyze, and clean with one click.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey.svg)
![Author](https://img.shields.io/badge/author-avdeshjadon-orange.svg)

---

## � What is this?

Jmac Visualizer scans your Mac's filesystem and renders it as an **interactive sunburst chart** — every ring is a folder, every slice is a file, sized to scale. You can drill into any directory, see what's taking up space, and delete junk in one click.

Think of it like **WinDirStat / DaisyDisk** — but open source and built with Python + React.

---

## ✨ Features

| Feature                 | Description                                                              |
| ----------------------- | ------------------------------------------------------------------------ |
| 🌀 **Sunburst Chart**   | Interactive donut chart — click any slice to drill deeper                |
| 📊 **Storage Overview** | Top-bar breakdown: System, Apps, Documents, Other, Free                  |
| ⚡ **Quick Clean**      | One-click clean for Caches, Logs, Trash, Downloads with live size update |
| 🗑️ **Safe Delete**      | Move to Trash (recoverable) or permanent delete with confirmation modal  |
| 🔄 **Live Updates**     | SSE stream — chart and sizes update in real-time after any delete        |
| 🔍 **Deep Scan**        | Recursively scans any path up to 10 levels deep                          |
| 🔐 **Permission Aware** | Detects Full Disk Access and guides you to grant it                      |

---

## 🏗️ How it Works

```
┌─────────────────────────────────────────────────────┐
│                     Browser UI                      │
│   React + Vite  →  Sunburst (D3)  →  Sidebar       │
└──────────────────────┬──────────────────────────────┘
                       │  REST API + SSE
                       ▼
┌─────────────────────────────────────────────────────┐
│                  Flask Backend                      │
│  /api/scan  →  scanner.py  →  os.walk + stat()     │
│  /api/delete  →  shutil / /bin/rm  →  SSE push     │
│  /api/disk-info  →  diskutil / df                  │
└─────────────────────────────────────────────────────┘
```

- **Backend** → Python/Flask HTTP server, runs on `localhost:5005`
- **Frontend** → React SPA served by Flask from `frontend/dist/`
- **No database** → everything computed live from the filesystem
- **SSE (Server-Sent Events)** → backend pushes change events to browser after each delete so the chart refreshes without polling

---

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/avdeshjadon/JmacVisualizer.git
cd JmacVisualizer

# 2. Setup + build frontend
cd frontend && npm install && npm run build && cd ..

# 3. Run
cd backend && python app.py
```

Open **http://127.0.0.1:5005** 🌐

---

## 🔐 Permissions

For full disk analysis you need **Full Disk Access** granted to Terminal (or your IDE):

> **System Settings → Privacy & Security → Full Disk Access → ✅ Terminal**

The app detects missing access automatically and shows a setup screen.

---

## 🧱 Tech Stack

| Layer       | Tech                             |
| ----------- | -------------------------------- |
| 🐍 Backend  | Python 3 + Flask                 |
| ⚛️ Frontend | React 18 + Vite                  |
| 📈 Charts   | D3.js (sunburst)                 |
| 🎨 Styling  | Vanilla CSS (dark glassmorphism) |
| 🔗 Realtime | Server-Sent Events (SSE)         |

---

## 📁 Project Structure

```
JmacVisualizer/
├── backend/
│   ├── app.py          ← entry point, Flask app factory
│   ├── routes.py       ← all API endpoints
│   ├── scanner.py      ← recursive filesystem scanner + cache
│   └── disk_info.py    ← diskutil / df wrappers
├── frontend/
│   └── src/
│       ├── App.jsx             ← root state + delete flow
│       ├── components/
│       │   ├── QuickClean.jsx  ← one-click cleanup panel
│       │   ├── Sidebar.jsx     ← selected item + file lists
│       │   └── ...
│       └── utils/
│           ├── api.js          ← all fetch calls to backend
│           └── helpers.js      ← formatSize, getPercentage
├── buildapp.sh         ← build standalone macOS .app
├── SETUP.md            ← local dev setup guide
└── BUILD_APP.md        ← packaging as a standalone .app
```

---

## 📦 Build Standalone .app

```bash
./buildapp.sh
```

Drag `frontend/release/mac-arm64/JmacVisualizer.app` to `/Applications`.

---

## 👤 Author

**Avdesh Jadon** — [@avdeshjadon](https://github.com/avdeshjadon)

## ⚖️ License

MIT — free to use, modify, and distribute. See [LICENSE](LICENSE).
