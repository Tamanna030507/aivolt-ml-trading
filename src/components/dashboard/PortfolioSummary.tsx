'use client'

import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { formatINR } from '@/lib/market'

interface Props {
  totalInvested: number
  totalCurrent: number
  totalPnL: number
  totalPnLPercent: number
  holdingsCount: number
}

export default function PortfolioSummary({
  totalInvested,
  totalCurrent,
  totalPnL,
  totalPnLPercent,
  holdingsCount,
}: Props) {
  const isPositive = totalPnL >= 0

  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      <div className="panel p-3">
        <div className="text-[10px] font-mono text-text-muted mb-1">INVESTED</div>
        <div className="text-sm font-mono font-bold text-text-primary">{formatINR(totalInvested)}</div>
      </div>
      <div className="panel p-3">
        <div className="text-[10px] font-mono text-text-muted mb-1">CURRENT VALUE</div>
        <div className="text-sm font-mono font-bold text-text-primary">{formatINR(totalCurrent)}</div>
      </div>
      <div className="panel p-3 col-span-2">
        <div className="text-[10px] font-mono text-text-muted mb-1">TOTAL P&amp;L</div>
        <div className={`flex items-center gap-1 text-lg font-mono font-bold ${isPositive ? 'text-accent-green' : 'text-accent-red'}`}>
          {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          {isPositive ? '+' : ''}{formatINR(totalPnL)}
          <span className="text-sm font-normal ml-1">
            ({isPositive ? '+' : ''}{totalPnLPercent.toFixed(2)}%)
          </span>
        </div>
      </div>
    </div>
  )
}