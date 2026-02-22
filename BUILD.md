# Building and Releasing JmacVisualizer

Follow these steps in your terminal to create the final native macOS `.app` bundle from your clean repository. This project consists of a full Electron-React frontend and a standalone PyInstaller Flask backend bundle.

## 1. Bundle the Python Backend

You can structure the Python dependencies either using a virtual environment (recommended) or globally.

### Option A: Using a Virtual Environment (Recommended)

```bash
cd backend

# Create and activate the virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies in the isolated environment
pip install -r requirements.txt
pip install pyinstaller

# Build the binary
pyinstaller --name app --clean --noconfirm --onedir app.py
```

### Option B: Using Global Python (Easy)

If you don't want to use virtual environments and face a "externally-managed-environment" error on macOS, you can force the installation globally:

```bash
cd backend

# Install dependencies globally
pip install -r requirements.txt --break-system-packages
pip install pyinstaller --break-system-packages

# Build the binary
pyinstaller --name app --clean --noconfirm --onedir app.py
```

## 2. Prepare the App Icon

If you want to use a custom macOS app icon, place your high-resolution `.icns` file here before building:
`frontend/build/icon.icns`

## 3. Build the Frontend and native Mac App

```bash
cd frontend

# Install the Node.js dependencies
npm install

# Run the build and package script
npm run dist
```

## 4. Run the App

Once the `npm run dist` command finishes, your packaged `.app` will be located at:
`frontend/release/mac-arm64/JmacVisualizer.app`

_Note: If you are building on an Intel Mac, the output folder will automatically be `mac/`._

You can drag this `.app` file to your `/Applications` folder. No terminal window is required to run the app anymore!
