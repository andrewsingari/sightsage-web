import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'
import { supabase } from '../lib/supabase'

type Unit = 'cm' | 'imperial'
type WUnit = 'kg' | 'lb'

const TIMEZONES = [
  'Pacific/Honolulu','America/Anchorage','America/Los_Angeles','America/Denver','America/Chicago','America/New_York',
  'America/Toronto','America/Mexico_City','America/Bogota','America/Lima','America/Santiago','America/Sao_Paulo',
  'Atlantic/Reykjavik','Europe/Dublin','Europe/London','Europe/Lisbon','Europe/Madrid','Europe/Paris','Europe/Berlin',
  'Europe/Amsterdam','Europe/Stockholm','Europe/Oslo','Europe/Rome','Europe/Athens','Europe/Helsinki','Europe/Warsaw',
  'Europe/Moscow','Africa/Cairo','Africa/Johannesburg','Asia/Jerusalem','Asia/Dubai','Asia/Tehran','Asia/Karachi',
  'Asia/Kolkata','Asia/Dhaka','Asia/Jakarta','Asia/Bangkok','Asia/Singapore','Asia/Kuala_Lumpur','Asia/Hong_Kong',
  'Asia/Manila','Asia/Taipei','Asia/Seoul','Asia/Tokyo','Australia/Perth','Australia/Adelaide','Australia/Sydney',
  'Pacific/Auckland','UTC'
]

function cmToFtIn(cm: number) {
  if (!isFinite(cm)) return { ft: '', inch: '' }
  const totalIn = cm / 2.54
  const ft = Math.floor(totalIn / 12)
  const inch = Math.round((totalIn - ft * 12) * 10) / 10
  return { ft: String(ft), inch: String(inch) }
}
function ftInToCm(ftStr: string, inStr: string) {
  const ft = Number((ftStr || '0').replace(/[^\d.]/g, ''))
  const inch = Number((inStr || '0').replace(/[^\d.]/g, ''))
  if (!isFinite(ft) && !isFinite(inch)) return null
  const cm = (ft * 12 + inch) * 2.54
  return Math.round(cm * 10) / 10
}
function lbToKg(lb: number) {
  return Math.round(lb * 0.45359237 * 10) / 10
}
function kgToLb(kg: number) {
  return Math.round((kg / 0.45359237) * 10) / 10
}

export default function Profile() {
  const nav = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [gender, setGender] = useState('')
  const [age, setAge] = useState('')
  const [heightUnit, setHeightUnit] = useState<Unit>('cm')
  const [heightCm, setHeightCm] = useState('')
  const [heightFt, setHeightFt] = useState('')
  const [heightIn, setHeightIn] = useState('')
  const [weightUnit, setWeightUnit] = useState<WUnit>('kg')
  const [weightKg, setWeightKg] = useState('')
  const [weightLb, setWeightLb] = useState('')
  const [medications, setMedications] = useState('')
  const [tz, setTz] = useState<string>(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')

  useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(async ({ data, error }) => {
      if (!mounted) return
      if (error || !data.user) { nav('/login'); return }
      const u = data.user
      const meta: any = u.user_metadata || {}
      setName(String(meta.name ?? ''))
      setEmail(String(u.email ?? ''))
      setGender(String(meta.gender ?? ''))
      setAge(meta.age != null ? String(meta.age) : '')
      const hc = typeof meta.height_cm === 'number' ? meta.height_cm : (meta.height_cm ? Number(meta.height_cm) : null)
      if (hc && isFinite(hc)) {
        setHeightCm(String(hc))
        const { ft, inch } = cmToFtIn(hc)
        setHeightFt(ft)
        setHeightIn(inch)
      }
      const wk = typeof meta.weight_kg === 'number' ? meta.weight_kg : (meta.weight_kg ? Number(meta.weight_kg) : null)
      if (wk && isFinite(wk)) {
        setWeightKg(String(wk))
        setWeightLb(String(kgToLb(wk)))
      }
      setMedications(String(meta.medications ?? ''))
      const { data: p } = await supabase.from('profiles').select('tz,full_name,email').eq('id', u.id).maybeSingle()
      if (p?.tz) setTz(p.tz)
      if (p?.full_name && !meta.name) setName(p.full_name)
      if (p?.email && !u.email) setEmail(p.email)
      setLoading(false)
    })
    return () => { mounted = false }
  }, [nav])

  useEffect(() => {
    if (heightUnit === 'cm' && heightCm) {
      const n = Number(heightCm)
      if (isFinite(n)) {
        const { ft, inch } = cmToFtIn(n)
        setHeightFt(ft)
        setHeightIn(inch)
      }
    }
  }, [heightUnit, heightCm])

  useEffect(() => {
    if (weightUnit === 'kg' && weightKg) {
      const n = Number(weightKg)
      if (isFinite(n)) setWeightLb(String(kgToLb(n)))
    }
  }, [weightUnit, weightKg])

  const save = async () => {
    setSaving(true)
    const { data: userRes } = await supabase.auth.getUser()
    if (!userRes.user) { setSaving(false); nav('/login'); return }
    const uid = userRes.user.id
    const currentEmail = userRes.user.email ?? ''
    const outHeightCm =
      heightUnit === 'cm'
        ? (isFinite(Number(heightCm)) ? Number(heightCm) : null)
        : ftInToCm(heightFt, heightIn)
    const outWeightKg =
      weightUnit === 'kg'
        ? (isFinite(Number(weightKg)) ? Number(weightKg) : null)
        : (isFinite(Number(weightLb)) ? lbToKg(Number(weightLb)) : null)
    const payload: any = {
      data: {
        name,
        gender,
        age: age ? Number(age) : null,
        height_cm: outHeightCm,
        weight_kg: outWeightKg,
        medications,
      },
    }
    if (email && email !== currentEmail) payload.email = email
    const { error: authErr } = await supabase.auth.updateUser(payload)
    const { error: profErr } = await supabase.from('profiles').update({ full_name: name, email, tz }).eq('id', uid)
    setSaving(false)
    if (authErr) { alert(authErr.message); return }
    if (profErr) { alert(profErr.message); return }
    alert('Profile updated')
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto mt-4 px-6">
        <div className="text-center text-gray-600">Loading…</div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto mt-4 px-6">
      <h1 className="text-3xl font-bold text-center text-[var(--brand)] mb-4">Profile</h1>
      <Card>
        <div className="grid gap-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800">Full Name</label>
              <input
                type="text"
                placeholder="e.g., Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border rounded-lg p-3 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800">Email</label>
              <input
                type="email"
                placeholder="e.g., jane@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border rounded-lg p-3 w-full"
              />
              <p className="text-xs text-gray-500 mt-1">Changing email may require confirmation.</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="border rounded-lg p-3 bg-white w-full"
              >
                <option value="">Select gender</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800">Age</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="e.g., 34"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="border rounded-lg p-3 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800">Time Zone</label>
              <select
                value={tz}
                onChange={(e) => setTz(e.target.value)}
                className="border rounded-lg p-3 bg-white w-full"
              >
                {TIMEZONES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-semibold text-gray-800">Height</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`px-3 py-1.5 rounded-full border font-semibold ${heightUnit === 'cm' ? 'bg-black text-white border-black' : 'hover:bg-gray-50'}`}
                onClick={() => setHeightUnit('cm')}
              >
                Centimeters
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 rounded-full border font-semibold ${heightUnit === 'imperial' ? 'bg-black text-white border-black' : 'hover:bg-gray-50'}`}
                onClick={() => setHeightUnit('imperial')}
              >
                Feet/Inches
              </button>
            </div>
            {heightUnit === 'cm' ? (
              <div className="grid sm:grid-cols-3 gap-3">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g., 175"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="border rounded-lg p-3 w-full sm:col-span-1"
                />
              </div>
            ) : (
              <div className="grid sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Feet (e.g., 5)"
                  value={heightFt}
                  onChange={(e) => setHeightFt(e.target.value.replace(/[^\d]/g, ''))}
                  className="border rounded-lg p-3 w-full"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Inches (e.g., 8 or 8.5)"
                  value={heightIn}
                  onChange={(e) => setHeightIn(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="border rounded-lg p-3 w-full"
                />
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-semibold text-gray-800">Weight</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`px-3 py-1.5 rounded-full border font-semibold ${weightUnit === 'kg' ? 'bg-black text-white border-black' : 'hover:bg-gray-50'}`}
                onClick={() => setWeightUnit('kg')}
              >
                Kilograms
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 rounded-full border font-semibold ${weightUnit === 'lb' ? 'bg-black text-white border-black' : 'hover:bg-gray-50'}`}
                onClick={() => setWeightUnit('lb')}
              >
                Pounds
              </button>
            </div>
            {weightUnit === 'kg' ? (
              <div className="grid sm:grid-cols-3 gap-3">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g., 70"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="border rounded-lg p-3 w-full sm:col-span-1"
                />
              </div>
            ) : (
              <div className="grid sm:grid-cols-3 gap-3">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g., 154"
                  value={weightLb}
                  onChange={(e) => setWeightLb(e.target.value)}
                  className="border rounded-lg p-3 w-full sm:col-span-1"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800">Medical Conditions / General Health</label>
            <textarea
              placeholder="e.g., Seasonal allergies; taking antihistamines as needed"
              value={medications}
              onChange={(e) => setMedications(e.target.value)}
              className="border rounded-lg p-3 h-28 w-full"
            />
          </div>

          <div className="sticky bottom-3 bg-white/60 backdrop-blur rounded-xl p-2">
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}