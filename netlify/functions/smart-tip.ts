import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const json = (status: number, body: unknown) => ({
  statusCode: status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  body: JSON.stringify(body),
})

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE
    const openaiKey = process.env.OPENAI_API_KEY

    if (!supabaseUrl || !serviceRole) return json(500, { error: 'Server not configured' })

    const auth = event.headers.authorization || event.headers.Authorization
    if (!auth || !auth.startsWith('Bearer ')) return json(401, { error: 'Missing auth' })
    const jwt = auth.slice('Bearer '.length).trim()

    const admin = createClient(supabaseUrl, serviceRole)

    const { data: userData, error: userErr } = await admin.auth.getUser(jwt)
    if (userErr || !userData?.user) return json(401, { error: 'Invalid user' })
    const user = userData.user
    const meta = (user.user_metadata || {}) as Record<string, any>

    const since = new Date()
    since.setDate(since.getDate() - 30)
    const sinceISO = since.toISOString().slice(0, 10)

    const { data: scores, error: scoresErr } = await admin
      .from('wellness_scores')
      .select('day,topic,score,raw_points,max_points')
      .eq('user_id', user.id)
      .gte('day', sinceISO)
      .order('day', { ascending: true })

    if (scoresErr) return json(500, { error: 'Failed to load scores' })

    const byTopic = new Map<
      string,
      { sum: number; count: number; latest: { day: string; score: number; raw_points: number | null; max_points: number | null } }
    >()
    for (const r of scores || []) {
      const s = Number((r as any).score)
      const topic = String((r as any).topic)
      const raw = (r as any).raw_points == null ? null : Number((r as any).raw_points)
      const max = (r as any).max_points == null ? null : Number((r as any).max_points)
      const cur = byTopic.get(topic) || { sum: 0, count: 0, latest: { day: String(r.day), score: s, raw_points: raw, max_points: max } }
      cur.sum += s
      cur.count += 1
      if (String(r.day) >= cur.latest.day) cur.latest = { day: String(r.day), score: s, raw_points: raw, max_points: max }
      byTopic.set(topic, cur)
    }
    const summary = Array.from(byTopic.entries()).map(([topic, v]) => ({
      topic,
      avg: v.count ? v.sum / v.count : null,
      latest: v.latest,
    }))

    const profile = {
      name: meta.name ?? null,
      gender: meta.gender ?? null,
      age: meta.age ?? null,
      height_cm: meta.height_cm ?? null,
      weight_kg: meta.weight_kg ?? null,
      medications: meta.medications ?? null,
    }

    let tip =
      'Based on your recent entries, try 10–15 minutes of outdoor daylight before noon and a consistent bedtime. Personalized tips will appear once the backend is connected.'

    if (openaiKey) {
      const userBlob = { profile, summary }
      const sys =
        'You are a concise wellness coach. Provide one actionable, safe, evidence-informed tip personalized to the user data. 2–3 sentences. Avoid medical claims. If data is sparse, give a generally helpful habit.'
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.7,
          max_tokens: 200,
          messages: [
            { role: 'system', content: sys },
            { role: 'user', content: `User data (JSON): ${JSON.stringify(userBlob)}` },
          ],
        }),
      })
      if (res.ok) {
        const j = await res.json()
        tip = j?.choices?.[0]?.message?.content?.trim() || tip
      }
    }

    return json(200, { tip })
  } catch (e: any) {
    return json(200, {
      tip:
        'Based on recent entries, try a short daylight walk today and keep your bedtime within a 30–45 minute window. Personalized tips will improve as more data is available.',
    })
  }
}