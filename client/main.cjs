const { app, BrowserWindow, session, protocol, net, systemPreferences } = require('electron');
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
