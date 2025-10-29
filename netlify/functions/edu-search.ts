import type { Handler } from '@netlify/functions'

const API_KEY = process.env.GOOGLE_YT_API_KEY!

const CHANNELS: Record<'vision' | 'other', string> = {
  vision: 'UCU1eFGW-UcdUhg3DlTafLOg',
  other: 'UCoquIFLN9kHo2HNKb5JSoqA',
}

const json = (status: number, body: any) => ({
  statusCode: status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
  },
  body: JSON.stringify(body),
})

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const titleScore = (title: string, query: string) => {
  const t = title.toLowerCase()
  const q = query.toLowerCase().trim()
  if (!q) return 0
  const words = q.split(/\s+/).filter(Boolean)
  let score = 0
  if (t === q) score += 1500
  if (t.startsWith(q)) score += 200
  if (new RegExp(`\\b${esc(q)}\\b`, 'i').test(title)) score += 1000
  for (const w of words) {
    if (new RegExp(`\\b${esc(w)}\\b`, 'i').test(title)) score += 50
    else if (t.includes(w)) score += 10
  }
  return score
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS')
    return { statusCode: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' }, body: '' }

  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })
    const parsed = (() => { try { return JSON.parse(event.body || '{}') } catch { return {} } })()
    const topic: 'vision' | 'other' = parsed?.topic === 'other' ? 'other' : 'vision'
    const query = typeof parsed?.query === 'string' ? parsed.query.trim() : ''
    const channelId = CHANNELS[topic]
    if (!API_KEY || !channelId) return json(400, { error: 'Missing API key or invalid topic' })
    if (!query) return json(400, { error: 'Missing search query' })

    const params = new URLSearchParams({
      key: API_KEY,
      part: 'snippet',
      channelId,
      type: 'video',
      order: 'relevance',
      maxResults: '25',
      q: query,
    })

    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`)
    const data = await res.json()
    if (!res.ok) return json(res.status, { error: data?.error?.message || 'YouTube API error' })

    const raw = Array.isArray(data?.items) ? data.items : []
    const enriched = raw
      .map((v: any) => {
        const id = v?.id?.videoId || ''
        const title = v?.snippet?.title || ''
        const publishedAt = v?.snippet?.publishedAt || '1970-01-01T00:00:00Z'
        const thumbnail =
          v?.snippet?.thumbnails?.high?.url ||
          v?.snippet?.thumbnails?.medium?.url ||
          v?.snippet?.thumbnails?.default?.url ||
          ''
        if (!id || !title) return null
        return {
          id,
          title,
          thumbnail,
          url: `https://www.youtube.com/watch?v=${id}`,
          _score: titleScore(title, query),
          _date: new Date(publishedAt).getTime(),
        }
      })
      .filter(Boolean) as Array<{ id: string; title: string; thumbnail: string; url: string; _score: number; _date: number }>

    enriched.sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score
      return b._date - a._date
    })

    const items = enriched.map(({ id, title, thumbnail, url }) => ({ id, title, thumbnail, url }))

    return json(200, { items })
  } catch (e: any) {
    return json(500, { error: e?.message || 'Server error' })
  }
}