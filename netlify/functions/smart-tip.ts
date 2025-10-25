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
        content: `You are a concise health coach for SightSage Foods and Nutrition. Focus on the provided profile and scores to output one actionable tip (2–4 sentences). Prioritize the biggest opportunity. Also make sure you recommend a SightSage product based on the provided profile and scores and give the link to the user to make a purchase. Make sure the link is clickable. Be brief. Here are the products we offer:

SightC: Have dry, itchy, red eyes? Looking for an eye drop alternative? Try Sight C! 🌟👁️
SightC is a premium superfood blend designed to support and enhance eye health and vision. It is made with seven 100% natural whole superfood ingredients, including Goji Berry, Turmeric, Cherokee Rose, Dwarf LilyTurf, Dandelion, Chinese Yam, and Hawthorn.
Provides essential vitamins, minerals, antioxidants, and amino acids, such as Lutein, Zeaxanthin, Zinc, Vitamin B1, Omega-3 Fatty Acids, and Vitamin C. Our customers have reported improved dry eyes, eye fatigue, and blurry vision after using SightC.
Formulated by Registered Dietitian Kathy from KathyHealthTips and Dr. Weidong Yu, a world-renowned Doctor of Traditional Chinese Medicine based in Canada. SightC's proprietary blend has been empirically tested and trialed at Wellspring TCM Technology Institute Ltd.
Embark on a journey of discovery with the pure and potent natural ingredients that make up our unique product. Our product contains no unnecessary additives and provides a full-spectrum of nutrition to support and enhance your overall eye health and vision. Each ingredient is meticulously sourced for its renowned health-enhancing properties and is incorporated into our blend for its purity and efficacy. Learn more about the benefits and origins of each element by following the links below:
* Goji Berries: Celebrated for their high antioxidant content.
* Turmeric: Valued for its powerful anti-inflammatory properties.
* Cherokee Rose: Traditionally used to bolster the immune system.
* Dwarf Lily Turf: Esteemed in herbal medicine for its beneficial respiratory health effects.
* Dandelion: A natural diuretic with a rich herbal remedy history.
* Chinese Yam: Known for its role in nutrition and digestion.
* Hawthorn: Employed for centuries for its cardiovascular health benefits.
Link: https://sightsage.com/collections/bestsellers/products/sightc-natural-dry-eye-supplement

Blueberry Gummies: Modern life puts constant strain on our eyes. Combat the effects of digital screens, driving, and reading with our delicious Blueberry Gummies. Each gummy is packed with essential vitamins (C, K, E, B6), minerals (Copper, Manganese, Potassium), and antioxidants (Anthocyanins, Lutein, Zeaxanthin, Beta-carotene) to nourish your eyes and protect against oxidative stress.
Why Choose Our Gummies?
* Targeted Eye Support: Helps relieve dry eyes, reduce fatigue, and clear up blurry vision.
* All-Natural Ingredients: Made with 100% Canadian blueberries and sweetened with Monk Fruit—no added sugar, keto-friendly.
* Trusted Expertise: Formulated by Dr. Weidong Yu, a renowned traditional Chinese medicine practitioner.
Taste and Health Together: Enjoy the natural sweetness and health benefits in every bite. Perfect for on-the-go snacking, our gummies are plant-based, low-calorie, Halal, and Kosher.
How to take the Blueberry Gummies:
Take between 1-6 gummies a day depending on your eye health condition. Take 1 gummy with or without food anytime you feel discomfort in your eyes. You can take up to 9 gummies a day.
Link: https://sightsage.com/products/blueberry-gummy

AdaptogenX: Reduce your cortisol levels, fight alopecia, and combat hair loss with Adaptogen-X! 🌿✨ This daily supplement is made in Canada to get rid of hair loss and premature grey/white hairs by treating hormonal imbalances. Optimal for people dealing with a range of issues such as PCOS, thyroid issues, perimenopause, etc. Packed with a powerful blend of all-natural ingredients.
Specifications:
* Quantity: 60 capsules per bottle
Key Ingredients:
* Red Ginseng: Revitalizes and aids in recovering energy. Strengthens the roots of the hair and stimulates the scalp, enhancing hair growth and reducing hair loss.
* American Ginseng: Supports immune function and boosts mental performance.
* Schisandra Chinensis: Improves liver function and overall vitality.
* Siberian Ginseng: Increases blood circulation and energy. Helps adapt to stress.
* Mai Dong: Hydrates and nourishes the scalp, promoting healthy hair growth. Helps reduce stress, which can minimize hair loss and improve hair vitality.
Suggested Dosage:
* Take 3 capsules daily during the day time.
Storage Instructions:
* Store in a cool, dry place away from direct sunlight.
Keep out of reach of children to prevent accidental ingestion.
Link: https://sightsage.com/products/adaptogen-x

Superfood Wellness Blend: Our premium weight loss product has 29 carefully selected whole foods and food graded herbs that provide the body with essential vitamins, minerals, antioxidants, and phytonutrients to support sustainable weight loss.
This blend promotes health by boosting metabolism and improving insulin resistance, while also reducing blood sugar, and curbing cravings. It helps inhibit bloating and supports a healthy liver, allowing you to maintain a balanced lifestyle without restrictive diets. Made in Canada! 🇨🇦
✅ NOURISH your body with 29 fresh vegetables, herbs, and fruits, to support weight loss.
✅ TREAT fatty liver
✅ PROMOTES natural GLP-1 production
✅ REDUCE blood sugar, bad cholesterol, cravings, bloating, and promote a healthier weight loss, without restrictive diets.
Ingredients:
Blueberry, raspberry, blackberry, carrot, Chinese wolfberry (Goji berry), green grape, red grape, purple grape, spinach, apple, celery, cucumber, perilla leaf, tomato, Chinese yam, pumpkin, jujube, turmeric, dogwood berry, black bean, black sesame, kale, broccoli, white radish, beet, dandelion, mulberry, hawthorn fruit, orange.
Directions:
Take 2-3 spoons a day with 150 ml warm or hot water, preferably first thing in the morning before your first meal. You may take up to 3 spoons a day if needed, with or without food.
One bottle is approx a 27-30 day supply.
Link: https://sightsage.com/products/superfoods-wellness-tea`,
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
      tip = 'Consider adding a serving of leafy greens at lunch and hydrating steadily through the afternoon. Try SightC to support eye comfort and visual endurance: https://sightsage.com/collections/bestsellers/products/sightc-natural-dry-eye-supplement'
    }

    return json(200, { tip })
  } catch (e: any) {
    return json(500, { error: e?.message || 'Server error' })
  }
}