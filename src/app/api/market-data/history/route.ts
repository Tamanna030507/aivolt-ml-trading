import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol') || 'RELIANCE.NS'
  const interval = searchParams.get('interval') || '5m'
  const range = searchParams.get('range') || '1d'

  const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`

  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}&includePrePost=false`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}`,
  ]

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://finance.yahoo.com',
          'Origin': 'https://finance.yahoo.com',
        },
        cache: 'no-store',
      })

      if (!res.ok) continue

      const data = await res.json()
      const result = data?.chart?.result?.[0]
      if (!result) continue

      const timestamps: number[] = result.timestamp || []
      const ohlcv = result.indicators?.quote?.[0] || {}

      const candles = timestamps
        .map((ts: number, i: number) => ({
          time: ts,
          open: ohlcv.open?.[i],
          high: ohlcv.high?.[i],
          low: ohlcv.low?.[i],
          close: ohlcv.close?.[i],
          volume: ohlcv.volume?.[i] || 0,
        }))
        .filter(
          (c: { open: number | null; close: number | null }) =>
            c.open != null && c.close != null && c.open > 0 && c.close > 0
        )

      if (candles.length === 0) continue

      return NextResponse.json({
        candles,
        symbol: yahooSymbol,
        source: 'yahoo',
        interval,
        range,
        count: candles.length,
      })
    } catch {
      continue
    }
  }

  return NextResponse.json(
    {
      error: 'Historical data unavailable',
      symbol: yahooSymbol,
      message: 'Unable to retrieve OHLCV from data providers. No synthetic candles are generated in production.',
      candles: [],
      source: null,
    },
    { status: 503 }
  )
}
