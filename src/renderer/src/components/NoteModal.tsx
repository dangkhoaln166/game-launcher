import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail } from 'lucide-react'

interface NoteModalProps {
  isOpen: boolean
  gameTitle: string
  initialNote: string
  onClose: () => void
  onSave: (note: string) => Promise<void>
}

export default function NoteModal({
  isOpen,
  gameTitle,
  initialNote,
  onClose,
  onSave
}: NoteModalProps) {
  const [text, setText] = useState(initialNote)
  const [phase, setPhase] = useState<'writing' | 'folding' | 'done'>('writing')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync when switching games
  useEffect(() => {
    if (isOpen) {
      setText(initialNote)
      setPhase('writing')
    }
  }, [isOpen, initialNote])

  // Auto-focus
  useEffect(() => {
    if (isOpen && phase === 'writing') {
      setTimeout(() => textareaRef.current?.focus(), 120)
    }
  }, [isOpen, phase])

  const handleSave = async () => {
    setPhase('folding')
    await new Promise((r) => setTimeout(r, 700))
    await onSave(text.trim())
    setPhase('done')
    await new Promise((r) => setTimeout(r, 500))
    onClose()
    setPhase('writing')
  }

  const handleClose = () => {
    setPhase('writing')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 200 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={phase === 'writing' ? handleClose : undefined}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

          <AnimatePresence mode="wait">
            {phase === 'writing' && (
              /* ── PAPER ─────────────────────────────────────────────── */
              <motion.div
                key="paper"
                className="relative flex flex-col"
                style={{ width: 440, originY: 0 }}
                initial={{ opacity: 0, scale: 0.88, y: 32 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scaleY: 0.05,
                  scaleX: 0.6,
                  y: 40,
                  rotateX: 80,
                  transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
                }}
                transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Paper body */}
                <div
                  style={{
                    background: '#fdfdf5',
                    borderRadius: '4px 4px 0 0',
                    boxShadow:
                      '0 2px 0 #e8e6d8, 0 4px 0 #f5f3e8, 0 6px 0 #e8e6d8, 0 20px 60px rgba(0,0,0,0.55)',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: 380
                  }}
                >
                  {/* Red margin line */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 52,
                      top: 0,
                      bottom: 0,
                      width: 1.5,
                      background: 'rgba(220, 80, 80, 0.35)',
                      zIndex: 1
                    }}
                  />

                  {/* Blue ruled lines */}
                  {Array.from({ length: 18 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 60 + i * 30,
                        height: 1,
                        background: 'rgba(100, 160, 220, 0.22)'
                      }}
                    />
                  ))}

                  {/* Hole punches */}
                  {[90, 210, 330].map((top) => (
                    <div
                      key={top}
                      style={{
                        position: 'absolute',
                        left: 14,
                        top,
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: '#e8e6d8',
                        border: '1px solid #ccc8b8',
                        zIndex: 2
                      }}
                    />
                  ))}

                  {/* Header */}
                  <div
                    style={{
                      padding: '18px 20px 14px 64px',
                      borderBottom: '1px solid rgba(100, 160, 220, 0.22)',
                      position: 'relative',
                      zIndex: 2
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#9c7a4a',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        marginBottom: 3,
                        fontFamily: 'Georgia, serif'
                      }}
                    >
                      Ghi chú
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: '#3d3520',
                        fontFamily: 'Georgia, serif',
                        fontStyle: 'italic'
                      }}
                    >
                      {gameTitle}
                    </div>
                  </div>

                  {/* Textarea */}
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={`Viết ghi chú cho game này…\n\nVí dụ: crack version, server IP, mẹo chơi, v.v.`}
                    style={{
                      width: '100%',
                      minHeight: 288,
                      padding: '12px 20px 12px 64px',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      resize: 'none',
                      fontSize: 14,
                      lineHeight: '30px',
                      color: '#2d2a1e',
                      fontFamily: '"Segoe UI", Georgia, serif',
                      position: 'relative',
                      zIndex: 2,
                      caretColor: '#555'
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') handleClose()
                    }}
                  />
                </div>

                {/* Bottom footer */}
                <div
                  style={{
                    background: '#f0ede0',
                    borderTop: '1px solid #d8d4c4',
                    borderRadius: '0 0 4px 4px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.55)'
                  }}
                >
                  <button
                    onClick={handleClose}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: 6,
                      background: 'rgba(0,0,0,0.06)',
                      border: '1px solid rgba(0,0,0,0.1)',
                      color: '#6b6550',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                  >
                    Huỷ
                  </button>
                  <button
                    onClick={handleSave}
                    style={{
                      flex: 2,
                      padding: '8px 0',
                      borderRadius: 6,
                      background: 'linear-gradient(135deg, #7c5c2e 0%, #a07840 100%)',
                      border: 'none',
                      color: '#fdfdf5',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 7
                    }}
                  >
                    <Mail size={14} />
                    Lưu & đóng phong thư
                  </button>
                  <button
                    onClick={handleClose}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.06)',
                      border: '1px solid rgba(0,0,0,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#8c8270'
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── ENVELOPE ANIMATION ─────────────────────────────────── */}
            {(phase === 'folding' || phase === 'done') && (
              <motion.div
                key="envelope"
                initial={{ opacity: 0, scale: 0.3, y: 20 }}
                animate={{
                  opacity: phase === 'done' ? 0 : 1,
                  scale: phase === 'done' ? 0.6 : 1,
                  y: phase === 'done' ? -30 : 0
                }}
                transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}
              >
                {/* SVG Envelope */}
                <svg
                  width="120"
                  height="90"
                  viewBox="0 0 120 90"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Envelope body */}
                  <rect
                    x="3"
                    y="20"
                    width="114"
                    height="67"
                    rx="5"
                    fill="#f0ede0"
                    stroke="#c8c2a8"
                    strokeWidth="1.5"
                  />

                  {/* Bottom diagonal folds */}
                  <line x1="3" y1="87" x2="60" y2="55" stroke="#d8d4c4" strokeWidth="1" />
                  <line x1="117" y1="87" x2="60" y2="55" stroke="#d8d4c4" strokeWidth="1" />

                  {/* Flap */}
                  <motion.path
                    d="M3 20 L60 56 L117 20 Z"
                    fill="#e8e4d0"
                    stroke="#c8c2a8"
                    strokeWidth="1.5"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    style={{ transformOrigin: '60px 20px' }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  />

                  {/* Diagonal fold lines */}
                  <motion.line
                    x1="3"
                    y1="20"
                    x2="60"
                    y2="56"
                    stroke="#c8c2a8"
                    strokeWidth="0.8"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.25, delay: 0.25 }}
                  />
                  <motion.line
                    x1="117"
                    y1="20"
                    x2="60"
                    y2="56"
                    stroke="#c8c2a8"
                    strokeWidth="0.8"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.25, delay: 0.25 }}
                  />

                  {/* Wax seal */}
                  <motion.circle
                    cx="60"
                    cy="57"
                    r="10"
                    fill="#8b4513"
                    stroke="#6b3210"
                    strokeWidth="1"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{ transformOrigin: '60px 57px' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.38 }}
                  />
                  <motion.text
                    x="60"
                    y="61"
                    textAnchor="middle"
                    fontSize="9"
                    fill="#f5d5a8"
                    fontWeight="bold"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.52 }}
                  >
                    ✦
                  </motion.text>

                  {/* Text lines on envelope */}
                  <line
                    x1="22"
                    y1="68"
                    x2="58"
                    y2="68"
                    stroke="#c8c2a8"
                    strokeWidth="1"
                    opacity="0.5"
                  />
                  <line
                    x1="22"
                    y1="75"
                    x2="50"
                    y2="75"
                    stroke="#c8c2a8"
                    strokeWidth="1"
                    opacity="0.35"
                  />
                </svg>

                <motion.p
                  style={{
                    color: '#f5ead5',
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: 'Georgia, serif',
                    fontStyle: 'italic',
                    textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                    letterSpacing: '0.03em'
                  }}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.32 }}
                >
                  Đã lưu ghi chú ✓
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
