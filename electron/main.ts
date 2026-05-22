import { app, BrowserWindow, globalShortcut } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createKioskWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    kiosk: true, // Locked fullscreen mode
    alwaysOnTop: true,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webgl: true // Hardware acceleration for Three.js
    }
  });

  // Load Vite dev server or production build
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../frontend/dist/index.html'));
  }

  // Block exit shortcuts
  globalShortcut.register('CommandOrControl+W', () => {
    console.log('Blocked window close');
  });
  globalShortcut.register('Alt+F4', () => {
    console.log('Blocked Alt+F4');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createKioskWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createKioskWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
