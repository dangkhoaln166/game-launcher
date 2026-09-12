export type Platform = 'steam' | 'epic' | 'crack' | 'custom'

export interface Game {
  id: string // App ID (Steam/Epic) or random ID (manual)
  title: string
  platform: Platform
  exePath?: string // or URL protocol like steam://run/123
  heroBackground?: string // URL or local path to hero image
  coverArt?: string // URL or local path to cover image
  logoUrl?: string // URL or local path to transparent logo
  lastPlayed?: number // timestamp
  playTime?: number // in minutes
  developer?: string

  // New fields for sorting and management
  playCount?: number
  isFavorite?: boolean
  orderIndex?: number // manual drag-drop order
  notes?: string // personal notes for the game
  collection?: string // Category/Genre folder for the game
}

export interface AudioTrack {
  id: string
  name: string
  path: string // built-in identifier or local file path
  type: 'ambient' | 'sfx'
  isBuiltIn?: boolean
}

export interface AppSettings {
  fullscreen: boolean
  autoStart: boolean
  uiSoundEnabled: boolean

  // Audio settings
  activeAmbientId?: string
  activeSfxId?: string
  customAudioTracks?: AudioTrack[]
  ambientVolume?: number
  sfxVolume?: number
}
