import type { Handler } from '@netlify/functions'

const API_KEY = process.env.GOOGLE_YT_API_KEY!
const CHANNELS: Record<'vision'|'other', string> = {
  vision: 'UCxB-mlL9MoYZbw8B7vXZb3g',
  other: 'UCN2pD4zVw3u3qcsqY1o7JhA'
}

const ALLOWED_ORIGINS = new Set([
  'https://app.sightsage.com',
  'http://localhost:5173',
  'http://localhost:8888'
])

const getOrigin = (headers: Record<string, string | undefined>) =>
  headers.origin || headers.Origin || ''

const cors = (origin: string) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://app.sightsage.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
})

const json = (status: number, body: any, origin: string) => ({
  statusCode: status,
  headers: {
    ...cors(origin),
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  },
  body: JSON.stringify(body)
})

export const handler: Handler = async (event) => {
  const origin = getOrigin(event.headers as any)

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors(origin), body: '' }
  }

  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' }, origin)

    const parsed = (() => { try { return JSON.parse(event.body || '{}') } catch { return {} } })()
    const topic: 'vision' | 'other' = parsed?.topic === 'other' ? 'other' : 'vision'
    const query = typeof parsed?.query === 'string' ? parsed.query.trim() : ''

    const channelId = CHANNELS[topic]
    if (!channelId) return json(400, { error: 'Invalid topic' }, origin)

    const baseUrl = 'https://www.googleapis.com/youtube/v3/search'
    const params = new URLSearchParams({
      key: API_KEY,
      channelId,
      part: 'snippet',
      maxResults: '12',
      order: 'date',
      type: 'video'
    })
    if (query) params.append('q', query)

    const res = await fetch(`${baseUrl}?${params.toString()}`)
    const data = await res.json()

    if (!res.ok) {
      return json(res.status, { error: data?.error?.message || 'Failed to fetch' }, origin)
    }

    const items = Array.isArray(data?.items) ? data.items : []
    const out = items.map((v: any) => ({
      id: v?.id?.videoId || '',
      title: v?.snippet?.title || '',
      thumbnail: v?.snippet?.thumbnails?.high?.url || v?.snippet?.thumbnails?.medium?.url || '',
      url: v?.id?.videoId ? `https://www.youtube.com/watch?v=${v.id.videoId}` : ''
    })).filter((x: any) => x.id && x.title)

    return json(200, { items: out }, origin)
  } catch (e: any) {
    return json(500, { error: e?.message || 'Server error' }, origin)
  }
}