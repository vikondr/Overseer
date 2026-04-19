const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs   = require('fs');
const path = require('path');
const path = require('path');

if (require('electron-squirrel-startup')) app.quit();

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 750,
    minWidth: 860,
    minHeight: 580,
    backgroundColor: '#020617',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
}

// Folder selection + file reading
const ALLOWED_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'psd', 'ai', 'fig'];

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (result.canceled) return null;
  const folderPath = result.filePaths[0];
  const entries = fs.readdirSync(folderPath);
  const files = entries
    .filter((f) => {
      const ext = path.extname(f).slice(1).toLowerCase();
      return ALLOWED_EXTS.includes(ext);
    })
    .map((f) => {
      const filePath = path.join(folderPath, f);
      return { name: f, path: filePath, size: fs.statSync(filePath).size };
    });
  return { folderPath, folderName: path.basename(folderPath), files };
});

ipcMain.handle('read-file', async (_, filePath) => {
  const buf = fs.readFileSync(filePath);
  return { data: Array.from(buf), name: path.basename(filePath) };
});

// Google OAuth flow — opens a modal window, intercepts the callback redirect
ipcMain.handle('open-google-auth', (event, baseUrl) => {
  return new Promise((resolve, reject) => {
    const parent = BrowserWindow.getFocusedWindow();
    const authWin = new BrowserWindow({
      width: 520,
      height: 680,
      parent: parent ?? undefined,
      modal: !!parent,
      backgroundColor: '#020617',
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    authWin.loadURL(`${baseUrl}/oauth2/authorization/google`);

    const intercept = (_, url) => {
      if (!url.includes('/auth/callback')) return;
      const token = new URL(url).searchParams.get('token');
      if (token) {
        resolve(token);
        authWin.destroy();
      }
    };

    authWin.webContents.on('will-redirect', intercept);
    authWin.webContents.on('will-navigate', intercept);
    authWin.on('closed', () => reject(new Error('cancelled')));
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});