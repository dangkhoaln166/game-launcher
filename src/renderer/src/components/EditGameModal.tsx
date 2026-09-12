import { motion, AnimatePresence } from 'framer-motion'
import { X, ImagePlus, Heart } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Game } from '../../../shared/types'

interface EditGameModalProps {
  isOpen: boolean
  game: Game | null
  onClose: () => void
  onGameUpdated: (updatedGame: Game) => void
}

export default function EditGameModal({
  isOpen,
  game,
  onClose,
  onGameUpdated
}: EditGameModalProps) {
  const [title, setTitle] = useState('')
  const [coverArt, setCoverArt] = useState('')
  const [heroBackground, setHeroBackground] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)

  // Sync state when a game is selected
  useEffect(() => {
    if (game && isOpen) {
      setTitle(game.title)
      setCoverArt(game.coverArt || '')
      setHeroBackground(game.heroBackground || '')
      setIsFavorite(game.isFavorite || false)
    }
  }, [game, isOpen])

  const handlePickCover = async () => {
    const url = await window.api.selectImageFile()
    if (url) {
      setCoverArt(url)
      setHeroBackground(url) // Usually we sync them, or could have 2 separate pickers
    }
  }

  const handlePickHero = async () => {
    const url = await window.api.selectImageFile()
    if (url) setHeroBackground(url)
  }

  const handleSave = async () => {
    if (!game) return
    const updatedGame: Game = {
      ...game,
      title: title.trim() || game.title,
      coverArt,
      heroBackground,
      isFavorite
    }
    const success = await window.api.updateGame(updatedGame)
    if (success) {
      onGameUpdated(updatedGame)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && game && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 110 }} // Higher than dropdown
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
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
                Chỉnh sửa thông tin Game
              </h2>
              <div className="flex items-center gap-2">
                {/* Favorite toggle */}
                <button
                  onClick={() => setIsFavorite((f) => !f)}
                  title={isFavorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isFavorite
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : 'bg-white/8 text-white/40 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  <Heart size={15} fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white transition-all"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-8 py-6 flex flex-col gap-5">
              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-white/40 font-medium uppercase tracking-widest">
                  Tên game
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-white/30 transition-colors"
                  placeholder="Nhập tên game…"
                  autoFocus
                />
              </div>

              {/* Images */}
              <div className="flex gap-4 items-start mt-2">
                {/* Cover Art */}
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-xs text-white/40 font-medium uppercase tracking-widest">
                    Ảnh bìa (Cover)
                  </label>
                  <div
                    className="relative w-full rounded-2xl overflow-hidden border border-white/10 cursor-pointer group bg-black/20"
                    style={{ aspectRatio: '1/1' }}
                    onClick={handlePickCover}
                  >
                    <img src={coverArt} alt="cover" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                      <ImagePlus size={22} className="text-white" />
                      <span className="text-xs font-medium text-white/80">Đổi ảnh bìa</span>
                    </div>
                  </div>
                </div>

                {/* Hero Background */}
                <div className="flex-[1.5] flex flex-col gap-2">
                  <label className="text-xs text-white/40 font-medium uppercase tracking-widest">
                    Ảnh nền (Background)
                  </label>
                  <div
                    className="relative w-full rounded-2xl overflow-hidden border border-white/10 cursor-pointer group bg-black/20"
                    style={{ aspectRatio: '16/9', height: '100%' }} // match height via flex
                    onClick={handlePickHero}
                  >
                    <img src={heroBackground} alt="hero" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                      <ImagePlus size={22} className="text-white" />
                      <span className="text-xs font-medium text-white/80">Đổi ảnh nền</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-white/6 hover:bg-white/12 text-white/60 hover:text-white text-sm font-medium border border-white/8 transition-all"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/85 transition-all"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
