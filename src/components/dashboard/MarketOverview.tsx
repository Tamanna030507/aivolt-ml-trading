'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface IndexData {
  name: string
  value: number
  change: number
  changePercent: number
}

export default function MarketOverview() {
  const [indices, setIndices] = useState<IndexData[]>([])

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/market-data/indices')
        if (res.ok) setIndices(await res.json())
      } catch {}
    }
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex items-center gap-6 px-6 py-3 overflow-x-auto">
      {indices.map(idx => (
        <div key={idx.name} className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-mono text-text-muted">{idx.name}</span>
          <span className="text-sm font-mono font-bold text-text-primary">
            {idx.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </span>
          <span className={`text-xs font-mono flex items-center gap-0.5 ${idx.change >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {idx.change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {idx.changePercent >= 0 ? '+' : ''}{idx.changePercent.toFixed(2)}%
          </span>
          <div className="w-px h-4 bg-bg-border" />
        </div>
      ))}
    </div>
  )
}