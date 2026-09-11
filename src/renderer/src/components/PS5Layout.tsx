import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Game } from '../../../shared/types'
import { useGamepad } from '../hooks/useGamepad'
import { Search, Settings as SettingsIcon, MoreHorizontal, User, Play, Pen, Trash2, FolderOpen, Heart, ArrowDownAz, Activity, GripVertical } from 'lucide-react'
import AddGameModal from './AddGameModal'
import EditGameModal from './EditGameModal'
import ConfirmModal from './ConfirmModal'
import SortGridModal from './SortGridModal'

// ─── Props ────────────────────────────────────────────────────────────────────
interface PS5LayoutProps {
  games: Game[]
  isLoading?: boolean
  onPlay: (game: Game) => void
  onSettings?: () => void
  /** Called with newly added games so parent can append them to state without a reload */
  onGamesAdded?: (newGames: Game[]) => void
  onGameUpdated?: (game: Game) => void
  onGameDeleted?: (id: string) => void
}

// ─── Loading screen ───────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center w-screen h-screen bg-black text-white">
      <motion.div
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
        className="text-2xl font-light tracking-widest"
      >
        LOADING LIBRARY…
      </motion.div>
    </div>
  )
}

// ─── Empty screen ─────────────────────────────────────────────────────────────
function EmptyScreen({ onAddGame }: { onAddGame: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center w-screen h-screen bg-black text-white gap-4">
      <div className="text-5xl">🎮</div>
      <h1 className="text-2xl font-semibold">No games found</h1>
      <p className="text-white/50 text-sm">Add games using the + button</p>
      <button
        onClick={onAddGame}
        className="mt-2 px-8 py-2.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/80 transition"
      >
        Add Game
      </button>
    </div>
  )
}

// ─── Animated background (cross-fade, no black flash) ────────────────────────
function Background({ game }: { game: Game }) {
  return (
    <div className="absolute inset-0" style={{ zIndex: 0 }}>
      {/* The AnimatePresence keeps old image until new one is done fading in */}
      <AnimatePresence>
        <motion.img
          key={game.id}
          src={game.heroBackground}
          alt=""
          aria-hidden
          onError={(e) => {
            e.currentTarget.src =
              'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070'
          }}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ willChange: 'opacity', filter: 'brightness(0.5)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        />
      </AnimatePresence>
      {/* Static gradient overlays — outside AnimatePresence so they never flicker */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"
        style={{ zIndex: 1, pointerEvents: 'none' }}
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent"
        style={{ zIndex: 1, pointerEvents: 'none' }}
      />
      <div
        className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-black/55 to-transparent"
        style={{ zIndex: 1, pointerEvents: 'none' }}
      />
    </div>
  )
}

// ─── Game card ────────────────────────────────────────────────────────────────
interface CardProps {
  game: Game
  isSelected: boolean
  onSelect: () => void
  onLaunch: () => void
}

function GameCard({ game, isSelected, onSelect, onLaunch }: CardProps) {
  return (
    <div
      style={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        // Extra top padding gives room for the scale transform without clipping
        paddingTop: 24,
        paddingBottom: 0,
        position: 'relative',
      }}
    >
      <motion.div
        onClick={isSelected ? onLaunch : onSelect}
        // Only animate GPU-composited properties (transform, opacity)
        animate={{
          scale: isSelected ? 1.2 : 1,
          y: isSelected ? -6 : 0,
          opacity: isSelected ? 1 : 0.75,
        }}
        whileHover={{ opacity: 1 }}
        whileTap={{ scale: isSelected ? 1.12 : 0.93 }}
        transition={{ type: 'spring', stiffness: 360, damping: 28, mass: 0.7 }}
        style={{
          width: 96,
          height: 96,
          willChange: 'transform, opacity',
          borderRadius: 20,
          overflow: 'hidden',
          cursor: 'pointer',
          position: 'relative',
          zIndex: isSelected ? 30 : 20,
          transformOrigin: 'bottom center',
          boxShadow: isSelected
            ? '0 0 0 3px rgba(255,255,255,1), 0 16px 40px rgba(0,0,0,0.9)'
            : '0 4px 12px rgba(0,0,0,0.5)',
        }}
      >
        <img
          src={game.coverArt}
          alt={game.title}
          draggable={false}
          onError={(e) => {
            e.currentTarget.src =
              'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=900'
          }}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </motion.div>

      {/* Game label — shown only for selected card */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: '100%',
              marginTop: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                background: '#fff',
                color: '#000',
                padding: '1px 4px',
                borderRadius: 3,
              }}
            >
              PS5
            </span>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 500, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
              {game.title}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main layout ──────────────────────────────────────────────────────────────
export default function PS5Layout({ games, isLoading, onPlay, onSettings, onGamesAdded, onGameUpdated, onGameDeleted }: PS5LayoutProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [time, setTime] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null)
  
  // Search & Sort states
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchActive, setIsSearchActive] = useState(false)
  const [sortMode, setSortMode] = useState<'manual' | 'alphabetical' | 'most-played' | 'favorites'>('manual')
  const [isSortGridOpen, setIsSortGridOpen] = useState(false)

  const trackRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef<number>(-1)
  const isInitialLoadRef = useRef(true)

  // Derived state
  const displayedGames = useMemo(() => {
    let result = [...games]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(g => g.title.toLowerCase().includes(q) || g.developer?.toLowerCase().includes(q))
    }
    
    switch (sortMode) {
      case 'alphabetical':
        result.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'most-played':
        result.sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
        break
      case 'favorites':
        result.sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0))
        break
      case 'manual':
      default:
        result.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
        break
    }
    return result
  }, [games, searchQuery, sortMode])

  // Index clamping
  const clamp = useCallback(
    (i: number) => Math.max(0, Math.min(displayedGames.length - 1, i)),
    [displayedGames.length]
  )

  const safeIndex = clamp(selectedIndex)
  const selectedGame = displayedGames[safeIndex] ?? null

  // Real-time clock
  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Auto-jump to newly added game when games array grows after initial load
  useEffect(() => {
    if (displayedGames.length === 0) return
    if (isInitialLoadRef.current) {
      // Mark initial load done once we first get games
      isInitialLoadRef.current = false
      prevLengthRef.current = displayedGames.length
      return
    }
    if (displayedGames.length > prevLengthRef.current) {
      // Jump to the first newly added game
      const firstNewIdx = prevLengthRef.current
      setSelectedIndex(firstNewIdx)
    }
    prevLengthRef.current = displayedGames.length
  }, [displayedGames.length])

  // Shared modal element — must be rendered even during loading/empty states
  const addModal = (
    <>
      <AddGameModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onGameAdded={(newGames) => {
          setIsAddModalOpen(false)
          onGamesAdded?.(newGames)
          // Immediately jump to the first new game's position
          // (prevLengthRef.current holds current count before append)
          if (prevLengthRef.current >= 0) {
            setSelectedIndex(prevLengthRef.current)
          }
        }}
      />
      <EditGameModal
        isOpen={isEditModalOpen}
        game={selectedGame}
        onClose={() => setIsEditModalOpen(false)}
        onGameUpdated={(updated) => {
          setIsEditModalOpen(false)
          onGameUpdated?.(updated)
        }}
      />
      <ConfirmModal
        isOpen={!!gameToDelete}
        title="Xóa khỏi thư viện"
        message={`Bạn có chắc muốn xóa "${gameToDelete?.title}" khỏi thư viện không? Dữ liệu game trên máy vẫn sẽ được giữ nguyên.`}
        onConfirm={async () => {
          if (gameToDelete) {
            await window.api.deleteGame(gameToDelete.id)
            onGameDeleted?.(gameToDelete.id)
            setGameToDelete(null)
          }
        }}
        onCancel={() => setGameToDelete(null)}
      />
      <SortGridModal
        isOpen={isSortGridOpen}
        games={games}
        onClose={() => setIsSortGridOpen(false)}
        onSaveOrder={async (updatedGames) => {
          await window.api.saveGames(updatedGames)
          onGamesAdded?.([]) // Trigger re-render in App
          setSortMode('manual') // Auto switch to manual mode when order is saved
        }}
      />
    </>
  )

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Close menu if open when navigating
      if (isMenuOpen && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Escape')) {
        setIsMenuOpen(false)
      }
      
      if (e.key === 'ArrowLeft') setSelectedIndex((p) => clamp(p - 1))
      if (e.key === 'ArrowRight') setSelectedIndex((p) => clamp(p + 1))
      if (e.key === 'Enter' && selectedGame && !isMenuOpen && !isEditModalOpen && !isAddModalOpen && !gameToDelete) {
        onPlay(selectedGame)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [clamp, selectedGame, onPlay, isMenuOpen, isEditModalOpen, isAddModalOpen, gameToDelete])

  // Gamepad support
  useGamepad({
    onLeft: () => setSelectedIndex((p) => clamp(p - 1)),
    onRight: () => setSelectedIndex((p) => clamp(p + 1)),
    onAction: () => selectedGame && onPlay(selectedGame),
    onOptions: () => onSettings?.(),
  })

  // Scroll track so selected card is always visible near the left
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const card = track.children[selectedIndex] as HTMLElement
    if (!card) return
    const left = card.offsetLeft - 64
    track.scrollTo({ left, behavior: 'smooth' })
  }, [selectedIndex])

  // ── Early returns — wrap with addModal so IPC works even before games load
  if (isLoading) return <>{<LoadingScreen />}{addModal}</>
  if (!games.length) return (
    <>
      <EmptyScreen onAddGame={() => setIsAddModalOpen(true)} />
      {addModal}
    </>
  )
  if (!selectedGame) return <>{<LoadingScreen />}{addModal}</>

  const CARD_GAP = 12

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-black text-white select-none"
      style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      {/* ── Layer 0: Animated background (no pointer events) ─────────── */}
      <div
        className="absolute inset-0"
        style={{ zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}
      >
        <Background game={selectedGame} />
      </div>

      {/* ── Layer 1: UI chrome (pointer events active) ────────────────── */}
      <div
        className="absolute inset-0 flex flex-col"
        style={{ zIndex: 10, pointerEvents: 'auto', padding: '36px 60px 44px' }}
      >
        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <div className="flex justify-between items-center mb-4">
          {/* Left nav */}
          <div className="flex items-center gap-5">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg leading-none hover:bg-white/25 transition-colors"
              aria-label="Add Game"
            >
              +
            </button>
            <button className="text-xl font-semibold text-white hover:text-white/75 transition-colors">
              Games
            </button>
            <button className="text-xl font-medium text-white/40 hover:text-white/65 transition-colors">
              Media
            </button>
          </div>

          {/* Right: icons + clock */}
          <div className="flex items-center gap-6 z-10">
            {/* Search */}
            <div className="relative flex items-center">
              <AnimatePresence>
                {isSearchActive && (
                  <motion.input
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 200, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    autoFocus
                    placeholder="Tìm kiếm game..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => !searchQuery && setIsSearchActive(false)}
                    className="absolute right-10 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm text-white placeholder-white/50 outline-none backdrop-blur-md"
                  />
                )}
              </AnimatePresence>
              <button
                onClick={() => setIsSearchActive(true)}
                className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                <Search size={22} />
              </button>
            </div>

            {/* Sort Menu */}
            <div className="group relative flex items-center">
              <button className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                {sortMode === 'manual' && <GripVertical size={22} />}
                {sortMode === 'alphabetical' && <ArrowDownAz size={22} />}
                {sortMode === 'most-played' && <Activity size={22} />}
                {sortMode === 'favorites' && <Heart size={22} />}
              </button>
              
              <div className="absolute top-full right-0 mt-2 w-48 py-2 bg-[#1a1a24]/90 backdrop-blur-xl border border-white/10 rounded-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button onClick={() => setSortMode('manual')} className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors ${sortMode==='manual'?'text-white font-medium':'text-white/60'}`}>Sắp xếp thủ công</button>
                <button onClick={() => setSortMode('alphabetical')} className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors ${sortMode==='alphabetical'?'text-white font-medium':'text-white/60'}`}>Theo chữ cái (A-Z)</button>
                <button onClick={() => setSortMode('most-played')} className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors ${sortMode==='most-played'?'text-white font-medium':'text-white/60'}`}>Chơi nhiều nhất</button>
                <button onClick={() => setSortMode('favorites')} className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors ${sortMode==='favorites'?'text-white font-medium':'text-white/60'}`}>Yêu thích</button>
                <div className="h-px bg-white/10 my-1" />
                <button onClick={() => setIsSortGridOpen(true)} className="w-full text-left px-4 py-2 text-sm text-white/90 hover:text-white hover:bg-white/10 transition-colors">Chỉnh sửa thứ tự...</button>
              </div>
            </div>

            <button
              onClick={onSettings}
              className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              <SettingsIcon size={22} />
            </button>
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gray-600 border border-white/20 flex items-center justify-center overflow-hidden">
                <User size={18} />
              </div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-black" />
            </div>
            <span className="text-xl font-light tabular-nums">{time}</span>
          </div>
        </div>

        {/* ── Carousel ────────────────────────────────────────────────── */}
        {/*
          Use overflowX:hidden + overflowY:visible so the scroll clips
          horizontally but the scale transform is NOT vertically clipped.
        */}
        <div style={{ width: '100%', overflowX: 'hidden', overflowY: 'visible' }}>
          <div
            ref={trackRef}
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: CARD_GAP,
              paddingLeft: 4,
              overflowX: 'scroll',
              overflowY: 'visible',
              scrollbarWidth: 'none',
            }}
          >
            {displayedGames.map((game, i) => (
              <GameCard
                key={game.id}
                game={game}
                isSelected={i === selectedIndex}
                onSelect={() => setSelectedIndex(i)}
                onLaunch={() => onPlay(game)}
              />
            ))}
          </div>
        </div>

        {/* ── Push bottom content to screen bottom ─────────────────────── */}
        <div style={{ flex: 1 }} />

        {/* ── Bottom info (animates per game change) ───────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedGame.id}
            className="flex justify-between items-end"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Left: title + CTA */}
            <div className="flex flex-col gap-3 max-w-lg">
              <div className="self-start px-2 py-0.5 rounded bg-white/10 border border-white/12 backdrop-blur-sm text-[10px] font-semibold uppercase tracking-widest text-white/75">
                {selectedGame.developer ?? 'Game'}
              </div>

              <h1 className="text-3xl font-light leading-snug tracking-tight text-white drop-shadow-lg">
                {selectedGame.title}
              </h1>

              <p className="text-sm text-white/50">
                {selectedGame.playTime
                  ? `${Math.round(selectedGame.playTime / 60)}h played`
                  : 'Not played yet'}
              </p>

              <div className="flex items-center gap-3 mt-1 relative">
                <button
                  onClick={() => onPlay(selectedGame)}
                  className="flex items-center gap-2 px-7 py-2.5 rounded-full font-semibold text-base bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 backdrop-blur-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/40"
                >
                  <Play size={15} className="fill-current" />
                  Play
                </button>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="w-11 h-11 rounded-full flex items-center justify-center bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 backdrop-blur-md transition-all duration-200 focus:outline-none"
                >
                  <MoreHorizontal size={18} />
                </button>

                {/* ── Context Menu ─────────────────────────────────────── */}
                <AnimatePresence>
                  {isMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-[140px] bottom-full mb-3 w-56 bg-black/80 backdrop-blur-xl border border-white/15 rounded-2xl p-2 flex flex-col gap-1 shadow-2xl"
                      style={{ zIndex: 50 }}
                    >
                      <button
                        onClick={async () => {
                          setIsMenuOpen(false)
                          const updated = { ...selectedGame, isFavorite: !selectedGame.isFavorite }
                          await window.api.updateGame(updated)
                          onGameUpdated?.(updated)
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                      >
                        <Heart size={16} fill={selectedGame.isFavorite ? 'currentColor' : 'none'} className={selectedGame.isFavorite ? 'text-red-400' : ''} />
                        {selectedGame.isFavorite ? 'Bỏ Yêu thích' : 'Yêu thích'}
                      </button>

                      <button
                        onClick={() => {
                          setIsMenuOpen(false)
                          setIsEditModalOpen(true)
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                      >
                        <Pen size={16} /> Chỉnh sửa thông tin
                      </button>
                      <button
                        onClick={() => {
                          setIsMenuOpen(false)
                          if (selectedGame.exePath) {
                            window.api.openGameFolder(selectedGame.exePath)
                          }
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                      >
                        <FolderOpen size={16} /> Mở thư mục gốc
                      </button>
                      <div className="h-px w-full bg-white/10 my-1" />
                      <button
                        onClick={async () => {
                          setIsMenuOpen(false)
                          setGameToDelete(selectedGame)
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
                      >
                        <Trash2 size={16} /> Xóa khỏi thư viện
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right: play time badge */}
            {selectedGame.playTime && selectedGame.playTime > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl mb-1">
                <div className="w-3 h-3 rounded-full border-2 border-white/60" />
                <span className="text-sm font-semibold tabular-nums text-white">
                  {Math.round(selectedGame.playTime / 60)}h
                </span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Add Game Modal ──────────────────────────────────────────── */}
      {addModal}
    </div>
  )
}
