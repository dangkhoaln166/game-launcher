import { useState, useEffect, useRef } from 'react'
import PS5Layout from './components/PS5Layout'
import SettingsModal from './components/SettingsModal'
import { Game, AppSettings } from '../../shared/types'
import ambientAudio from './assets/ambient_carefree.mp3'

const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
  Promise.race([promise, new Promise<T>((res) => setTimeout(() => res(fallback), ms))])

function App() {
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // null = no active session; string = gameId currently being tracked
  const [activeSessionGameId, setActiveSessionGameId] = useState<string | null>(null)
  
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Load Games
    setIsLoading(true)
    withTimeout(window.api.getGames(), 8000, [])
      .then((loaded) => {
        setGames(loaded)
        setIsLoading(false)
      })
      .catch(() => {
        setGames([])
        setIsLoading(false)
      })

    // Load Settings
    window.api.getSettings().then((loadedSettings) => {
      setSettings(loadedSettings)
    })
  }, [])

  // ── Ambient Audio Logic ────────────────────────────────────────────────
  useEffect(() => {
    if (!settings) return

    if (settings.uiSoundEnabled) {
      // Find active ambient track
      const tracks = settings.customAudioTracks || []
      const activeId = settings.activeAmbientId || 'default-ambient-1'
      const track = tracks.find(t => t.id === activeId)
      
      const audioSrc = track && !track.isBuiltIn ? `file://${track.path}` : ambientAudio

      // Recreate audio if source changes
      if (!audioRef.current || audioRef.current.src !== audioSrc) {
        if (audioRef.current) {
          audioRef.current.pause()
        }
        
        const audio = new Audio(audioSrc)
        audio.loop = true
        audio.volume = settings.ambientVolume ?? 0.2
        audioRef.current = audio
      }

      // Resume playing
      audioRef.current.play().catch((e) => {
        console.log('Auto-play prevented:', e)
      })
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }
  }, [settings?.uiSoundEnabled, settings?.activeAmbientId, settings?.customAudioTracks])

  // Update volume separately to avoid restarting playback
  useEffect(() => {
    if (audioRef.current && settings?.ambientVolume !== undefined) {
      audioRef.current.volume = settings.ambientVolume
    }
  }, [settings?.ambientVolume])

  // ── Subscribe to playtime-updated from main process ──────────────────────
  useEffect(() => {
    const unsub = window.api.onPlaytimeUpdated(({ gameId, playTime }) => {
      // Clear the active session for this game
      setActiveSessionGameId((prev) => (prev === gameId ? null : prev))
      // Patch the updated playTime into state
      setGames((prev) => prev.map((g) => (g.id === gameId ? { ...g, playTime } : g)))
    })
    return unsub
  }, [])

  const handlePlayGame = (game: Game) => {
    setActiveSessionGameId(game.id)
    window.api.launchGame(game)
  }

  const handleStopSession = () => {
    if (activeSessionGameId) {
      window.api.endSession(activeSessionGameId)
    }
  }

  const handleGamesAdded = (newGames: Game[]) => {
    setGames((prev) => {
      const existingIds = new Set(prev.map((g) => g.id))
      const unique = newGames.filter((g) => !existingIds.has(g.id))
      return unique.length ? [...prev, ...unique] : prev
    })
  }

  const handleGameUpdated = (updatedGame: Game) => {
    setGames((prev) => prev.map((g) => (g.id === updatedGame.id ? updatedGame : g)))
  }

  const handleGameDeleted = (id: string) => {
    setGames((prev) => prev.filter((g) => g.id !== id))
  }

  const handleGamesReordered = (reorderedGames: Game[]) => {
    setGames(reorderedGames)
  }

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings)
    window.api.saveSettings(newSettings)
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="w-screen h-screen bg-black overflow-hidden font-sans select-none text-white">
      <PS5Layout
        games={games}
        isLoading={isLoading}
        onPlay={handlePlayGame}
        onSettings={() => setIsSettingsOpen(true)}
        onGamesAdded={handleGamesAdded}
        onGameUpdated={handleGameUpdated}
        onGameDeleted={handleGameDeleted}
        onGamesReordered={handleGamesReordered}
        activeSessionGameId={activeSessionGameId}
        onStopSession={handleStopSession}
        uiSoundEnabled={settings?.uiSoundEnabled ?? true}
        activeSfxPath={
          settings?.activeSfxId === 'default-sfx-2' ? 'synth-click' :
          settings?.activeSfxId === 'default-sfx-3' ? 'synth-digital' :
          settings?.customAudioTracks?.find(t => t.id === settings?.activeSfxId)?.path || 'default'
        }
        sfxVolume={settings?.sfxVolume ?? 0.2}
      />

      {settings && (
        <SettingsModal
          isOpen={isSettingsOpen}
          settings={settings}
          onClose={() => {
            // Restore settings from main process in case of cancel
            window.api.getSettings().then(setSettings)
            setIsSettingsOpen(false)
          }}
          onChange={(preview) => {
            setSettings(preview)
          }}
          onSave={handleSaveSettings}
        />
      )}
    </div>
  )
}

export default App

