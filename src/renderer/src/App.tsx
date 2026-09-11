import { useState, useEffect } from 'react'
import PS5Layout from './components/PS5Layout'
import { Game } from '../../shared/types'

const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
  Promise.race([promise, new Promise<T>((res) => setTimeout(() => res(fallback), ms))])

function App() {
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    // 8-second hard timeout so the loading screen never freezes
    withTimeout(window.api.getGames(), 8000, [])
      .then((loaded) => { setGames(loaded); setIsLoading(false) })
      .catch(() => { setGames([]); setIsLoading(false) })
  }, [])

  const handlePlayGame = (game: Game) => {
    window.api.launchGame(game)
  }

  /** Called when AddGameModal successfully adds games.
   *  Appends only truly NEW games (dedup by id) — no IPC round-trip. */
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
      />
    </div>
  )
}

export default App
