import { app, BrowserWindow, Menu, Tray, dialog } from "electron";
import path from 'path';

import { init as ipcMainInit, checkInitSuccess, verifyAuthConfig } from "./ipcMainHandler";
import Store from "electron-store";

const store = new Store();

const isMac = process.platform === 'darwin'
const isWin = process.platform === 'win32'
const assetsDir = `${__dirname}${path.sep}..${path.sep}..${path.sep}assets`
const appIconPath = path.join(assetsDir, `app${isMac ? '.icns' : '.ico'}`)

const isMainDev = process.env.NODE_ENV === 'development'
const isGUIDev = process.env.DEBUG_UI === 'true'

if (isWin) app.setAppUserModelId('annoying-comment-viewer')

let mainWindow: BrowserWindow
let settingsWindow: BrowserWindow
let initWindow: BrowserWindow
let tray: Tray

function openInitWindow() {
  initWindow = new BrowserWindow({
    width: !isMainDev ? 500 : 1000,
    height: !isMainDev ? 500 : 1000,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false
    },
    icon: path.join(appIconPath),
  })
  if (isMainDev) initWindow.webContents.openDevTools()
  ipcMainInit(initWindow)
  return new Promise((resolve, reject) => {
    initWindow.loadFile(`assets${path.sep}html${path.sep}init.html`)
    initWindow.on("closed", () => {
      // 少なくともIDとSecretが入力されていれば次に進む（後のverifyで詳細チェックされる）
      const id = store.get("oauth2ClientId");
      const secret = store.get("oauth2ClientSecret");
      if (id && secret) {
        resolve("")
      } else {
        reject("Setup cancelled")
      }
    })
  })
}

function openSettingsWindow() {
  settingsWindow = new BrowserWindow({
    width: !isMainDev ? 500 : 1000,
    height: !isMainDev ? 500 : 1000,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false
    },
    icon: path.join(appIconPath),
  })
  if (isMainDev) settingsWindow.webContents.openDevTools()
  ipcMainInit(settingsWindow, () => updateTrayMenu())
  return new Promise((resolve, reject) => {
    settingsWindow.loadFile(`assets${path.sep}html${path.sep}settings.html`)
    settingsWindow.on("closed", () => {
      if (checkInitSuccess()) {
        resolve("")
      }
      else {
        reject("")
      }
    })
  })
}


function createWindow() {
  mainWindow = new BrowserWindow({
    width: isGUIDev ? 1280 : 1920,
    height: isGUIDev ? 720 : 1080,
    center: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false
    },
    frame: isGUIDev,
    icon: path.join(appIconPath),
    transparent: !isGUIDev,
    backgroundColor: isGUIDev ? 'rgba(100, 100, 100, 0)' : undefined,
    alwaysOnTop: !isGUIDev
  })
  if (!isGUIDev) {
    mainWindow.setIgnoreMouseEvents(true)
  }

  mainWindow.loadFile(`public${path.sep}index.html`)

  if (isGUIDev) mainWindow.webContents.openDevTools({ mode: 'detach' })
}

function updateTrayMenu() {
  if (!tray) return;

  const isStickyMode = store.get('enableStickyMode', false) as boolean;
  const isTtsEnabled = store.get('enableTts', false) as boolean;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'TTS読み上げを有効にする',
      type: 'checkbox',
      checked: isTtsEnabled,
      click: (menuItem) => {
        store.set('enableTts', menuItem.checked);
        updateTrayMenu();
      }
    },
    {
      label: 'Stickyモード（画面を埋める）',
      type: 'checkbox',
      checked: isStickyMode,
      click: (menuItem) => {
        store.set('enableStickyMode', menuItem.checked);
        if (mainWindow) {
          mainWindow.webContents.send('sticky-mode-changed', menuItem.checked);
        }
        updateTrayMenu();
      }
    },
    {
      label: '画面をリセット（全消去）',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('clear-chat');
        }
      }
    },
    { type: 'separator' },
    { label: '終了', role: 'quit' }
  ]);

  tray.setContextMenu(contextMenu);
}

function createTray() {
  tray = new Tray(appIconPath);
  tray.setTitle(app.name);
  tray.setToolTip('comment-viewer が起動中');
  updateTrayMenu();
}

app.whenReady().then(async () => {
  try {
    // 1. OAuth設定と通信状態の検証
    let authVerified = false;
    while (!authVerified) {
      const result = await verifyAuthConfig();

      if (result.success) {
        authVerified = true;
      } else if (result.reason === 'network_error') {
        // ネットワークエラー時は再試行の選択肢を出す
        const choice = dialog.showMessageBoxSync({
          type: 'error',
          title: 'ネットワークエラー',
          message: 'YouTube APIへの接続に失敗しました。',
          detail: 'インターネット接続を確認してください。\n\nエラー内容: ' + (result.error?.message || '不明'),
          buttons: ['再試行', '終了'],
          defaultId: 0,
          cancelId: 1
        });

        if (choice === 1) { // 終了を選択
          app.quit();
          return;
        }
        // ループの最初に戻り、再試行
      } else {
        // 認証情報の不足、または無効な場合は初期設定画面(init)を開く
        await openInitWindow();
        // Initウィンドウが閉じられた後、ループの最初に戻って再検証
      }
    }

    // 2. 設定画面(settings)を開く
    await openSettingsWindow();

    createTray()
    createWindow()

    // メインウィンドウが閉じられたらアプリを終了する
    mainWindow.on('closed', () => {
      app.quit()
    })

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  } catch (err) {
    console.log("Startup process was cancelled or failed:", err);
    app.quit();
  }
})

app.on('window-all-closed', function () {
  if (!isMac) app.quit()
})
