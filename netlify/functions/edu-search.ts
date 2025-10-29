import type { Handler } from '@netlify/functions'

const API_KEY = process.env.GOOGLE_YT_API_KEY!

const CHANNELS: Record<'vision'|'other', string> = {
  vision: 'UCU1eFGW-UcdUhg3DlTafLOg',
  other: 'UCoquIFLN9kHo2HNKb5JSoqA'
}

const json = (status: number, body: any) => ({
  statusCode: status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  body: JSON.stringify(body)
})

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })
    if (!API_KEY) return json(500, { error: 'Missing GOOGLE_YT_API_KEY' })

    const { query, topic } = JSON.parse(event.body || '{}')
    const channelId = CHANNELS[topic === 'vision' ? 'vision' : 'other']
    if (!channelId) return json(400, { error: 'Invalid topic' })

    const baseUrl = 'https://www.googleapis.com/youtube/v3/search'
    const params = new URLSearchParams({
      key: API_KEY,
      channelId,
      part: 'snippet',
      maxResults: '24',
      order: 'date',
      type: 'video',
      videoEmbeddable: 'true'
    })
    if (typeof query === 'string' && query.trim()) params.append('q', query.trim())

    const res = await fetch(`${baseUrl}?${params.toString()}`)
    const data = await res.json()

    if (!res.ok) {
      const msg =
        data?.error?.errors?.[0]?.message ||
        data?.error?.message ||
        'YouTube API error'
      return json(res.status, { error: msg })
    }

    const items = (Array.isArray(data.items) ? data.items : []).map((v: any) => ({
      id: v?.id?.videoId || '',
      title: v?.snippet?.title || '',
      thumbnail: v?.snippet?.thumbnails?.high?.url || v?.snippet?.thumbnails?.medium?.url || v?.snippet?.thumbnails?.default?.url || '',
      url: v?.id?.videoId ? `https://www.youtube.com/watch?v=${v.id.videoId}` : ''
    })).filter(x => x.id && x.title)

    return json(200, { items })
  } catch (e: any) {
    return json(500, { error: e?.message || 'Server error' })
  }
}