import type { Handler } from '@netlify/functions'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

function json(status: number, body: any) {
  return {
    statusCode: status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    body: JSON.stringify(body),
  }
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

    const auth = event.headers.authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) return json(401, { error: 'Missing Authorization Bearer token' })

    const parsed = (() => { try { return JSON.parse(event.body || '{}') } catch { return {} } })()
    const day = typeof parsed.day === 'string' ? parsed.day : null

    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userRes?.user) return json(401, { error: 'Invalid token' })
    const user = userRes.user

    const profile = {
      id: user.id,
      email: user.email ?? null,
      name: (user.user_metadata as any)?.name ?? null,
      gender: (user.user_metadata as any)?.gender ?? null,
      age: (user.user_metadata as any)?.age ?? null,
      height_cm: (user.user_metadata as any)?.height_cm ?? null,
      weight_kg: (user.user_metadata as any)?.weight_kg ?? null,
      medications: (user.user_metadata as any)?.medications ?? null,
    }

    const { data: scores, error: sErr } = await supabaseAdmin
      .from('wellness_scores')
      .select('day, topic, score, raw_points, max_points')
      .eq('user_id', user.id)
      .order('day', { ascending: true })

    if (sErr) return json(500, { error: sErr.message })

    const topics: Record<string, { sum: number; cnt: number }> = {}
    for (const r of scores ?? []) {
      const t = String((r as any).topic)
      const v = Number((r as any).score)
      if (!isFinite(v)) continue
      if (!topics[t]) topics[t] = { sum: 0, cnt: 0 }
      topics[t].sum += v
      topics[t].cnt += 1
    }
    const averages = Object.fromEntries(
      Object.entries(topics).map(([k, v]) => [k, v.cnt ? v.sum / v.cnt : 0])
    )

    const payloadForModel = {
      day,
      profile,
      scores_all_days: (scores ?? []).map((r: any) => ({
        day: r.day,
        topic: r.topic,
        score: r.score,
        raw_points: r.raw_points,
        max_points: r.max_points,
      })),
      averages_by_topic: averages,
    }

    const tipPrompt = [
      {
        role: 'system',
        content:
            'You are a concise health coach for SightSage Foods and Nutrition. Use the provided profile and scores to output one actionable tip (2–4 sentences). Prioritize the biggest opportunity. Avoid medical diagnoses. Also make sure you recommend a SightSage product and give the link to the user to make a purchase',      },
      {
        role: 'user',
        content:
          'Here is my profile and all wellness scores (all days). Please give me one personalized tip for today.\n' +
          JSON.stringify(payloadForModel),
      },
    ]

    let tip = ''
    try {
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: tipPrompt as any,
        temperature: 0.7,
        max_tokens: 220,
      })
      tip = resp.choices?.[0]?.message?.content?.trim() || ''
    } catch {
      tip = ''
    }

    if (!tip) {
      tip =
        'Try 10–15 minutes of outdoor daylight before noon and a consistent bedtime tonight. Keep screen brightness lower in the evening to support better sleep and eye comfort.'
    }

    return json(200, { tip })
  } catch (e: any) {
    return json(500, { error: e?.message || 'Server error' })
  }
}