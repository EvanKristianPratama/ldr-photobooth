const { app, BrowserWindow, session, protocol, net, systemPreferences, ipcMain } = require('electron');
const path = require('path');
const url = require('url');

const isDev = !app.isPackaged;

// Mendaftarkan custom protocol 'app://' agar bisa melayani file statis
// dengan path absolut yang benar (menggantikan file:// yang bermasalah)
protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    corsEnabled: true,
  }
}]);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: "FUTU - LDR Photobooth",
  });

  // Mengizinkan semua permission request (kamera, audio, clipboard, dll)
  session.defaultSession.setPermissionCheckHandler(() => true);

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });

  // Menentukan URL berdasarkan mode dev atau build statis
  const startUrl = isDev
    ? 'http://localhost:3000'
    : 'app://./index.html';

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.handle('print-image', async (event, imageUrl, options = {}) => {
  const workerWindow = new BrowserWindow({
    show: false, // Hidden window
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load simple HTML document containing the full-size printable image strip
  workerWindow.loadURL(`data:text/html;charset=utf-8,
    <html>
      <body style="margin:0;padding:0;display:flex;justify-content:center;align-items:center;height:100vh;background:%23fff;">
        <img src="${imageUrl}" style="max-width:100%;max-height:100%;object-fit:contain;" />
      </body>
    </html>
  `);

  return new Promise((resolve) => {
    workerWindow.webContents.once('did-finish-load', () => {
      // Direct silent print commands
      workerWindow.webContents.print({
        silent: options.silent ?? true,
        printBackground: true,
        margins: { marginType: 'none' },
        pageSize: options.pageSize || 'A4', // default A6 maps well to standard 4R prints
        ...options
      }, (success, errorType) => {
        workerWindow.close(); // Tear down the hidden window
        if (success) {
          resolve({ success: true });
        } else {
          console.error('Electron silent print failed:', errorType);
          resolve({ success: false, error: errorType });
        }
      });
    });
  });
});

app.whenReady().then(async () => {
  // Di mode produksi, daftarkan handler untuk custom protocol 'app://'
  // yang memetakan semua request ke folder 'out/'
  if (!isDev) {
    const outDir = path.join(__dirname, 'out');

    protocol.handle('app', (request) => {
      let urlPath = new URL(request.url).pathname;

      // Decode URI components (spasi, karakter khusus, dll)
      urlPath = decodeURIComponent(urlPath);

      // Default ke index.html jika path adalah root
      if (urlPath === '/' || urlPath === '') {
        urlPath = '/index.html';
      }

      const filePath = path.join(outDir, urlPath);
      return net.fetch(url.pathToFileURL(filePath).toString());
    });
  }

  // Di macOS, minta izin kamera di level sistem operasi
  // Tanpa ini, getUserMedia akan gagal meskipun permission handler sudah di-set
  if (process.platform === 'darwin') {
    await systemPreferences.askForMediaAccess('camera');
    await systemPreferences.askForMediaAccess('microphone');
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
