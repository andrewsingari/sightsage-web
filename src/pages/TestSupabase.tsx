import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function TestSupabase() {
  const [status, setStatus] = useState('Testing connection...')

  useEffect(() => {
    async function checkConnection() {
      try {
        const { data, error } = await supabase
          .from('user_scores')
          .select('*')
          .limit(1)

        if (error) throw error
        setStatus(`✅ Connected! Found ${data?.length || 0} rows in user_scores`)
      } catch (err: any) {
        setStatus(`⚠️ Connection error: ${err.message}`)
      }
    }
    checkConnection()
  }, [])

  return (
    <div className="max-w-3xl mx-auto text-center py-16">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      <p>{status}</p>
    </div>
  )
}