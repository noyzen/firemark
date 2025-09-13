
const { app, BrowserWindow, Menu, nativeTheme, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const WindowState = require('electron-window-state');
const { exec } = require('child_process');

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

let mainWindow;

function createWindow() {
  const mainWindowState = WindowState({
    defaultWidth: 1200,
    defaultHeight: 800
  });

  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    minWidth: 940,
    minHeight: 600,
    icon: path.join(__dirname, '../../appicon.png'),
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: false,
    backgroundColor: '#121212',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindowState.manage(mainWindow);

  mainWindow.on('maximize', () => mainWindow.webContents.send('window:maximize-changed', true));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window:maximize-changed', false));

  Menu.setApplicationMenu(null);

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  if (!app.isPackaged) {
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.webContents.on('before-input-event', (event, input) => {
    const isCtrlOrCmd = process.platform === 'darwin' ? input.meta : input.control;
    if (isCtrlOrCmd && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow.webContents.isDevToolsOpened()
        ? mainWindow.webContents.closeDevTools()
        : mainWindow.webContents.openDevTools({ mode: 'detach' });
      event.preventDefault();
    }
  });
}

app.on('ready', createWindow);

// --- IPC Handlers for Firemark ---

ipcMain.handle('dialog:openImages', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif'] }]
  });
  if (canceled) return [];
  return filePaths;
});

ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    if (canceled || filePaths.length === 0) return null;
    return filePaths[0];
});

ipcMain.handle('file:save', async (event, { dataUrl, directory, originalName, format }) => {
    try {
        const mimeType = `image/${format}`;
        const base64Data = dataUrl.replace(/^data:.+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const parsedPath = path.parse(originalName);
        const newName = `${parsedPath.name}-watermarked.${format}`;
        const outputPath = path.join(directory, newName);
        await fs.promises.writeFile(outputPath, buffer);
        return { success: true, path: outputPath };
    } catch (error) {
        console.error('Failed to save file:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('app:open-folder', (event, folderPath) => {
    shell.openPath(folderPath);
});

// Placeholder for AI Ghosting feature - prevents renderer errors
ipcMain.handle('app:ghost-watermark', (event, { dataUrl, subtlety }) => {
    console.error(`'ghostWatermark' feature is not implemented in the main process.`);
    // Return original dataUrl to avoid breaking the processing chain
    return { success: false, error: 'AI Ghosting not implemented.' };
});

ipcMain.handle('font:getList', () => {
  return new Promise((resolve) => {
    let command;
    switch (process.platform) {
      case 'win32':
        command = 'powershell -noprofile -command "(New-Object System.Drawing.Text.InstalledFontCollection).Families.Name"';
        break;
      case 'linux':
        command = 'fc-list : family';
        break;
      case 'darwin':
        command = 'system_profiler SPFontsDataType | grep "Family:" | cut -d: -f2 | sort -u';
        break;
      default:
        return resolve([]);
    }

    exec(command, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error getting system fonts: ${error.message}`);
        return resolve([]); // Gracefully fail
      }
      if (stderr) {
        console.warn(`Stderr while getting system fonts: ${stderr}`);
      }
      
      const fonts = stdout.split('\n')
        .map(font => {
          if (process.platform === 'linux' && font.includes(',')) {
            return font.split(',')[0].trim();
          }
          return font.trim();
        })
        .filter(font => font.length > 0 && !font.startsWith('.'));
      
      resolve(Array.from(new Set(fonts)).sort());
    });
  });
});

// --- Window Control Handlers ---

ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (!mainWindow) return false;
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  return mainWindow.isMaximized();
});
ipcMain.handle('window:close', () => mainWindow?.close());
ipcMain.handle('window:isMaximized', () => mainWindow ? mainWindow.isMaximized() : false);

app.on('window-all-closed', () => app.quit());
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
