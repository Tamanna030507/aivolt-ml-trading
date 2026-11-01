import { NextResponse } from 'next/server'

const INDEX_SYMBOLS = [
  { yahoo: '^NSEI', name: 'NIFTY 50' },
  { yahoo: '^BSESN', name: 'SENSEX' },
  { yahoo: '^NSEBANK', name: 'BANK NIFTY' },
  { yahoo: '^INDIAVIX', name: 'INDIA VIX' },
]

export async function GET() {
  const results = await Promise.allSettled(
    INDEX_SYMBOLS.map(async ({ yahoo, name }) => {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?interval=5m&range=1d`,
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
      const meta = data?.chart?.result?.[0]?.meta
      if (!meta) throw new Error('No meta')

      const price = meta.regularMarketPrice || meta.previousClose || 0
      const prev = meta.chartPreviousClose || meta.previousClose || price
      const change = price - prev

      return {
        name,
        value: parseFloat(price.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: prev ? parseFloat(((change / prev) * 100).toFixed(2)) : 0,
        source: 'yahoo',
        dataTimestamp: meta.regularMarketTime
          ? new Date(meta.regularMarketTime * 1000).toISOString()
          : null,
      }
    })
  )

  const indices = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
    .map((r) => r.value)

  if (indices.length === 0) {
    return NextResponse.json(
      {
        error: 'Index data unavailable',
        message: 'Unable to retrieve index quotes. No synthetic values returned.',
        indices: [],
      },
      { status: 503 }
    )
  }

  return NextResponse.json(indices)
}
