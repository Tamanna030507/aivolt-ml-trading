import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbolsParam = searchParams.get('symbols')
  if (!symbolsParam) {
    return NextResponse.json({ error: 'symbols query parameter required' }, { status: 400 })
  }

  const symbols = symbolsParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20)

  const quotes = await Promise.allSettled(
    symbols.map(async (symbol) => {
      const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1m&range=1d`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://finance.yahoo.com',
          },
          cache: 'no-store',
        }
      )

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const result = data?.chart?.result?.[0]
      if (!result) throw new Error('No data')
      const meta = result.meta
      const price = meta.regularMarketPrice || meta.previousClose || 0
      const prev = meta.chartPreviousClose || meta.previousClose || price
      const change = price - prev

      return {
        symbol: meta.symbol || yahooSymbol,
        name: meta.longName || meta.shortName || yahooSymbol,
        price: parseFloat(price.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: prev ? parseFloat(((change / prev) * 100).toFixed(2)) : 0,
        volume: meta.regularMarketVolume || 0,
        high: meta.regularMarketDayHigh || price,
        low: meta.regularMarketDayLow || price,
        open: meta.regularMarketOpen || price,
        prevClose: parseFloat(prev.toFixed(2)),
        exchange: meta.exchangeName || 'NSE',
        source: 'yahoo',
      }
    })
  )

  const results = quotes
    .filter((q): q is PromiseFulfilledResult<any> => q.status === 'fulfilled')
    .map((q) => q.value)

  return NextResponse.json({
    quotes: results,
    requested: symbols.length,
    available: results.length,
    source: 'yahoo',
  })
}
