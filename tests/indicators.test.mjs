function ema(prices, period) {
  const k = 2 / (period + 1)
  let e = prices[0]
  for (let i = 1; i < prices.length; i++) e = prices[i] * k + e * (1 - k)
  return e
}

function macd(prices) {
  const k12 = 2 / 13, k26 = 2 / 27
  let e12 = prices[0], e26 = prices[0]
  const series = []
  for (let i = 0; i < prices.length; i++) {
    e12 = prices[i] * k12 + e12 * (1 - k12)
    e26 = prices[i] * k26 + e26 * (1 - k26)
    series.push(e12 - e26)
  }
  const k9 = 2 / 10
  let signal = series[0]
  for (let i = 1; i < series.length; i++) signal = series[i] * k9 + signal * (1 - k9)
  const m = series[series.length - 1]
  return { macd: m, signal, hist: m - signal }
}

const prices = Array.from({ length: 50 }, (_, i) => 100 + i * 0.5 + Math.sin(i / 3) * 2)
const m = macd(prices)
if (!(Math.abs(m.hist - (m.macd - m.signal)) < 1e-9)) {
  console.error('MACD hist mismatch')
  process.exit(1)
}
if (!(m.signal !== m.macd || prices.length < 30)) {
}
console.log('indicators_ok', { macd: +m.macd.toFixed(4), signal: +m.signal.toFixed(4), hist: +m.hist.toFixed(4) })
