'use client'

import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Holding } from '@/lib/store'
import clsx from 'clsx'

interface Props {
  holdings: Holding[]
  selectedSymbol?: string
  onSelect?: (symbol: string) => void
}

export default function HoldingsTable({ holdings, selectedSymbol, onSelect }: Props) {
  if (holdings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
        <div className="text-text-muted text-sm mb-2">No holdings yet</div>
        <div className="text-text-muted text-xs">AI will populate this once trading begins</div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {holdings.map(h => {
        const isSelected = selectedSymbol?.includes(h.symbol)
        const isPositive = h.pnl >= 0

        return (
          <button
            key={h.id}
            onClick={() => onSelect?.(`${h.symbol}.NS`)}
            className={clsx(
              'w-full px-4 py-3 text-left border-b border-bg-border transition-colors hover:bg-bg-hover',
              isSelected ? 'bg-accent-blue/5 border-l-2 border-l-accent-blue' : ''
            )}
          >
            <div className="flex items-start justify-between mb-1">
              <div>
                <div className="text-text-primary text-sm font-mono font-medium">{h.symbol}</div>
                <div className="text-text-muted text-xs">{h.quantity} shares @ ₹{h.avgBuyPrice.toFixed(0)}</div>
              </div>
              <div className="text-right">
                <div className="text-text-primary text-sm font-mono">₹{h.currentPrice.toFixed(2)}</div>
                <div className={clsx('text-xs font-mono flex items-center gap-0.5', isPositive ? 'text-accent-green' : 'text-accent-red')}>
                  {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {isPositive ? '+' : ''}{h.pnlPercent.toFixed(2)}%
                </div>
              </div>
            </div>

            {}
            <div className="flex items-center gap-2">
              <div className="flex-1 confidence-bar">
                <div
                  className={clsx('h-full rounded-full transition-all', {
                    'confidence-fill-high': h.aiConfidence === 'high',
                    'confidence-fill-medium': h.aiConfidence === 'medium',
                    'confidence-fill-low': h.aiConfidence === 'low',
                  })}
                  style={{ width: h.aiConfidence === 'high' ? '80%' : h.aiConfidence === 'medium' ? '50%' : '25%' }}
                />
              </div>
              <span className={clsx('text-[10px] font-mono uppercase', {
                'text-accent-green': h.aiConfidence === 'high',
                'text-accent-gold': h.aiConfidence === 'medium',
                'text-accent-red': h.aiConfidence === 'low',
              })}>
                {h.aiConfidence}
              </span>
            </div>

            <div className={clsx('text-xs font-mono mt-1', isPositive ? 'text-accent-green' : 'text-accent-red')}>
              {isPositive ? '+' : ''}₹{h.pnl.toFixed(0)} total P&L
            </div>
          </button>
        )
      })}
    </div>
  )
}
