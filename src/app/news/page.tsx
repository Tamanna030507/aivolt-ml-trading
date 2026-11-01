'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import AppLayout from '@/components/layout/AppLayout'

const CATS = [
  { id: 'india', label: 'India' },
  { id: 'us', label: 'US' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'commodities', label: 'Commodities' },
]

export default function NewsPage() {
  const router = useRouter()
  const { user } = useAppStore()
  const [cat, setCat] = useState('india')
  const [articles, setArticles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) router.push('/')
  }, [user, router])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/news?category=${cat}`)
      const data = await res.json()
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.articles)
          ? data.articles
          : []
      setArticles(list)
      if (!res.ok && list.length === 0) {
        setError(data.message || data.error || 'News unavailable')
      }
    } catch (e: any) {
      setArticles([])
      setError(e.message || 'Failed to load news')
    } finally {
      setLoading(false)
    }
  }, [cat])

  useEffect(() => {
    load()
  }, [load])

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-xl font-semibold">News</h1>
          <div className="flex gap-1 p-1 rounded-full bg-bg-secondary border border-bg-border">
            {CATS.map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                  cat === c.id ? 'bg-white/15 text-text-primary' : 'text-text-muted'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="panel h-24 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && error && articles.length === 0 && (
          <div className="panel p-8 text-center text-sm text-text-secondary">
            <p className="font-medium mb-1">No news right now</p>
            <p className="text-xs text-text-muted">{error}</p>
            <p className="text-xs text-text-muted mt-2">
              Set NEWS_API_KEY in .env.local (newsapi.org) and restart the server.
            </p>
          </div>
        )}

        {!loading && articles.length > 0 && (
          <div className="space-y-3">
            {articles.map((a, i) => (
              <a
                key={i}
                href={a.url || '#'}
                target="_blank"
                rel="noreferrer"
                className="panel p-4 block hover:bg-bg-hover transition-colors"
              >
                <div className="text-sm font-medium leading-snug">{a.title}</div>
                {a.description && (
                  <p className="text-xs text-text-secondary mt-2 line-clamp-2">{a.description}</p>
                )}
                <div className="flex gap-3 mt-3 text-[10px] text-text-muted font-mono">
                  <span>{a.source?.name || a.source || 'Source'}</span>
                  {a.publishedAt && <span>{new Date(a.publishedAt).toLocaleString('en-IN')}</span>}
                  {a.sentiment && <span>{a.sentiment}</span>}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
