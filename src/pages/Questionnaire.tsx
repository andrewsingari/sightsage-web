import React, { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import type { Question } from '@/types'
import { supabase } from '../lib/supabase'

const QUESTIONS: Record<string, Question[]> = {
  Outdoor: [
    { id: 'out_hours_day', type: 'number', text: 'On average, how many hours per day do you spend outdoors?' },
    { id: 'out_lux', type: 'number', text: 'What is the intensity of outdoor light you experience (Lux)? (3,000–5,000 Lux is healthy)' },
    { id: 'out_activity_type', type: 'text', text: 'What type of outdoor activities do you engage in?' },
    { id: 'out_direct_sun_min', type: 'number', text: 'How many minutes per day in direct sunlight without sunglasses?' },
    { id: 'out_nature_freq', type: 'choice', text: 'How often do you visit natural environments (parks, forests, beaches)?', options: ['Rarely','1–2×/week','3–4×/week','5–6×/week','Daily'] },
    { id: 'out_green_min', type: 'number', text: 'How many minutes per day do you spend in nature or green spaces?' },
    { id: 'out_fitness_per_week', type: 'number', text: 'How many times per week do you do outdoor fitness (boot camps, nature-based classes)?' },
    { id: 'out_region', type: 'choice', text: 'Which geographic region are you in?', options: ['Tropical','Temperate','Polar','Mediterranean','Desert','Subtropical','Coastal'] },
  ],
  'Indoor Lighting': [
    { id: 'in_hours_artificial', type: 'number', text: 'Average hours/day in indoor environments with artificial lighting' },
    { id: 'in_lux', type: 'number', text: 'Indoor lighting intensity (Lux)? (3,000–5,000 Lux is healthy)' },
    { id: 'in_cct', type: 'choice', text: 'Color temperature of indoor lighting', options: ['Very warm','Warm','Neutral','Slightly cool','Cool','Very cool','Blue-rich'] },
    { id: 'in_hours_natural', type: 'number', text: 'Hours/day in indoor spaces with natural lighting (near windows/skylights)' },
    { id: 'in_screen_hours', type: 'number', text: 'Hours/day using electronic devices with backlit screens' },
    { id: 'in_lighting_type', type: 'choice', text: 'Primary lighting type at home', options: ['LED','Fluorescent','Incandescent','Halogen','Mixed/Other'] },
    { id: 'in_quality', type: 'choice', text: 'Overall indoor lighting quality', options: ['1 Very poor','2','3','4','5','6','7 Excellent'] },
    { id: 'in_focused_tasks_week', type: 'number', text: 'Times per week doing focused visual tasks under artificial lighting' },
  ],
  Reading: [
    { id: 'read_print_hours', type: 'number', text: 'Hours/day reading printed materials (books, newspapers, magazines)' },
    { id: 'read_days_week', type: 'number', text: 'Days/week you read for leisure or education' },
    { id: 'read_session_len', type: 'text', text: 'Typical amount per reading session (pages/chapters or minutes)' },
    { id: 'read_light_quality', type: 'choice', text: 'Lighting while reading printed materials', options: ['1 Very dim','2','3','4','5','6','7 Very bright'] },
    { id: 'read_contrast', type: 'choice', text: 'Text/background contrast while reading', options: ['1 Very low','2','3','4','5','6','7 Very high'] },
    { id: 'read_electronic_minutes', type: 'number', text: 'Minutes/day reading from backlit electronic devices' },
    { id: 'read_env_comfort', type: 'choice', text: 'Reading environment comfort (seating/temperature)', options: ['1 Very uncomfortable','2','3','4','5','6','7 Very comfortable'] },
    { id: 'read_eye_fatigue_week', type: 'number', text: 'Times per week you experience eye fatigue while reading' },
  ],
  'Medical History': [
    { id: 'mh_chronic_count', type: 'number', text: 'How many chronic medical conditions have you been diagnosed with?' },
    { id: 'mh_hospitalizations_year', type: 'number', text: 'Times hospitalized in the past year' },
    { id: 'mh_surgeries_lifetime', type: 'number', text: 'Total surgeries in your lifetime' },
    { id: 'mh_rx_count', type: 'number', text: 'How many prescription medications are you taking now?' },
    { id: 'mh_otc_count', type: 'number', text: 'How many OTC meds or supplements do you use regularly?' },
    { id: 'mh_er_visits_year', type: 'number', text: 'Emergency department visits in the past year' },
    { id: 'mh_specialist_year', type: 'number', text: 'Specialist consultations in the past year' },
    { id: 'mh_treatments_year', type: 'text', text: 'Medical treatments for specific conditions in the past year – list with dates if possible' },
    { id: 'mh_pregnancies', type: 'number', text: 'How many pregnancies have you had? (leave 0 if not applicable)' },
    { id: 'mh_live_births', type: 'number', text: 'How many live births have you had? (leave 0 if not applicable)' },
    { id: 'mh_menstruating', type: 'choice', text: 'Are you currently menstruating?', options: ['Yes','No','Menopause / Post-menopause','Prefer not to say'] },
  ],
  'General Health': [
    { id: 'gh_overall_1_10', type: 'number', text: 'Overall health (1–10, 10 = excellent)' },
    { id: 'gh_mvpa_days', type: 'number', text: 'Days/week with ≥30 minutes of moderate–vigorous activity' },
    { id: 'gh_stress_days', type: 'number', text: 'Days/week you experience stress or anxiety symptoms' },
    { id: 'gh_depression_days', type: 'number', text: 'Days/week you experience depression/low mood' },
    { id: 'gh_sleep_weekdays', type: 'number', text: 'Typical hours/night of sleep on weekdays' },
    { id: 'gh_sleep_weekends', type: 'number', text: 'Typical hours/night of sleep on weekends' },
    { id: 'gh_water_servings', type: 'number', text: 'How many glasses of water or hydrating beverages per day?' },
    { id: 'gh_relax_freq', type: 'number', text: 'Times/week you do relaxation or mindfulness practices' },
  ],
  'Mental Health': [
    { id: 'mth_overall_1_10', type: 'number', text: 'Overall mental well-being (1–10)' },
    { id: 'mth_stress_freq', type: 'choice', text: 'How often do you feel overwhelmed by stress?', options: ['Rarely','Occasionally','Often','Almost always'] },
    { id: 'mth_depression_days_month', type: 'number', text: 'Days in the past month with depression symptoms' },
    { id: 'mth_anxiety_freq', type: 'choice', text: 'How frequently do you experience anxiety symptoms?', options: ['Rarely','Occasionally','Often','Almost always'] },
    { id: 'mth_sleep_hours', type: 'number', text: 'How many hours of quality sleep do you typically get per night?' },
    { id: 'mth_relax_techniques', type: 'choice', text: 'How often do you do relaxation techniques (breathing/meditation)?', options: ['Rarely','Occasionally','Often','Almost always'] },
    { id: 'mth_accomplishment', type: 'choice', text: 'How often do you feel a sense of accomplishment?', options: ['Rarely','Occasionally','Often','Almost always'] },
    { id: 'mth_joy_activities', type: 'choice', text: 'How frequently do you do activities that bring you joy?', options: ['Rarely','Occasionally','Often','Almost always'] },
  ],
  'Functional Food': [
    { id: 'ff_servings_sightc', type: 'number', text: 'Average daily servings of SightC' },
    { id: 'ff_frequency_days_sightc', type: 'number', text: 'How many days per week do you take SightC?' },
    { id: 'ff_servings_blueberry', type: 'number', text: 'Average daily servings of Blueberry Gummies' },
    { id: 'ff_frequency_days_blueberry', type: 'number', text: 'How many days per week do you take Blueberry Gummies?' },
    { id: 'ff_servings_adaptogenx', type: 'number', text: 'Average daily servings of AdaptogenX' },
    { id: 'ff_frequency_days_adaptogenx', type: 'number', text: 'How many days per week do you take AdaptogenX?' },
    { id: 'ff_servings_superfood', type: 'number', text: 'Cups/day of Superfoods Wellness Tea' },
    { id: 'ff_frequency_days_superfood', type: 'number', text: 'How many days per week do you take Superfood Wellness Blend?' },
    { id: 'ff_servings_veggiecookies', type: 'number', text: 'Average daily servings of Veggie Cookies' },
    { id: 'ff_frequency_days_veggiecookies', type: 'number', text: 'How many days per week do you eat Veggie Cookies?' },
    { id: 'ff_hair_pro_days_week', type: 'number', text: 'Days/week you follow recommended serving size for products' },
    { id: 'ff_substitute_meals_week', type: 'number', text: 'Times/week you substitute snacks/meals with functional foods' },
    { id: 'ff_repurchase_month', type: 'number', text: 'Times/month you repurchase functional food products' },
    { id: 'ff_other', type: 'text', text: 'Any other health foods, medications, or lifestyle medicine?' },
  ],
  Sleep: [
    { id: 'sleep_hours', type: 'number', text: 'Average hours of sleep per night' },
    { id: 'sleep_diff_fall_week', type: 'number', text: 'Times/week you have difficulty falling asleep' },
    { id: 'sleep_wake_midnight_week', type: 'number', text: 'Times/week you wake during the night and can’t return to sleep' },
    { id: 'sleep_early_wake_week', type: 'number', text: 'Times/week you wake earlier than desired and cannot fall back asleep' },
    { id: 'sleep_quality', type: 'choice', text: 'Overall sleep quality', options: ['1 Very poor','2','3','4','5','6','7 Excellent'] },
    { id: 'sleep_day_sleepiness', type: 'choice', text: 'Daytime sleepiness/fatigue', options: ['1 Not at all','2','3','4','5','6','7 Extremely'] },
    { id: 'sleep_aids_week', type: 'number', text: 'Times/week you use sleep aids or medications' },
    { id: 'sleep_nap_week', type: 'number', text: 'Times/week you nap in the daytime/afternoon' },
    { id: 'sleep_bedtime', type: 'choice', text: 'Usual bedtime', options: ['Before 9:30 pm','9:30–11:00 pm','11:00 pm–1:00 am','After 1:00 am'] },
    { id: 'sleep_waketime', type: 'choice', text: 'Usual wake-up time', options: ['Before 5:00 am','5:30–7:00 am','7:00–9:00 am','After 9:00 am'] },
  ],
  'Nutrition & Diet': [
    { id: 'nd_fruit_veg_servings', type: 'number', text: 'Servings of fruits & vegetables per day' },
    { id: 'nd_processed_fast_food', type: 'number', text: 'Times per week you eat processed or fast food' },
    { id: 'nd_sugary_bev_week', type: 'number', text: 'Sugary beverages per week' },
    { id: 'nd_diet_type', type: 'choice', text: 'Diet preference', options: ['Everything','Vegetarian','Vegan'] },
    { id: 'nd_disliked_produce', type: 'text', text: 'Which fruits/vegetables do you not enjoy? (list)' },
    { id: 'nd_whole_grain_servings', type: 'number', text: 'Servings of whole grains per day' },
    { id: 'nd_lean_protein_servings', type: 'number', text: 'Servings of lean protein per day' },
    { id: 'nd_sat_fat_week', type: 'number', text: 'Times/week you eat foods high in saturated fats' },
    { id: 'nd_added_sugar_week', type: 'number', text: 'Times/week you eat foods high in added sugars' },
    { id: 'nd_alcohol_week', type: 'number', text: 'Alcoholic beverages per week' },
  ],
  Sports: [
    { id: 'sport_hours_week', type: 'number', text: 'Average hours/week in physical activities or sports' },
    { id: 'sport_moderate_days', type: 'number', text: 'Days/week of moderate-intensity aerobic activity' },
    { id: 'sport_vigorous_days', type: 'number', text: 'Days/week of vigorous-intensity aerobic activity' },
    { id: 'sport_strength_min_day', type: 'number', text: 'Minutes/day of strength training' },
    { id: 'sport_stretch_min_day', type: 'number', text: 'Minutes/day of stretching/flexibility work' },
    { id: 'sport_rpe_1_10', type: 'number', text: 'Perceived exertion during activity (1–10)' },
    { id: 'sport_steps_day', type: 'number', text: 'Average steps per day' },
    { id: 'sport_hand_eye_week', type: 'number', text: 'Times/week you play hand–eye coordination sports (tennis, basketball, racquetball)' },
  ],
}

const BAD_WORDS = [
  'er_','hospital','surgery','surger','rx_','otc_','wake_','diff_','aids',
  'sugary','processed','sat_fat','added_sugar','alcohol','screen','stress',
  'depression','anxiety','fatigue'
]

const GOOD_PEAKS: Record<string, number> = { sleep_hours: 8 }
const GOOD_RANGE: Record<string, [number, number]> = { in_lux: [3000, 5000], out_lux: [3000, 5000] }

const moreIsBetter = (x: number, k = 2) => (x <= 0 ? 0 : Math.min(1, x / (x + k)))
const lessIsBetter = (x: number, k = 2) => 1 - moreIsBetter(x, k)
const peakAt = (x: number, target: number, width = 1.5) => {
  const z = (x - target) / width
  return Math.max(0, Math.min(1, Math.exp(-0.5 * z * z)))
}
const inRange = (x: number, lo: number, hi: number) => {
  if (x <= 0) return 0
  if (x < lo) return moreIsBetter(x / lo, 1) * 0.8
  if (x > hi) return moreIsBetter(hi / x, 1) * 0.8
  return 1
}
const isBadMetric = (id: string) => BAD_WORDS.some(w => id.includes(w))

function scoreNumber(id: string, raw: string): number {
  const x = Number(raw)
  if (!isFinite(x)) return 0
  if (id in GOOD_PEAKS) return peakAt(x, GOOD_PEAKS[id])
  if (id in GOOD_RANGE) {
    const [lo, hi] = GOOD_RANGE[id]
    return inRange(x, lo, hi)
  }
  if (isBadMetric(id)) return lessIsBetter(x, 2)
  return moreIsBetter(x, 2)
}

function scoreChoice(raw: string, options?: string[]): number {
  if (!options || options.length === 0) return 0.5
  const first = options[0].trim()
  if (/^\d/.test(first)) {
    const max = parseInt((options[options.length - 1].match(/^\d+/) || ['1'])[0], 10)
    const chosenNum = parseInt((raw.match(/^\d+/) || ['0'])[0], 10)
    return Math.max(0, Math.min(1, chosenNum / max))
  }
  const idx = options.findIndex(o => o === raw)
  return idx < 0 ? 0.5 : (options.length === 1 ? 1 : idx / (options.length - 1))
}

const scoreText = (_id: string, raw: string) => (raw.trim() ? 0.6 : 0)

function computeTopicScore(topic: string, questions: Question[], answers: Record<string, string>): number {
  if (!questions.length) return 0
  const each = questions.map(q => {
    const raw = answers[q.id] ?? ''
    if (!raw) return 0
    if (q.type === 'number') return scoreNumber(q.id, raw)
    if (q.type === 'choice') return scoreChoice(raw, (q as any).options)
    return scoreText(q.id, raw)
  })
  const sum = each.reduce((a, b) => a + b, 0)
  return Math.max(0, Math.min(1, sum / questions.length))
}

function computeFunctionalFoodScore(answers: Record<string, string>): number {
  const pairs: [string, string][] = [
    ['ff_servings_sightc','ff_frequency_days_sightc'],
    ['ff_servings_blueberry','ff_frequency_days_blueberry'],
    ['ff_servings_adaptogenx','ff_frequency_days_adaptogenx'],
    ['ff_servings_superfood','ff_frequency_days_superfood'],
    ['ff_servings_veggiecookies','ff_frequency_days_veggiecookies'],
  ]
  const totals = pairs.map(([s, d]) => {
    const servings = Math.max(0, Number(answers[s] || 0))
    const days = Math.max(0, Math.min(7, Number(answers[d] || 0)))
    return servings * days
  })
  totals.sort((a, b) => b - a)
  const topTwo = totals.slice(0, 2).reduce((a, b) => a + b, 0)
  const ratio = Math.min(1, topTwo / 56)
  return ratio * 400
}

export default function Questionnaire() {
  const { topic = '' } = useParams()
  const nav = useNavigate()
  const normalizedTopic = useMemo(() => decodeURIComponent(String(topic || '')), [topic])
  const questions = useMemo<Question[]>(() => (QUESTIONS as any)[normalizedTopic] ?? [], [normalizedTopic])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const set = (id: string, val: string) => setAnswers(prev => ({ ...prev, [id]: val }))

  const goHomeTop = () => {
    try { sessionStorage.setItem('forceScrollTop', '1') } catch {}
    try { window.history.scrollRestoration = 'manual' } catch {}
    const force = () => {
      try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }) } catch {}
      try { document.documentElement.scrollTop = 0 } catch {}
      try { document.body.scrollTop = 0 } catch {}
    }
    force()
    setTimeout(force, 0)
    setTimeout(force, 80)
    setTimeout(force, 160)
    nav('/', { replace: true, state: { scrollToTop: Date.now() } })
    setTimeout(force, 280)
    setTimeout(force, 480)
  }

  const submit = async () => {
    let normalized: number
    let raw: number | null = null
    let max: number | null = null
    if (normalizedTopic === 'Functional Food') {
      const points = computeFunctionalFoodScore(answers)
      normalized = points / 400
      raw = points
      max = 400
    } else {
      normalized = computeTopicScore(normalizedTopic, questions, answers)
    }
    const { data: s } = await supabase.auth.getSession()
    if (!s.session?.user) { nav('/login'); return }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    const { error } = await supabase.rpc('api_upsert_wellness_score', {
      p_topic: normalizedTopic,
      p_score: normalized,
      p_raw_points: raw,
      p_max_points: max,
      p_day: null,
      p_tz: tz
    })
    if (error) { alert(`Save failed: ${error.message}`); return }
    goHomeTop()
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl font-bold">{normalizedTopic}</h2>
      <div className="text-gray-600 mt-1 mb-1">Please answer the questions below.</div>
      {normalizedTopic === 'Functional Food' && (
        <div className="text-gray-800 mb-3">Functional Food is scored out of <span className="font-bold">400</span> points.</div>
      )}
      {questions.length === 0 ? (
        <div>No questions found for “{normalizedTopic}”.</div>
      ) : (
        <div className="grid gap-3">
          {questions.map(item => {
            const value = answers[item.id] ?? ''
            if (item.type === 'number') {
              return (
                <Card key={item.id}>
                  <div className="text-base mb-2">{item.text}</div>
                  <input
                    value={value}
                    onChange={(e) => set(item.id, e.target.value)}
                    placeholder="Enter a number"
                    inputMode="numeric"
                    className="bg-white border rounded-xl p-2.5"
                  />
                </Card>
              )
            }
            if (item.type === 'choice') {
              return (
                <Card key={item.id}>
                  <div className="text-base mb-2">{item.text}</div>
                  <div className="flex flex-wrap gap-2">
                    {(item as any).options?.map((opt: string) => {
                      const selected = value === opt
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => set(item.id, opt)}
                          className={['border rounded-2xl px-3 py-2', selected ? 'border-[var(--brand)] bg-red-50 text-[var(--brand)]' : ''].join(' ')}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                </Card>
              )
            }
            return (
              <Card key={item.id}>
                <div className="text-base mb-2">{item.text}</div>
                <input
                  value={value}
                  onChange={(e) => set(item.id, e.target.value)}
                  placeholder="Type your answer"
                  className="bg-white border rounded-xl p-2.5"
                />
              </Card>
            )
          })}
        </div>
      )}
      <div className="sticky bottom-4 mt-4">
        <Button onClick={submit}>Submit</Button>
      </div>
    </div>
  )
}