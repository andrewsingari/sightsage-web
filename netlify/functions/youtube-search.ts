import type { Handler } from '@netlify/functions'

const API_KEY = process.env.GOOGLE_YT_API_KEY!
const CHANNELS = {
  vision: 'UCxB-mlL9MoYZbw8B7vXZb3g', // Wellspring Clinic channel ID
  other: 'UCN2pD4zVw3u3qcsqY1o7JhA'  // Kathy Health Tips channel ID
}

const json = (status: number, body: any) => ({
  statusCode: status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  body: JSON.stringify(body)
})

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })
    const { query, topic } = JSON.parse(event.body || '{}')
    const channelId = CHANNELS[topic === 'vision' ? 'vision' : 'other']
    if (!channelId) return json(400, { error: 'Invalid topic' })

    const baseUrl = 'https://www.googleapis.com/youtube/v3/search'
    const params = new URLSearchParams({
      key: API_KEY,
      channelId,
      part: 'snippet',
      maxResults: '12',
      order: 'date',
      type: 'video',
    })
    if (query) params.append('q', query)

    const res = await fetch(`${baseUrl}?${params.toString()}`)
    const data = await res.json()

    if (!res.ok) return json(res.status, { error: data?.error?.message || 'Failed to fetch' })

    const items = (data.items || []).map((v: any) => ({
      id: v.id.videoId,
      title: v.snippet.title,
      thumbnail: v.snippet.thumbnails.high?.url,
      url: `https://www.youtube.com/watch?v=${v.id.videoId}`
    }))

    return json(200, { items })
  } catch (e: any) {
    return json(500, { error: e?.message || 'Server error' })
  }
}