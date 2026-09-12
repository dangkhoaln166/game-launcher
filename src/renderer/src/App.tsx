import { useState, useEffect } from 'react'
import PS5Layout from './components/PS5Layout'
import { Game } from '../../shared/types'

const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
  Promise.race([promise, new Promise<T>((res) => setTimeout(() => res(fallback), ms))])

function App() {
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // null = no active session; string = gameId currently being tracked
  const [activeSessionGameId, setActiveSessionGameId] = useState<string | null>(null)

  useEffect(() => {
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
  }, [])

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
      // We no longer optimistically clear here.
      // We wait for the main process to send 'playtime-updated' so we know it actually processed the end session.
    }
  }

  /** Called when AddGameModal successfully adds games. */
  const handleGamesAdded = (newGames: Game[]) => {
    setGames((prev) => {
      const existingIds = new Set(prev.map((g) => g.id))
      const unique = newGames.filter((g) => !existingIds.has(g.id))
      return unique.length ? [...prev, ...unique] : prev
    })
  }

  /** Called when a game is updated in EditGameModal */
  const handleGameUpdated = (updatedGame: Game) => {
    setGames((prev) => prev.map((g) => (g.id === updatedGame.id ? updatedGame : g)))
  }

  /** Called when a game is deleted from context menu */
  const handleGameDeleted = (id: string) => {
    setGames((prev) => prev.filter((g) => g.id !== id))
  }

  const handleGamesReordered = (reorderedGames: Game[]) => {
    setGames(reorderedGames)
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="w-screen h-screen bg-black overflow-hidden font-sans select-none text-white">
      <PS5Layout
        games={games}
        isLoading={isLoading}
        onPlay={handlePlayGame}
        onSettings={() => alert('Chức năng cài đặt (Comming soon)')}
        onGamesAdded={handleGamesAdded}
        onGameUpdated={handleGameUpdated}
        onGameDeleted={handleGameDeleted}
        onGamesReordered={handleGamesReordered}
        activeSessionGameId={activeSessionGameId}
        onStopSession={handleStopSession}
      />
    </div>
  )
}

export default App
