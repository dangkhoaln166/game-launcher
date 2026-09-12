import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  FolderOpen,
  Gamepad2,
  Zap,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ImagePlus
} from 'lucide-react'
import { useState } from 'react'
import { Game } from '../../../shared/types'

interface AddGameModalProps {
  isOpen: boolean
  onClose: () => void
  onGameAdded: (newGames: Game[]) => void
}

type ScanStatus = 'idle' | 'scanning' | 'success' | 'error'
interface ScanState {
  status: ScanStatus
  message: string
}
const initialScan: ScanState = { status: 'idle', message: '' }

// ── Pending game edit form ────────────────────────────────────────────────────
interface PendingGame {
  base: Game // the game object returned by selectExeFile
  title: string
  coverArt: string // may be file:// URL or Unsplash fallback
  heroBackground: string
}

export default function AddGameModal({ isOpen, onClose, onGameAdded }: AddGameModalProps) {
  const [steam, setSteam] = useState<ScanState>(initialScan)
  const [epic, setEpic] = useState<ScanState>(initialScan)
  const [manual, setManual] = useState<ScanState>(initialScan)

  // When a .exe is picked, we enter "edit" mode before saving
  const [pending, setPending] = useState<PendingGame | null>(null)

  const reset = () => {
    setSteam(initialScan)
    setEpic(initialScan)
    setManual(initialScan)
    setPending(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  // ── Scan Steam ─────────────────────────────────────────────────────────────
  const handleScanSteam = async () => {
    setSteam({ status: 'scanning', message: 'Đang quét Steam Library…' })
    try {
      const games = await window.api.scanSteamGames()
      if (!games?.length) {
        setSteam({ status: 'error', message: 'Không tìm thấy game Steam nào.' })
        return
      }
      await window.api.saveGames(games)
      setSteam({ status: 'success', message: `✓ Đã thêm ${games.length} game từ Steam!` })
      setTimeout(() => onGameAdded(games), 1200)
    } catch (err: any) {
      setSteam({ status: 'error', message: err?.message ?? 'Lỗi khi quét Steam.' })
    }
  }

  // ── Scan Epic ──────────────────────────────────────────────────────────────
  const handleScanEpic = async () => {
    setEpic({ status: 'scanning', message: 'Đang quét Epic Games…' })
    try {
      const games = await window.api.scanEpicGames()
      if (!games?.length) {
        setEpic({ status: 'error', message: 'Không tìm thấy game Epic nào.' })
        return
      }
      await window.api.saveGames(games)
      setEpic({ status: 'success', message: `✓ Đã thêm ${games.length} game từ Epic!` })
      setTimeout(() => onGameAdded(games), 1200)
    } catch (err: any) {
      setEpic({ status: 'error', message: err?.message ?? 'Lỗi khi quét Epic Games.' })
    }
  }

  // ── Manual .exe — Step 1: pick exe ─────────────────────────────────────────
  const handleAddManual = async () => {
    setManual({ status: 'scanning', message: 'Đang mở hộp thoại chọn file…' })
    try {
      const result = await window.api.selectExeFile()
      if (!result) {
        setManual(initialScan)
        return
      }
      // Enter edit mode
      setManual(initialScan)
      setPending({
        base: result,
        title: result.title,
        coverArt: result.coverArt || '',
        heroBackground: result.heroBackground || ''
      })
    } catch (err: any) {
      setManual({ status: 'error', message: err?.message ?? 'Lỗi khi chọn file.' })
    }
  }

  // ── Manual .exe — pick cover image ─────────────────────────────────────────
  const handlePickCover = async () => {
    const url = await window.api.selectImageFile()
    if (url && pending) setPending({ ...pending, coverArt: url, heroBackground: url })
  }

  // ── Manual .exe — Step 2: confirm save ────────────────────────────────────
  const handleConfirmSave = async () => {
    if (!pending) return
    const finalGame: Game = {
      ...pending.base,
      title: pending.title.trim() || pending.base.title,
      coverArt: pending.coverArt,
      heroBackground: pending.heroBackground
    }
    await window.api.saveGames([finalGame])
    onGameAdded([finalGame])
    reset()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 100 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleClose}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

          <motion.div
            className="relative rounded-3xl border border-white/10 overflow-hidden"
            style={{
              width: 520,
              background: 'rgba(18,18,24,0.97)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.85)'
            }}
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-white/8">
              <h2 className="text-xl font-semibold text-white tracking-tight">
                {pending ? 'Chỉnh sửa thông tin Game' : 'Thêm Game'}
              </h2>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <AnimatePresence mode="wait">
              {pending ? (
                /* ── Edit Form ─────────────────────────────────────────── */
                <motion.div
                  key="edit"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="px-8 py-6 flex flex-col gap-5"
                >
                  {/* Cover art preview + picker */}
                  <div className="flex gap-4 items-start">
                    <div
                      className="relative flex-shrink-0 rounded-2xl overflow-hidden border border-white/10 cursor-pointer group"
                      style={{ width: 96, height: 96 }}
                      onClick={handlePickCover}
                    >
                      <img
                        src={pending.coverArt}
                        alt="cover"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src =
                            'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=900'
                        }}
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ImagePlus size={22} className="text-white" />
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-xs text-white/40 font-medium uppercase tracking-widest">
                        Tên game
                      </label>
                      <input
                        type="text"
                        value={pending.title}
                        onChange={(e) => setPending({ ...pending, title: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-white/30 transition-colors"
                        placeholder="Nhập tên game…"
                        autoFocus
                      />
                      <div className="flex items-center justify-between mt-1">
                        <button
                          onClick={handlePickCover}
                          className="text-xs text-white/40 hover:text-white/70 transition-colors text-left flex items-center gap-1.5"
                        >
                          <ImagePlus size={12} /> Chọn ảnh bìa từ máy tính
                        </button>
                        <button
                          onClick={async () => {
                            if (!pending.title) return
                            const md = await window.api.fetchMetadata(pending.title)
                            if (md) {
                              setPending({
                                ...pending,
                                title: md.title,
                                coverArt: md.coverArt || pending.coverArt,
                                heroBackground: md.heroBackground || pending.heroBackground,
                                base: {
                                  ...pending.base,
                                  developer: md.developer || pending.base.developer
                                }
                              })
                            } else {
                              alert('Không tìm thấy thông tin game.')
                            }
                          }}
                          className="text-xs text-blue-400 hover:text-blue-300 transition-colors text-left flex items-center gap-1.5"
                        >
                          <Zap size={12} /> Tự động lấy thông tin (Steam)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Exe path display */}
                  <div className="text-xs text-white/25 truncate px-1" title={pending.base.exePath}>
                    📂 {pending.base.exePath}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3 mt-1">
                    <button
                      onClick={() => setPending(null)}
                      className="flex-1 py-2.5 rounded-xl bg-white/6 hover:bg-white/12 text-white/60 hover:text-white text-sm font-medium border border-white/8 transition-all"
                    >
                      ← Quay lại
                    </button>
                    <button
                      onClick={handleConfirmSave}
                      className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/85 transition-all"
                    >
                      Thêm Game
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* ── Option cards ──────────────────────────────────────── */
                <motion.div
                  key="options"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="px-8 py-6 flex flex-col gap-4"
                >
                  <OptionCard
                    icon={<FolderOpen size={22} />}
                    title="Thêm thủ công (.exe)"
                    desc="Chọn file thực thi (.exe) hoặc shortcut (.lnk) từ máy tính"
                    color="#3b82f6"
                    state={manual}
                    onClick={handleAddManual}
                  />
                  <OptionCard
                    icon={<Gamepad2 size={22} />}
                    title="Đồng bộ Steam"
                    desc="Tự động quét toàn bộ thư viện Steam đã cài trên máy"
                    color="#1a9fff"
                    state={steam}
                    onClick={handleScanSteam}
                  />
                  <OptionCard
                    icon={<Zap size={22} />}
                    title="Đồng bộ Epic Games"
                    desc="Quét các game từ Epic Games Launcher đã cài đặt"
                    color="#c084fc"
                    state={epic}
                    onClick={handleScanEpic}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer — only on options view */}
            {!pending && (
              <div className="px-8 pb-7 pt-1">
                <button
                  onClick={handleClose}
                  className="w-full py-2.5 rounded-xl bg-white/6 hover:bg-white/12 text-white/60 hover:text-white text-sm font-medium border border-white/8 transition-all"
                >
                  Đóng
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Option Card ───────────────────────────────────────────────────────────────
interface OptionCardProps {
  icon: React.ReactNode
  title: string
  desc: string
  color: string
  state: ScanState
  onClick: () => void
}

function OptionCard({ icon, title, desc, color, state, onClick }: OptionCardProps) {
  const isScanning = state.status === 'scanning'
  const isSuccess = state.status === 'success'
  const isError = state.status === 'error'

  return (
    <motion.button
      onClick={onClick}
      disabled={isScanning}
      whileHover={isScanning ? {} : { scale: 1.015 }}
      whileTap={isScanning ? {} : { scale: 0.985 }}
      className="w-full text-left rounded-2xl border p-4 transition-all focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        background: isSuccess
          ? 'rgba(34,197,94,0.08)'
          : isError
            ? 'rgba(239,68,68,0.08)'
            : 'rgba(255,255,255,0.04)',
        borderColor: isSuccess
          ? 'rgba(34,197,94,0.3)'
          : isError
            ? 'rgba(239,68,68,0.3)'
            : 'rgba(255,255,255,0.08)'
      }}
    >
      <div className="flex items-center gap-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}22`, color }}
        >
          {isScanning ? (
            <Loader2 size={20} className="animate-spin" style={{ color }} />
          ) : isSuccess ? (
            <CheckCircle2 size={20} style={{ color: '#22c55e' }} />
          ) : isError ? (
            <AlertCircle size={20} style={{ color: '#ef4444' }} />
          ) : (
            icon
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-medium text-sm">{title}</div>
          {state.status !== 'idle' ? (
            <div
              className="text-xs mt-0.5 truncate"
              style={{
                color: isSuccess ? '#22c55e' : isError ? '#ef4444' : 'rgba(255,255,255,0.5)'
              }}
            >
              {state.message}
            </div>
          ) : (
            <div className="text-xs text-white/40 mt-0.5">{desc}</div>
          )}
        </div>
        {state.status === 'idle' && <div className="text-white/20 text-lg pr-1">›</div>}
      </div>
    </motion.button>
  )
}
