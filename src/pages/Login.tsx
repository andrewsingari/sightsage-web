import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import { supabase } from '../lib/supabase'

export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(true)
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setSessionEmail(data.session?.user?.email ?? null)
      setChecking(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSessionEmail(session?.user?.email ?? null)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please fill in all fields')
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) alert(error.message)
    else nav('/', { replace: true })
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setSessionEmail(null)
  }

  if (checking) {
    return (
      <div className="max-w-md mx-auto mt-16 px-6">
        <Card>
          <div className="py-6 text-center">Loading…</div>
        </Card>
      </div>
    )
  }

  if (sessionEmail) {
    return (
      <div className="max-w-md mx-auto mt-16 px-6">
        <h1 className="text-3xl font-bold text-center text-[var(--brand)] mb-6">Login</h1>
        <Card>
          <div className="grid gap-4 text-center">
            <div className="text-lg font-semibold">You are already signed in</div>
            <div className="text-gray-600">Signed in as {sessionEmail}</div>
            <Button onClick={() => nav('/', { replace: true })}>Continue to Home</Button>
            <button
              onClick={handleSignOut}
              className="w-full mt-2 border rounded-lg py-2 font-semibold hover:bg-gray-50"
            >
              Sign out to switch account
            </button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-16 px-6">
      <h1 className="text-3xl font-bold text-center text-[var(--brand)] mb-6">Login</h1>
      <Card>
        <div className="grid gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border rounded-lg p-3"
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border rounded-lg p-3"
            autoComplete="current-password"
          />
          <Button onClick={handleLogin} disabled={busy}>{busy ? 'Logging in…' : 'Login'}</Button>
          <button
            onClick={() => nav('/register')}
            className="w-full mt-2 border rounded-lg py-2 font-semibold hover:bg-gray-50"
          >
            Register
          </button>
        </div>
      </Card>
    </div>
  )
}