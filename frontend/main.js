import { app, BrowserWindow } from "electron";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import http from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let backendProcess;

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const PORT = 5005;
const BACKEND_URL = `http://127.0.0.1:${PORT}`;

function startBackend() {
  console.log("Starting Python backend...");
  if (isDev) {
    backendProcess = spawn("python3", [
      path.join(__dirname, "../backend/app.py"),
    ]);
  } else {
    // In production, run the PyInstaller executable which is inside the 'backend' folder
    const executablePath = path.join(process.resourcesPath, "backend", "app");
    backendProcess = spawn(executablePath, []);
  }

  backendProcess.stdout.on("data", (data) => {
    console.log(`Backend stdout: ${data}`);
  });

  backendProcess.stderr.on("data", (data) => {
    console.error(`Backend stderr: ${data}`);
  });

  backendProcess.on("close", (code) => {
    console.log(`Backend process exited with code ${code}`);
  });
}

function checkBackendReady(url, maxRetries = 30, interval = 1000) {
  return new Promise((resolve, reject) => {
    let retries = 0;

    const ping = () => {
      console.log(
        `Checking backend readiness... (${retries + 1}/${maxRetries})`,
      );
      const request = http.get(url, (res) => {
        if (res.statusCode === 200 || res.statusCode === 404) {
          // As long as the server responds (even with a 404 if no root route is explicitly defined), it's up.
          console.log("Backend is ready!");
          resolve();
        } else {
          retry();
        }
      });

      request.on("error", (err) => {
        retry();
      });

      request.end();
    };

    const retry = () => {
      retries++;
      if (retries >= maxRetries) {
        reject(new Error("Backend failed to start within the expected time."));
      } else {
        setTimeout(ping, interval);
      }
    };

    ping();
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    // Customize your window appearance here
    titleBarStyle: "hiddenInset",
  });

  try {
    // Wait for the backend to be fully initialized and serving requests
    await checkBackendReady(`${BACKEND_URL}/health`);

    if (isDev) {
      // In development, load from Vite dev server if running, or load local build
      mainWindow.loadURL("http://localhost:5173");
      mainWindow.webContents.openDevTools();
    } else {
      // In production, load the built Vite index.html directly
      mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
    }
  } catch (error) {
    console.error("Failed to load application:", error);
    // You could load an error.html here if you want
    app.quit();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackend();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  if (backendProcess) {
    console.log("Killing backend process...");
    backendProcess.kill();
  }
});
