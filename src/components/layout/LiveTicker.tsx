'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface TickerItem {
  symbol: string
  price: number
  change: number
  changePercent: number
}

export default function LiveTicker() {
  const [tickers, setTickers] = useState<TickerItem[]>([
    { symbol: 'NIFTY 50', price: 22547.35, change: 123.45, changePercent: 0.55 },
    { symbol: 'SENSEX', price: 74234.12, change: 312.67, changePercent: 0.42 },
    { symbol: 'BANK NIFTY', price: 48123.55, change: -89.2, changePercent: -0.19 },
    { symbol: 'RELIANCE', price: 2847.6, change: 34.5, changePercent: 1.23 },
    { symbol: 'TCS', price: 4123.45, change: -12.3, changePercent: -0.3 },
    { symbol: 'HDFC BANK', price: 1734.8, change: 18.75, changePercent: 1.09 },
    { symbol: 'INFOSYS', price: 1845.3, change: -23.4, changePercent: -1.25 },
    { symbol: 'INDIA VIX', price: 13.42, change: -0.34, changePercent: -2.47 },
    { symbol: 'BAJAJ FIN', price: 7234.1, change: 145.3, changePercent: 2.05 },
    { symbol: 'ICICI BANK', price: 1123.45, change: 8.9, changePercent: 0.8 },
  ])

  useEffect(() => {
    const interval = setInterval(() => {
      setTickers(prev =>
        prev.map(ticker => {
          const randomChange = (Math.random() - 0.5) * 0.001
          const newPrice = ticker.price * (1 + randomChange)
          const changeFromPrev = newPrice - (ticker.price - ticker.change)
          return {
            ...ticker,
            price: parseFloat(newPrice.toFixed(2)),
            change: parseFloat(changeFromPrev.toFixed(2)),
            changePercent: parseFloat(((changeFromPrev / (ticker.price - ticker.change)) * 100).toFixed(2)),
          }
        })
      )
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/market-data/indices')
        if (res.ok) {
          const data = await res.json()
          setTickers(prev => {
            const updated = [...prev]
            data.forEach((index: any) => {
              const existing = updated.find(t => t.symbol === index.name)
              if (existing) {
                existing.price = index.value
                existing.change = index.change
                existing.changePercent = index.changePercent
              }
            })
            return updated
          })
        }
      } catch {}
    }
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  const tickerContent = [...tickers, ...tickers]

  return (
    <div className="ticker-wrap h-9 bg-bg-secondary border-b border-bg-border flex items-center overflow-hidden">
      <div className="ticker-content flex items-center gap-8 px-4">
        {tickerContent.map((item, i) => (
          <div key={i} className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-text-secondary text-xs font-mono">{item.symbol}</span>
            <span className="text-text-primary text-xs font-mono font-medium">
              {item.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`text-xs font-mono flex items-center gap-0.5 ${item.change >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {item.change >= 0
                ? <TrendingUp size={10} />
                : <TrendingDown size={10} />
              }
              {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
            </span>
            <span className="text-bg-border">•</span>
          </div>
        ))}
      </div>
    </div>
  )
}
