import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
  }

  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`,
  ]

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Referer': 'https://finance.yahoo.com',
          'Origin': 'https://finance.yahoo.com',
        },
        cache: 'no-store',
      })
      if (!res.ok) continue
      const data = await res.json()
      const result = data?.chart?.result?.[0]
      if (!result) continue
      const meta = result.meta
      const price = meta.regularMarketPrice || meta.previousClose || 0
      const prevClose = meta.chartPreviousClose || meta.previousClose || price
      const change = price - prevClose
      if (price > 0) {
        const isDelayed = !meta.regularMarketPrice
        return NextResponse.json({
          symbol: meta.symbol,
          name: meta.longName || meta.shortName || symbol,
          price: parseFloat(price.toFixed(2)),
          change: parseFloat(change.toFixed(2)),
          changePercent: parseFloat(((change / prevClose) * 100).toFixed(2)),
          volume: meta.regularMarketVolume || 0,
          high: meta.regularMarketDayHigh || price,
          low: meta.regularMarketDayLow || price,
          open: meta.regularMarketOpen || price,
          prevClose: parseFloat(prevClose.toFixed(2)),
          exchange: meta.exchangeName || 'NSE',
          source: 'yahoo',
          dataTimestamp: meta.regularMarketTime
            ? new Date(meta.regularMarketTime * 1000).toISOString()
            : new Date().toISOString(),
          delayed: isDelayed,
          freshness: isDelayed ? 'previous_close' : 'live_or_last',
        })
      }
    } catch {
      continue
    }
  }

  return NextResponse.json(
    {
      error: 'Market data unavailable',
      symbol,
      message: 'Unable to retrieve live quote from data providers. No synthetic fallback is used in production.',
      source: null,
    },
    { status: 503 }
  )
}
