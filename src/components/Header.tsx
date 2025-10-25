import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Header() {
  const nav = useNavigate()
  const { pathname } = useLocation()
  const [authState, setAuthState] = useState<'loading' | 'in' | 'out'>('loading')
  const [email, setEmail] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const isProfile = pathname.startsWith('/profile')

  useEffect(() => {
    let alive = true
    const prime = async () => {
      const { data: ures } = await supabase.auth.getUser()
      if (!alive) return
      if (ures.user) {
        setEmail(ures.user.email ?? null)
        setAuthState('in')
      } else {
        const { data: sres } = await supabase.auth.getSession()
        if (!alive) return
        const e = sres.session?.user?.email ?? null
        setEmail(e)
        setAuthState(e ? 'in' : 'out')
      }
    }
    prime()
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const e = session?.user?.email ?? null
      setEmail(e)
      setAuthState(e ? 'in' : 'out')
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setEmail(null)
    setAuthState('out')
    setOpen(false)
    nav('/', { replace: true })
  }

  const closeMenu = () => setOpen(false)

  return (
    <header className="w-full border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <Link to="/" onClick={closeMenu} className="text-2xl sm:text-[28px] font-extrabold text-red-600 truncate">
          SightSage
        </Link>

        <nav className="hidden md:flex items-center gap-2 sm:gap-4">
          <Link to="/HealthReport" className="px-3 py-1.5 rounded-lg hover:bg-gray-100 font-semibold">
            Health Report
          </Link>
          <Link to="/education" className="px-3 py-1.5 rounded-lg hover:bg-gray-100 font-semibold">
            Education
          </Link>
          <a href="https://sightsage.com/en-ca/collections/shop-all" className="px-3 py-1.5 rounded-lg hover:bg-gray-100 font-semibold">
            Products
          </a>
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {authState === 'loading' ? null : authState === 'in' ? (
            isProfile ? (
              <button onClick={signOut} className="px-4 py-1.5 rounded-lg hover:bg-gray-100 font-semibold">
                Logout
              </button>
            ) : (
              <>
                <Link to="/profile" className="px-4 py-1.5 rounded-lg border font-semibold hover:bg-gray-50">
                  Profile
                </Link>
                <button onClick={signOut} className="px-4 py-1.5 rounded-lg hover:bg-gray-100 font-semibold">
                  Logout
                </button>
              </>
            )
          ) : (
            <Link to="/login" className="px-4 py-1.5 rounded-lg hover:bg-gray-100 font-semibold">
              Login
            </Link>
          )}
        </div>

        <button
          className="md:hidden inline-flex items-center justify-center rounded-lg p-2 border hover:bg-gray-50"
          aria-expanded={open}
          aria-label="Menu"
          onClick={() => setOpen(v => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t bg-white">
          <div className="max-w-6xl mx-auto px-4 py-2 flex flex-col gap-1">
            <Link to="/HealthReport" onClick={closeMenu} className="px-3 py-2 rounded-lg hover:bg-gray-100 font-semibold">
              Health Report
            </Link>
            <Link to="/education" onClick={closeMenu} className="px-3 py-2 rounded-lg hover:bg-gray-100 font-semibold">
              Education
            </Link>
            <a href="https://sightsage.com/en-ca/collections/shop-all" onClick={closeMenu} className="px-3 py-2 rounded-lg hover:bg-gray-100 font-semibold">
              Products
            </a>
            {authState === 'loading' ? null : authState === 'in' ? (
              isProfile ? (
                <button onClick={signOut} className="mt-1 px-3 py-2 rounded-lg hover:bg-gray-100 font-semibold text-left">
                  Logout
                </button>
              ) : (
                <>
                  <Link to="/profile" onClick={closeMenu} className="px-3 py-2 rounded-lg hover:bg-gray-100 font-semibold">
                    Profile
                  </Link>
                  <button onClick={signOut} className="mt-1 px-3 py-2 rounded-lg hover:bg-gray-100 font-semibold text-left">
                    Logout
                  </button>
                </>
              )
            ) : (
              <Link to="/login" onClick={closeMenu} className="mt-1 px-3 py-2 rounded-lg hover:bg-gray-100 font-semibold">
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}