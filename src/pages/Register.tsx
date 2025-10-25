import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import { supabase } from '../lib/supabase'

type Unit = 'cm' | 'imperial'
type WUnit = 'kg' | 'lb'

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

export default function Register() {
  const nav = useNavigate()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

  const handleRegister = async () => {
    if (!name || !email || !password || !gender || !age) {
      alert('Please fill in all required fields')
      return
    }
    if (password.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }
    const parsedAge = Number(age)
    if (!isFinite(parsedAge) || parsedAge <= 0) {
      alert('Please enter a valid age')
      return
    }
    const outHeightCm =
      heightUnit === 'cm'
        ? Number(heightCm)
        : ftInToCm(heightFt, heightIn)
    if (!isFinite(Number(outHeightCm)) || Number(outHeightCm) <= 0) {
      alert('Please enter a valid height')
      return
    }
    const outWeightKg =
      weightUnit === 'kg'
        ? Number(weightKg)
        : (isFinite(Number(weightLb)) ? lbToKg(Number(weightLb)) : NaN)
    if (!isFinite(Number(outWeightKg)) || Number(outWeightKg) <= 0) {
      alert('Please enter a valid weight')
      return
    }

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          gender,
          age: parsedAge,
          height_cm: Number(outHeightCm),
          weight_kg: Number(outWeightKg),
          medications,
        },
      },
    })
    setLoading(false)
    if (error) {
      alert(error.message)
      return
    }
    if (!data.session) {
      alert('Registration successful. Please check your email to confirm your account.')
      nav('/login')
    } else {
      alert('Registration successful')
      nav('/')
    }
  }

  return (
    <div className="max-w-xl mx-auto mt-4 px-6">
      <h1 className="text-3xl font-bold text-center text-[var(--brand)] mb-4">Register</h1>
      <Card>
        <div className="grid gap-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border rounded-lg p-3 w-full"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border rounded-lg p-3 w-full"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border rounded-lg p-3 w-full"
            />
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="border rounded-lg p-3 bg-white w-full"
            >
              <option value="">Gender</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Non-binary">Non-binary</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <input
              type="number"
              inputMode="numeric"
              placeholder="Age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="border rounded-lg p-3 w-full"
            />
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
                  placeholder="Height (cm)"
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
                  placeholder="Weight (kg)"
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
                  placeholder="Weight (lb)"
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
              className="border rounded-lg p-3 h-24 w-full"
            />
          </div>

          <div className="sticky bottom-3 bg-white/60 backdrop-blur rounded-xl p-2">
            <Button onClick={handleRegister} disabled={loading}>
              {loading ? 'Creating account…' : 'Submit Registration'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}