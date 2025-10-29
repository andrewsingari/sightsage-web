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

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS')
    return { statusCode: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' }, body: '' }

  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })
    const parsed = (() => { try { return JSON.parse(event.body || '{}') } catch { return {} } })()
    const topic = parsed?.topic === 'other' ? 'other' : 'vision'
    const query = typeof parsed?.query === 'string' ? parsed.query.trim() : ''
    const channelId = CHANNELS[topic]
    if (!API_KEY || !channelId) return json(400, { error: 'Missing API key or invalid topic' })
    if (!query) return json(400, { error: 'Missing search query' })

    const params = new URLSearchParams({
      key: API_KEY,
      part: 'snippet',
      channelId,
      type: 'video',
      order: 'date',
      maxResults: '24',
      q: query,
    })

    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`)
    const data = await res.json()
    if (!res.ok) return json(res.status, { error: data?.error?.message || 'YouTube API error' })

    const items = Array.isArray(data?.items)
      ? data.items
          .map((v: any) => ({
            id: v?.id?.videoId || '',
            title: v?.snippet?.title || '',
            thumbnail:
              v?.snippet?.thumbnails?.high?.url ||
              v?.snippet?.thumbnails?.medium?.url ||
              v?.snippet?.thumbnails?.default?.url ||
              '',
            url: v?.id?.videoId ? `https://www.youtube.com/watch?v=${v.id.videoId}` : '',
          }))
          .filter((x: any) => x.id && x.title)
      : []

    return json(200, { items })
  } catch (e: any) {
    return json(500, { error: e?.message || 'Server error' })
  }
}