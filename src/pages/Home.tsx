import React, { useEffect, useLayoutEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Header from '../components/Header'
import { supabase } from '../lib/supabase'
import bannerImage from '../assets/bannerimage.png';

const SHOW_DEBUG = false

const TOPIC_ORDER = [
  'Outdoor',
  'Indoor Lighting',
  'Reading',
  'Medical History',
  'General Health',
  'Mental Health',
  'Functional Food',
  'Sleep',
  'Nutrition & Diet',
  'Sports',
]

const SLICE_COLORS = [
  '#FFE975',
  '#F7A556',
  '#94D86F',
  '#EE4C40',
  '#B77BEA',
  '#FFF7D9',
  '#B4D97A',
  '#559A94',
  '#FFF25E',
  '#F28B33',
]

const PRODUCT_LINKS: Record<string, string> = {
  sightc: 'https://sightsage.com/collections/bestsellers/products/sightc-natural-dry-eye-supplement',
  blueberry: 'https://sightsage.com/products/blueberry-gummy',
  adaptogen: 'https://sightsage.com/products/adaptogen-x',
  superfood: 'https://sightsage.com/products/superfoods-wellness-tea',
  default: 'https://sightsage.com/collections/bestsellers',
}

const degToRad = (d: number) => (Math.PI / 180) * d
const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
  const a = degToRad(angleDeg)
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}
function ringWedgePath(cx: number, cy: number, rInner: number, rOuter: number, startAngle: number, endAngle: number) {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  const p1 = polarToCartesian(cx, cy, rOuter, startAngle)
  const p2 = polarToCartesian(cx, cy, rOuter, endAngle)
  const p3 = polarToCartesian(cx, cy, rInner, endAngle)
  const p4 = polarToCartesian(cx, cy, rInner, startAngle)
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ')
}

const toISO = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
const todayLocalISO = () => toISO(new Date())
const formatHuman = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  const local = new Date(y, m - 1, d)
  return local.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

export default function Home() {
  const nav = useNavigate()
  const location = useLocation()
  const [nonce, setNonce] = useState(0)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [uid, setUid] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<string>(todayLocalISO())
  const [calOpen, setCalOpen] = useState(false)
  const [viewDate, setViewDate] = useState(new Date())
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [filledDays, setFilledDays] = useState<Set<string>>(new Set())
  const [resetting, setResetting] = useState(false)
  const [tipOpen, setTipOpen] = useState(false)
  const [tipLoading, setTipLoading] = useState(false)
  const [tipText, setTipText] = useState('')
  const [tipHtml, setTipHtml] = useState<string | null>(null)
  const [tipError, setTipError] = useState<string | null>(null)
  const [ctaUrl, setCtaUrl] = useState<string | null>(null)
  const [ctaLabel, setCtaLabel] = useState<string>('Shop SightSage')

  const linkify = (s: string) => {
    let html = s || ''
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline text-[var(--brand)] font-semibold">$1</a>')
    html = html.replace(/(^|[\s(])((https?:\/\/|www\.)[^\s<)]+)/gi, (_m, p1, p2) => {
      const url = p2.startsWith('http') ? p2 : `https://${p2}`
      return `${p1}<a href="${url}" target="_blank" rel="noopener noreferrer" class="underline text-[var(--brand)] font-semibold">${p2}</a>`
    })
    html = html.replace(/\n/g, '<br/>')
    return html
  }

  const extractFirstUrl = (s: string | null | undefined) => {
    if (!s) return null
    const m = s.match(/https?:\/\/[^\s)]+/i)
    return m ? m[0] : null
  }

  const pickProduct = (t: string) => {
    const s = (t || '').toLowerCase()
    if (s.includes('sightc')) return { link: PRODUCT_LINKS.sightc, label: 'Buy SightC' }
    if (s.includes('blueberry')) return { link: PRODUCT_LINKS.blueberry, label: 'Buy Blueberry Gummies' }
    if (s.includes('adaptogen')) return { link: PRODUCT_LINKS.adaptogen, label: 'Buy AdaptogenX' }
    if (s.includes('superfood') || s.includes('wellness blend')) return { link: PRODUCT_LINKS.superfood, label: 'Buy Superfood Wellness Blend' }
    return { link: PRODUCT_LINKS.default, label: 'Shop SightSage' }
  }

  useEffect(() => {
    try { window.history.scrollRestoration = 'manual' } catch {}
  }, [])

  useLayoutEffect(() => {
    const goTop = () => {
      try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }) } catch {}
      try { document.documentElement.scrollTop = 0 } catch {}
      try { document.body.scrollTop = 0 } catch {}
    }
    goTop()
    requestAnimationFrame(goTop)
    const t0 = setTimeout(goTop, 0)
    const t1 = setTimeout(goTop, 80)
    const t2 = setTimeout(goTop, 160)
    try { sessionStorage.removeItem('forceScrollTop') } catch {}
    return () => {
      clearTimeout(t0 as any)
      clearTimeout(t1 as any)
      clearTimeout(t2 as any)
    }
  }, [location.pathname])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user
      setUid(u?.id ?? null)
      setDisplayName((u?.user_metadata as any)?.name ?? u?.email?.split('@')[0] ?? null)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user
      setUid(u?.id ?? null)
      setDisplayName((u?.user_metadata as any)?.name ?? u?.email?.split('@')[0] ?? null)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!uid) { setScores({}); return }
    const load = async () => {
      const { data, error } = await supabase
        .from('wellness_scores')
        .select('topic,score')
        .eq('user_id', uid)
        .eq('day', selectedDay)
      if (error) { setScores({}); return }
      const map: Record<string, number> = {}
      for (const r of data ?? []) map[(r as any).topic as string] = Number((r as any).score)
      setScores(map)
    }
    load()
  }, [uid, nonce, selectedDay])

  useEffect(() => {
    if (!uid) { setFilledDays(new Set()); return }
    const run = async () => {
      const { data, error } = await supabase
        .from('wellness_scores')
        .select('day')
        .eq('user_id', uid)
      if (error) { setFilledDays(new Set()); return }
      const s = new Set<string>()
      for (const r of (data ?? []) as any[]) {
        const iso = String(r.day).slice(0, 10)
        if (iso) s.add(iso)
      }
      setFilledDays(s)
    }
    run()
  }, [uid, nonce])

  const size = 600
  const cx = size / 2
  const cy = size / 2
  const outerR = size * 0.5
  const baseInner = size * 0.2
  const maxInner = size * 0.38
  const baseCenter = size * 0.1
  const maxCenter = size * 0.2
  const whiteDonutR = size * 0.22
  const sliceAngle = 360 / TOPIC_ORDER.length
  const sliceAngleRad = degToRad(sliceAngle)

  const todayIsoLocal = todayLocalISO()
  const isTodaySelected = selectedDay === todayIsoLocal

  const resetScores = async () => {
    if (!uid || !isTodaySelected) return
    if (!window.confirm('Reset all wellness scores for selected day?')) return
    setResetting(true)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    const { error } = await supabase.rpc('api_reset_scores_for_day', { p_day: selectedDay, p_tz: tz })
    setResetting(false)
    if (error) { alert(error.message); return }
    setScores({})
    setNonce(n => n + 1)
    try { sessionStorage.setItem('forceScrollTop', '1') } catch {}
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }

  const openTip = async () => {
    setTipOpen(true)
    setTipLoading(true)
    setTipError(null)
    setTipText('')
    setTipHtml(null)
    setCtaUrl(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || null
      const res = await fetch('/api/smart-tip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ day: selectedDay })
      })
      if (!res.ok) throw new Error('Failed to fetch tip')
      const json = await res.json().catch(() => ({}))
      const html = typeof json?.html === 'string' ? json.html : null
      const text = typeof json?.text === 'string' ? json.text : (typeof json?.tip === 'string' ? json.tip : '')
      let outHtml: string
      let url = extractFirstUrl(html || '') || extractFirstUrl(text)
      if (html) {
        outHtml = html
      } else {
        const hasUrl = !!url
        if (!hasUrl) {
          const pick = pickProduct(text)
          url = pick.link
          outHtml = `${linkify(text)} <a href="${url}" target="_blank" rel="noopener noreferrer" class="underline text-[var(--brand)] font-semibold">Click here</a>.`
        } else {
          outHtml = linkify(text)
        }
      }
      setTipHtml(outHtml)
      const pick = pickProduct(text + ' ' + (html || ''))
      setCtaUrl(url || pick.link)
      setCtaLabel(url && url.includes('blueberry') ? 'Buy Blueberry Gummies' :
                  url && url.includes('adaptogen') ? 'Buy AdaptogenX' :
                  url && url.includes('sightc') ? 'Buy SightC' :
                  url && url.includes('superfood') ? 'Buy Superfood Wellness Blend' :
                  pick.label)
    } catch {
      setTipText('You’ll see personalized tips here once you register/login. Try one small improvement today: get 20-30 minutes of outdoor daylight before noon and aim for a consistent bedtime.')
      setTipHtml(null)
      setCtaUrl(PRODUCT_LINKS.default)
      setCtaLabel('Shop SightSage')
    } finally {
      setTipLoading(false)
    }
  }

  const visionScore = scores['Vision Wellness']
  const centerDynamic =
    typeof visionScore === 'number'
      ? baseCenter + (maxCenter - baseCenter) * visionScore
      : maxCenter
  const visionPercent = typeof visionScore === 'number' ? Math.round(visionScore * 100) : null
  const hasVisionData = typeof visionScore === 'number'
  const greet = uid ? `Welcome Back, ${displayName || 'Friend'}` : 'Please log in for health tracking'

  const goSlice = (topic: string, hasData: boolean) => {
    const anchor = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    if (isTodaySelected) {
      if (hasData) nav(`/healthreport#${anchor}`)
      else nav(`/questionnaire/${encodeURIComponent(topic)}`)
    } else {
      if (hasData) nav(`/healthreport#${anchor}`)
    }
  }

  const renderedTip = tipHtml ? (
    <span dangerouslySetInnerHTML={{ __html: tipHtml }} />
  ) : (
    linkify(tipText)
  )

  return (
    <div className="overflow-x-hidden">
      <Header />
      <div className="flex flex-col items-center">
        <div className="w-full max-w-4xl px-4 sm:px-6 mt-6 text-center">
          <div className="text-[28px] sm:text-[32px] text-[var(--brand)] font-semibold">
            {greet}
          </div>
        </div>

        <div className="mt-4 w-full flex justify-center px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 relative">
            <button
              type="button"
              onClick={() => setCalOpen(v => !v)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-300 bg-white font-semibold text-sm sm:text-base shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="4" width="18" height="17" rx="2" stroke="#6B7280" strokeWidth="2"/>
                <path d="M8 2v4M16 2v4M3 10h18" stroke="#6B7280" strokeWidth="2"/>
              </svg>
              <span>{selectedDay ? formatHuman(selectedDay) : 'Select date'}</span>
            </button>

            {isTodaySelected && (
              <button
                className={[
                  'px-5 py-2.5 rounded-full border text-sm sm:text-base font-semibold shadow-sm',
                  !resetting ? 'border-gray-300 hover:bg-gray-50' : 'border-gray-200'
                ].join(' ')}
                onClick={resetScores}
                disabled={resetting}
              >
                {resetting ? 'Resetting…' : 'Reset Scores'}
              </button>
            )}

            <button
              type="button"
              onClick={openTip}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-300 bg-white font-semibold text-sm sm:text-base shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 18h6M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.2-2.7 5.4-.6.5-1.1 1.2-1.3 2H9c-.2-.8-.7-1.5-1.3-2C6.3 13.2 5 11.5 5 9a7 7 0 0 1 7-7Z" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>SightSage Wellness Plan</span>
            </button>

            {calOpen && (
              <div className="absolute top-[calc(100%+12px)] left-1/2 -translate-x-1/2 z-50 w-[min(95vw,560px)] rounded-2xl border bg-white p-5 sm:p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <button
                    className="px-3 py-2 rounded-lg border hover:bg-gray-50 font-semibold"
                    onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                  >
                    ◀
                  </button>
                  <div className="text-lg sm:text-xl font-extrabold">
                    {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </div>
                  <button
                    className="px-3 py-2 rounded-lg border hover:bg-gray-50 font-semibold"
                    onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                  >
                    ▶
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-2 text-center text-sm font-bold text-gray-500 mb-2">
                  {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d}>{d}</div>)}
                </div>
                {(() => {
                  const y = viewDate.getFullYear()
                  const m = viewDate.getMonth()
                  const first = new Date(y, m, 1)
                  const startIdx = (first.getDay() + 7) % 7
                  const daysInPrev = new Date(y, m, 0).getDate()
                  const daysInThis = new Date(y, m + 1, 0).getDate()
                  const cells: { date: Date; muted: boolean }[] = []
                  for (let i = 0; i < 42; i++) {
                    const dayNum = i - startIdx + 1
                    if (dayNum <= 0) cells.push({ date: new Date(y, m - 1, daysInPrev + dayNum), muted: true })
                    else if (dayNum > daysInThis) cells.push({ date: new Date(y, m + 1, dayNum - daysInThis), muted: true })
                    else cells.push({ date: new Date(y, m, dayNum), muted: false })
                  }
                  const selISO = selectedDay
                  const todayIsoLocal = todayLocalISO()
                  return (
                    <div className="grid grid-cols-7 gap-2">
                      {cells.map(({ date, muted }, i) => {
                        const iso = toISO(date)
                        const isSel = iso === selISO
                        const isToday = !muted && iso === todayIsoLocal
                        const hasData = !muted && filledDays.has(iso)
                        const isFuture = iso > todayIsoLocal
                        return (
                          <button
                            key={i}
                            disabled={isFuture}
                            onClick={() => { if (!isFuture) { setSelectedDay(iso); setCalOpen(false) } }}
                            className={[
                              'h-12 sm:h-14 rounded-xl border text-base sm:text-lg font-semibold',
                              muted ? 'text-gray-400 border-gray-200' : 'text-gray-900 border-gray-300',
                              isSel ? 'bg-[var(--brand)] border-[var(--brand)] text-white' : 'hover:bg-gray-50',
                              !isSel && isToday ? 'ring-2 ring-[var(--brand)] ring-offset-2 ring-offset-white' : '',
                              !isSel && hasData ? 'bg-green-50 border-green-500 text-green-800' : '',
                              isFuture ? 'opacity-50 cursor-not-allowed hover:bg-white' : ''
                            ].join(' ')}
                          >
                            {date.getDate()}
                          </button>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        </div>

        <div className="relative mt-6 w-full flex justify-center px-4" data-nonce={nonce}>
          <div className="w-full max-w-[600px]">
            <svg
              viewBox={`0 0 ${size} ${size}`}
              width={size}
              height={size}
              preserveAspectRatio="xMidYMid meet"
              style={{ width: '100%', height: 'auto', aspectRatio: '1 / 1', display: 'block' }}
              aria-label="Vision Wellness Wheel"
            >
              <rect x="0" y="0" width={size} height={size} fill="#fff" />
              {TOPIC_ORDER.map((topic, i) => {
                const start = -90 + i * sliceAngle
                const end = start + sliceAngle
                const fill = SLICE_COLORS[i % SLICE_COLORS.length]
                const score = scores[topic]
                const innerDynamic =
                  typeof score === 'number'
                    ? baseInner + (maxInner - baseInner) * (1 - Math.max(0, Math.min(1, score)))
                    : baseInner
                const d = ringWedgePath(cx, cy, innerDynamic, outerR, start, end)
                const mid = (start + end) / 2
                const midNorm = ((mid % 360) + 360) % 360
                const needsFlip = midNorm > 90 && midNorm < 270
                const isFF = topic === 'Functional Food'
                const isND = topic === 'Nutrition & Diet'
                const isReading = topic === 'Reading'
                const words = topic.split(' ')
                const longest = words.reduce((m, w) => Math.max(m, w.length), 0)
                const s = typeof score === 'number' ? Math.max(0, Math.min(1, score)) : null
                const labelFactorBase = 0.68
                const labelFactorInset = isFF ? 0.66 : 0.62
                const labelFactor = s !== null && s < 0.99 ? labelFactorInset : labelFactorBase
                const labelR = innerDynamic + (outerR - innerDynamic) * labelFactor
                const label = polarToCartesian(cx, cy, labelR, mid)
                const thickness = outerR - innerDynamic
                const baseFont = isFF || isND || isReading ? 14 : 16
                const minFont = 12
                const lineGapK = 1.05
                const radialLimit = (thickness * 0.9) / (1 + (words.length - 1) * lineGapK)
                const arcAvail = labelR * sliceAngleRad * 0.9
                const widthLimit = arcAvail / Math.max(1, 0.6 * longest)
                const labelFont = Math.max(minFont, Math.min(baseFont, radialLimit, widthLimit))
                const dyStep = labelFont * lineGapK
                const percentBandInner = whiteDonutR + 6
                const percentBandOuter = Math.max(percentBandInner + 6, innerDynamic - 8)
                const ffPoints = isFF && typeof score === 'number' ? Math.round(score * 400) : null
                const ffDigits = ffPoints !== null ? String(Math.abs(ffPoints)).length : 0
                let t = 0.6
                if (isFF) {
                  if (ffDigits >= 3) t = 2.05
                  else t = 0.6
                }
                const percentR = percentBandInner + (percentBandOuter - percentBandInner) * t
                const percentPos = polarToCartesian(cx, cy, percentR, mid)
                const metricText =
                  typeof score === 'number'
                    ? isFF
                      ? String(ffPoints)
                      : `${Math.round(score * 100)}%`
                    : null
                const hasTopicData = typeof score === 'number'
                const sliceClickable = isTodaySelected || hasTopicData
                const onActivate = () => goSlice(topic, hasTopicData)
                return (
                  <g key={topic} aria-label={topic} aria-disabled={!sliceClickable}>
                    <path
                      d={d}
                      fill={fill}
                      stroke={SHOW_DEBUG ? '#000' : 'none'}
                      strokeDasharray={SHOW_DEBUG ? '3 3' : 'none'}
                      style={{ cursor: sliceClickable ? 'pointer' : 'default' }}
                    />
                    <path
                      d={d}
                      fill="#000"
                      fillOpacity={0.001}
                      style={{ cursor: sliceClickable ? 'pointer' : 'default' }}
                      onClick={sliceClickable ? onActivate : undefined}
                      onKeyDown={sliceClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onActivate() } : undefined}
                      role={sliceClickable ? 'button' : undefined}
                      tabIndex={sliceClickable ? 0 : -1}
                    />
                    <g transform={`translate(${label.x}, ${label.y}) rotate(${needsFlip ? mid + 180 : mid})`} style={{ pointerEvents: 'none' }}>
                      <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: labelFont,
                          fontWeight: 800,
                          fill: '#111',
                          stroke: '#fff',
                          strokeWidth: 4,
                          paintOrder: 'stroke fill',
                          letterSpacing: 0.2,
                        }}
                      >
                        {words.map((word, idx) => (
                          <tspan key={idx} x="0" dy={idx === 0 ? 0 : dyStep}>
                            {word}
                          </tspan>
                        ))}
                      </text>
                    </g>
                    {metricText !== null && (
                      <text
                        x={percentPos.x}
                        y={percentPos.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: isFF ? Math.min(16, labelFont) : 16,
                          fontWeight: 800,
                          fill: '#111',
                          stroke: '#fff',
                          strokeWidth: 4,
                          paintOrder: 'stroke fill',
                          pointerEvents: 'none',
                        }}
                      >
                        {metricText}
                      </text>
                    )}
                  </g>
                )
              })}

              <circle cx={cx} cy={cy} r={whiteDonutR} fill="none" />

              <g
                role={isTodaySelected || hasVisionData ? 'button' : undefined}
                tabIndex={isTodaySelected || hasVisionData ? 0 : -1}
                onClick={() => {
                  if (isTodaySelected) {
                    if (hasVisionData) nav('/healthreport#vision-wellness')
                    else nav('/vision-wellness')
                  } else {
                    if (hasVisionData) nav('/healthreport#vision-wellness')
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    if (isTodaySelected) {
                      if (hasVisionData) nav('/healthreport#vision-wellness')
                      else nav('/vision-wellness')
                    } else {
                      if (hasVisionData) nav('/healthreport#vision-wellness')
                    }
                  }
                }}
                style={{ cursor: isTodaySelected || hasVisionData ? 'pointer' : 'default' }}
                aria-disabled={!(isTodaySelected || hasVisionData)}
                aria-label="Vision Wellness"
              >
                <circle cx={cx} cy={cy} r={centerDynamic} fill="#E63423" />
                <text x={cx} y={cy - 8} textAnchor="middle" fontSize="28" fontWeight="800" fill="#000">Vision</text>
                <text x={cx} y={cy + 18} textAnchor="middle" fontSize="28" fontWeight="800" fill="#000">Wellness</text>
                {visionPercent !== null && (
                  <text x={cx} y={cy + 50} textAnchor="middle" fontSize="20" fontWeight="800" fill="#000">
                    {visionPercent}%
                  </text>
                )}
              </g>
            </svg>
          </div>
        </div>

        <p className="text-center font-serif text-[24px] sm:text-[28px] text-purple-900 mt-2">
          Happy Eyes. Happy Life.
        </p>

        {!uid && (
          <div className="w-full max-w-4xl px-4 sm:px-6 mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
            <button
              onClick={() => nav('/login')}
              className="w-full h-12 rounded-2xl border-2 border-black font-extrabold bg-white"
            >
              LOG IN
            </button>
            <button
              onClick={() => nav('/register')}
              className="w-full h-12 rounded-2xl bg-black text-white font-extrabold"
            >
              REGISTER
            </button>
          </div>
        )}

        <div className="w-full max-w-4xl px-4 sm:px-6 mt-5">
          <img
            src={bannerImage}
            alt="SightSage Banner"
            className="w-full h-48 sm:h-64 object-cover rounded-xl"
          />
        </div>
      </div>

      {tipOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="bg-white w-[min(92vw,560px)] rounded-2xl p-5 sm:p-6 shadow-xl">
            <div className="text-lg sm:text-xl font-bold mb-2">
              SightSage Wellness Plan for {displayName || 'you'}
            </div>            <div className="min-h-[80px] text-gray-800">
              {tipLoading ? 'Fetching your tip…' : tipError ? <span className="text-red-600">{tipError}</span> : renderedTip}
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <div>
                {ctaUrl && (
                  <a
                    href={ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 rounded-xl bg-[var(--brand)] text-white font-semibold hover:opacity-90"
                  >
                    {ctaLabel}
                  </a>
                )}
              </div>
              <button
                className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 font-semibold"
                onClick={() => setTipOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}