const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

// Instead of using electron-is-dev, use this approach
let isDev = false;
try {
  isDev = !app.isPackaged;
} catch (error) {
  // If app.isPackaged is not available, use this fallback
  isDev = process.env.NODE_ENV !== 'production';
}

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the React app
  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );

  // Open DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Create application menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          click() {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About CRPF Promotion Forecaster',
          click() {
            // Show about dialog
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              title: 'About CRPF Promotion Forecaster',
              message: 'CRPF Promotion Forecaster v1.0.0',
              detail: 'An application to simulate and forecast officer promotions based on retirement dates and vacancies.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});