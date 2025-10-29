import type { Handler } from '@netlify/functions'

const API_KEY = process.env.GOOGLE_YT_API_KEY as string

const UPLOADS_PLAYLISTS: Record<'vision' | 'other', string> = {
  vision: 'UUU1eFGW-UcdUhg3DlTafLOg',
  other: 'UUoquIFLN9kHo2HNKb5JSoqA',
}

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST,OPTIONS',
  'access-control-allow-headers': 'content-type,accept',
}

const json = (status: number, body: any) => ({
  statusCode: status,
  headers: {
    ...cors,
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'public, s-maxage=600, stale-while-revalidate=86400',
  },
  body: JSON.stringify(body),
})

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const matchesExactWords = (title: string, q: string) => {
  const t = (q || '').trim()
  if (!t) return true
  const words = t.split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const pattern = words.map(w => `\\b${esc(w)}\\b`).join('(?=.*)')
  return new RegExp(`^(?=.*${pattern}).*`, 'i').test(title)
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' }

  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })
    if (!API_KEY) return json(500, { error: 'Missing GOOGLE_YT_API_KEY' })

    const body = (() => { try { return JSON.parse(event.body || '{}') } catch { return {} } })()
    const topic: 'vision' | 'other' = body?.topic === 'other' ? 'other' : 'vision'
    const query: string = typeof body?.query === 'string' ? body.query : ''
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
        const title = String(sn?.title || '')
        if (!vid || !title || /^(Private video|Deleted video)$/i.test(title)) return null
        const thumb = sn?.thumbnails?.high?.url || sn?.thumbnails?.medium?.url || sn?.thumbnails?.default?.url || ''
        return { id: String(vid), title, thumbnail: String(thumb), url: `https://www.youtube.com/watch?v=${vid}` }
      })
      .filter(Boolean) as Array<{ id: string; title: string; thumbnail: string; url: string }>

    const filtered = query ? mapped.filter(it => matchesExactWords(it.title, query)) : mapped

    return json(200, {
      items: filtered,
      nextPageToken: typeof data?.nextPageToken === 'string' ? data.nextPageToken : null,
    })
  } catch (e: any) {
    return json(500, { error: e?.message || 'Server error' })
  }
}