import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import * as crypto from 'crypto'
import { join, basename, extname } from 'path'
import * as fs from 'fs-extra'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { GameScanner } from './GameScanner'
import { Game } from '../shared/types'

const gameStore = new Map<string, Game>()

const getDbPath = () => join(app.getPath('userData'), 'games.json')

const loadStore = () => {
  try {
    const p = getDbPath()
    if (fs.existsSync(p)) {
      const data = fs.readJsonSync(p)
      if (Array.isArray(data)) {
        data.forEach(g => gameStore.set(g.id, g))
      }
    }
  } catch (e) {
    console.error('Failed to load DB', e)
  }
}

const saveStore = () => {
  try {
    fs.writeJsonSync(getDbPath(), [...gameStore.values()])
  } catch (e) {
    console.error('Failed to save DB', e)
  }
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Suppress Chromium cache errors in console
app.commandLine.appendSwitch('disable-gpu-disk-cache')
app.commandLine.appendSwitch('disable-disk-cache')

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.ps5launcher')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Load persistence on startup
  loadStore()

  // ── IPC: get-games ─────────────────────────────────────────────────────
  ipcMain.handle('get-games', async () => {
    // Return from store first (already-saved games)
    if (gameStore.size > 0) return [...gameStore.values()]

    // First run: auto-scan Steam + Epic
    const [steamGames, epicGames] = await Promise.all([
      GameScanner.scanSteamGames().catch(() => [] as Game[]),
      GameScanner.scanEpicGames().catch(() => [] as Game[]),
    ])
    const all = [...steamGames, ...epicGames]
    all.forEach((g) => gameStore.set(g.id, g))
    saveStore()
    return all
  })

  // ── IPC: launch-game ────────────────────────────────────────────────────
  ipcMain.on('launch-game', (_, game: Game) => {
    const existing = gameStore.get(game.id)
    if (existing) {
      existing.playCount = (existing.playCount || 0) + 1
      existing.lastPlayed = Date.now()
      gameStore.set(game.id, existing)
      saveStore()
    }

    if (game.platform === 'steam' || game.platform === 'epic') {
      if (game.exePath) shell.openExternal(game.exePath)
    } else {
      GameScanner.launchGame(game)
    }
  })

  // ── IPC: select-exe-file ────────────────────────────────────────────────
  ipcMain.handle('select-exe-file', async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(focusedWindow ?? BrowserWindow.getAllWindows()[0], {
      title: 'Chọn file game',
      filters: [
        { name: 'Executable', extensions: ['exe', 'lnk'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    })

    if (result.canceled || !result.filePaths.length) return null

    const exePath = result.filePaths[0]
    const filename = basename(exePath, extname(exePath))
    const id = `custom-${crypto.randomUUID()}`

    const game: Game = {
      id,
      title: filename,
      platform: 'custom',
      exePath,
      heroBackground: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070',
      coverArt: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=900',
      developer: 'Custom Game',
    }
    return game
  })

  // ── IPC: select-image-file ───────────────────────────────────────────
  ipcMain.handle('select-image-file', async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(focusedWindow ?? BrowserWindow.getAllWindows()[0], {
      title: 'Chọn ảnh bìa game',
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }],
      properties: ['openFile'],
    })
    if (result.canceled || !result.filePaths.length) return null
    
    // Read file and convert to base64 to completely bypass Electron's webSecurity and cache issues
    try {
      const filePath = result.filePaths[0]
      const ext = extname(filePath).toLowerCase().substring(1)
      const mimeType = ext === 'jpg' ? 'jpeg' : ext
      const base64 = fs.readFileSync(filePath, 'base64')
      return `data:image/${mimeType};base64,${base64}`
    } catch (e) {
      console.error('Failed to read image file:', e)
      return null
    }
  })

  // ── IPC: scan-steam-games ───────────────────────────────────────────────
  ipcMain.handle('scan-steam-games', async () => {
    return await GameScanner.scanSteamGames()
  })

  // ── IPC: scan-epic-games ────────────────────────────────────────────────
  ipcMain.handle('scan-epic-games', async () => {
    return await GameScanner.scanEpicGames()
  })

  // ── IPC: save-games ─────────────────────────────────────────────────────
  ipcMain.handle('save-games', async (_, games: Game[]) => {
    if (!Array.isArray(games)) throw new Error('Expected array of games')
    games.forEach((g) => {
      if (g?.id) gameStore.set(g.id, g)
    })
    saveStore()
    return { saved: games.length }
  })

  // ── IPC: update-game ────────────────────────────────────────────────────
  ipcMain.handle('update-game', async (_, game: Game) => {
    if (game?.id) {
      gameStore.set(game.id, game)
      saveStore()
      return true
    }
    return false
  })

  // ── IPC: delete-game ────────────────────────────────────────────────────
  ipcMain.handle('delete-game', async (_, id: string) => {
    const res = gameStore.delete(id)
    if (res) saveStore()
    return res
  })

  // ── IPC: open-game-folder ───────────────────────────────────────────────
  ipcMain.handle('open-game-folder', async (_, exePath: string) => {
    shell.showItemInFolder(exePath)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
