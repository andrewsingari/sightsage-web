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
`You are a concise health coach for SightSage Foods & Nutrition.

Goal:
- Produce ONE actionable tip (2–4 sentences) personalized from the user's profile and ALL their scores (including averages_by_topic).
- Recommend EXACTLY ONE SightSage product that best matches the user's biggest opportunity.

Product catalog and selection guidance (use these to decide; do not default to any product):
1) SightC — best for dry/itchy/red eyes, eye fatigue, blurry vision, ocular surface dryness or irritation.
   URL: https://sightsage.com/collections/bestsellers/products/sightc-natural-dry-eye-supplement
2) Blueberry Gummies — best for digital eye strain, heavy screen time, driving/reading fatigue, general antioxidant support.
   URL: https://sightsage.com/products/blueberry-gummy
3) AdaptogenX — best for insomnia, high stress/cortisol, hair loss/alopecia, hormonal imbalance (PCOS, thyroid, perimenopause).
   URL: https://sightsage.com/products/adaptogen-x
4) Superfood Wellness Blend — best for weight management goals, cravings, fatty liver, high blood sugar/diabetes, metabolic risk.
   URL: https://sightsage.com/products/superfoods-wellness-tea

Rules:
- Choose the ONE product that most directly addresses the user’s primary needs signaled by profile and lowest/most variable topics across all days.
- If multiple apply, pick the highest-impact one and mention why it fits.
- Do NOT always pick SightC; only pick it when dryness/eye-comfort issues are primary.
- Output must be plain text (no JSON). End with a clear call to action using a markdown link whose anchor text contains the word "here", like: [click here to purchase](URL).
- Keep a supportive, practical tone and avoid medical diagnoses.`,
      },
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
        model: process.env.OPENAI_MODEL || 'gpt-5.1-instant',
        messages: tipPrompt as any,
        temperature: 0.6,
        max_tokens: 220,
      })
      tip = resp.choices?.[0]?.message?.content?.trim() || ''
    } catch {
      tip = ''
    }

    if (!tip) {
      tip = 'Based on your entries, tighten your evening routine: finish dinner earlier, dim screens, and add 10–15 minutes of relaxing breathwork. If stress or sleep is a key issue, [click here to purchase](https://sightsage.com/products/adaptogen-x).'
    }

    return json(200, { tip })
  } catch (e: any) {
    return json(500, { error: e?.message || 'Server error' })
  }
}