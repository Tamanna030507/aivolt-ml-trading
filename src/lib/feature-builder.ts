export function buildFeatureVector(closes: number[], volumes: number[], highs?: number[], lows?: number[]): Record<string, number> | null {
  if (closes.length < 60) return null
  const n = closes.length
  const H = highs && highs.length === n ? highs : closes
  const L = lows && lows.length === n ? lows : closes

  const ret = (i: number, h: number) => (closes[i - h] > 0 ? closes[i] / closes[i - h] - 1 : 0)
  const rets: number[] = []
  for (let i = 1; i < n; i++) rets.push(closes[i] / closes[i - 1] - 1)

  const std = (arr: number[]) => {
    if (arr.length < 2) return 0
    const m = arr.reduce((a, b) => a + b, 0) / arr.length
    return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length)
  }

  const rsiFn = (prices: number[], period: number) => {
    if (prices.length < period + 1) return 50
    let g = 0
    let l = 0
    for (let i = prices.length - period; i < prices.length; i++) {
      const d = prices[i] - prices[i - 1]
      if (d >= 0) g += d
      else l += Math.abs(d)
    }
    const ag = g / period
    const al = l / period
    if (al === 0) return 100
    return 100 - 100 / (1 + ag / al)
  }

  const emaFn = (prices: number[], period: number) => {
    const k = 2 / (period + 1)
    let e = prices[0]
    for (let i = 1; i < prices.length; i++) e = prices[i] * k + e * (1 - k)
    return e
  }

  const macdFull = (prices: number[]) => {
    const k12 = 2 / 13
    const k26 = 2 / 27
    let e12 = prices[0]
    let e26 = prices[0]
    const series: number[] = []
    for (let i = 0; i < prices.length; i++) {
      e12 = prices[i] * k12 + e12 * (1 - k12)
      e26 = prices[i] * k26 + e26 * (1 - k26)
      series.push(e12 - e26)
    }
    const k9 = 2 / 10
    let sig = series[0]
    for (let i = 1; i < series.length; i++) sig = series[i] * k9 + sig * (1 - k9)
    const m = series[series.length - 1]
    return { macd: m, signal: sig, hist: m - sig }
  }

  const bollinger = (prices: number[], period = 20) => {
    const slice = prices.slice(-period)
    const mean = slice.reduce((a, b) => a + b, 0) / period
    const variance = slice.reduce((s, p) => s + (p - mean) ** 2, 0) / period
    const sd = Math.sqrt(variance)
    const upper = mean + 2 * sd
    const lower = mean - 2 * sd
    const last = prices[prices.length - 1]
    return {
      width: mean > 0 ? (upper - lower) / mean : 0,
      pos: upper !== lower ? (last - lower) / (upper - lower) : 0.5,
    }
  }

  const e12 = emaFn(closes, 12)
  const e26 = emaFn(closes, 26)
  const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20
  const sma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50
  const m = macdFull(closes)
  const bb = bollinger(closes, 20)
  const avgVol = volumes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, volumes.length) || 1
  const hi = H[n - 1]
  const lo = L[n - 1]
  const range = hi - lo

  return {
    ret_1: ret(n - 1, 1),
    ret_5: ret(n - 1, 5),
    ret_10: ret(n - 1, 10),
    ret_20: ret(n - 1, 20),
    vol_10: std(rets.slice(-10)),
    vol_20: std(rets.slice(-20)),
    vol_ratio: (volumes[n - 1] || 0) / avgVol,
    rsi_14: rsiFn(closes, 14),
    rsi_7: rsiFn(closes, 7),
    ema_ratio: e26 !== 0 ? e12 / e26 : 1,
    price_sma20: sma20 !== 0 ? closes[n - 1] / sma20 : 1,
    price_sma50: sma50 !== 0 ? closes[n - 1] / sma50 : 1,
    macd: m.macd,
    macd_hist: m.hist,
    macd_signal_cross: Math.max(-1, Math.min(1, m.macd - m.signal)),
    bb_width: bb.width,
    bb_pos: bb.pos,
    momentum_10: ret(n - 1, 10),
    momentum_20: ret(n - 1, 20),
    high_low_range: closes[n - 1] > 0 ? range / closes[n - 1] : 0,
    close_location: range > 0 ? (closes[n - 1] - lo) / range : 0.5,
  }
}
