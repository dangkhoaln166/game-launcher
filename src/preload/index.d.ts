import { ElectronAPI } from '@electron-toolkit/preload'
import { Game, AppSettings, AudioTrack } from '../shared/types'

export interface API {
  getGames: () => Promise<Game[]>
  launchGame: (game: Game) => void
  selectExeFile: () => Promise<Game | null>
  selectImageFile: () => Promise<string | null>
  scanSteamGames: () => Promise<Game[]>
  scanEpicGames: () => Promise<Game[]>
  saveGames: (games: Game[]) => Promise<{ saved: number }>
  updateGame: (game: Game) => Promise<boolean>
  deleteGame: (id: string) => Promise<boolean>
  openGameFolder: (exePath: string) => Promise<void>
  // Playtime tracking
  endSession: (gameId: string) => void
  onPlaytimeUpdated: (callback: (data: { gameId: string; playTime: number }) => void) => () => void
  
  // Settings
  getSettings: () => Promise<import('../shared/types').AppSettings>
  saveSettings: (settings: import('../shared/types').AppSettings) => Promise<void>

  // Metadata
  fetchMetadata: (title: string) => Promise<{ title: string; developer?: string; heroBackground?: string; coverArt?: string } | null>

  // Audio
  importAudio: (type: 'ambient' | 'sfx') => Promise<{ name: string; path: string } | null>
  deleteAudioFile: (path: string) => Promise<boolean>

  // Window controls
  minimizeWindow: () => void
  maximizeWindow: () => void
  closeWindow: () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
