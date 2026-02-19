# Setup Guide ⚙️

This guide will help you get **JmacVisualizer** running on your macOS system.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.8+**: [python.org](https://www.python.org/downloads/)
- **Node.js 16+**: [nodejs.org](https://nodejs.org/)
- **Google Chrome**: (Or Brave/Chromium) for the standalone app experience.

## 📥 Installation

1.  **Clone the Repository**:

    ```bash
    git clone https://github.com/avdeshjadon/JmacVisualizer.git
    cd JmacVisualizer
    ```

2.  **Make Launcher Executable**:
    ```bash
    chmod +x start.sh
    ```

## 🚀 Running the App

Simply run the launcher script from your terminal:

```bash
./start.sh
```

### What `start.sh` does:

1.  **Checks Prerequisites**: Verifies Python and Node.js.
2.  **Installs Dependencies**: Automatically installs Flask and Node modules if missing.
3.  **Builds the Frontend**: Compiles the React/Vite assets.
4.  **Launches Server**: Boots up the Flask backend on `127.0.0.1:5005`.
5.  **Opens App Window**: Displays the visualizer in a standalone, dedicated Chrome window.

## 🔧 Troubleshooting

### "Terminal wants to control System Events"

On first run, macOS may ask for permission to allow the terminal to monitor windows. **Click OK**. This is required so the terminal can automatically shut down the server when you close the app window.

### "Chrome Not Found"

The script looks for Google Chrome in `/Applications`. If you use a different path or browser, you can modify the `CHROME_APP` path in `start.sh`.

### Manual Cleanup

If for some reason the server keeps running after you close the app, you can manually stop it:

```bash
lsof -ti:5005 | xargs kill -9
```

## 🛠️ Developer Configuration

Settings for the scanner can be found in `backend/config.py`. You can adjust:

- `SKIP_DIRS`: Directories to ignore during scanning.
- `PORT`: The port the server runs on.
