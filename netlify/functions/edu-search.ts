import type { Handler } from '@netlify/functions'

const API_KEY = process.env.GOOGLE_YT_API_KEY as string

const UPLOADS_PLAYLISTS: Record<'vision' | 'other', string> = {
  vision: 'UUU1eFGW-UcdUhg3DlTafLOg',
  other: 'UUoquIFLN9kHo2HNKb5JSoqA',
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
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'content-type',
      },
      body: '',
    }
  }

  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })
    if (!API_KEY) return json(500, { error: 'Missing GOOGLE_YT_API_KEY' })

    const body = (() => { try { return JSON.parse(event.body || '{}') } catch { return {} } })()
    const topic: 'vision' | 'other' = body?.topic === 'other' ? 'other' : 'vision'
    const queryRaw: string = typeof body?.query === 'string' ? body.query : ''
    const pageToken: string | null = typeof body?.pageToken === 'string' && body.pageToken ? body.pageToken : null

    const playlistId = UPLOADS_PLAYLISTS[topic]
    if (!playlistId) return json(400, { error: 'Invalid topic' })

    const params = new URLSearchParams({
      key: API_KEY,
      part: 'snippet',
      maxResults: '50',
      playlistId,
    })
    if (pageToken) params.set('pageToken', pageToken)

    const resp = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`)
    const data = await resp.json()

    if (!resp.ok) return json(resp.status, { error: data?.error?.message || 'YouTube API error' })

    const items = Array.isArray(data?.items) ? data.items : []
    const mapped = items
      .map((v: any) => {
        const sn = v?.snippet
        const vid = sn?.resourceId?.videoId
        const title = sn?.title || ''
        const thumb = sn?.thumbnails?.high?.url || sn?.thumbnails?.medium?.url || sn?.thumbnails?.default?.url || ''
        if (!vid || !title) return null
        return {
          id: vid as string,
          title: title as string,
          thumbnail: thumb as string,
          url: `https://www.youtube.com/watch?v=${vid}`,
        }
      })
      .filter(Boolean)

    const query = (queryRaw || '').trim().toLowerCase()
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const exactFiltered = query
      ? (mapped as any[]).filter((it: any) => new RegExp(`\\b${esc(query)}\\b`, 'i').test(String(it.title)))
      : mapped

    return json(200, {
      items: exactFiltered,
      nextPageToken: typeof data?.nextPageToken === 'string' ? data.nextPageToken : null,
    })
  } catch (e: any) {
    return json(500, { error: e?.message || 'Server error' })
  }
}