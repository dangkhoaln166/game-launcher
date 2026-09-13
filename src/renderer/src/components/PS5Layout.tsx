import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Game } from '../../../shared/types'
import { useGamepad } from '../hooks/useGamepad'
import {
  Search,
  Settings as SettingsIcon,
  MoreHorizontal,
  User,
  Play,
  Pen,
  Trash2,
  FolderOpen,
  Heart,
  ArrowDownAz,
  Activity,
  GripVertical,
  X as XIcon,
  FileText,
  Mail,
  Square,
  Clock,
  Globe,
  Minus,
  Maximize
} from 'lucide-react'
import AddGameModal from './AddGameModal'
import EditGameModal from './EditGameModal'
import ConfirmModal from './ConfirmModal'
import SortGridModal from './SortGridModal'
import NoteModal from './NoteModal'
import DashboardView from './DashboardView'

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
  onGamesReordered?: (games: Game[]) => void
  /** gameId currently being session-tracked; null if no active session */
  activeSessionGameId?: string | null
  /** Called when user manually stops a session (Steam/Epic) */
  onStopSession: () => void
  uiSoundEnabled: boolean
  activeSfxPath?: string
  sfxVolume?: number
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
        position: 'relative'
      }}
    >
      <motion.div
        onClick={isSelected ? onLaunch : onSelect}
        // Only animate GPU-composited properties (transform, opacity)
        animate={{
          scale: isSelected ? 1.2 : 1,
          y: isSelected ? -6 : 0,
          opacity: isSelected ? 1 : 0.75
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
            : '0 4px 12px rgba(0,0,0,0.5)'
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
        {/* Favorite badge */}
        {game.isFavorite && (
          <div
            style={{
              position: 'absolute',
              top: 5,
              right: 5,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Heart size={10} fill="#f87171" color="#f87171" />
          </div>
        )}
        {/* Note badge */}
        {game.notes && game.notes.trim() && (
          <div
            style={{
              position: 'absolute',
              top: 5,
              left: 5,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Mail size={9} color="#fbbf24" />
          </div>
        )}
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
              pointerEvents: 'none'
            }}
          >
            <span
              style={{
                color: '#fff',
                fontSize: 13,
                fontWeight: 500,
                textShadow: '0 1px 4px rgba(0,0,0,0.6)'
              }}
            >
              {game.title}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Activity Card ────────────────────────────────────────────────────────────
interface ActivityCardProps {
  title: string
  subtitle?: string
  icon: React.ReactNode
  bgImage?: string
  color?: string
  onClick: () => void
  delay?: number
}

function ActivityCard({ title, subtitle, icon, bgImage, color = 'bg-white/10', onClick, delay = 0 }: ActivityCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative w-56 h-32 md:w-72 md:h-44 rounded-[16px] md:rounded-[20px] overflow-hidden cursor-pointer group flex flex-col justify-end p-4 md:p-5 border border-white/10 shadow-xl shrink-0 ${bgImage ? 'bg-black/40' : color}`}
      style={{ backdropFilter: 'blur(16px)' }}
    >
      {bgImage && (
        <>
          <img src={bgImage} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-75 transition-opacity duration-500" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        </>
      )}
      {!bgImage && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      )}
      <div className="relative z-10 flex flex-col gap-1 md:gap-2">
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white mb-1 shadow-sm">
          {icon}
        </div>
        <h3 className="text-white font-bold text-lg md:text-xl leading-tight drop-shadow-md">{title}</h3>
        {subtitle && <p className="text-white/70 text-[10px] md:text-sm font-semibold uppercase tracking-widest drop-shadow-sm">{subtitle}</p>}
      </div>
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
         <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white/80 backdrop-blur-sm">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
         </div>
      </div>
    </motion.div>
  )
}

// ─── Main layout ──────────────────────────────────────────────────────────────
export default function PS5Layout({
  games,
  isLoading,
  onPlay,
  onSettings,
  onGamesAdded,
  onGameUpdated,
  onGameDeleted,
  onGamesReordered,
  activeSessionGameId,
  onStopSession,
  uiSoundEnabled,
  activeSfxPath,
  sfxVolume = 0.2
}: PS5LayoutProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [time, setTime] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const sfxAudioRef = useRef<HTMLAudioElement | null>(null)
  const isInitialSFX = useRef(true)

  const playHoverSound = useCallback(() => {
    if (!uiSoundEnabled) return
    try {
      if (activeSfxPath && activeSfxPath !== 'default' && !activeSfxPath.startsWith('synth-')) {
        const audioSrc = `file://${activeSfxPath}`
        if (!sfxAudioRef.current || sfxAudioRef.current.src !== audioSrc) {
          sfxAudioRef.current = new Audio(audioSrc)
        }
        sfxAudioRef.current.volume = sfxVolume
        sfxAudioRef.current.currentTime = 0
        sfxAudioRef.current.play().catch(() => {})
        return
      }

      // Fallback to Web Audio Synth for default or built-in synth sounds
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') ctx.resume()
      
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      if (activeSfxPath === 'synth-click') {
        osc.type = 'square'
        osc.frequency.setValueAtTime(800, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.02)
        gain.gain.setValueAtTime(sfxVolume * 0.25, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.02)
      } else if (activeSfxPath === 'synth-digital') {
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(400, ctx.currentTime)
        osc.frequency.setValueAtTime(600, ctx.currentTime + 0.02)
        gain.gain.setValueAtTime(sfxVolume * 0.25, ctx.currentTime)
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.05)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.05)
      } else {
        // Cheerful, soft "bop" sound (default)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(600, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.04)
        gain.gain.setValueAtTime(sfxVolume, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.04)
      }
    } catch (e) {
      // Ignore errors
    }
  }, [uiSoundEnabled, activeSfxPath, sfxVolume])

  useEffect(() => {
    if (isInitialSFX.current) {
      isInitialSFX.current = false
      return
    }
    playHoverSound()
  }, [selectedIndex, playHoverSound])

  // Search & Sort states
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchActive, setIsSearchActive] = useState(false)
  const [sortMode, setSortMode] = useState<'manual' | 'alphabetical' | 'most-played' | 'favorites'>(
    'manual'
  )
  const [isSortGridOpen, setIsSortGridOpen] = useState(false)
  const [isNoteOpen, setIsNoteOpen] = useState(false)

  const trackRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef<number>(-1)
  const isInitialLoadRef = useRef(true)

  // Collections & Dashboard state
  const [activeTab, setActiveTab] = useState<string>('Games')
  const collections = useMemo(() => {
    const set = new Set<string>()
    games.forEach((g) => {
      if (g.collection) set.add(g.collection)
    })
    return Array.from(set).sort()
  }, [games])

  // ── Live session timer (seconds elapsed for currently active game) ─────────
  const [sessionSeconds, setSessionSeconds] = useState(0)

  // Reset + tick whenever activeSessionGameId changes
  useEffect(() => {
    if (!activeSessionGameId) {
      setSessionSeconds(0)
      return
    }
    setSessionSeconds(0)
    const id = setInterval(() => setSessionSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [activeSessionGameId])

  // Derived state
  const displayedGames = useMemo(() => {
    let result = [...games]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (g) => g.title.toLowerCase().includes(q) || g.developer?.toLowerCase().includes(q)
      )
    }

    if (activeTab === 'Favorites') {
      result = result.filter((g) => g.isFavorite)
    } else if (activeTab !== 'Games' && activeTab !== 'Dashboard') {
      result = result.filter((g) => g.collection === activeTab)
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
  }, [games, searchQuery, sortMode, activeTab])

  // Index wrapping for carousel
  const wrapIndex = useCallback(
    (i: number) => {
      if (displayedGames.length === 0) return 0
      if (i < 0) return displayedGames.length - 1
      if (i >= displayedGames.length) return 0
      return i
    },
    [displayedGames.length]
  )

  const safeIndex = wrapIndex(selectedIndex)
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
          onGamesReordered?.(updatedGames)
          setSortMode('manual')
        }}
      />
      <NoteModal
        isOpen={isNoteOpen}
        gameTitle={selectedGame?.title ?? ''}
        initialNote={selectedGame?.notes ?? ''}
        onClose={() => setIsNoteOpen(false)}
        onSave={async (note) => {
          if (!selectedGame) return
          const updated = { ...selectedGame, notes: note }
          await window.api.updateGame(updated)
          onGameUpdated?.(updated)
        }}
      />
    </>
  )

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Escape: close menu, or deactivate search
      if (e.key === 'Escape') {
        if (isMenuOpen) {
          setIsMenuOpen(false)
          return
        }
        if (isSearchActive) {
          setSearchQuery('')
          setIsSearchActive(false)
          return
        }
      }
      // Close menu if open when navigating
      if (isMenuOpen && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        setIsMenuOpen(false)
      }
      // Don't navigate while search input is focused
      if (isSearchActive) return

      if (e.key === 'ArrowLeft') setSelectedIndex((p) => wrapIndex(p - 1))
      if (e.key === 'ArrowRight') setSelectedIndex((p) => wrapIndex(p + 1))
      if (
        e.key === 'Enter' &&
        selectedGame &&
        !isMenuOpen &&
        !isEditModalOpen &&
        !isAddModalOpen &&
        !gameToDelete
      ) {
        onPlay(selectedGame)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    wrapIndex,
    selectedGame,
    onPlay,
    isMenuOpen,
    isEditModalOpen,
    isAddModalOpen,
    gameToDelete,
    isSearchActive
  ])

  // Gamepad support
  useGamepad({
    onLeft: () => setSelectedIndex((p) => wrapIndex(p - 1)),
    onRight: () => setSelectedIndex((p) => wrapIndex(p + 1)),
    onAction: () => selectedGame && onPlay(selectedGame),
    onOptions: () => onSettings?.()
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
  if (isLoading)
    return (
      <>
        {<LoadingScreen />}
        {addModal}
      </>
    )
  if (!games.length)
    return (
      <>
        <EmptyScreen onAddGame={() => setIsAddModalOpen(true)} />
        {addModal}
      </>
    )
  if (!selectedGame)
    return (
      <>
        {<LoadingScreen />}
        {addModal}
      </>
    )

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
      <div className="absolute top-0 inset-x-0 h-6" style={{ WebkitAppRegion: 'drag', zIndex: 50 } as any} />
      <div
        className="absolute inset-0 flex flex-col z-10 pointer-events-auto p-4 md:p-8 lg:px-14 lg:py-10 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'none' }}
      >
        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <div className="flex justify-between items-center w-full gap-4 mb-4 shrink-0">
          {/* Left nav */}
          <div className="flex items-center gap-3 md:gap-5 overflow-x-auto shrink pb-2 md:pb-0" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg leading-none hover:bg-white/25 transition-colors"
              aria-label="Add Game"
            >
              +
            </button>
            <button
              onClick={() => setActiveTab('Dashboard')}
              className={`text-xl transition-colors ${activeTab === 'Dashboard' ? 'font-semibold text-white' : 'font-medium text-white/40 hover:text-white/65'}`}
            >
              Thống kê
            </button>
            <button
              onClick={() => {
                setActiveTab('Games')
                setSelectedIndex(0)
              }}
              className={`text-xl transition-colors ${activeTab === 'Games' ? 'font-semibold text-white' : 'font-medium text-white/40 hover:text-white/65'}`}
            >
              Tất cả
            </button>
            <button
              onClick={() => {
                setActiveTab('Favorites')
                setSelectedIndex(0)
              }}
              className={`text-xl transition-colors flex items-center gap-1.5 ${activeTab === 'Favorites' ? 'font-semibold text-white' : 'font-medium text-white/40 hover:text-white/65'}`}
            >
              Yêu thích
            </button>
            {collections.map((col) => (
              <button
                key={col}
                onClick={() => {
                  setActiveTab(col)
                  setSelectedIndex(0)
                }}
                className={`text-xl transition-colors ${activeTab === col ? 'font-semibold text-white' : 'font-medium text-white/40 hover:text-white/65'}`}
              >
                {col}
              </button>
            ))}
          </div>

          {/* Right: icons + clock */}
          <div className="flex items-center gap-3 md:gap-6 z-10 shrink-0">
            {/* Search */}
            <div className="relative flex items-center">
              <AnimatePresence>
                {isSearchActive && (
                  <motion.div
                    className="absolute right-10 flex items-center"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 220, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <input
                      autoFocus
                      placeholder="Tìm kiếm game..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setSearchQuery('')
                          setIsSearchActive(false)
                        }
                      }}
                      className="w-full bg-white/10 border border-white/20 rounded-full pl-4 pr-8 py-1.5 text-sm text-white placeholder-white/50 outline-none backdrop-blur-md focus:border-white/40"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery('')
                        }}
                        className="absolute right-3 text-white/40 hover:text-white transition-colors"
                      >
                        <XIcon size={13} />
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                onClick={() => setIsSearchActive((v) => !v)}
                className={`p-2 rounded-full transition-colors ${
                  isSearchActive || searchQuery
                    ? 'bg-white/15 text-white'
                    : 'hover:bg-white/10 text-white/70 hover:text-white'
                }`}
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
                <button
                  onClick={() => setSortMode('manual')}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors ${sortMode === 'manual' ? 'text-white font-medium' : 'text-white/60'}`}
                >
                  Sắp xếp thủ công
                </button>
                <button
                  onClick={() => setSortMode('alphabetical')}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors ${sortMode === 'alphabetical' ? 'text-white font-medium' : 'text-white/60'}`}
                >
                  Theo chữ cái (A-Z)
                </button>
                <button
                  onClick={() => setSortMode('most-played')}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors ${sortMode === 'most-played' ? 'text-white font-medium' : 'text-white/60'}`}
                >
                  Chơi nhiều nhất
                </button>
                <button
                  onClick={() => setSortMode('favorites')}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors ${sortMode === 'favorites' ? 'text-white font-medium' : 'text-white/60'}`}
                >
                  Yêu thích
                </button>
                <div className="h-px bg-white/10 my-1" />
                <button
                  onClick={() => setIsSortGridOpen(true)}
                  className="w-full text-left px-4 py-2 text-sm text-white/90 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Chỉnh sửa thứ tự...
                </button>
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
            {/* Window Controls */}
            <div className="flex items-center gap-1.5 ml-2 border-l border-white/20 pl-4" style={{ WebkitAppRegion: 'no-drag' } as any}>
              <button onClick={() => window.api.minimizeWindow()} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Thu nhỏ">
                <Minus size={18} />
              </button>
              <button onClick={() => window.api.maximizeWindow()} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Phóng to / Thu nhỏ">
                <Maximize size={16} />
              </button>
              <button onClick={() => window.api.closeWindow()} className="p-1.5 text-white/60 hover:text-white hover:bg-red-500/80 rounded-full transition-colors" title="Đóng">
                <XIcon size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Main View Area ────────────────────────────────────────────── */}
        {activeTab === 'Dashboard' ? (
          <AnimatePresence>
            <DashboardView games={games} />
          </AnimatePresence>
        ) : (
          <>
            {/* ── Carousel ────────────────────────────────────────────────── */}
            <div className="shrink-0" style={{ width: '100%', overflowX: 'hidden', overflowY: 'visible' }}>
              <div
                ref={trackRef}
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: CARD_GAP,
                  paddingTop: 32,
                  paddingBottom: 24,
                  paddingLeft: 32,
                  paddingRight: 64,
                  overflowX: 'scroll',
                  overflowY: 'visible',
                  scrollbarWidth: 'none'
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
          </>
        )}

        {/* ── Push bottom content to screen bottom ─────────────────────── */}
        {activeTab !== 'Dashboard' && <div style={{ flex: 1 }} />}

        {/* ── Main Content (Cards + Bottom info) animates per game ─────── */}
        {activeTab !== 'Dashboard' && (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedGame.id}
              className="flex flex-col gap-6 md:gap-8 w-full shrink-0"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Activity Cards Row */}
              <div className="flex gap-3 md:gap-5 overflow-x-auto pb-4 w-full" style={{ scrollbarWidth: 'none' }}>
                <ActivityCard 
                  title={activeSessionGameId === selectedGame.id ? "Đang chơi" : "Tiếp tục chơi"}
                  subtitle={selectedGame.playTime ? `${Math.floor(selectedGame.playTime / 60)}h ${selectedGame.playTime % 60}m đã chơi` : "Bắt đầu hành trình"}
                  icon={<Play size={18} fill="currentColor" />}
                  bgImage={selectedGame.heroBackground || selectedGame.coverArt}
                  onClick={() => onPlay(selectedGame)}
                  delay={0.1}
                />
                
                <ActivityCard 
                  title="Thống kê cá nhân"
                  subtitle={selectedGame.playCount ? `Mở game ${selectedGame.playCount} lần` : "Chưa từng mở"}
                  icon={<Activity size={18} />}
                  color="bg-purple-900/40"
                  onClick={() => setActiveTab('Dashboard')}
                  delay={0.15}
                />

                <ActivityCard 
                  title={selectedGame.developer ? `NSX: ${selectedGame.developer}` : "Thông tin phát hành"}
                  subtitle={`Nền tảng: ${selectedGame.platform.toUpperCase()}`}
                  icon={<Globe size={18} />}
                  color="bg-blue-900/40"
                  onClick={() => setIsEditModalOpen(true)}
                  delay={0.2}
                />

                {selectedGame.notes && (
                  <ActivityCard 
                    title="Ghi chú & Cẩm nang"
                    subtitle="Xem nhanh"
                    icon={<FileText size={18} />}
                    color="bg-amber-900/40"
                    onClick={() => setIsNoteOpen(true)}
                    delay={0.25}
                  />
                )}

                {selectedGame.exePath && (
                  <ActivityCard 
                    title="Mở thư mục gốc"
                    subtitle="Local Files"
                    icon={<FolderOpen size={18} />}
                    color="bg-white/10"
                    onClick={() => window.api.openGameFolder(selectedGame.exePath!)}
                    delay={0.3}
                  />
                )}
              </div>

              {/* Bottom Info Row */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end w-full gap-4">
                {/* Left: title + CTA */}
            <div className="flex flex-col gap-3 md:gap-4 w-full">
              <div className="self-start px-2 py-0.5 md:px-3 md:py-1 rounded-md bg-white/10 border border-white/12 backdrop-blur-sm text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/80">
                {selectedGame.developer ?? 'Trò chơi'}
              </div>

              <div className="flex items-center gap-3 md:gap-4">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight tracking-tight text-white drop-shadow-2xl">
                  {selectedGame.title}
                </h1>
                {/* Inline favorite badge next to title */}
                {selectedGame.isFavorite && (
                  <Heart
                    size={18}
                    fill="#f87171"
                    color="#f87171"
                    className="flex-shrink-0 drop-shadow"
                  />
                )}
              </div>

              <p className="text-sm text-white/50">
                {activeSessionGameId === selectedGame.id
                  ? (() => {
                      const totalSecs = sessionSeconds + (selectedGame.playTime ?? 0) * 60
                      const h = Math.floor(totalSecs / 3600)
                      const m = Math.floor((totalSecs % 3600) / 60)
                      const s = totalSecs % 60
                      return h > 0
                        ? `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
                        : `${m}m ${String(s).padStart(2, '0')}s`
                    })()
                  : selectedGame.playTime
                    ? (() => {
                        const totalMins = selectedGame.playTime
                        const h = Math.floor(totalMins / 60)
                        const m = totalMins % 60
                        return h > 0 ? `${h}h ${m}m đã chơi` : `${m}m đã chơi`
                      })()
                    : 'Chưa từng chơi'}
              </p>

              {/* Notes preview — compact amber chip */}
              {selectedGame.notes && selectedGame.notes.trim() && (
                <motion.button
                  key={selectedGame.id + '-notechip'}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setIsNoteOpen(true)}
                  className="flex items-center gap-2 self-start px-3 py-1.5 rounded-xl bg-amber-400/15 border border-amber-400/25 backdrop-blur-sm hover:bg-amber-400/25 transition-colors cursor-pointer"
                >
                  <Mail size={12} className="text-amber-400 flex-shrink-0" />
                  <p className="text-xs text-amber-200/80 leading-relaxed line-clamp-1 max-w-[260px]">
                    {selectedGame.notes}
                  </p>
                </motion.button>
              )}

              <div className="flex items-center gap-3 mt-1 relative">
                {activeSessionGameId === selectedGame.id ? (
                  /* ── ACTIVE SESSION ───────────────────────────── */
                  <>
                    {/* NOW PLAYING badge */}
                    <motion.div
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-green-500/20 border border-green-400/40 text-green-300 text-sm font-semibold backdrop-blur-md"
                    >
                      <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                      <Clock size={13} />
                      {(() => {
                        const h = Math.floor(sessionSeconds / 3600)
                        const m = Math.floor((sessionSeconds % 3600) / 60)
                        const s = sessionSeconds % 60
                        return h > 0
                          ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
                          : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
                      })()}{' '}
                      Đang chơi
                    </motion.div>

                    {/* Stop Tracking — manual fallback for all games */}
                    <button
                      onClick={onStopSession}
                      title="Dừng theo dõi thời gian chơi"
                      className="w-11 h-11 rounded-full flex items-center justify-center bg-red-500/20 border border-red-400/30 text-red-400 hover:bg-red-500/30 backdrop-blur-md transition-all duration-200 focus:outline-none"
                    >
                      <Square size={15} fill="currentColor" />
                    </button>
                  </>
                ) : (
                  /* ── NORMAL ───────────────────────────────────── */
                  <button
                    onClick={() => onPlay(selectedGame)}
                    className="flex items-center gap-2 px-7 py-2.5 rounded-full font-semibold text-base bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 backdrop-blur-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/40"
                  >
                    <Play size={15} className="fill-current" />
                    Play
                  </button>
                )}

                {/* Quick favorite toggle */}
                <button
                  onClick={async () => {
                    const updated = { ...selectedGame, isFavorite: !selectedGame.isFavorite }
                    await window.api.updateGame(updated)
                    onGameUpdated?.(updated)
                  }}
                  title={selectedGame.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
                  className={`w-11 h-11 rounded-full flex items-center justify-center border backdrop-blur-md transition-all duration-200 focus:outline-none ${
                    selectedGame.isFavorite
                      ? 'bg-red-500/20 border-red-400/30 text-red-400 hover:bg-red-500/30'
                      : 'bg-white/10 border-white/20 text-white/60 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  <Heart size={17} fill={selectedGame.isFavorite ? 'currentColor' : 'none'} />
                </button>

                {/* Note button */}
                <button
                  onClick={() => setIsNoteOpen(true)}
                  title={selectedGame.notes ? 'Xem / Sửa ghi chú' : 'Thêm ghi chú'}
                  className={`w-11 h-11 rounded-full flex items-center justify-center border backdrop-blur-md transition-all duration-200 focus:outline-none ${
                    selectedGame.notes && selectedGame.notes.trim()
                      ? 'bg-amber-500/20 border-amber-400/30 text-amber-400 hover:bg-amber-500/30'
                      : 'bg-white/10 border-white/20 text-white/60 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  {selectedGame.notes && selectedGame.notes.trim() ? (
                    <Mail size={17} />
                  ) : (
                    <FileText size={17} />
                  )}
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
                      className="absolute left-[188px] bottom-full mb-3 w-56 bg-black/80 backdrop-blur-xl border border-white/15 rounded-2xl p-2 flex flex-col gap-1 shadow-2xl"
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
                        <Heart
                          size={16}
                          fill={selectedGame.isFavorite ? 'currentColor' : 'none'}
                          className={selectedGame.isFavorite ? 'text-red-400' : ''}
                        />
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
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* ── Add Game Modal ──────────────────────────────────────────── */}
      {addModal}
    </div>
  )
}
