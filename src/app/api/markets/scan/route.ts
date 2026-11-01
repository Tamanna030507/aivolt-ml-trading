import { NextResponse } from 'next/server'
import { fetchQuote } from '@/lib/market-data'
import { WATCH_UNIVERSE } from '@/lib/universe'

export async function GET() {
  const rows = []
  for (const s of WATCH_UNIVERSE) {
    try {
      const q = await fetchQuote(s.yahoo)
      if (!q || !(q.price > 0)) continue
      rows.push({
        symbol: s.symbol,
        yahoo: s.yahoo,
        name: s.name,
        sector: s.sector,
        price: q.price,
        changePercent: q.changePercent ?? 0,
        change: q.change ?? 0,
      })
    } catch {
      continue
    }
  }
  const sorted = [...rows].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
  const gainers = [...rows].sort((a, b) => b.changePercent - a.changePercent).slice(0, 8)
  const losers = [...rows].sort((a, b) => a.changePercent - b.changePercent).slice(0, 8)
  return NextResponse.json({
    all: sorted,
    gainers,
    losers,
    count: rows.length,
    source: 'yahoo',
  })
}
