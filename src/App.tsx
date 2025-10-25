import React, { useEffect, useLayoutEffect } from 'react'
import { useLocation, Outlet } from 'react-router-dom'
import Header from './components/Header'

export default function App() {
  const { pathname } = useLocation()

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
    return () => {
      clearTimeout(t0)
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [pathname])

  const isHome = pathname === '/'

  return (
    <div className="min-h-screen">
      {!isHome && <Header />}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t py-6 text-center text-sm text-gray-500 bg-white">
        © SightSage
      </footer>
    </div>
  )
}