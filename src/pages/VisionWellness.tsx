import React, { useMemo, useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import { supabase } from '../lib/supabase'

type EyeVals = { sph: string; cyl: string; axis: string; add: string }
type RxVals = { od: EyeVals; os: EyeVals; pd: string }

const moreIsBetter = (x: number, k = 2) => (x <= 0 ? 0 : Math.min(1, x / (x + k)))
const lessIsBetter = (x: number, k = 2) => 1 - moreIsBetter(x, k)
const inRange = (x: number, lo: number, hi: number) => {
  if (!isFinite(x)) return 0
  if (x < lo) return Math.max(0, Math.min(1, x / lo)) * 0.8
  if (x > hi) return Math.max(0, Math.min(1, hi / x)) * 0.8
  return 1
}

function safeNumber(val: string) {
  return val.trim() === '' ? null : Number(val)
}

function scorePrescription(rx: RxVals): number {
  const sphOD = safeNumber(rx.od.sph)
  const sphOS = safeNumber(rx.os.sph)
  const cylOD = safeNumber(rx.od.cyl)
  const cylOS = safeNumber(rx.os.cyl)
  const pd = safeNumber(rx.pd)
  const parts: number[] = []
  if (sphOD !== null && sphOS !== null) parts.push((lessIsBetter(Math.abs(sphOD), 1) + lessIsBetter(Math.abs(sphOS), 1)) / 2)
  if (cylOD !== null && cylOS !== null) parts.push((lessIsBetter(Math.abs(cylOD), 0.75) + lessIsBetter(Math.abs(cylOS), 0.75)) / 2)
  if (pd !== null) parts.push(inRange(pd, 60, 66))
  if (!parts.length) return 0
  return Math.max(0, Math.min(1, parts.reduce((a, b) => a + b, 0) / parts.length))
}

type SnellenLine = { label: string; letters: string; fontSize: number }
const SNELLEN: SnellenLine[] = [
  { label: '20/160', letters: 'EKA', fontSize: 38.4 },
  { label: '20/125', letters: 'CZHS', fontSize: 32 },
  { label: '20/100', letters: 'KSRNH', fontSize: 27.2 },
  { label: '20/80', letters: 'DVKHCR', fontSize: 23.2 },
  { label: '20/60', letters: 'NSDVCHO', fontSize: 20 },
  { label: '20/50', letters: 'DCNKOHRS', fontSize: 17.6 },
  { label: '20/40', letters: 'HUDKSCRONV', fontSize: 15.2 },
  { label: '20/30', letters: 'OAHVZCKLDBSR', fontSize: 12.8 },
  { label: '20/25', letters: 'NVGRBHOEAKCMPS', fontSize: 11.2 },
  { label: '20/20', letters: 'PKVNTNUHARXMBJEDCIO', fontSize: 9.6 },
  { label: '20/16', letters: 'JXRAPMWYOFCHGVSNLUTKD', fontSize: 8 },
]

function lineToDecimal(label: string) {
  const m = label.match(/20\/(\d+)/)
  if (!m) return 0
  const den = Number(m[1])
  if (!isFinite(den) || den <= 0) return 0
  return Math.min(1, 20 / den)
}

function sanitizeLetters(s: string) {
  return s.toUpperCase().replace(/[^A-Z]/g, '')
}

function compareCount(input: string, target: string) {
  const a = sanitizeLetters(input)
  const b = sanitizeLetters(target)
  const L = Math.min(a.length, b.length)
  let correct = 0
  for (let i = 0; i < L; i++) if (a[i] === b[i]) correct++
  const total = b.length
  const acc = total ? correct / total : 0
  return { correct, total, acc }
}

function decodeVoiceToLetters(raw: string) {
  let t = raw.toLowerCase()
  t = t.replace(/\bx ray\b/g, 'xray').replace(/\bx-ray\b/g, 'xray').replace(/\bdouble u\b/g, 'doubleu')
  const map: Record<string, string> = {
    alpha: 'A', alfa: 'A', a: 'A',
    bravo: 'B', b: 'B', bee: 'B', be: 'B',
    charlie: 'C', c: 'C', sea: 'C', see: 'C', cee: 'C',
    delta: 'D', d: 'D', dee: 'D',
    echo: 'E', e: 'E',
    foxtrot: 'F', f: 'F', eff: 'F',
    golf: 'G', g: 'G', gee: 'G',
    hotel: 'H', h: 'H', aitch: 'H',
    india: 'I', i: 'I', eye: 'I',
    juliet: 'J', juliett: 'J', j: 'J', jay: 'J',
    kilo: 'K', k: 'K', kay: 'K',
    lima: 'L', l: 'L', el: 'L',
    mike: 'M', m: 'M', em: 'M',
    november: 'N', n: 'N', en: 'N',
    oscar: 'O', o: 'O', oh: 'O', owe: 'O',
    papa: 'P', p: 'P', pee: 'P',
    quebec: 'Q', q: 'Q', cue: 'Q', queue: 'Q',
    romeo: 'R', r: 'R', ar: 'R', are: 'R',
    sierra: 'S', s: 'S', ess: 'S',
    tango: 'T', t: 'T', tee: 'T', tea: 'T',
    uniform: 'U', u: 'U', you: 'U',
    victor: 'V', v: 'V', vee: 'V',
    whiskey: 'W', whisky: 'W', w: 'W', doubleu: 'W',
    xray: 'X', x: 'X', ex: 'X',
    yankee: 'Y', y: 'Y', why: 'Y',
    zulu: 'Z', z: 'Z', zee: 'Z', zed: 'Z'
  }
  const tokens = t.split(/\s+/).filter(Boolean)
  let out = ''
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i].replace(/[^a-z]/g, '')
    if (!tok) continue
    const letter = map[tok]
    if (letter) out += letter
    else out += sanitizeLetters(tok)
  }
  return sanitizeLetters(out)
}

const todayLocalISO = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const OSDI_QUESTIONS = [
  'Have you experienced eyes that are sensitive to light during the last week?',
  'Have you experienced eyes that feel gritty during the last week?',
  'Have you experienced painful or sore eyes during the last week?',
  'Have you experienced blurred vision during the last week?',
  'Have you experienced poor vision during the last week?',
  'Have you had any vision problems when reading (non-digital) in the past week?',
  'Have you had any vision problems when driving at night in the past week?',
  'Have you had any vision problems when working with a computer or bank machine (ATM) in the past week?',
  'Have you had any vision problems when watching TV in the past week?',
  'Have your eyes felt uncomfortable in windy areas?',
  'Have your eyes felt uncomfortable in places with low humidity (very dry)?',
  'Have your eyes felt uncomfortable in areas that had air conditioning?'
]

export default function VisionWellness() {
  const nav = useNavigate()
  const [rx, setRx] = useState<RxVals>({ od: { sph: '', cyl: '', axis: '', add: '' }, os: { sph: '', cyl: '', axis: '', add: '' }, pd: '' })
  const [started, setStarted] = useState(false)
  const [idx, setIdx] = useState(0)
  const idxRef = useRef(0)
  useEffect(() => { idxRef.current = idx }, [idx])
  const [answer, setAnswer] = useState('')
  const [best, setBest] = useState<number | null>(null)
  const [messages, setMessages] = useState<string[]>([])
  const [lettersCorrect, setLettersCorrect] = useState(0)
  const [lettersTotal, setLettersTotal] = useState(0)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<any | null>(null)
  const committedRef = useRef('')
  const submittingRef = useRef(false)
  const [osdi, setOsdi] = useState<Array<number | null>>(Array(12).fill(null))

  const rxScore = useMemo(() => scorePrescription(rx), [rx])
  const acuityScore = useMemo(() => (best === null ? 0 : lineToDecimal(SNELLEN[best].label)), [best])
  const osdiScore = useMemo(() => {
    const present = osdi.filter((v) => v !== null) as number[]
    if (!present.length) return 0
    const bounded = present.map((s) => Math.max(1, Math.min(8, s)))
    const wellness = bounded.map((s) => (9 - s) / 8)
    return Math.max(0, Math.min(1, wellness.reduce((a, b) => a + b, 0) / wellness.length))
  }, [osdi])
  const overall = useMemo(() => Math.max(0, Math.min(1, (rxScore + acuityScore + osdiScore) / 3)), [rxScore, acuityScore, osdiScore])

  const makeRecognizer = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recog = new SR()
    recognitionRef.current = recog
    recog.lang = 'en-US'
    recog.interimResults = true
    recog.continuous = true
    recog.maxAlternatives = 1
    recog.onresult = (e: any) => {
      let interim = ''
      let final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        const txt = r[0]?.transcript || ''
        if (r.isFinal) final += txt + ' '
        else interim += txt + ' '
      }
      if (final) committedRef.current += final
      const letters = decodeVoiceToLetters(committedRef.current + interim)
      setAnswer(letters)
    }
    recog.onerror = () => {
      if (listening) {
        try { recog.stop() } catch {}
        setListening(false)
      }
    }
    recog.onend = () => {
      if (listening) {
        try { recog.start() } catch {}
      }
    }
    return recog
  }

  const startRecognition = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Voice input is not supported in this browser.'); return }
    const r = makeRecognizer()
    try {
      r.start()
      setListening(true)
    } catch {
      setListening(false)
    }
  }

  const restartVoiceSession = () => {
    if (!listening) return
    committedRef.current = ''
    setAnswer('')
    const old = recognitionRef.current
    if (old) {
      old.onend = () => {
        const r = makeRecognizer()
        try { r.start() } catch {}
      }
      try { old.stop() } catch {}
    } else {
      const r = makeRecognizer()
      try { r.start() } catch {}
    }
  }

  const startTest = () => {
    setStarted(true)
    setIdx(0)
    setAnswer('')
    setBest(null)
    setMessages([])
    setLettersCorrect(0)
    setLettersTotal(0)
    committedRef.current = ''
  }

  const doSubmitWith = (inputText: string) => {
    const line = SNELLEN[idxRef.current]
    const { correct, total, acc } = compareCount(inputText, line.letters)
    const pass = acc >= 0.8
    setLettersCorrect((v) => v + correct)
    setLettersTotal((v) => v + total)
    setMessages((m) => [...m, `${line.label}: ${pass ? 'pass' : 'recorded'} (${Math.round(acc * 100)}%)`])
    if (pass) setBest((prev) => (prev === null || idxRef.current > prev ? idxRef.current : prev))
    setAnswer('')
    committedRef.current = ''
    setIdx((prev) => Math.min(prev + 1, SNELLEN.length - 1))
    restartVoiceSession()
  }

  const submitLine = () => {
    if (submittingRef.current) return
    submittingRef.current = true
    const a = answer
    const r = recognitionRef.current
    if (r) {
      try { r.onresult = null } catch {}
      try { r.stop() } catch {}
    }
    committedRef.current = ''
    setAnswer('')
    doSubmitWith(a)
    setTimeout(() => { submittingRef.current = false }, 0)
  }

  const cantRead = () => {
    if (idx === 0) setMessages((m) => [...m, `${SNELLEN[idx].label}: cannot read`])
  }

  const saveScore = async () => {
    const { data: s } = await supabase.auth.getSession()
    if (!s.session?.user) { nav('/login'); return }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    const toSave = [
      { topic: 'Vision Wellness', score: overall },
      { topic: 'Vision Wellness: Prescription', score: rxScore },
      { topic: 'Vision Wellness: Acuity', score: acuityScore },
      { topic: 'Vision Wellness: OSDI', score: osdiScore },
    ]
    for (const row of toSave) {
      const { error } = await supabase.rpc('api_upsert_wellness_score', {
        p_topic: row.topic,
        p_score: row.score,
        p_raw_points: null,
        p_max_points: null,
        p_day: null,
        p_tz: tz
      })
      if (error) { alert(`Save failed: ${error.message}`); return }
    }
    try { window.history.scrollRestoration = 'manual' } catch {}
    try { sessionStorage.setItem('forceScrollTop', '1') } catch {}
    nav('/', { replace: true, state: { scrollToTop: Date.now() } })
  }

  const toggleVoice = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Voice input is not supported in this browser.'); return }
    if (listening) {
      setListening(false)
      try { recognitionRef.current?.stop() } catch {}
      return
    }
    startRecognition()
  }

  const current = SNELLEN[idx]
  const fs = current.fontSize
  const vwBase = Math.max(2.2, Math.min(9, 100 / (current.letters.length + 3)))
  const dynSize = `clamp(10px, ${vwBase}vw, ${fs}px)`
  const dynSizeBig = `clamp(12px, ${Math.min(vwBase + 3, 12)}vw, ${fs * 1.35}px)`

  return (
    <div className="w-full overflow-x-hidden">
      <div className="max-w-screen-md md:max-w-4xl lg:max-w-5xl mx-auto grid gap-6 px-4 sm:px-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand)] break-words">Vision Wellness</h1>

        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-lg sm:text-xl font-semibold">Prescription Entry</h2>
            <div className="text-sm text-gray-600">
              Score: <span className="font-bold">{Math.round(rxScore * 100)}%</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div>
              <div className="font-semibold mb-2">Right Eye (O.D.)</div>
              <div className="grid grid-cols-2 gap-2">
                <input className="border rounded-lg px-3 py-2 w-full" placeholder="SPH" value={rx.od.sph} onChange={(e) => setRx({ ...rx, od: { ...rx.od, sph: e.target.value } })} />
                <input className="border rounded-lg px-3 py-2 w-full" placeholder="CYL" value={rx.od.cyl} onChange={(e) => setRx({ ...rx, od: { ...rx.od, cyl: e.target.value } })} />
                <input className="border rounded-lg px-3 py-2 w-full" placeholder="AXIS" value={rx.od.axis} onChange={(e) => setRx({ ...rx, od: { ...rx.od, axis: e.target.value } })} />
                <input className="border rounded-lg px-3 py-2 w-full" placeholder="ADD" value={rx.od.add} onChange={(e) => setRx({ ...rx, od: { ...rx.od, add: e.target.value } })} />
              </div>
            </div>

            <div>
              <div className="font-semibold mb-2">Left Eye (O.S.)</div>
              <div className="grid grid-cols-2 gap-2">
                <input className="border rounded-lg px-3 py-2 w-full" placeholder="SPH" value={rx.os.sph} onChange={(e) => setRx({ ...rx, os: { ...rx.os, sph: e.target.value } })} />
                <input className="border rounded-lg px-3 py-2 w-full" placeholder="CYL" value={rx.os.cyl} onChange={(e) => setRx({ ...rx, os: { ...rx.os, cyl: e.target.value } })} />
                <input className="border rounded-lg px-3 py-2 w-full" placeholder="AXIS" value={rx.os.axis} onChange={(e) => setRx({ ...rx, os: { ...rx.os, axis: e.target.value } })} />
                <input className="border rounded-lg px-3 py-2 w-full" placeholder="ADD" value={rx.os.add} onChange={(e) => setRx({ ...rx, os: { ...rx.os, add: e.target.value } })} />
              </div>
            </div>
          </div>

          <div className="mt-3">
            <div className="font-semibold mb-1">PD (Pupillary Distance)</div>
            <input className="border rounded-lg px-3 py-2 w-40" placeholder="e.g., 63" value={rx.pd} onChange={(e) => setRx({ ...rx, pd: e.target.value })} />
          </div>
        </Card>

        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-lg sm:text-xl font-semibold">Visual Acuity Test</h2>
            <div className="text-sm text-gray-600">
              Score: <span className="font-bold">{lettersCorrect}/{lettersTotal}</span>
            </div>
          </div>

          {!started ? (
            <div className="mt-4">
              <p className="text-gray-600">Stand at the distance shown for each line and read the letters aloud, then type them below.</p>
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <div className="w-full sm:w-auto"><Button onClick={startTest} style={{ width: '100%' }}>Start Test</Button></div>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid gap-4">
              <div className="text-center w-full max-w-full overflow-x-hidden mx-auto">
                <div className="text-gray-500 text-sm mb-2">{current.label}</div>
                {current.label === '20/160' ? (
                  <div className="font-extrabold select-none flex flex-wrap justify-center items-end gap-1 sm:gap-2" style={{ lineHeight: 1.1 }}>
                    <span style={{ fontSize: dynSizeBig, display: 'inline-block' }}>E</span>
                    <span style={{ fontSize: dynSize, display: 'inline-block' }}>K</span>
                    <span style={{ fontSize: dynSize, display: 'inline-block' }}>A</span>
                  </div>
                ) : (
                  <div className="font-extrabold select-none text-center tracking-normal" style={{ fontSize: dynSize, lineHeight: 1.1, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {current.letters}
                  </div>
                )}
              </div>

              <div className="grid gap-3">
                <textarea
                  className="border rounded-lg px-3 py-3 w-full h-24 text-lg sm:text-2xl md:text-3xl md:tracking-widest font-mono"
                  placeholder="Type the letters"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault() } }}
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-2">
                  <div className="col-span-2 sm:col-span-1">
                    <Button
                      onClick={() => {
                        const cleaned = answer.trim()
                        if (cleaned.length > 0) {
                          submitLine()
                        }
                        setAnswer('')
                        committedRef.current = ''
                      }}
                      style={{ width: '100%' }}
                    >
                      Submit
                    </Button>
                  </div>
                  <button className="w-full px-3 py-2 rounded-lg border font-semibold hover:bg-gray-50" onClick={() => { setIdx((p) => Math.min(p + 1, SNELLEN.length - 1)); setAnswer(''); committedRef.current = '' }}>Next Line</button>
                  <button className="w-full px-3 py-2 rounded-lg border font-semibold hover:bg-gray-50" onClick={cantRead}>Can’t read this</button>
                  <button className="w-full px-3 py-2 rounded-lg border font-semibold hover:bg-gray-50" onClick={startTest}>Restart</button>
                  <button
                    className={`w-full px-3 py-2 rounded-lg border font-semibold ${listening ? 'bg-red-500 text-white border-red-500' : 'hover:bg-gray-50'}`}
                    onClick={toggleVoice}
                    disabled={!started}
                    aria-pressed={listening}
                    title="Speak the letters"
                  >
                    {listening ? 'Listening…' : 'Voice'}
                  </button>
                </div>
              </div>

              {messages.length > 0 && (
                <div className="text-sm text-gray-600">
                  {messages.map((m, i) => <div key={i}>• {m}</div>)}
                </div>
              )}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-lg sm:text-xl font-semibold">OSDI</h2>
            <div className="text-sm text-gray-600">
              Score: <span className="font-bold">{Math.round(osdiScore * 100)}%</span>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600">Please answer on a scale from 1 to 8 (1 is lowest and 8 is highest).</div>
          <div className="mt-4 grid gap-4">
            {OSDI_QUESTIONS.map((q, i) => {
              const selected = osdi[i]
              return (
                <div key={i} className="grid gap-2">
                  <div className="font-medium">{q}</div>
                  <div className="flex flex-wrap gap-3">
                    {[1,2,3,4,5,6,7,8].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`min-w-[48px] h-12 px-4 py-3 rounded-2xl border text-base font-semibold ${selected === n ? 'border-[var(--brand)] bg-red-50 text-[var(--brand)]' : 'hover:bg-gray-50'}`}
                        onClick={() => {
                          const next = [...osdi]
                          next[i] = n
                          setOsdi(next)
                        }}
                        aria-pressed={selected === n}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-lg sm:text-xl font-semibold">Overall Vision Wellness</div>
            <div className="text-2xl font-extrabold">{Math.round(overall * 100)}%</div>
          </div>
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <div className="w-full sm:w-auto"><Button onClick={saveScore} style={{ width: '100%' }}>Save Vision Wellness Score</Button></div>
          </div>
        </Card>
      </div>
    </div>
  )
}