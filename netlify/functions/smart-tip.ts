import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL as string
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE as string
const OPENAI_API_KEY = process.env.OPENAI_API_KEY as string

const json = (statusCode: number, body: any) => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'Method Not Allowed' })
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      return json(500, { error: 'Server not configured: Supabase env missing' })
    }

    const auth = event.headers.authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) return json(401, { error: 'Unauthorized' })

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })

    const { data: userResp, error: userErr } = await admin.auth.getUser(token)
    if (userErr || !userResp?.user) return json(401, { error: 'Invalid token' })
    const user = userResp.user
    const uid = user.id

    const since = new Date()
    since.setDate(since.getDate() - 30)
    const sinceISO = since.toISOString().slice(0, 10)

    const { data: scores, error: scoresErr } = await admin
      .from('wellness_scores')
      .select('day, topic, score, raw_points, max_points')
      .eq('user_id', uid)
      .gte('day', sinceISO)
      .order('day', { ascending: false })
      .limit(500)

    if (scoresErr) return json(500, { error: 'Failed to load scores' })

    const profile = {
      name: user.user_metadata?.name ?? null,
      gender: user.user_metadata?.gender ?? null,
      age: user.user_metadata?.age ?? null,
      height_cm: user.user_metadata?.height_cm ?? null,
      weight_kg: user.user_metadata?.weight_kg ?? null,
      medications: user.user_metadata?.medications ?? null,
      email: user.email ?? null,
    }

    let tipText =
      'Based on recent entries, try 10–15 minutes of outdoor daylight before noon and a consistent bedtime. Personalized tips will appear once the backend is connected.'

    if (OPENAI_API_KEY) {
      const messages = [
        {
          role: 'system',
          content:
            'You are a concise health coach. Use the provided profile and scores to output one actionable tip (2–4 sentences). Prioritize the biggest opportunity. Avoid medical diagnoses.',
        },
        {
          role: 'user',
          content: JSON.stringify(
            {
              profile,
              scores: (scores ?? []).map((s) => ({
                day: s.day,
                topic: s.topic,
                score: s.score,
                raw_points: s.raw_points,
                max_points: s.max_points,
              })),
            },
            null,
            0
          ),
        },
      ]

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.6,
          max_tokens: 220,
          messages,
        }),
      })

      if (resp.ok) {
        const data = (await resp.json()) as any
        const content = data?.choices?.[0]?.message?.content?.trim()
        if (content) tipText = content
      }
    }

    return json(200, {
      tip: tipText,
      used: {
        user_id: uid,
        score_count: scores?.length ?? 0,
        since: sinceISO,
      },
    })
  } catch (e: any) {
    return json(500, { error: 'Unexpected error', detail: e?.message || String(e) })
  }
}