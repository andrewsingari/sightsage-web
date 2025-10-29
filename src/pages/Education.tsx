import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type SearchItem = { id: string; title: string; thumbnail: string; url: string }
type ApiResp = { items?: SearchItem[]; nextPageToken?: string | null; error?: string }

export default function Education() {
  const [query, setQuery] = useState('')
  const [topic, setTopic] = useState<'vision' | 'other'>('vision')
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<SearchItem[]>([])
  const [nextToken, setNextToken] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const inFlightRef = useRef<AbortController | null>(null)

  const heading = useMemo(() => (query.trim() ? 'Search Results' : 'Recent Uploads'), [query])

  const fetchPage = useCallback(
    async (opts: { reset?: boolean; after?: string | null } = {}) => {
      if (inFlightRef.current) inFlightRef.current.abort()
      const ac = new AbortController()
      inFlightRef.current = ac

      const isReset = !!opts.reset
      if (isReset) {
        setResults([])
        setNextToken(null)
        setHasMore(false)
        seenIdsRef.current.clear()
      }
      setError(null)
      if (isReset) setLoading(true)
      else setLoadingMore(true)
      try {
        const body: Record<string, any> = { topic, query, pageToken: opts.after ?? nextToken ?? null }
        const res = await fetch('/api/edu-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: ac.signal,
        })
        const data: ApiResp = await res.json().catch(() => ({} as any))
        if (!res.ok) {
          setError(data?.error || 'Failed to load videos')
          setHasMore(false)
          return
        }
        const incoming = Array.isArray(data.items) ? data.items : []
        const unique = incoming.filter(v => {
          if (!v?.id) return false
          if (seenIdsRef.current.has(v.id)) return false
          seenIdsRef.current.add(v.id)
          return true
        })
        setResults(prev => (isReset ? unique : [...prev, ...unique]))
        const token = data.nextPageToken || null
        setNextToken(token)
        setHasMore(!!token)
      } catch (e: any) {
        if (e?.name !== 'AbortError') setError('Unable to load results. Please try again.')
      } finally {
        if (isReset) setLoading(false)
        else setLoadingMore(false)
        if (inFlightRef.current === ac) inFlightRef.current = null
      }
    },
    [topic, query, nextToken]
  )

  const runSearch = useCallback(() => fetchPage({ reset: true }), [fetchPage])

  useEffect(() => {
    runSearch()
  }, [topic, runSearch])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(entries => {
      const first = entries[0]
      if (first?.isIntersecting && hasMore && !loading && !loadingMore && !error) {
        fetchPage({ after: nextToken ?? null })
      }
    }, { rootMargin: '800px 0px 800px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, loading, loadingMore, error, fetchPage, nextToken])

  return (
    <div className="max-w-6xl mx-auto px-3 pt-4 pb-10 md:px-4">
      <div className="mb-6">
        <h1 className="text-center text-base md:text-xl font-semibold text-gray-900">
          Explore video education curated by SightSage founders Dr. Weidong Yu and Kathy
        </h1>
      </div>

      <section className="mb-8">
        <form
          onSubmit={e => {
            e.preventDefault()
            runSearch()
          }}
          className="flex flex-col md:flex-row md:items-end gap-4"
        >
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-800 mb-2">Select Topic</div>
            <div className="inline-flex rounded-full border border-gray-300 bg-white p-1">
              <button
                type="button"
                onClick={() => setTopic('vision')}
                className={`px-4 py-2 rounded-full text-sm font-semibold ${topic === 'vision' ? 'bg-[var(--brand)] text-white' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                Vision
              </button>
              <button
                type="button"
                onClick={() => setTopic('other')}
                className={`px-4 py-2 rounded-full text-sm font-semibold ${topic === 'other' ? 'bg-[var(--brand)] text-white' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                Other Health Concerns
              </button>
            </div>
          </div>

          <div className="flex-1">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={topic === 'vision' ? 'Search vision topics…' : 'Search health topics…'}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm md:text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
            <div className="mt-1 text-xs text-gray-500">Search matches exact words in video titles</div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 rounded-xl text-white font-semibold ${loading ? 'bg-gray-400' : 'bg-[var(--brand)] hover:opacity-90'}`}
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setResults([])
                setError(null)
                setNextToken(null)
                setHasMore(false)
                seenIdsRef.current.clear()
                runSearch()
              }}
              className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 font-semibold"
            >
              Clear
            </button>
          </div>
        </form>

        {loading && <div className="mt-4 text-sm text-gray-600">Loading videos…</div>}
        {error && <div className="mt-4 text-sm text-red-600">{error}</div>}
      </section>

      <section>
        <h2 className="text-lg md:text-2xl font-semibold text-gray-800 mb-4">{heading}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
          {results.map(v => (
            <a
              key={v.id}
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block group rounded-xl overflow-hidden shadow hover:shadow-lg transition"
            >
              <img src={v.thumbnail} alt={v.title} className="aspect-video w-full object-cover" />
              <div className="p-2 text-xs md:text-sm font-medium text-gray-800 truncate group-hover:text-[var(--brand)]">
                {v.title}
              </div>
            </a>
          ))}
          {!loading && !error && results.length === 0 && (
            <div className="col-span-full text-sm text-gray-600">No videos found.</div>
          )}
        </div>
        <div ref={sentinelRef} className="h-12 flex items-center justify-center">
          {loadingMore && <span className="text-sm text-gray-600">Loading more…</span>}
          {!loadingMore && hasMore && <span className="text-sm text-gray-400">Scroll to load more…</span>}
        </div>
      </section>
    </div>
  )
}