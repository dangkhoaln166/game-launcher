import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings as SettingsIcon, Monitor, Power, Volume2 } from 'lucide-react'
import { AppSettings } from '../../../shared/types'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  settings: AppSettings
  onSave: (settings: AppSettings) => void
}

export default function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings)

  // Sync prop to local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings)
    }
  }, [isOpen, settings])

  const handleToggle = (key: keyof AppSettings) => {
    setLocalSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = () => {
    onSave(localSettings)
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
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

          <motion.div
            className="relative rounded-3xl border border-white/10 flex flex-col p-8"
            style={{
              width: 500,
              background: 'rgba(20,20,25,0.95)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.8)'
            }}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <SettingsIcon size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Cài đặt</h2>
                <p className="text-sm text-white/50">Tùy chỉnh hệ thống PS5 Game Launcher</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 mb-10">
              {/* Fullscreen Toggle */}
              <div
                className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => handleToggle('fullscreen')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70">
                    <Monitor size={18} />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Toàn màn hình</h3>
                    <p className="text-xs text-white/50">Mở ứng dụng ở chế độ toàn màn hình</p>
                  </div>
                </div>
                <ToggleSwitch active={localSettings.fullscreen} />
              </div>

              {/* Auto Start Toggle */}
              <div
                className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => handleToggle('autoStart')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70">
                    <Power size={18} />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Khởi động cùng Windows</h3>
                    <p className="text-xs text-white/50">Tự động mở launcher khi mở máy</p>
                  </div>
                </div>
                <ToggleSwitch active={localSettings.autoStart} />
              </div>

              {/* UI Sound Toggle */}
              <div
                className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => handleToggle('uiSoundEnabled')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70">
                    <Volume2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Âm thanh giao diện</h3>
                    <p className="text-xs text-white/50">Phát nhạc nền và hiệu ứng âm thanh</p>
                  </div>
                </div>
                <ToggleSwitch active={localSettings.uiSoundEnabled} />
              </div>
            </div>

            <div className="flex gap-3 w-full mt-auto">
              <button
                onClick={onClose}
                className="flex-1 py-3.5 rounded-2xl bg-white/8 hover:bg-white/15 text-white/80 hover:text-white text-sm font-semibold transition-all border border-white/5"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3.5 rounded-2xl bg-white text-black hover:bg-white/90 text-sm font-semibold transition-all shadow-[0_0_15px_rgba(255,255,255,0.15)] hover:shadow-[0_0_25px_rgba(255,255,255,0.3)]"
              >
                Lưu thay đổi
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ToggleSwitch({ active }: { active: boolean }) {
  return (
    <div
      className={`w-12 h-7 rounded-full flex items-center px-1 transition-colors ${
        active ? 'bg-green-500' : 'bg-white/20'
      }`}
    >
      <motion.div
        className="w-5 h-5 rounded-full bg-white shadow-sm"
        animate={{ x: active ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </div>
  )
}
