import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Header() {
  const nav = useNavigate()
  const { pathname } = useLocation()
  const [authState, setAuthState] = useState<'loading' | 'in' | 'out'>('loading')
  const [user, setUser] = useState<any>(null)
  const [open, setOpen] = useState(false)
  const isProfile = pathname.startsWith('/profile')

  useEffect(() => {
    let alive = true
    const prime = async () => {
      const { data: ures } = await supabase.auth.getUser()
      if (!alive) return
      if (ures.user) {
        setUser(ures.user)
        setAuthState('in')
      } else {
        const { data: sres } = await supabase.auth.getSession()
        if (!alive) return
        const u = sres.session?.user ?? null
        setUser(u)
        setAuthState(u ? 'in' : 'out')
      }
    }
    prime()
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null
      setUser(u)
      setAuthState(u ? 'in' : 'out')
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setAuthState('out')
    setOpen(false)
    nav('/', { replace: true })
  }

  const closeMenu = () => setOpen(false)

  const logShareEvent = async (platform: string) => {
    try {
      if (user?.id) {
        const displayName =
          user.user_metadata?.name ||
          user.user_metadata?.full_name ||
          user.email?.split('@')[0] ||
          null

        await supabase.from('share_events').insert([
          {
            user_id: user.id,
            email: user.email,
            display_name: displayName,
            platform,
          },
        ])
      }
    } catch (err) {
      console.error('Failed to log share event', err)
    }
  }

  const share = async () => {
    const shareData = {
      title: 'SightSage',
      text: 'Check out SightSage Foods & Nutrition!',
      url: 'https://sightsage.com',
    }
    const platform = /iPhone|iPad|Android/i.test(navigator.userAgent)
      ? 'mobile'
      : 'desktop'

    await logShareEvent(platform)

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {}
    } else {
      const shareUrl = encodeURIComponent(shareData.url)
      const text = encodeURIComponent(shareData.text)
      const dialog = document.createElement('div')
      dialog.className =
        'fixed inset-0 bg-black/50 flex items-center justify-center z-50'
      dialog.innerHTML = `
        <div class="bg-white rounded-xl p-6 w-80 shadow-lg text-center">
          <h3 class="text-lg font-semibold mb-3">Share SightSage</h3>
          <div class="flex flex-col gap-2">
            <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" class="text-blue-600 hover:underline">Facebook</a>
            <a href="https://api.whatsapp.com/send?text=${text}%20${shareUrl}" target="_blank" class="text-green-600 hover:underline">WhatsApp</a>
            <a href="https://www.instagram.com/" target="_blank" class="text-pink-600 hover:underline">Instagram</a>
            <a href="https://www.tiktok.com/" target="_blank" class="text-black hover:underline">TikTok</a>
            <a href="https://www.messenger.com/t/" target="_blank" class="text-blue-500 hover:underline">Messenger</a>
            <a href="https://web.wechat.com/" target="_blank" class="text-green-500 hover:underline">WeChat</a>
          </div>
          <button id="closeShareDialog" class="mt-4 px-4 py-2 rounded-lg border bg-gray-100 hover:bg-gray-200 font-semibold">Close</button>
        </div>`
      document.body.appendChild(dialog)
      dialog.querySelector('#closeShareDialog')?.addEventListener('click', () => {
        dialog.remove()
      })
    }
  }

  return (
    <header className="w-full border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <Link
          to="/"
          onClick={closeMenu}
          className="text-2xl sm:text-[28px] font-extrabold text-red-600 truncate"
        >
          SightSage
        </Link>

        <nav className="hidden md:flex items-center gap-2 sm:gap-4">
          <Link
            to="/HealthReport"
            className="px-3 py-1.5 rounded-lg hover:bg-gray-100 font-semibold"
          >
            Health Report
          </Link>
          <Link
            to="/education"
            className="px-3 py-1.5 rounded-lg hover:bg-gray-100 font-semibold"
          >
            Education
          </Link>
          <a
            href="https://sightsage.com/en-ca/collections/shop-all"
            className="px-3 py-1.5 rounded-lg hover:bg-gray-100 font-semibold"
          >
            Products
          </a>
          <button
            onClick={share}
            className="px-3 py-1.5 rounded-lg hover:bg-gray-100 font-semibold"
          >
            Share
          </button>
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {authState === 'loading' ? null : authState === 'in' ? (
            isProfile ? (
              <button
                onClick={signOut}
                className="px-4 py-1.5 rounded-lg hover:bg-gray-100 font-semibold"
              >
                Logout
              </button>
            ) : (
              <>
                <Link
                  to="/profile"
                  className="px-4 py-1.5 rounded-lg border font-semibold hover:bg-gray-50"
                >
                  Profile
                </Link>
                <button
                  onClick={signOut}
                  className="px-4 py-1.5 rounded-lg hover:bg-gray-100 font-semibold"
                >
                  Logout
                </button>
              </>
            )
          ) : (
            <Link
              to="/login"
              className="px-4 py-1.5 rounded-lg hover:bg-gray-100 font-semibold"
            >
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
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              d="M4 6h16M4 12h16M4 18h16"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t bg-white">
          <div className="max-w-6xl mx-auto px-4 py-2 flex flex-col gap-1">
            <Link
              to="/HealthReport"
              onClick={closeMenu}
              className="px-3 py-2 rounded-lg hover:bg-gray-100 font-semibold"
            >
              Health Report
            </Link>
            <Link
              to="/education"
              onClick={closeMenu}
              className="px-3 py-2 rounded-lg hover:bg-gray-100 font-semibold"
            >
              Education
            </Link>
            <a
              href="https://sightsage.com/en-ca/collections/shop-all"
              onClick={closeMenu}
              className="px-3 py-2 rounded-lg hover:bg-gray-100 font-semibold"
            >
              Products
            </a>
            <button
              onClick={() => {
                closeMenu()
                share()
              }}
              className="px-3 py-2 rounded-lg hover:bg-gray-100 font-semibold text-left"
            >
              Share
            </button>
            {authState === 'loading' ? null : authState === 'in' ? (
              isProfile ? (
                <button
                  onClick={signOut}
                  className="mt-1 px-3 py-2 rounded-lg hover:bg-gray-100 font-semibold text-left"
                >
                  Logout
                </button>
              ) : (
                <>
                  <Link
                    to="/profile"
                    onClick={closeMenu}
                    className="px-3 py-2 rounded-lg hover:bg-gray-100 font-semibold"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={signOut}
                    className="mt-1 px-3 py-2 rounded-lg hover:bg-gray-100 font-semibold text-left"
                  >
                    Logout
                  </button>
                </>
              )
            ) : (
              <Link
                to="/login"
                onClick={closeMenu}
                className="mt-1 px-3 py-2 rounded-lg hover:bg-gray-100 font-semibold"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}