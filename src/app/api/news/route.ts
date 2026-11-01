import { NextRequest, NextResponse } from 'next/server'

function analyzeSentiment(text: string): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  const bullishWords = ['surge', 'rally', 'gain', 'rise', 'up', 'positive', 'growth', 'record', 'profit', 'beat', 'strong', 'bullish', 'buy', 'upgrade']
  const bearishWords = ['fall', 'drop', 'decline', 'loss', 'down', 'negative', 'crash', 'sell', 'bearish', 'downgrade', 'miss', 'weak', 'concern']
  const lower = text.toLowerCase()
  let bullScore = 0
  let bearScore = 0
  bullishWords.forEach((w) => {
    if (lower.includes(w)) bullScore++
  })
  bearishWords.forEach((w) => {
    if (lower.includes(w)) bearScore++
  })
  if (bullScore > bearScore) return 'BULLISH'
  if (bearScore > bullScore) return 'BEARISH'
  return 'NEUTRAL'
}

function extractStocks(text: string): string[] {
  const knownStocks = [
    'RELIANCE', 'TCS', 'HDFC', 'INFOSYS', 'WIPRO', 'ICICI', 'KOTAK',
    'BAJAJ', 'MARUTI', 'AIRTEL', 'ITC', 'ONGC', 'NTPC', 'TATA', 'ADANI',
  ]
  return knownStocks.filter((stock) => text.toUpperCase().includes(stock)).slice(0, 3)
}

export async function GET(req: NextRequest) {
  const key = (process.env.NEWS_API_KEY || '').trim()
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') || 'india'
  const page = parseInt(searchParams.get('page') || '1', 10)

  if (!key) {
    return NextResponse.json(
      {
        error: 'News provider not configured',
        message: 'Set NEWS_API_KEY in .env.local next to package.json, then restart npm run dev',
        articles: [],
      },
      { status: 503 }
    )
  }

  const queries: Record<string, string> = {
    india: 'India stock market OR Nifty OR Sensex OR NSE',
    us: 'US stock market OR S&P 500 OR Nasdaq',
    crypto: 'Bitcoin OR Ethereum OR cryptocurrency',
    commodities: 'crude oil OR gold price OR commodity',
  }
  const q = queries[category] || queries.india

  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&language=en&sortBy=publishedAt&pageSize=20&page=${page}&apiKey=${key}`
    const res = await fetch(url, { cache: 'no-store' })
    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(
        {
          error: 'NewsAPI error',
          message: data.message || data.code || `HTTP ${res.status}`,
          articles: [],
        },
        { status: 503 }
      )
    }

    const articles = (data.articles || []).map((a: any) => ({
      title: a.title || '',
      description: a.description || '',
      url: a.url || '',
      source: a.source?.name || 'Unknown',
      publishedAt: a.publishedAt || new Date().toISOString(),
      sentiment: analyzeSentiment(`${a.title || ''} ${a.description || ''}`),
      impactedStocks: extractStocks(`${a.title || ''} ${a.description || ''}`),
    }))

    return NextResponse.json({ articles, source: 'newsapi', count: articles.length })
  } catch (err: any) {
    return NextResponse.json(
      {
        error: 'News fetch failed',
        message: err.message || 'Network error',
        articles: [],
      },
      { status: 503 }
    )
  }
}
