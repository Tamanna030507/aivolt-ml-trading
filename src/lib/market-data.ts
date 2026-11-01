

export type Quote = {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  high: number
  low: number
  open: number
  prevClose: number
  exchange: string
  source: string
  dataTimestamp: string | null
  delayed: boolean
}

export type Candle = {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

const YAHOO_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json',
  Referer: 'https://finance.yahoo.com',
  Origin: 'https://finance.yahoo.com',
}

export function toYahooSymbol(symbol: string): string {
  if (symbol.includes('.') || symbol.startsWith('^')) return symbol
  return `${symbol}.NS`
}

export async function fetchQuote(symbol: string): Promise<Quote | null> {
  const yahoo = toYahooSymbol(symbol)
  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?interval=1m&range=1d`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?interval=1m&range=1d`,
  ]

  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: YAHOO_HEADERS, cache: 'no-store' })
      if (!res.ok) continue
      const data = await res.json()
      const meta = data?.chart?.result?.[0]?.meta
      if (!meta) continue
      const price = meta.regularMarketPrice || meta.previousClose || 0
      const prev = meta.chartPreviousClose || meta.previousClose || price
      if (price <= 0) continue
      const change = price - prev
      return {
        symbol: meta.symbol || yahoo,
        name: meta.longName || meta.shortName || yahoo,
        price: +price.toFixed(2),
        change: +change.toFixed(2),
        changePercent: prev ? +((change / prev) * 100).toFixed(2) : 0,
        volume: meta.regularMarketVolume || 0,
        high: meta.regularMarketDayHigh || price,
        low: meta.regularMarketDayLow || price,
        open: meta.regularMarketOpen || price,
        prevClose: +prev.toFixed(2),
        exchange: meta.exchangeName || 'NSE',
        source: 'yahoo',
        dataTimestamp: meta.regularMarketTime
          ? new Date(meta.regularMarketTime * 1000).toISOString()
          : null,
        delayed: !meta.regularMarketPrice,
      }
    } catch {
      continue
    }
  }
  return null
}

export async function fetchDailyHistory(
  symbol: string,
  range = '3mo'
): Promise<{ candles: Candle[]; source: string } | null> {
  const yahoo = toYahooSymbol(symbol)
  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?interval=1d&range=${range}`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?interval=1d&range=${range}`,
  ]

  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: YAHOO_HEADERS, cache: 'no-store' })
      if (!res.ok) continue
      const data = await res.json()
      const result = data?.chart?.result?.[0]
      if (!result) continue
      const ts: number[] = result.timestamp || []
      const q = result.indicators?.quote?.[0] || {}
      const candles: Candle[] = ts
        .map((t, i) => ({
          time: t,
          open: q.open?.[i],
          high: q.high?.[i],
          low: q.low?.[i],
          close: q.close?.[i],
          volume: q.volume?.[i] || 0,
        }))
        .filter((c) => c.open != null && c.close != null && c.open > 0 && c.close > 0) as Candle[]
      if (candles.length < 5) continue
      return { candles, source: 'yahoo' }
    } catch {
      continue
    }
  }
  return null
}
