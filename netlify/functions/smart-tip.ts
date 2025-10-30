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

const firstUrl = (s: string | null | undefined) => {
  if (!s) return null
  const m = s.match(/https?:\/\/[^\s\]]+/i)
  return m ? m[0] : null
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
`You are talking on behalf of SightSage Foods & Nutrition as in "we".
Goal:
- Provide 4-5 bullet points that are one liners to produce a health report. Include ONE actionable tip. Base it on the user's profile and ALL their scores (including averages_by_topic).
- Recommend EXACTLY ONE SightSage product that best matches the user's profile and scores. Be concise.
Product catalog and selection guidance:
1) SightC — best for dry/itchy/red eyes, eye fatigue, blurry vision, ocular surface dryness or irritation.
   URL: https://sightsage.com/collections/bestsellers/products/sightc-natural-dry-eye-supplement
2) Blueberry Gummies — best for digital eye strain, heavy screen time, driving/reading fatigue, general antioxidant support.
   URL: https://sightsage.com/products/blueberry-gummy
3) AdaptogenX — best for insomnia, high stress/cortisol, hair loss/alopecia, hormonal imbalance (PCOS, thyroid, perimenopause).
   URL: https://sightsage.com/products/adaptogen-x
4) Superfood Wellness Blend — best for weight management goals, cravings, fatty liver, high blood sugar/diabetes, metabolic risk.
   URL: https://sightsage.com/products/superfoods-wellness-tea
Rules:
- Avoid saying phrases like: Here’s your personalized health report based on your wellness scores:", in the first line
- Choose the ONE product that most directly addresses the user’s primary needs signaled by profile and lowest/most variable topics across all days.
- If multiple apply, pick the highest-impact one and mention why it fits.
- Do NOT always pick SightC; only pick it when dryness/eye-comfort issues are primary.
- Output must be plain text (no JSON). End with a clear call to action using a markdown link whose anchor text contains the word "here", like: [click here to purchase](URL).
- Keep a supportive, practical tone and avoid medical diagnoses.`,
      },
      {
        role: 'user',
        content: 'Here is my profile and all wellness scores (all days). Please give me one personalized tip for today.\n' + JSON.stringify(payloadForModel),
      },
    ]

    let tip = ''
    try {
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
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

    const product_url = firstUrl(tip)

    await supabaseAdmin.from('smart_tips').insert({
      user_id: profile.id,
      user_email: profile.email,
      user_name: profile.name,
      gender: profile.gender,
      age: profile.age,
      height_cm: profile.height_cm,
      weight_kg: profile.weight_kg,
      medications: profile.medications,
      day,
      tip_text: tip,
      product_url,
      model: 'gpt-4o-mini',
      profile_snapshot: profile,
      scores_all_days: payloadForModel.scores_all_days,
      averages_by_topic: payloadForModel.averages_by_topic,
    })

    return json(200, { tip })
  } catch (e: any) {
    return json(500, { error: e?.message || 'Server error' })
  }
}