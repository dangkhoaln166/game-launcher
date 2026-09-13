import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings as SettingsIcon, Monitor, Power, Volume2, Music, Trash2, Plus, VolumeX } from 'lucide-react'
import { AppSettings, AudioTrack } from '../../../shared/types'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  settings: AppSettings
  onChange?: (settings: AppSettings) => void
  onSave: (settings: AppSettings) => void
}

const BUILT_IN_AMBIENT: AudioTrack = {
  id: 'default-ambient-1',
  name: 'Nhạc nền 1 (Carefree)',
  path: 'default',
  type: 'ambient',
  isBuiltIn: true
}

const BUILT_IN_SFX_1: AudioTrack = {
  id: 'default-sfx-1',
  name: 'SFX 1: Nhẹ nhàng (Bop)',
  path: 'default',
  type: 'sfx',
  isBuiltIn: true
}
const BUILT_IN_SFX_2: AudioTrack = {
  id: 'default-sfx-2',
  name: 'SFX 2: Cứng cáp (Click)',
  path: 'synth-click',
  type: 'sfx',
  isBuiltIn: true
}
const BUILT_IN_SFX_3: AudioTrack = {
  id: 'default-sfx-3',
  name: 'SFX 3: Điện tử (Digital)',
  path: 'synth-digital',
  type: 'sfx',
  isBuiltIn: true
}

export default function SettingsModal({ isOpen, onClose, settings, onChange, onSave }: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings)

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && onChange) {
      onChange(localSettings)
    }
  }, [localSettings, isOpen, onChange])

  const handleToggle = (key: keyof AppSettings) => {
    setLocalSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = () => {
    onSave(localSettings)
    onClose()
  }

  const handleUploadAudio = async (type: 'ambient' | 'sfx') => {
    const track = await window.api.importAudio(type)
    if (track) {
      setLocalSettings((prev) => {
        const tracks = prev.customAudioTracks || []
        const newSettings = { ...prev, customAudioTracks: [...tracks, track] }
        if (type === 'ambient') newSettings.activeAmbientId = track.id
        if (type === 'sfx') newSettings.activeSfxId = track.id
        return newSettings
      })
    }
  }

  const handleDeleteAudio = async (track: AudioTrack) => {
    if (track.isBuiltIn) return
    const ok = await window.api.deleteAudioFile(track.path)
    if (ok) {
      setLocalSettings((prev) => {
        const tracks = prev.customAudioTracks || []
        const newSettings = { ...prev, customAudioTracks: tracks.filter((t) => t.id !== track.id) }
        
        // Reset active to default if deleted
        if (prev.activeAmbientId === track.id) newSettings.activeAmbientId = BUILT_IN_AMBIENT.id
        if (prev.activeSfxId === track.id) newSettings.activeSfxId = BUILT_IN_SFX_1.id
        
        return newSettings
      })
    }
  }

  const ambientTracks = [BUILT_IN_AMBIENT, ...(localSettings.customAudioTracks || []).filter(t => t.type === 'ambient')]
  const sfxTracks = [BUILT_IN_SFX_1, BUILT_IN_SFX_2, BUILT_IN_SFX_3, ...(localSettings.customAudioTracks || []).filter(t => t.type === 'sfx')]

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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />

          <motion.div
            className="relative rounded-[32px] border border-white/10 flex flex-col p-8 backdrop-blur-2xl"
            style={{
              width: 580,
              maxHeight: '90vh',
              background: 'linear-gradient(145deg, rgba(65,70,80,0.95) 0%, rgba(40,45,55,0.98) 100%)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)'
            }}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <div className="flex items-center gap-4 mb-8 shrink-0">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center border border-white/20 shadow-lg shadow-white/5">
                <SettingsIcon size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">Cài đặt</h2>
                <p className="text-sm text-white/50">Tùy chỉnh hệ thống & Âm thanh</p>
              </div>
            </div>

            <div className="flex flex-col gap-6 overflow-y-auto pr-4 -mr-4 mb-8 min-h-0">
              
              {/* Toggles */}
              <div className="flex flex-col gap-4">
                <div
                  className="flex items-center justify-between p-4 rounded-2xl bg-white/10 border border-white-10 hover:bg-white/20 hover:border-white/30 transition-all duration-300 cursor-pointer group"
                  onClick={() => handleToggle('fullscreen')}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors flex items-center justify-center text-white/70 group-hover:text-white shadow-inner">
                      <Monitor size={18} />
                    </div>
                    <div>
                      <h3 className="text-white font-medium group-hover:text-blue-100 transition-colors">Toàn màn hình</h3>
                      <p className="text-xs text-white/50 group-hover:text-white/70 transition-colors">Mở ứng dụng ở chế độ toàn màn hình</p>
                    </div>
                  </div>
                  <ToggleSwitch active={localSettings.fullscreen} />
                </div>

                <div
                  className="flex items-center justify-between p-4 rounded-2xl bg-white/10 border border-white-10 hover:bg-white/20 hover:border-white/30 transition-all duration-300 cursor-pointer group"
                  onClick={() => handleToggle('autoStart')}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors flex items-center justify-center text-white/70 group-hover:text-white shadow-inner">
                      <Power size={18} />
                    </div>
                    <div>
                      <h3 className="text-white font-medium group-hover:text-blue-100 transition-colors">Khởi động cùng Windows</h3>
                      <p className="text-xs text-white/50 group-hover:text-white/70 transition-colors">Tự động mở launcher khi mở máy</p>
                    </div>
                  </div>
                  <ToggleSwitch active={localSettings.autoStart} />
                </div>

                <div
                  className="flex items-center justify-between p-4 rounded-2xl bg-white/10 border border-white-10 hover:bg-white/20 hover:border-white/30 transition-all duration-300 cursor-pointer group"
                  onClick={() => handleToggle('uiSoundEnabled')}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors flex items-center justify-center text-white/70 group-hover:text-white shadow-inner">
                      <Volume2 size={18} />
                    </div>
                    <div>
                      <h3 className="text-white font-medium group-hover:text-blue-100 transition-colors">Phát âm thanh</h3>
                      <p className="text-xs text-white/50 group-hover:text-white/70 transition-colors">Bật/tắt toàn bộ âm thanh giao diện</p>
                    </div>
                  </div>
                  <ToggleSwitch active={localSettings.uiSoundEnabled} />
                </div>
              </div>

              {localSettings.uiSoundEnabled && (
                <>
                  <div className="h-px bg-white/10 my-2" />

                  {/* Nhạc nền (Ambient) */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-white font-medium flex items-center gap-2">
                        <Music size={16} className="text-white/70" /> Nhạc nền (Ambient)
                      </h3>
                      <button
                        onClick={() => handleUploadAudio('ambient')}
                        className="text-xs flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Plus size={14} /> Thêm nhạc
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-4 mb-4 bg-white/5 p-3 rounded-xl border border-white/5">
                      <span className="text-xs text-white/50 w-16">Âm lượng</span>
                      <input 
                        type="range" 
                        min="0" max="1" step="0.05"
                        value={localSettings.ambientVolume ?? 0.2}
                        onChange={(e) => setLocalSettings(p => ({ ...p, ambientVolume: parseFloat(e.target.value) }))}
                        className="flex-1 accent-white"
                      />
                      <span className="text-xs text-white/80 w-8 text-right">{Math.round((localSettings.ambientVolume ?? 0.2) * 100)}%</span>
                    </div>

                    <div className="flex flex-col gap-2">
                      {ambientTracks.map((track) => (
                        <div
                          key={track.id}
                          onClick={() => setLocalSettings(p => ({ ...p, activeAmbientId: track.id }))}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 cursor-pointer ${
                            localSettings.activeAmbientId === track.id
                              ? 'bg-gradient-to-r from-blue-500/30 to-blue-400/20 border-blue-400/60 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                              : 'bg-white/10 border-white/10 hover:bg-white/20 hover:border-white/30'
                          }`}
                        >
                          <span className={`text-sm truncate font-medium ${localSettings.activeAmbientId === track.id ? 'text-blue-100' : 'text-white/80'}`}>{track.name}</span>
                          {!track.isBuiltIn && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteAudio(track) }}
                              className="p-1.5 text-white/40 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hiệu ứng chuyển Game (SFX) */}
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-white font-medium flex items-center gap-2">
                        <VolumeX size={16} className="text-white/70" /> Âm thanh Lướt Game
                      </h3>
                      <button
                        onClick={() => handleUploadAudio('sfx')}
                        className="text-xs flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Plus size={14} /> Thêm SFX
                      </button>
                    </div>

                    <div className="flex items-center gap-4 mb-4 bg-white/5 p-3 rounded-xl border border-white/5">
                      <span className="text-xs text-white/50 w-16">Âm lượng</span>
                      <input 
                        type="range" 
                        min="0" max="1" step="0.05"
                        value={localSettings.sfxVolume ?? 0.2}
                        onChange={(e) => setLocalSettings(p => ({ ...p, sfxVolume: parseFloat(e.target.value) }))}
                        className="flex-1 accent-white"
                      />
                      <span className="text-xs text-white/80 w-8 text-right">{Math.round((localSettings.sfxVolume ?? 0.2) * 100)}%</span>
                    </div>

                    <div className="flex flex-col gap-2">
                      {sfxTracks.map((track) => (
                        <div
                          key={track.id}
                          onClick={() => setLocalSettings(p => ({ ...p, activeSfxId: track.id }))}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 cursor-pointer ${
                            localSettings.activeSfxId === track.id
                              ? 'bg-gradient-to-r from-purple-500/30 to-purple-400/20 border-purple-400/60 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                              : 'bg-white/10 border-white/10 hover:bg-white/20 hover:border-white/30'
                          }`}
                        >
                          <span className={`text-sm truncate font-medium ${localSettings.activeSfxId === track.id ? 'text-purple-100' : 'text-white/80'}`}>{track.name}</span>
                          {!track.isBuiltIn && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteAudio(track) }}
                              className="p-1.5 text-white/40 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 w-full shrink-0 mt-2">
              <button
                onClick={onClose}
                className="flex-1 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white text-sm font-semibold transition-all border border-white/10"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-white to-gray-200 text-black hover:from-white hover:to-white text-sm font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]"
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
      className={`w-12 h-7 rounded-full flex items-center px-1 transition-all duration-300 ${
        active ? 'bg-gradient-to-r from-green-400 to-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.4)]' : 'bg-white/20'
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
