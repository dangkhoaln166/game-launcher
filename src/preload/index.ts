import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // ── Game list ──────────────────────────────────────────────────────────
  getGames: () => ipcRenderer.invoke('get-games'),

  // ── Launch ─────────────────────────────────────────────────────────────
  launchGame: (game: unknown) => ipcRenderer.send('launch-game', game),

  // ── Add Game ───────────────────────────────────────────────────────────
  /** Opens native file-picker and returns a partial Game object (or null if cancelled) */
  selectExeFile: () => ipcRenderer.invoke('select-exe-file'),

  /** Opens native image-picker and returns a file:// URL (or null if cancelled) */
  selectImageFile: () => ipcRenderer.invoke('select-image-file'),

  /** Scans Steam library, returns found games */
  scanSteamGames: () => ipcRenderer.invoke('scan-steam-games'),

  /** Scans Epic Games manifests, returns found games */
  scanEpicGames: () => ipcRenderer.invoke('scan-epic-games'),

  /** Persists an array of Game objects to the local DB */
  saveGames: (games: unknown[]) => ipcRenderer.invoke('save-games', games),

  /** Updates an existing Game object */
  updateGame: (game: unknown) => ipcRenderer.invoke('update-game', game),

  /** Deletes a game by ID */
  deleteGame: (id: string) => ipcRenderer.invoke('delete-game', id),

  /** Opens the folder containing the game's executable */
  openGameFolder: (exePath: string) => ipcRenderer.invoke('open-game-folder', exePath),

  // ── Playtime tracking ──────────────────────────────────────────────────
  /** Manually end a session (for Steam/Epic where process exit can't be detected) */
  endSession: (gameId: string) => ipcRenderer.send('end-session', gameId),

  /**
   * Subscribe to playtime-updated events pushed by the main process.
   * Returns an unsubscribe function.
   */
  onPlaytimeUpdated: (callback: (data: { gameId: string; playTime: number }) => void) => {
    const handler = (_: unknown, data: { gameId: string; playTime: number }) => callback(data)
    ipcRenderer.on('playtime-updated', handler)
    return () => ipcRenderer.removeListener('playtime-updated', handler)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
