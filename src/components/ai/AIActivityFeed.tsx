'use client'

import { AIActivity } from '@/lib/store'
import { formatDistanceToNow } from 'date-fns'
import { TrendingUp, TrendingDown, AlertCircle, Cpu } from 'lucide-react'

interface Props {
  activities: AIActivity[]
}

export default function AIActivityFeed({ activities }: Props) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6 text-center gap-2">
        <Cpu size={24} className="text-text-muted" />
        <div className="text-text-muted text-xs font-mono">AI monitoring markets...</div>
        <div className="text-text-muted text-xs">Actions will appear here in real-time</div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {activities.map((a, i) => {
        const isBuy = a.action.toLowerCase().includes('bought') || a.action.toLowerCase().includes('buy')
        const isSell = a.action.toLowerCase().includes('sold') || a.action.toLowerCase().includes('sell')
        const isAlert = a.action.toLowerCase().includes('alert') || a.action.toLowerCase().includes('warning')

        return (
          <div
            key={a.id || i}
            className="px-4 py-3 border-b border-bg-border hover:bg-bg-hover transition-colors animate-slide-in"
          >
            <div className="flex items-start gap-2">
              <div className={`mt-0.5 shrink-0 ${isBuy ? 'text-accent-green' : isSell ? 'text-accent-red' : 'text-accent-gold'}`}>
                {isBuy ? <TrendingUp size={13} /> : isSell ? <TrendingDown size={13} /> : <AlertCircle size={13} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-text-primary text-xs font-medium leading-snug mb-1">
                  {a.action}
                </div>
                {a.reasoning && (
                  <div className="text-text-muted text-[10px] leading-snug mb-1">{a.reasoning}</div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-text-muted">
                    {a.createdAt
                      ? formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })
                      : 'just now'}
                  </span>
                  <span className={`text-[10px] font-mono ${
                    a.confidence >= 75 ? 'text-accent-green' : a.confidence >= 55 ? 'text-accent-gold' : 'text-accent-red'
                  }`}>
                    {a.confidence}% conf
                  </span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}