'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, CrosshairMode, IChartApi, ISeriesApi } from 'lightweight-charts'

interface Props {
  symbol: string
  showAIOverlay?: boolean
}

const INTERVALS = [
  { label: '1D', interval: '5m', range: '1d' },
  { label: '1W', interval: '1h', range: '5d' },
  { label: '1M', interval: '1d', range: '1mo' },
  { label: '3M', interval: '1d', range: '3mo' },
  { label: '1Y', interval: '1wk', range: '1y' },
]

export default function StockChart({ symbol }: Props) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const [activeInterval, setActiveInterval] = useState(0)
  const [currentPrice, setCurrentPrice] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!chartRef.current) return

    const chart = createChart(chartRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#a1a1aa',
      },
      grid: {
        vertLines: { color: 'rgba(128,128,128,0.12)' },
        horzLines: { color: 'rgba(128,128,128,0.12)' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: 'rgba(128,128,128,0.2)' },
      timeScale: { borderColor: 'rgba(128,128,128,0.2)', timeVisible: true },
      width: chartRef.current.clientWidth,
      height: chartRef.current.clientHeight || 360,
    })

    const series = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    })

    chartInstance.current = chart
    seriesRef.current = series

    const onResize = () => {
      if (chartRef.current && chartInstance.current) {
        chartInstance.current.applyOptions({
          width: chartRef.current.clientWidth,
          height: chartRef.current.clientHeight || 360,
        })
      }
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      chart.remove()
      chartInstance.current = null
      seriesRef.current = null
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      if (!symbol || !seriesRef.current) return
      setLoading(true)
      setError('')
      try {
        const { interval, range } = INTERVALS[activeInterval]
        const clean = symbol.includes('.') ? symbol : `${symbol.replace(/\.NS$/i, '')}.NS`
        const res = await fetch(
          `/api/market-data/history?symbol=${encodeURIComponent(clean)}&interval=${interval}&range=${range}`
        )
        const data = await res.json()
        const raw = Array.isArray(data) ? data : data.candles || []
        if (!Array.isArray(raw) || raw.length === 0) {
          if (!cancelled) {
            setError(data.message || data.error || 'No candle data')
            setCount(0)
            seriesRef.current?.setData([])
          }
          return
        }

        const candles = raw
          .map((c: any) => ({
            time: (typeof c.time === 'number' ? c.time : Number(c.time)) as any,
            open: Number(c.open),
            high: Number(c.high),
            low: Number(c.low),
            close: Number(c.close),
          }))
          .filter(
            (c: any) =>
              Number.isFinite(c.time) &&
              Number.isFinite(c.open) &&
              Number.isFinite(c.close) &&
              c.open > 0 &&
              c.close > 0
          )
          .sort((a: any, b: any) => a.time - b.time)

        if (cancelled) return
        seriesRef.current.setData(candles)
        chartInstance.current?.timeScale().fitContent()
        setCurrentPrice(candles[candles.length - 1]?.close || 0)
        setCount(candles.length)
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Chart failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    const t = setInterval(loadData, 60000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [symbol, activeInterval])

  return (
    <div className="panel overflow-hidden flex flex-col h-full min-h-[380px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">{symbol.replace('.NS', '')}</span>
          {currentPrice > 0 && (
            <span className="text-sm font-mono text-text-secondary">
              ₹{currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          )}
          {count > 0 && (
            <span className="text-[10px] text-text-muted font-mono">{count} bars · Yahoo</span>
          )}
        </div>
        <div className="flex gap-1">
          {INTERVALS.map((iv, i) => (
            <button
              key={iv.label}
              onClick={() => setActiveInterval(i)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                activeInterval === i
                  ? 'bg-white/15 text-text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {iv.label}
            </button>
          ))}
        </div>
      </div>
      <div className="relative flex-1 min-h-[320px]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg-primary/40">
            <div className="text-xs text-text-muted animate-pulse">Loading chart…</div>
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
            <div className="text-center text-sm text-text-secondary max-w-sm">
              <div className="font-medium mb-1">Chart unavailable</div>
              <div className="text-xs text-text-muted">{error}</div>
            </div>
          </div>
        )}
        <div ref={chartRef} className="w-full h-full min-h-[320px]" />
      </div>
    </div>
  )
}
