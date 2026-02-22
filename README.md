# JmacVisualizer 🖥️

A stunning, retro-inspired disk space visualizer for macOS. Visualize your files and directories as a 3D interactive city, featuring cinematic scanning animations and precise sizing.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![Author](https://img.shields.io/badge/author-avdeshjadon-orange.svg)

## 🪐 Features

- **Retro PC Scanner**: A nostalgic loading animation with an interactive file tree.
- **Interactive City View**: Visualize your storage as a stunning 3D isometric city.
- **Native macOS Experience**: Runs as a standalone `.app` bundled with Electron—no terminal required.
- **Auto-Managed Backend**: The integrated Python/Flask backend process spawns and dies with the app cleanly.
- **Precise Analysis**: Accurate file sizing including hidden system directories.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Electron, Vanilla CSS.
- **Backend**: Python, Flask, PyInstaller.

## 🚀 Quick Start

To launch JmacVisualizer on your Mac, grab the latest `.dmg` or `.app.zip` release from the [Releases page](https://github.com/avdeshjadon/JmacVisualizer/releases), unzip it, and drag it to your `/Applications` directory!

## 📜 Documentation

- [Local Development Setup](SETUP.md)
- [Building the Production App](BUILD.md)

## 📁 Project Structure

- **backend/**: Python server, scanner logic, API routes, and PyInstaller configs.
- **frontend/**: React interface, Electron `main.js`, and Vite configuration.

## 👤 Author

**Avdesh Jadon**

- GitHub: [@avdeshjadon](https://github.com/avdeshjadon)

## ⚖️ License

This project is licensed under the MIT License.
