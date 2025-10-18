// #region [Handle .env file for electron generated executable] ======
//remove this whole region if you don't want to handle .env file for electron generated executable
const dotenv = require("dotenv");
const pathModule = require("path");
const fs = require("fs");
const exeDir = pathModule.dirname(process.execPath);
const envPathNextToExe = pathModule.join(exeDir, ".env");
// Try loading from executable directory first (for bundled apps)
if (fs.existsSync(envPathNextToExe)) {
  console.log("Loading .env from:", envPathNextToExe);
  dotenv.config({ path: envPathNextToExe });
} else {
  // Fallback to current working directory (for development)
  console.log("Loading .env from current directory");
  dotenv.config();
}

// Log the LOG_LEVEL for debugging
console.log("LOG_LEVEL set to:", process.env.LOG_LEVEL);

// #endregion ===============================================================

import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import ChatService from "./services/chat-service";
import { WINDOW_CONFIG } from "./config";

let chatService: ChatService | null = null;
let mainWindow: BrowserWindow | null;

async function createWindow(): Promise<void> {
  const isDev = process.argv.includes("--dev");

  // Create the browser window with conditional configuration
  const windowOptions: any = {
    width: WINDOW_CONFIG.width,
    height: WINDOW_CONFIG.height,
    resizable: true, // Allow window resizing even in frameless mode
    minWidth: 400,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, "assets/icon.png"), // Optional: add an icon
    title: "Crypto Chat Assistant",
  };

  // Apply frameless/transparent settings only if NOT in dev mode and if enabled in config
  if (WINDOW_CONFIG.useFramelessWindow && !isDev) {
    windowOptions.frame = false;
    windowOptions.transparent = WINDOW_CONFIG.transparent;
    windowOptions.hasShadow = false; // Shadow can interfere with transparency

    // On Windows, thickFrame allows resizing of frameless windows
    if (process.platform === "win32") {
      windowOptions.thickFrame = true;
    }
    // Don't set backgroundColor when transparent is true on Windows
    // This allows true transparency
  }

  mainWindow = new BrowserWindow(windowOptions);

  // Load the HTML file
  mainWindow.loadFile("index.html");

  // Open DevTools only in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  chatService = new ChatService();
  // Handle window closed
  mainWindow.on("closed", () => {
    chatService?.destroy();
    mainWindow = null;
  });

  // Initialize chat service with the main window
  chatService?.initialize(mainWindow);
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle chat messages from renderer process
ipcMain.on("chat-message", async (_event, message: string) => {
  await chatService?.handleMessage(message);
});

// Handle window close from renderer process
ipcMain.on("close-window", () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

// Store initial bounds for resizing
let initialBounds: { x: number; y: number; width: number; height: number } = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
};

// Handle resize start
ipcMain.on("start-resize", (_event, _data) => {
  if (mainWindow) {
    const bounds = mainWindow.getBounds();
    initialBounds = { ...bounds };
  }
});

// Handle window resizing
ipcMain.on(
  "resize-window",
  (_event, data: { direction: string; deltaX: number; deltaY: number }) => {
    if (!mainWindow) return;

    const { direction, deltaX, deltaY } = data;
    const minWidth = 400;
    const minHeight = 500;

    let newBounds = { ...initialBounds };

    // Calculate new bounds based on direction
    switch (direction) {
      case "n": // North (top)
        newBounds.height = Math.max(minHeight, initialBounds.height - deltaY);
        newBounds.y =
          initialBounds.y + (initialBounds.height - newBounds.height);
        break;
      case "s": // South (bottom)
        newBounds.height = Math.max(minHeight, initialBounds.height + deltaY);
        break;
      case "e": // East (right)
        newBounds.width = Math.max(minWidth, initialBounds.width + deltaX);
        break;
      case "w": // West (left)
        newBounds.width = Math.max(minWidth, initialBounds.width - deltaX);
        newBounds.x = initialBounds.x + (initialBounds.width - newBounds.width);
        break;
      case "ne": // Northeast
        newBounds.height = Math.max(minHeight, initialBounds.height - deltaY);
        newBounds.y =
          initialBounds.y + (initialBounds.height - newBounds.height);
        newBounds.width = Math.max(minWidth, initialBounds.width + deltaX);
        break;
      case "nw": // Northwest
        newBounds.height = Math.max(minHeight, initialBounds.height - deltaY);
        newBounds.y =
          initialBounds.y + (initialBounds.height - newBounds.height);
        newBounds.width = Math.max(minWidth, initialBounds.width - deltaX);
        newBounds.x = initialBounds.x + (initialBounds.width - newBounds.width);
        break;
      case "se": // Southeast
        newBounds.height = Math.max(minHeight, initialBounds.height + deltaY);
        newBounds.width = Math.max(minWidth, initialBounds.width + deltaX);
        break;
      case "sw": // Southwest
        newBounds.height = Math.max(minHeight, initialBounds.height + deltaY);
        newBounds.width = Math.max(minWidth, initialBounds.width - deltaX);
        newBounds.x = initialBounds.x + (initialBounds.width - newBounds.width);
        break;
    }

    mainWindow.setBounds(newBounds);
  }
);

// Handle manual window dragging
ipcMain.on(
  "drag-window",
  (_event, data: { deltaX: number; deltaY: number }) => {
    if (!mainWindow) return;

    const { deltaX, deltaY } = data;
    const bounds = mainWindow.getBounds();

    mainWindow.setBounds({
      x: bounds.x + deltaX,
      y: bounds.y + deltaY,
      width: bounds.width,
      height: bounds.height,
    });
  }
);
