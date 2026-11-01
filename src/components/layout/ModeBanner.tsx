'use client'

import { useEffect, useState } from 'react'
import ThemeToggle from '@/components/ThemeToggle'

export default function ModeBanner() {
  const [mode, setMode] = useState<'LIVE' | 'PAPER' | 'HALTED' | 'LOADING'>('LOADING')

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const res = await fetch('/api/system')
        if (!res.ok) return
        const data = await res.json()
        if (!alive) return
        if (data.halted) setMode('HALTED')
        else if (data.mode === 'LIVE') setMode('LIVE')
        else setMode('PAPER')
      } catch {
        if (alive) setMode('PAPER')
      }
    }
    load()
    const t = setInterval(load, 20000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  return (
    <div className="w-full flex items-center justify-between px-4 py-2 border-b border-bg-border bg-bg-secondary">
      <div className="text-[11px] font-medium tracking-wide">
        {mode === 'HALTED' && <span className="text-loss">System halted — orders blocked</span>}
        {mode === 'LIVE' && <span className="text-loss">Live trading — real money</span>}
        {(mode === 'PAPER' || mode === 'LOADING') && (
          <span className="text-text-secondary">Paper mode — simulated funds</span>
        )}
      </div>
      <ThemeToggle />
    </div>
  )
}
