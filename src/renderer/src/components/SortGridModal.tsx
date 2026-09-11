import { useState, useEffect } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { Game } from '../../shared/types'
import { X, GripVertical } from 'lucide-react'

interface SortGridModalProps {
  isOpen: boolean
  games: Game[]
  onClose: () => void
  onSaveOrder: (newGames: Game[]) => void
}

export default function SortGridModal({ isOpen, games, onClose, onSaveOrder }: SortGridModalProps) {
  const [items, setItems] = useState<Game[]>([])

  useEffect(() => {
    // Only sort by orderIndex if available
    const sorted = [...games].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
    setItems(sorted)
  }, [games, isOpen])

  const handleSave = () => {
    const updated = items.map((g, i) => ({ ...g, orderIndex: i }))
    onSaveOrder(updated)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center p-8"
          style={{ zIndex: 100 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
          
          <motion.div
            className="relative bg-[#14141a] border border-white/10 rounded-3xl w-full max-w-2xl h-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden"
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-white/10 bg-white/[0.02]">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Tùy chỉnh thứ tự</h2>
                <p className="text-white/50 text-sm mt-1">Kéo thả biểu tượng ≡ để thay đổi vị trí game trên màn hình chính.</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* List Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <Reorder.Group axis="y" values={items} onReorder={setItems} className="flex flex-col gap-2">
                {items.map((game) => (
                  <Reorder.Item
                    key={game.id}
                    value={game}
                    className="flex items-center gap-4 bg-white/5 border border-white/5 hover:border-white/15 p-3 rounded-2xl cursor-grab active:cursor-grabbing transition-colors"
                  >
                    <GripVertical className="text-white/30 ml-2" size={20} />
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/50 shrink-0">
                      <img 
                        src={game.coverArt} 
                        alt="cover" 
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=900' }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{game.title}</h3>
                      <p className="text-white/40 text-xs mt-0.5 uppercase tracking-wider">{game.platform}</p>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-white/10 bg-white/[0.02] flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 font-medium transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2.5 rounded-xl bg-white text-black font-semibold hover:bg-gray-200 transition-colors"
              >
                Lưu thứ tự
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
