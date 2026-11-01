'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts'
import { useAppStore } from '@/lib/store'

const PERIODS = ['Daily', 'Weekly', 'Monthly']
const PERIOD_KEYS = ['daily', 'weekly', 'monthly']

interface PnLData {
  date: string
  realized_pnl: number
  total_trades: number
  winning_trades: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-3 text-xs font-mono shadow-xl">
      <div className="text-text-muted mb-1">{label}</div>
      <div className={`font-bold ${payload[0]?.value >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
        P&L: {payload[0]?.value >= 0 ? '+' : ''}₹{Number(payload[0]?.value || 0).toFixed(0)}
      </div>
      {payload[1] && (
        <div className="text-text-secondary">
          Cumulative: ₹{Number(payload[1]?.value || 0).toFixed(0)}
        </div>
      )}
    </div>
  )
}

export default function PnLChart() {
  const { user, isPaperMode } = useAppStore()
  const [period, setPeriod] = useState(0)
  const [data, setData] = useState<PnLData[]>([])
  const [summary, setSummary] = useState({ totalPnL: 0, winRate: 0 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user, period, isPaperMode])

  async function loadData() {
    if (!user) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/pnl?userId=${user.id}&period=${PERIOD_KEYS[period]}&isPaper=${isPaperMode}`
      )
      if (res.ok) {
        const json = await res.json()
        setData(json.data || [])
        setSummary(json.summary || { totalPnL: 0, winRate: 0 })
      }
    } catch {
    }
    setLoading(false)
  }

  const chartData = data.reduce((acc: any[], item, i) => {
    const prev = acc[i - 1]?.cumulative || 0
    return [...acc, {
      date: item.date,
      daily: item.realized_pnl,
      cumulative: prev + item.realized_pnl,
      trades: item.total_trades,
      wins: item.winning_trades,
    }]
  }, [])

  const isProfit = summary.totalPnL >= 0

  return (
    <div className="panel p-4">
      {}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs font-mono text-text-muted mb-1">PROFIT & LOSS</div>
          <div className={`text-2xl font-mono font-bold ${isProfit ? 'text-accent-green' : 'text-accent-red'}`}>
            {isProfit ? '+' : ''}₹{Math.abs(summary.totalPnL).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-text-muted font-mono">
            Win rate:{' '}
            <span className={summary.winRate >= 50 ? 'text-accent-green' : 'text-accent-red'}>
              {summary.winRate.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="flex gap-1">
          {PERIODS.map((p, i) => (
            <button
              key={p}
              onClick={() => setPeriod(i)}
              className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                period === i
                  ? 'bg-accent-blue/20 text-accent-blue'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {}
      {loading ? (
        <div className="h-48 flex items-center justify-center text-text-muted text-xs font-mono animate-pulse">
          Loading P&L data...
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-text-muted text-xs font-mono">
          No trade history yet. Start trading to see P&L here.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="pnlGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d68f" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00d68f" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="pnlRed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff3d71" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ff3d71" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fill: '#4a5568', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            />
            <YAxis
              tick={{ fill: '#4a5568', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#1e2d4a" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke={isProfit ? '#00d68f' : '#ff3d71'}
              fill={isProfit ? 'url(#pnlGreen)' : 'url(#pnlRed)'}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
