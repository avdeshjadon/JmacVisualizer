# Setup Guide ⚙️

This guide will help you get **JmacVisualizer** running in a local development environment on your macOS system.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.8+**: [python.org](https://www.python.org/downloads/)
- **Node.js 20+**: [nodejs.org](https://nodejs.org/)

## 📥 Installation

1.  **Clone the Repository**:

    ```bash
    git clone https://github.com/avdeshjadon/JmacVisualizer.git
    cd JmacVisualizer
    ```

## 🚀 Running in Development Mode

Since this is an Electron app with a Python child process, you need to run two separate processes during development to get hot module reloading.

### 1. Start the Python Backend API

In your first terminal tab, initialize and run the Flask server:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 app.py
```

_The API will start running on `http://127.0.0.1:5005`._

### 2. Start the Frontend Vite/Electron App

In your second terminal tab, install the NPM dependencies and start the Electron watcher:

```bash
cd frontend
npm install
npm run dev
```

_The Electron app will boot up and load the hot-reloading Vite server._

## 📦 Building the Standalone App

When you are ready to distribute JmacVisualizer as a `.app` bundle that users can double click:

Please follow the comprehensive instructions located in the [**BUILD.md**](BUILD.md) file in the root of the repository.

## 🛠️ Developer Configuration

Settings for the scanner can be found in `backend/config.py`. You can adjust:

- `SKIP_DIRS`: Directories to ignore during scanning.
- `PORT`: The port the backend server runs on.
