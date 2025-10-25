import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Card from '../components/Card'
import { supabase } from '../lib/supabase'

type Topic =
  | 'Nutrition & Diet'
  | 'Sleep'
  | 'Functional Food'
  | 'Mental Health'
  | 'General Health'
  | 'Medical History'
  | 'Reading'
  | 'Indoor Lighting'
  | 'Outdoor'
  | 'Sports'
  | 'Vision Wellness'

const TOPICS: Topic[] = [
  'Nutrition & Diet',
  'Sleep',
  'Functional Food',
  'Mental Health',
  'General Health',
  'Medical History',
  'Reading',
  'Indoor Lighting',
  'Outdoor',
  'Sports',
  'Vision Wellness',
]

const TOPIC_COLORS: Record<Topic, string> = {
  Outdoor: '#FFE975',
  'Indoor Lighting': '#F7A556',
  Reading: '#94D86F',
  'Medical History': '#EE4C40',
  'General Health': '#B77BEA',
  'Mental Health': '#FFF7D9',
  'Functional Food': '#B4D97A',
  Sleep: '#559A94',
  'Nutrition & Diet': '#FFF25E',
  Sports: '#F28B33',
  'Vision Wellness': '#E63423',
}

type Row = { day: string; topic: Topic | string; score: number; raw_points: number | null; max_points: number | null }

function toISO(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseISODate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1)
}

function labelForKey(key: string, groupBy: 'day' | 'month' | 'year') {
  if (groupBy === 'day') {
    const dt = parseISODate(key)
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  if (groupBy === 'month') {
    const [y, m] = key.split('-').map(Number)
    const dt = new Date(y, m - 1, 1)
    return dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }
  return key
}

function keyForDate(d: Date, groupBy: 'day' | 'month' | 'year') {
  if (groupBy === 'day') return toISO(d)
  if (groupBy === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  return String(d.getFullYear())
}

function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const ro = new ResizeObserver(([entry]) => {
      const box = entry.contentBoxSize ? (Array.isArray(entry.contentBoxSize) ? entry.contentBoxSize[0] : entry.contentBoxSize) : null
      const width = box ? box.inlineSize : el.getBoundingClientRect().width
      setW(width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, width: w }
}

function BarChart({
  data,
  color,
  maxValue,
  tickValues,
  formatY,
  formatBar,
}: {
  data: { key: string; label: string; value: number }[]
  color: string
  maxValue: number
  tickValues?: number[]
  formatY: (v: number) => string
  formatBar: (v: number) => string
}) {
  const { ref, width } = useMeasure<HTMLDivElement>()
  const isMobile = (width || 0) < 450
  const H = isMobile ? 240 : 260
  const m = isMobile ? { t: 14, r: 58, b: 64, l: 12 } : { t: 24, r: 16, b: 64, l: 50 }
  const baseBarW = isMobile ? 14 : 18
  const baseGap = isMobile ? 8 : 10
  const minW = m.l + m.r + Math.max(0, data.length * baseBarW + Math.max(0, data.length - 1) * baseGap)
  const containerW = Math.max(1, width || 320)
  const wrap = minW > containerW
  const W = wrap ? Math.max(minW, containerW) : containerW
  const innerW = W - m.l - m.r
  const innerH = H - m.t - m.b
  const n = data.length
  const gap = Math.min(isMobile ? 14 : 20, Math.max(isMobile ? 6 : 8, innerW / Math.max(1, n) / 5))
  const barW = n > 0 ? Math.max(isMobile ? 8 : 14, (innerW - gap * (n - 1)) / n) : 0
  const y = (v: number) => m.t + innerH * (1 - Math.max(0, Math.min(maxValue, v)) / maxValue)
  const x = (i: number) => m.l + i * (barW + gap)
  const ticks = tickValues && tickValues.length ? tickValues : [0, maxValue / 2, maxValue]
  const labelEvery = isMobile ? (n > 16 ? 4 : n > 8 ? 2 : 1) : 1
  const labelRotate = isMobile && n > 6 ? -45 : 0
  return (
    <div ref={ref} className={`w-full ${wrap ? 'overflow-x-auto pr-2' : ''} flex justify-center`}>
      <svg width={W} height={H} role="img">
        <rect x="0" y="0" width={W} height={H} fill="#fff" />
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="#e5e7eb" strokeWidth={isMobile ? 1 : 1.5} />
            {isMobile ? (
              <text x={W - m.r + 8} y={y(t)} textAnchor="start" dominantBaseline="middle" fontSize={12} fill="#6b7280" fontWeight={700}>{formatY(t)}</text>
            ) : (
              <text x={m.l - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={14} fill="#374151" fontWeight={700}>{formatY(t)}</text>
            )}
          </g>
        ))}
        {isMobile && <line x1={W - m.r} x2={W - m.r} y1={m.t} y2={H - m.b} stroke="#e5e7eb" strokeWidth="1" />}
        {data.map((d, i) => (
          <g key={d.key} transform={`translate(${x(i)},0)`}>
            <rect x="0" y={y(d.value)} width={barW} height={m.t + innerH - y(d.value)} rx={isMobile ? 6 : 9} fill={color} />
            {!isMobile && (
              <text x={barW / 2} y={y(d.value) - (isMobile ? 6 : 10)} textAnchor="middle" fontSize={isMobile ? 12 : 14} fill="#111827" fontWeight={800}>{formatBar(d.value)}</text>
            )}
            {(i % labelEvery === 0) && (
              <g transform={`translate(${barW / 2},${H - m.b + (isMobile ? 28 : 26)}) rotate(${labelRotate})`}>
                <text textAnchor={labelRotate ? 'end' : 'middle'} fontSize={isMobile ? 12 : 13} fill="#111827" fontWeight={600}>{d.label}</text>
              </g>
            )}
          </g>
        ))}
        <line x1={m.l} x2={W - m.r} y1={m.t + innerH} y2={m.t + innerH} stroke="#111827" strokeWidth={isMobile ? 1.25 : 1.75} />
      </svg>
    </div>
  )
}

function GroupedBarChart({
  data,
  series,
  maxValue,
  tickValues,
  formatY,
}: {
  data: { key: string; label: string; values: Record<string, number | null> }[]
  series: { key: string; label: string; color: string; format: (v: number) => string }[]
  maxValue: number
  tickValues?: number[]
  formatY: (v: number) => string
}) {
  const { ref, width } = useMeasure<HTMLDivElement>()
  const isMobile = (width || 0) < 640
  const H = isMobile ? 280 : 300
  const m = isMobile ? { t: 22, r: 16, b: 90, l: 50 } : { t: 28, r: 16, b: 70, l: 50 }
  const baseBarW = isMobile ? 18 : 14
  const baseGap = isMobile ? 10 : 6
  const groupGapBase = isMobile ? 16 : 22
  const groups = data.length
  const barsPerGroup = series.length
  const groupWBase = barsPerGroup * baseBarW + (barsPerGroup - 1) * baseGap
  const neededInner = Math.max(1, groups) * groupWBase + Math.max(0, groups - 1) * groupGapBase
  const minW = m.l + m.r + neededInner
  const containerW = Math.max(1, width || 320)
  const wrap = minW > containerW
  const W = wrap ? Math.max(minW, containerW) : containerW
  const innerW = W - m.l - m.r
  const innerH = H - m.t - m.b
  const groupGap = Math.min(groupGapBase, Math.max(isMobile ? 10 : 12, innerW / Math.max(1, groups) / 6))
  const groupW = groups > 0 ? (innerW - groupGap * (groups - 1)) / groups : 0
  const barGap = Math.min(baseGap, Math.max(4, groupW / Math.max(1, barsPerGroup) / 6))
  const barW = barsPerGroup > 0 ? Math.max(isMobile ? 12 : 10, (groupW - barGap * (barsPerGroup - 1)) / barsPerGroup) : 0
  const y = (v: number) => m.t + innerH * (1 - Math.max(0, Math.min(maxValue, v)) / maxValue)
  const xGroup = (i: number) => m.l + i * (groupW + groupGap)
  const ticks = tickValues && tickValues.length ? tickValues : [0, maxValue / 2, maxValue]
  return (
    <div ref={ref} className={`w-full ${wrap ? 'overflow-x-auto pr-2' : ''} flex justify-center`}>
      <svg width={W} height={H} role="img">
        <rect x="0" y="0" width={W} height={H} fill="#fff" />
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="#e5e7eb" strokeWidth={isMobile ? 1.25 : 1.5} />
            <text x={m.l - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={isMobile ? 12 : 14} fill="#374151" fontWeight={700}>{formatY(t)}</text>
          </g>
        ))}
        {data.map((d, i) => (
          <g key={d.key} transform={`translate(${xGroup(i)},0)`}>
            {series.map((s, j) => {
              const v = d.values[s.key]
              const x = j * (barW + barGap)
              const h = v == null ? 0 : m.t + innerH - y(v)
              const yTop = v == null ? y(0) : y(v)
              return (
                <g key={s.key} transform={`translate(${x},0)`}>
                  <rect x="0" y={yTop} width={barW} height={h} rx={isMobile ? 7 : 8} fill={s.color} />
                  {v != null && (
                    <text x={barW / 2} y={yTop - (isMobile ? 6 : 10)} textAnchor="middle" fontSize={isMobile ? 11 : 12} fill="#111827" fontWeight={800}>{s.format(v)}</text>
                  )}
                </g>
              )
            })}
            <text x={groupW / 2} y={H - m.b + (isMobile ? 34 : 28)} textAnchor="middle" fontSize={isMobile ? 12 : 13} fill="#111827" fontWeight={700}>{d.label}</text>
          </g>
        ))}
        <line x1={m.l} x2={W - m.r} y1={m.t + innerH} y2={m.t + innerH} stroke="#111827" strokeWidth={isMobile ? 1.5 : 1.75} />
        <g transform={`translate(${m.l},${H - (isMobile ? 18 : 26)})`}>
          {series.map((s, i) => (
            <g key={s.key} transform={`translate(${i * (isMobile ? 100 : 120)},0)`}>
              <rect x="0" y={isMobile ? -10 : -12} width={isMobile ? 12 : 14} height={isMobile ? 12 : 14} rx="3" fill={s.color} />
              <text x={isMobile ? 18 : 20} y={isMobile ? 0 : -1} fontSize={isMobile ? 12 : 13} fill="#111827" fontWeight={700}>{s.label}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}

function CompactBar({
  data,
  color,
  maxValue,
  tickValues,
  formatY,
  formatBar,
}: {
  data: { key: string; label: string; value: number }[]
  color: string
  maxValue: number
  tickValues?: number[]
  formatY: (v: number) => string
  formatBar: (v: number) => string
}) {
  const { ref, width } = useMeasure<HTMLDivElement>()
  const H = 220
  const m = { t: 16, r: 58, b: 70, l: 12 }
  const baseBarW = 16
  const baseGap = 8
  const minW = m.l + m.r + Math.max(0, data.length * baseBarW + Math.max(0, data.length - 1) * baseGap)
  const containerW = Math.max(1, width || 300)
  const wrap = minW > containerW
  const W = wrap ? Math.max(minW, containerW) : containerW
  const innerW = W - m.l - m.r
  const innerH = H - m.t - m.b
  const n = data.length
  const gap = Math.min(16, Math.max(6, innerW / Math.max(1, n) / 5))
  const barW = n > 0 ? Math.max(8, (innerW - gap * (n - 1)) / n) : 0
  const y = (v: number) => m.t + innerH * (1 - Math.max(0, Math.min(maxValue, v)) / maxValue)
  const x = (i: number) => m.l + i * (barW + gap)
  const ticks = tickValues && tickValues.length ? tickValues : [0, maxValue / 2, maxValue]
  const labelEvery = n > 16 ? 4 : n > 8 ? 2 : 1
  const labelRotate = n > 6 ? -45 : 0
  return (
    <div ref={ref} className={`w-full ${wrap ? 'overflow-x-auto pr-2' : ''} flex justify-center`}>
      <svg width={W} height={H} role="img">
        <rect x="0" y="0" width={W} height={H} fill="#fff" />
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="#e5e7eb" strokeWidth="1.25" />
            <text x={W - m.r + 8} y={y(t)} textAnchor="start" dominantBaseline="middle" fontSize={12} fill="#6b7280" fontWeight={700}>{formatY(t)}</text>
          </g>
        ))}
        <line x1={W - m.r} x2={W - m.r} y1={m.t} y2={H - m.b} stroke="#e5e7eb" strokeWidth="1" />
        {data.map((d, i) => (
          <g key={d.key} transform={`translate(${x(i)},0)`}>
            <rect x="0" y={y(d.value)} width={barW} height={m.t + innerH - y(d.value)} rx={6} fill={color} />
            <g transform={`translate(${barW / 2},${H - m.b + 32}) rotate(${labelRotate})`}>
              {(i % labelEvery === 0) && <text textAnchor={labelRotate ? 'end' : 'middle'} fontSize={12} fill="#111827" fontWeight={600}>{d.label}</text>}
            </g>
          </g>
        ))}
        <line x1={m.l} x2={W - m.r} y1={m.t + innerH} y2={m.t + innerH} stroke="#111827" strokeWidth="1.5" />
      </svg>
    </div>
  )
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export default function HealthReport() {
  const nav = useNavigate()
  const location = useLocation()
  const [uid, setUid] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [groupBy, setGroupBy] = useState<'day' | 'month' | 'year'>('day')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user
      if (!u) {
        nav('/login')
        return
      }
      setUid(u.id)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user
      if (!u) {
        nav('/login')
        return
      }
      setUid(u.id)
    })
    return () => data.subscription.unsubscribe()
  }, [nav])

  useEffect(() => {
    if (!uid) return
    let alive = true
    const run = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('wellness_scores')
        .select('day,topic,score,raw_points,max_points,user_id')
        .eq('user_id', uid)
        .order('day', { ascending: true })
      if (!alive) return
      if (error) {
        setRows([])
        setLoading(false)
        return
      }
      const parsed: Row[] = (data ?? []).map((r: any) => ({
        day: String(r.day),
        topic: r.topic as Topic | string,
        score: Number(r.score),
        raw_points: r.raw_points == null ? null : Number(r.raw_points),
        max_points: r.max_points == null ? null : Number(r.max_points),
      }))
      setRows(parsed)
      setLoading(false)
    }
    run()
    return () => {
      alive = false
    }
  }, [uid])

  useEffect(() => {
    if (!rows.length) return
    const hash = location.hash.replace(/^#/, '')
    if (!hash) return
    const tryScroll = () => {
      const el = document.getElementById(hash)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      else requestAnimationFrame(tryScroll)
    }
    requestAnimationFrame(tryScroll)
  }, [location.hash, rows, groupBy])

  const seriesByTopic = useMemo(() => {
    const topicsOnly = rows.filter(r => (TOPICS as string[]).includes(r.topic as string))
    const map: Record<Topic, Map<string, { sum: number; count: number; date: Date }>> = Object.fromEntries(TOPICS.map(t => [t, new Map()])) as any
    for (const r of topicsOnly) {
      const d = parseISODate(r.day)
      const rep = groupBy === 'day' ? d : groupBy === 'month' ? startOfMonth(d) : startOfYear(d)
      const k = keyForDate(rep, groupBy)
      const isFF = r.topic === 'Functional Food'
      const value = isFF ? Math.max(0, Math.min(400, r.raw_points ?? Math.round(r.score * 400))) : Math.max(0, Math.min(1, r.score))
      const slot = map[r.topic as Topic].get(k)
      if (slot) {
        slot.sum += value
        slot.count += 1
      } else {
        map[r.topic as Topic].set(k, { sum: value, count: 1, date: rep })
      }
    }
    const out: Record<Topic, { key: string; label: string; value: number; date: Date }[]> = {} as any
    for (const t of TOPICS) {
      const arr = Array.from(map[t].entries()).map(([k, v]) => ({
        key: k,
        label: labelForKey(k, groupBy),
        value: v.sum / v.count,
        date: v.date,
      }))
      arr.sort((a, b) => a.date.getTime() - b.date.getTime())
      out[t] = arr
    }
    return out
  }, [rows, groupBy])

  const visionGrouped = useMemo(() => {
    const catMap: Record<string, string[]> = {
      overall: ['Vision Wellness', 'Vision Wellness: Overall'],
      prescription: ['Vision Wellness: Prescription', 'Vision Rx', 'Prescription'],
      acuity: ['Vision Wellness: Acuity', 'Visual Acuity', 'Acuity'],
      osdi: ['Vision Wellness: OSDI', 'OSDI', 'Dry Eye OSDI'],
    }
    const categories = Object.keys(catMap)
    const points = new Map<string, { date: Date; label: string; values: Record<string, { sum: number; count: number }> }>()
    for (const r of rows) {
      let cat: string | null = null
      for (const k of categories) {
        if (catMap[k].includes(r.topic as string)) {
          cat = k
          break
        }
      }
      if (!cat) continue
      const d = parseISODate(r.day)
      const rep = groupBy === 'day' ? d : groupBy === 'month' ? startOfMonth(d) : startOfYear(d)
      const key = keyForDate(rep, groupBy)
      const label = labelForKey(key, groupBy)
      const slot = points.get(key) || { date: rep, label, values: {} as any }
      const vslot = slot.values[cat] || { sum: 0, count: 0 }
      vslot.sum += Math.max(0, Math.min(1, r.score))
      vslot.count += 1
      slot.values[cat] = vslot
      points.set(key, slot)
    }
    const arr = Array.from(points.entries())
      .map(([key, s]) => {
        const values: Record<string, number | null> = { overall: null, prescription: null, acuity: null, osdi: null }
        for (const k of Object.keys(s.values)) {
          values[k] = s.values[k].sum / s.values[k].count
        }
        return { key, label: s.label, date: s.date, values }
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime())
    return arr
  }, [rows, groupBy])

  const hasAny = rows.length > 0

  const visionSeriesMobile = useMemo(() => {
    const mk = (k: 'overall' | 'prescription' | 'acuity' | 'osdi') =>
      visionGrouped.map(d => ({ key: d.key, label: d.label, value: d.values[k] == null ? 0 : d.values[k]! }))
    return {
      overall: mk('overall'),
      prescription: mk('prescription'),
      acuity: mk('acuity'),
      osdi: mk('osdi'),
    }
  }, [visionGrouped])

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--brand)]">Health Report</h1>
        <div className="flex items-center gap-2">
          <select
            className="border rounded-xl px-3 py-2.5 bg-white text-base font-semibold"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
          >
            <option value="day">Day</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
        </div>
      </div>

      {!hasAny && !loading && <div className="mt-8 text-gray-700 text-lg">No data yet.</div>}

      {loading && <div className="mt-8 text-gray-700 text-lg">Loading…</div>}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        {TOPICS.map((t) => {
          const isFF = t === 'Functional Food'
          const isVision = t === 'Vision Wellness'
          const data = seriesByTopic[t] || []
          return (
            <div key={t} id={slug(t)} className="scroll-mt-24">
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xl font-bold">{t}</div>
                  <div className="text-base text-gray-700 font-semibold"></div>
                </div>
                {isVision ? (
                  visionGrouped.length ? (
                    <>
                      <div className="hidden md:block">
                        <GroupedBarChart
                          data={visionGrouped.map(d => ({ key: d.key, label: d.label, values: d.values }))}
                          series={[
                            { key: 'overall', label: 'Overall', color: '#E63423', format: (v) => `${Math.round(v * 100)}%` },
                            { key: 'prescription', label: 'Prescription', color: '#6366F1', format: (v) => `${Math.round(v * 100)}%` },
                            { key: 'acuity', label: 'Visual Acuity', color: '#22C55E', format: (v) => `${Math.round(v * 100)}%` },
                            { key: 'osdi', label: 'OSDI', color: '#F59E0B', format: (v) => `${Math.round(v * 100)}%` },
                          ]}
                          maxValue={1}
                          tickValues={[0, 0.5, 1]}
                          formatY={(v) => `${Math.round(v * 100)}%`}
                        />
                      </div>
                      <div className="md:hidden grid grid-cols-1 gap-6">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-3 h-3 rounded" style={{ backgroundColor: '#E63423' }} />
                            <span className="text-sm font-semibold">Overall</span>
                          </div>
                          <CompactBar
                            data={visionSeriesMobile.overall}
                            color="#E63423"
                            maxValue={1}
                            tickValues={[0, 0.5, 1]}
                            formatY={(v) => `${Math.round(v * 100)}%`}
                            formatBar={(v) => `${Math.round(v * 100)}%`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-3 h-3 rounded" style={{ backgroundColor: '#6366F1' }} />
                            <span className="text-sm font-semibold">Prescription</span>
                          </div>
                          <CompactBar
                            data={visionSeriesMobile.prescription}
                            color="#6366F1"
                            maxValue={1}
                            tickValues={[0, 0.5, 1]}
                            formatY={(v) => `${Math.round(v * 100)}%`}
                            formatBar={(v) => `${Math.round(v * 100)}%`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-3 h-3 rounded" style={{ backgroundColor: '#22C55E' }} />
                            <span className="text-sm font-semibold">Visual Acuity</span>
                          </div>
                          <CompactBar
                            data={visionSeriesMobile.acuity}
                            color="#22C55E"
                            maxValue={1}
                            tickValues={[0, 0.5, 1]}
                            formatY={(v) => `${Math.round(v * 100)}%`}
                            formatBar={(v) => `${Math.round(v * 100)}%`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-3 h-3 rounded" style={{ backgroundColor: '#F59E0B' }} />
                            <span className="text-sm font-semibold">OSDI</span>
                          </div>
                          <CompactBar
                            data={visionSeriesMobile.osdi}
                            color="#F59E0B"
                            maxValue={1}
                            tickValues={[0, 0.5, 1]}
                            formatY={(v) => `${Math.round(v * 100)}%`}
                            formatBar={(v) => `${Math.round(v * 100)}%`}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-600 text-sm">No data for selected grouping.</div>
                  )
                ) : (
                  <>
                    {data.length ? (
                      <BarChart
                        data={data.map(d => ({ key: d.key, label: d.label, value: d.value }))}
                        color={TOPIC_COLORS[t]}
                        maxValue={isFF ? 400 : 1}
                        tickValues={isFF ? [0, 100, 200, 300, 400] : [0, 0.5, 1]}
                        formatY={(v) => (isFF ? `${Math.round(v)}` : `${Math.round(v * 100)}%`)}
                        formatBar={(v) => (isFF ? `${Math.round(v)}` : `${Math.round(v * 100)}%`)}
                      />
                    ) : (
                      <div className="text-gray-600 text-sm">No data for selected grouping.</div>
                    )}
                  </>
                )}
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}