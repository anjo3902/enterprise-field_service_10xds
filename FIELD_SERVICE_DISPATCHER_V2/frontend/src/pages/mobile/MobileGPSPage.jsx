import { useEffect, useMemo, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL

export default function MobileGPSPage() {
  const [status, setStatus] = useState('Fetching location...')
  const [error, setError] = useState('')
  const [coords, setCoords] = useState({ lat: null, lng: null, accuracy: null })
  const [sessionId, setSessionId] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  const apiBase = useMemo(() => {
    try {
      return new URL(API_BASE).origin
    } catch {
      return API_BASE
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setSessionId(params.get('session_id') || '')
  }, [])

  useEffect(() => {
    if (!sessionId) {
      setError('Missing session ID. Please scan the QR again.')
      setStatus('')
      return
    }

    if (!navigator.geolocation) {
      setError('Geolocation is not supported on this device.')
      setStatus('')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const accuracy = Math.round(pos.coords.accuracy)

        setCoords({ lat, lng, accuracy })
        setStatus('Sending...')
        setError('')
        setSending(true)

        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 8000)
          let response
          try {
            response = await fetch(`${apiBase}/api/gps/update`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({ session_id: sessionId, lat, lng }),
            })
          } finally {
            clearTimeout(timeoutId)
          }

          if (!response.ok) {
            throw new Error('Failed to send location to server.')
          }

          setDone(true)
          setStatus('Location shared successfully ✅')
        } catch (err) {
          if (String(err?.name || '').toLowerCase().includes('abort')) {
            setError('Sending location timed out. Please retry.')
          } else {
            setError(err?.message || 'Failed to send location.')
          }
          setStatus('')
        } finally {
          setSending(false)
        }
      },
      (err) => {
        setError(err?.message || 'Unable to fetch location.')
        setStatus('')
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 25000,
      }
    )
  }, [apiBase, sessionId])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-8 text-slate-50">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Mobile GPS</p>
        <h1 className="mt-2 text-2xl font-bold">Share Location</h1>
        <p className="mt-2 text-sm text-slate-300">Fetching location from this device and sending it to the dispatch session.</p>

        <div className="mt-5 space-y-3 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm">
          <div>
            <span className="text-slate-400">Status:</span>{' '}
            <span className={done ? 'text-emerald-400' : 'text-sky-300'}>{sending ? 'Sending...' : (status || 'Fetching location...')}</span>
          </div>
          <div>
            <span className="text-slate-400">Session:</span>{' '}
            <span className="break-all text-slate-200">{sessionId || '-'}</span>
          </div>
          <div>
            <span className="text-slate-400">Lat:</span>{' '}
            <span className="text-slate-200">{coords.lat != null ? coords.lat.toFixed(6) : '-'}</span>
          </div>
          <div>
            <span className="text-slate-400">Lng:</span>{' '}
            <span className="text-slate-200">{coords.lng != null ? coords.lng.toFixed(6) : '-'}</span>
          </div>
          <div>
            <span className="text-slate-400">Accuracy:</span>{' '}
            <span className="text-slate-200">{coords.accuracy != null ? `+/- ${coords.accuracy} m` : '-'}</span>
          </div>
        </div>

        {error ? <p className="mt-4 rounded-lg border border-rose-800 bg-rose-950/60 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
        {done ? <p className="mt-4 rounded-lg border border-emerald-800 bg-emerald-950/60 px-4 py-3 text-sm text-emerald-200">Location shared successfully ✅</p> : null}
      </div>
    </div>
  )
}
