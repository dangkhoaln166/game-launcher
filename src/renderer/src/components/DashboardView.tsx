import { motion } from 'framer-motion'
import { Game } from '../../../shared/types'
import { Clock, Gamepad2, PlayCircle, Trophy, Layers, Library } from 'lucide-react'

interface DashboardViewProps {
  games: Game[]
}

// Helper to render a simple SVG Donut Chart
function DonutChart({
  data,
  colors,
  size = 140
}: {
  data: { label: string; value: number }[]
  colors: string[]
  size?: number
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (total === 0) {
    return (
      <div
        className="rounded-full bg-white/10 flex items-center justify-center text-white/30 text-xs"
        style={{ width: size, height: size }}
      >
        Trống
      </div>
    )
  }

  const center = size / 2
  const strokeWidth = 24
  const radius = center - strokeWidth / 2
  const circumference = 2 * Math.PI * radius

  let currentOffset = 0

  return (
    <div className="relative flex items-center gap-6">
      <svg width={size} height={size} className="transform -rotate-90">
        {data.map((item, index) => {
          if (item.value === 0) return null
          const percentage = item.value / total
          const strokeLength = percentage * circumference
          const strokeDasharray = `${strokeLength} ${circumference}`
          const strokeDashoffset = -currentOffset
          currentOffset += strokeLength

          return (
            <circle
              key={item.label}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={colors[index % colors.length]}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          )
        })}
      </svg>
      {/* Legend */}
      <div className="flex flex-col gap-2">
        {data.map((item, index) => {
          if (item.value === 0) return null
          return (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="text-white/80">{item.label}</span>
              <span className="text-white font-semibold ml-auto">{item.value}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function DashboardView({ games }: DashboardViewProps) {
  const totalPlayTime = games.reduce((sum, g) => sum + (g.playTime || 0), 0)
  const totalPlayCount = games.reduce((sum, g) => sum + (g.playCount || 0), 0)

  const mostPlayedGame = [...games].sort((a, b) => (b.playTime || 0) - (a.playTime || 0))[0]
  const recentlyPlayed = [...games].sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))[0]

  const formatHours = (mins: number) => {
    if (mins < 60) return `${Math.floor(mins)} phút`
    return `${(mins / 60).toFixed(1)} giờ`
  }

  // Stats Data
  const platformData = [
    { label: 'Steam', value: games.filter((g) => g.platform === 'steam').length },
    { label: 'Epic Games', value: games.filter((g) => g.platform === 'epic').length },
    { label: 'Thủ công', value: games.filter((g) => g.platform === 'crack' || g.platform === 'custom').length }
  ]

  const collectionsStats = games.reduce((acc, g) => {
    const col = g.collection || 'Chưa phân loại'
    acc[col] = (acc[col] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const collectionData = Object.entries(collectionsStats)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5) // Top 5 categories

  const favoriteCount = games.filter((g) => g.isFavorite).length

  const playtimeStats = [...games]
    .filter((g) => (g.playTime || 0) > 0)
    .map((g) => ({ label: g.title, value: g.playTime || 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="flex-1 w-full min-h-0 overflow-y-auto pr-4 pb-20 scrollbar-hide"
    >
      <div className="flex flex-col gap-8 pt-4">
        {/* Top numbers */}
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
            <div className="flex items-center gap-3 text-white/50 mb-3">
              <Clock size={20} />
              <span className="font-medium">Tổng thời gian</span>
            </div>
            <div className="text-3xl font-bold text-white">{formatHours(totalPlayTime)}</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
            <div className="flex items-center gap-3 text-white/50 mb-3">
              <PlayCircle size={20} />
              <span className="font-medium">Số lần khởi chạy</span>
            </div>
            <div className="text-3xl font-bold text-white">{totalPlayCount} lần</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
            <div className="flex items-center gap-3 text-white/50 mb-3">
              <Gamepad2 size={20} />
              <span className="font-medium">Bộ sưu tập</span>
            </div>
            <div className="text-3xl font-bold text-white">{games.length} game</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
            <div className="flex items-center gap-3 text-white/50 mb-3">
              <Trophy size={20} />
              <span className="font-medium">Game yêu thích</span>
            </div>
            <div className="text-3xl font-bold text-white">{favoriteCount} game</div>
          </div>
        </div>

        {/* Highlights & Charts Row 1 */}
        <div className="grid grid-cols-2 gap-6">
          {/* Most Played */}
          <div className="flex flex-col gap-6">
            {mostPlayedGame && (mostPlayedGame.playTime || 0) > 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex gap-6 flex-1">
                <img
                  src={mostPlayedGame.coverArt || mostPlayedGame.heroBackground}
                  alt={mostPlayedGame.title}
                  className="w-32 h-32 object-cover rounded-2xl shadow-xl"
                />
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-2 text-yellow-400 mb-2 font-medium">
                    <Trophy size={16} /> Game chơi nhiều nhất
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-1 line-clamp-1">{mostPlayedGame.title}</h3>
                  <p className="text-white/60">{formatHours(mostPlayedGame.playTime || 0)}</p>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex items-center justify-center text-white/40 flex-1">
                Chưa có dữ liệu chơi game
              </div>
            )}

            {/* Recently Played */}
            {recentlyPlayed && (recentlyPlayed.lastPlayed || 0) > 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex gap-6 flex-1">
                <img
                  src={recentlyPlayed.coverArt || recentlyPlayed.heroBackground}
                  alt={recentlyPlayed.title}
                  className="w-32 h-32 object-cover rounded-2xl shadow-xl"
                />
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-2 text-blue-400 mb-2 font-medium">
                    <Clock size={16} /> Vừa chơi gần đây
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-1 line-clamp-1">{recentlyPlayed.title}</h3>
                  <p className="text-white/60">
                    {new Date(recentlyPlayed.lastPlayed || 0).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex items-center justify-center text-white/40 flex-1">
                Chưa có lịch sử chơi
              </div>
            )}
          </div>

          {/* Charts Area 1 */}
          <div className="flex flex-col gap-6">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex-1">
              <div className="flex items-center gap-2 text-white/60 mb-6 font-medium uppercase tracking-widest text-xs">
                <Clock size={14} /> Thời gian chơi (Top 5)
              </div>
              <DonutChart data={playtimeStats} colors={['#f43f5e', '#ec4899', '#d946ef', '#8b5cf6', '#6366f1']} />
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex-1">
            <div className="flex items-center gap-2 text-white/60 mb-6 font-medium uppercase tracking-widest text-xs">
              <Layers size={14} /> Nền tảng
            </div>
            <DonutChart data={platformData} colors={['#1a9fff', '#c084fc', '#3b82f6']} />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex-1">
            <div className="flex items-center gap-2 text-white/60 mb-6 font-medium uppercase tracking-widest text-xs">
              <Library size={14} /> Phân loại (Top 5)
            </div>
            <DonutChart data={collectionData} colors={['#fbbf24', '#f87171', '#34d399', '#60a5fa', '#a78bfa']} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
