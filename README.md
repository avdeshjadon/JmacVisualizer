# JmacVisualizer 🖥️

A stunning, retro-inspired disk space visualizer for macOS. Visualize your files and directories as a 3D interactive city, featuring cinematic scanning animations and precise sizing.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![Author](https://img.shields.io/badge/author-avdeshjadon-orange.svg)

## 🪐 Features

- **Retro PC Scanner**: A nostalgic CRT-style loading animation with a scanning laser.
- **Interactive City View**: Visualize your storage as a 3D isometric city.
- **Smart Treemap Layout**: Files are scaled proportionally for visibility while emphasizing large culprits.
- **One-Click Launcher**: Robust `start.sh` script that manages the server and a standalone Chrome window.
- **Auto-Cleanup**: Closing the app window automatically shuts down the background server.
- **Precise Analysis**: Accurate file sizing including hidden system directories.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, D3.js, Vanilla CSS.
- **Backend**: Python, Flask.
- **Automation**: Bash, AppleScript for window monitoring.

## 🚀 Quick Start

1.  Make sure you have **Python 3** and **Node.js** installed.
2.  Clone the repository and enter the directory.
3.  Run the launcher:
    ```bash
    chmod +x start.sh
    ./start.sh
    ```

## 📜 Documentation

- [Setup Guide](SETUP.md)
- [Implementation Plan](README.md#architecture)

## 📁 Project Structure

- **backend/**: Python server, scanner logic, and API routes.
- **frontend/**: React interface, 3D city visualization, and assets.
- **start.sh**: Master launcher for macOS.

## 👤 Author

**Avdesh Jadon**

- GitHub: [@avdeshjadon](https://github.com/avdeshjadon)

## ⚖️ License

This project is licensed under the MIT License.
