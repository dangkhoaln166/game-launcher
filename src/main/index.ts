import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { exec } from 'child_process'
import * as crypto from 'crypto'
import { join, basename, extname, resolve } from 'path'
import * as fs from 'fs-extra'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { GameScanner } from './GameScanner'
import { MetadataFetcher } from './MetadataFetcher'
import { Game, AppSettings } from '../shared/types'

const gameStore = new Map<string, Game>()

let currentSettings: AppSettings = {
  fullscreen: true,
  autoStart: false,
  uiSoundEnabled: true,
  activeAmbientId: 'default-ambient-1',
  activeSfxId: 'default-sfx-1',
  customAudioTracks: [],
  ambientVolume: 0.2,
  sfxVolume: 0.2
}

// ── Session Manager ────────────────────────────────────────────────────────────
// Tracks active play sessions: gameId → start timestamp (ms)
const activeSessions = new Map<string, number>()

function logDebug(msg: string) {
  if (is.dev) console.log(`[Session Debug] ${msg}`)
}

/** Finalise a session: calc elapsed time, persist to DB, ALWAYS notify renderer. */
function finaliseSession(gameId: string, reason: string): void {
  const startTime = activeSessions.get(gameId)
  if (startTime === undefined) {
    logDebug(`finaliseSession(${gameId}) called by ${reason} but session already ended.`)
    return // already finalised
  }
  activeSessions.delete(gameId)

  const elapsedMs = Date.now() - startTime
  const game = gameStore.get(gameId)

  logDebug(
    `finaliseSession(${gameId}) called by ${reason}. Elapsed: ${elapsedMs}ms. Game found: ${!!game}`
  )
  if (!game) return

  // Save playtime if at least 5 seconds were played (rounds up, min 1 minute)
  if (elapsedMs >= 5000) {
    const addedMinutes = Math.max(1, Math.round(elapsedMs / 60000))
    game.playTime = (game.playTime || 0) + addedMinutes
    gameStore.set(gameId, game)
    saveStore()
    logDebug(`[Session SAVED] ${gameId}: +${addedMinutes} min (total: ${game.playTime} min)`)
  } else {
    logDebug(`[Session DISCARDED] ${gameId}: too short (< 5s)`)
  }

  // ALWAYS notify renderer — even 0 minutes, so UI clears the live timer
  BrowserWindow.getAllWindows().forEach((w) => {
    if (!w.isDestroyed()) {
      w.webContents.send('playtime-updated', { gameId, playTime: game.playTime ?? 0 })
    }
  })
}

const getDbPath = () => join(app.getPath('userData'), 'games.json')

const loadStore = () => {
  try {
    const p = getDbPath()
    if (fs.existsSync(p)) {
      const data = fs.readJsonSync(p)
      if (Array.isArray(data)) {
        data.forEach((g) => gameStore.set(g.id, g))
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

const getSettingsPath = () => join(app.getPath('userData'), 'settings.json')

const loadSettings = () => {
  try {
    const p = getSettingsPath()
    if (fs.existsSync(p)) {
      const data = fs.readJsonSync(p)
      currentSettings = { ...currentSettings, ...data }
    }
  } catch (e) {
    console.error('Failed to load Settings', e)
  }
}

const saveSettingsFile = (settings: AppSettings) => {
  try {
    currentSettings = settings
    fs.writeJsonSync(getSettingsPath(), settings)
    app.setLoginItemSettings({
      openAtLogin: settings.autoStart,
      path: process.execPath
    })
    
    // Apply fullscreen to all windows
    BrowserWindow.getAllWindows().forEach((w) => {
      w.setFullScreen(settings.fullscreen)
    })
  } catch (e) {
    console.error('Failed to save Settings', e)
  }
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    fullscreen: currentSettings.fullscreen,
    autoHideMenuBar: true,
    frame: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
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
  loadSettings()
  
  // Apply auto-start on startup just in case
  app.setLoginItemSettings({
    openAtLogin: currentSettings.autoStart,
    path: process.execPath
  })

  // ── IPC: Window Controls ───────────────────────────────────────────────
  ipcMain.on('window-minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })
  ipcMain.on('window-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      if (win.isFullScreen()) {
        win.setFullScreen(false)
        win.unmaximize()
      } else if (win.isMaximized()) {
        win.unmaximize()
      } else {
        win.maximize()
      }
    }
  })
  ipcMain.on('window-close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  // ── IPC: get-games ─────────────────────────────────────────────────────
  ipcMain.handle('get-games', async () => {
    // Return from store first (already-saved games)
    if (gameStore.size > 0) return [...gameStore.values()]

    // First run: auto-scan Steam + Epic
    const [steamGames, epicGames] = await Promise.all([
      GameScanner.scanSteamGames().catch(() => [] as Game[]),
      GameScanner.scanEpicGames().catch(() => [] as Game[])
    ])
    const all = [...steamGames, ...epicGames]
    all.forEach((g) => gameStore.set(g.id, g))
    saveStore()
    return all
  })

  // ── IPC: launch-game ────────────────────────────────────────────────────
  ipcMain.on('launch-game', (_, game: Game) => {
    logDebug(`launch-game requested for ${game.id} (${game.title})`)
    if (activeSessions.has(game.id)) {
      logDebug(`game ${game.id} already active.`)
      return
    }

    // Update play stats
    const existing = gameStore.get(game.id)
    if (existing) {
      existing.playCount = (existing.playCount || 0) + 1
      existing.lastPlayed = Date.now()
      gameStore.set(game.id, existing)
      saveStore()
    }

    // Start session timer
    activeSessions.set(game.id, Date.now())

    if (game.platform === 'steam' || game.platform === 'epic') {
      // URL protocol launch — session must be ended manually by renderer
      if (game.exePath) shell.openExternal(game.exePath)
    } else {
      // Custom/crack game — track via process exit
      const child = GameScanner.launchCustomGame(game)
      if (child && child.pid) {
        let alreadyFinalised = false
        let pollId: NodeJS.Timeout

        const endSession = (reason: string) => {
          if (!alreadyFinalised) {
            alreadyFinalised = true
            clearInterval(pollId)
            finaliseSession(game.id, reason)
          }
        }

        // 1. Standard event listeners
        child.on('exit', () => endSession('child-exit'))
        child.on('error', () => {
          endSession('child-error')
          // Fallback UI clear if it errored out immediately
          activeSessions.delete(game.id)
          BrowserWindow.getAllWindows().forEach((w) => {
            if (!w.isDestroyed()) {
              w.webContents.send('playtime-updated', {
                gameId: game.id,
                playTime: gameStore.get(game.id)?.playTime ?? 0
              })
            }
          })
        })

        // 2. Aggressive polling fallback using OS-level process check
        // Sometimes child.on('exit') fails to fire on Windows if the game leaves zombie child processes.
        pollId = setInterval(() => {
          if (!activeSessions.has(game.id)) {
            clearInterval(pollId)
            return
          }
          try {
            // Signal 0 checks for process existence without killing it
            process.kill(child.pid as number, 0)
          } catch (e) {
            // If process.kill throws, the process no longer exists
            endSession('process-kill-throw')
          }
        }, 2000)
      } else {
        // spawn() returned null or failed to get PID
        logDebug(`spawn() failed for ${game.id}`)
        activeSessions.delete(game.id)
      }
    }
  })

  // ── IPC: end-session (renderer-triggered, for Steam/Epic/Manual fallback) ─
  ipcMain.on('end-session', (_, gameId: string) => {
    finaliseSession(gameId, 'ipc-end-session')
  })

  // ── IPC: select-exe-file ────────────────────────────────────────────────
  ipcMain.handle('select-exe-file', async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(focusedWindow ?? BrowserWindow.getAllWindows()[0], {
      title: 'Chọn file game',
      filters: [
        { name: 'Executable', extensions: ['exe', 'lnk'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
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
      developer: 'Custom Game'
    }
    return game
  })

  // ── IPC: select-image-file ───────────────────────────────────────────
  ipcMain.handle('select-image-file', async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(focusedWindow ?? BrowserWindow.getAllWindows()[0], {
      title: 'Chọn ảnh bìa game',
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }],
      properties: ['openFile']
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

  // ── IPC: import-audio ──────────────────────────────────────────────────
  ipcMain.handle('import-audio', async (_, type: 'ambient' | 'sfx') => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg'] }]
    })
    if (canceled || filePaths.length === 0) return null

    const srcPath = filePaths[0]
    const audioDir = join(app.getPath('userData'), 'audio')
    await fs.ensureDir(audioDir)

    const id = crypto.randomUUID()
    const ext = extname(srcPath)
    const destPath = join(audioDir, `${id}${ext}`)
    
    await fs.copy(srcPath, destPath)
    
    return {
      id,
      name: basename(srcPath, ext),
      path: destPath,
      type,
      isBuiltIn: false
    }
  })

  // ── IPC: delete-audio-file ─────────────────────────────────────────────
  ipcMain.handle('delete-audio-file', async (_, filePath: string) => {
    try {
      const audioDir = join(app.getPath('userData'), 'audio')
      const resolvedPath = resolve(filePath)
      
      // Security check: Only allow deleting files inside the app's audio directory
      if (!resolvedPath.startsWith(audioDir)) {
        console.warn('Unauthorized file deletion attempt:', filePath)
        return false
      }

      if (fs.existsSync(resolvedPath)) {
        await fs.remove(resolvedPath)
      }
      return true
    } catch (e) {
      console.error('Failed to delete audio file', e)
      return false
    }
  })

  // ── IPC: Settings ───────────────────────────────────────────────────────
  ipcMain.handle('get-settings', () => {
    return currentSettings
  })

  ipcMain.handle('save-settings', (_, settings: AppSettings) => {
    saveSettingsFile(settings)
  })

  // ── IPC: fetch-metadata ─────────────────────────────────────────────────
  ipcMain.handle('fetch-metadata', async (_, title: string) => {
    return await MetadataFetcher.fetchMetadata(title)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  // Save all active sessions before the app exits
  for (const gameId of activeSessions.keys()) {
    finaliseSession(gameId, 'app-quit')
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
