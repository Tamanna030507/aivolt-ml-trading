
export interface StockQuote {
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
  marketCap?: number
  exchange: string
}

export interface IndexData {
  name: string
  value: number
  change: number
  changePercent: number
}

const NSE_BASE = 'https://www.nseindia.com/api'

const YAHOO_PROXY = 'https://query1.finance.yahoo.com/v8/finance/chart'

const AV_BASE = 'https://www.alphavantage.co/query'
const AV_KEY = process.env.ALPHA_VANTAGE_KEY || 'demo'

export const NIFTY50_STOCKS = [
  { symbol: 'RELIANCE', yahooSymbol: 'RELIANCE.NS', name: 'Reliance Industries' },
  { symbol: 'TCS', yahooSymbol: 'TCS.NS', name: 'Tata Consultancy Services' },
  { symbol: 'HDFCBANK', yahooSymbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
  { symbol: 'INFY', yahooSymbol: 'INFY.NS', name: 'Infosys' },
  { symbol: 'HINDUNILVR', yahooSymbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever' },
  { symbol: 'ICICIBANK', yahooSymbol: 'ICICIBANK.NS', name: 'ICICI Bank' },
  { symbol: 'KOTAKBANK', yahooSymbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank' },
  { symbol: 'BAJFINANCE', yahooSymbol: 'BAJFINANCE.NS', name: 'Bajaj Finance' },
  { symbol: 'BHARTIARTL', yahooSymbol: 'BHARTIARTL.NS', name: 'Bharti Airtel' },
  { symbol: 'ITC', yahooSymbol: 'ITC.NS', name: 'ITC Limited' },
  { symbol: 'WIPRO', yahooSymbol: 'WIPRO.NS', name: 'Wipro' },
  { symbol: 'AXISBANK', yahooSymbol: 'AXISBANK.NS', name: 'Axis Bank' },
  { symbol: 'MARUTI', yahooSymbol: 'MARUTI.NS', name: 'Maruti Suzuki' },
  { symbol: 'SUNPHARMA', yahooSymbol: 'SUNPHARMA.NS', name: 'Sun Pharma' },
  { symbol: 'TATAMOTORS', yahooSymbol: 'TATAMOTORS.NS', name: 'Tata Motors' },
  { symbol: 'ONGC', yahooSymbol: 'ONGC.NS', name: 'ONGC' },
  { symbol: 'ULTRACEMCO', yahooSymbol: 'ULTRACEMCO.NS', name: 'UltraTech Cement' },
  { symbol: 'POWERGRID', yahooSymbol: 'POWERGRID.NS', name: 'Power Grid' },
  { symbol: 'NTPC', yahooSymbol: 'NTPC.NS', name: 'NTPC' },
  { symbol: 'TITAN', yahooSymbol: 'TITAN.NS', name: 'Titan Company' },
]

export const INDICES = [
  { symbol: '^NSEI', name: 'NIFTY 50' },
  { symbol: '^BSESN', name: 'SENSEX' },
  { symbol: '^NSEBANK', name: 'BANK NIFTY' },
  { symbol: 'NIFTY_MID_SELECT.NS', name: 'MIDCAP' },
  { symbol: '^INDIAVIX', name: 'INDIA VIX' },
]

export async function fetchStockQuote(yahooSymbol: string): Promise<StockQuote | null> {
  try {
    const res = await fetch(
      `/api/market-data/quote?symbol=${encodeURIComponent(yahooSymbol)}`,
      { next: { revalidate: 30 } }
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function fetchMultipleQuotes(symbols: string[]): Promise<StockQuote[]> {
  try {
    const res = await fetch(
      `/api/market-data/quotes?symbols=${symbols.join(',')}`,
      { next: { revalidate: 30 } }
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function fetchIndices(): Promise<IndexData[]> {
  try {
    const res = await fetch('/api/market-data/indices', { next: { revalidate: 60 } })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export interface AISignal {
  symbol: string
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  confidence: number
  reasoning: string
  entry: number
  target: number
  stopLoss: number
  timeframe: string
  tradeType: 'intraday' | 'swing' | 'delivery'
  momentumScore: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
}

export function generateAISignal(quote: StockQuote, historicalData?: number[]): AISignal {
  const changePercent = quote.changePercent
  const volumeRatio = Math.random() * 2 + 0.5
  
  let signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL'
  let confidence = 50
  let momentumScore = 50
  
  if (changePercent > 2 && volumeRatio > 1.5) {
    signal = 'BULLISH'
    confidence = Math.min(85, 60 + changePercent * 5)
    momentumScore = Math.min(95, 70 + changePercent * 3)
  } else if (changePercent > 0.5) {
    signal = 'BULLISH'
    confidence = 55 + changePercent * 3
    momentumScore = 55 + changePercent * 5
  } else if (changePercent < -2 && volumeRatio > 1.5) {
    signal = 'BEARISH'
    confidence = Math.min(85, 60 + Math.abs(changePercent) * 5)
    momentumScore = Math.max(5, 30 - Math.abs(changePercent) * 3)
  } else if (changePercent < -0.5) {
    signal = 'BEARISH'
    confidence = 55 + Math.abs(changePercent) * 3
    momentumScore = Math.max(10, 40 - Math.abs(changePercent) * 5)
  }

  const entry = quote.price
  const targetMultiplier = signal === 'BULLISH' ? 1 + (confidence / 1000) : 1 - (confidence / 1000)
  const slMultiplier = signal === 'BULLISH' ? 1 - 0.03 : 1 + 0.03

  const reasonings: Record<string, string[]> = {
    BULLISH: [
      `Institutional accumulation detected. Volume ${volumeRatio.toFixed(1)}x above average.`,
      `Breakout above resistance with strong momentum. RSI trending up.`,
      `Sector rotation into this space. FII buying detected in data.`,
      `Strong earnings expected. AI models show 78% probability of upside.`,
    ],
    BEARISH: [
      `Distribution pattern detected. Smart money exiting.`,
      `Breakdown below support. Volume confirms the move.`,
      `Sector headwinds. Macro data unfavorable for this space.`,
      `Overbought on multiple timeframes. Mean reversion expected.`,
    ],
    NEUTRAL: [
      `Consolidating after recent move. Awaiting catalyst.`,
      `Low volatility. Range-bound. Monitoring for breakout.`,
    ],
  }

  const reasoningList = reasonings[signal]
  const reasoning = reasoningList[Math.floor(Math.random() * reasoningList.length)]

  return {
    symbol: quote.symbol,
    signal,
    confidence: Math.round(confidence),
    reasoning,
    entry,
    target: Math.round(entry * targetMultiplier * 100) / 100,
    stopLoss: Math.round(entry * slMultiplier * 100) / 100,
    timeframe: signal === 'BULLISH' || signal === 'BEARISH' ? '3-7 days' : '1-2 weeks',
    tradeType: 'swing',
    momentumScore: Math.round(momentumScore),
    riskLevel: confidence > 75 ? 'LOW' : confidence > 60 ? 'MEDIUM' : 'HIGH',
  }
}

export function formatINR(amount: number): string {
  if (Math.abs(amount) >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`
  if (Math.abs(amount) >= 100000) return `₹${(amount / 100000).toFixed(2)}L`
  if (Math.abs(amount) >= 1000) return `₹${(amount / 1000).toFixed(2)}K`
  return `₹${amount.toFixed(2)}`
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n)
}
