'use client'

import { useAppStore } from '@/lib/store'
import { Activity, Zap, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function AIStatusBar() {
  const { aiStatus, lastAIAction, isPaperMode, portfolioValue, todayPnL, todayPnLPercent } = useAppStore()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const statusColor = aiStatus === 'Active' ? 'text-green-400' : aiStatus === 'Hibernating' ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="h-8 bg-bg-secondary border-b border-bg-border flex items-center justify-between px-4 text-xs font-mono z-50">
      {}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <div className={`w-1.5 h-1.5 rounded-full ${aiStatus === 'Active' ? 'bg-accent-green' : 'bg-yellow-400'}`} />
            {aiStatus === 'Active' && (
              <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-accent-green animate-ping opacity-75" />
            )}
          </div>
          <span className="text-text-secondary">AI Status:</span>
          <span className={statusColor}>{aiStatus}</span>
        </div>

        <div className="flex items-center gap-1.5 text-text-secondary">
          <Activity size={10} className="text-accent-blue" />
          <span className="truncate max-w-[200px]">{lastAIAction}</span>
        </div>
      </div>

      {}
      <div className="flex items-center gap-4">
        {isPaperMode && (
          <span className="virtual-badge ai-badge px-2 py-0.5 rounded text-[10px]">
            VIRTUAL MODE
          </span>
        )}
        <div className="flex items-center gap-1.5">
          <Shield size={10} className="text-accent-green" />
          <span className="text-text-secondary">Portfolio Health:</span>
          <span className={todayPnL >= 0 ? 'text-accent-green' : 'text-accent-red'}>
            {todayPnL >= 0 ? 'Strong' : 'Caution'}
          </span>
        </div>

        {portfolioValue > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-text-secondary">Today:</span>
            <span className={todayPnL >= 0 ? 'text-accent-green' : 'text-accent-red'}>
              {todayPnL >= 0 ? '+' : ''}₹{Math.abs(todayPnL).toFixed(0)}
              <span className="ml-1 text-text-muted">
                ({todayPnLPercent >= 0 ? '+' : ''}{todayPnLPercent.toFixed(2)}%)
              </span>
            </span>
          </div>
        )}
      </div>

      {}
      <div className="flex items-center gap-3 text-text-muted">
        <div className="flex items-center gap-1">
          <Zap size={10} className="text-accent-gold" />
          <span>AIVOLT</span>
        </div>
        <span>{time.toLocaleTimeString('en-IN', { hour12: false })}</span>
      </div>
    </div>
  )
}
