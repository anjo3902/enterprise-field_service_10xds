import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPin, Navigation, XCircle } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { sanitizeText, validateLocation } from '../utils/validation'

const LocationInput = ({ register, error, setValue, resetKey = 0 }) => {
  const [isWaitingMobileGps, setIsWaitingMobileGps] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const [mobileStatus, setMobileStatus] = useState('')
  const [mobileGpsSuccess, setMobileGpsSuccess] = useState(false)
  const [locationText, setLocationText] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [gpsMode, setGpsMode] = useState('mobile-qr')
  const [showManualFallbackHint, setShowManualFallbackHint] = useState(false)
  const [mobilePageUrl, setMobilePageUrl] = useState('')
  const [gpsSessionId, setGpsSessionId] = useState('')
  const apiBase = import.meta.env.VITE_API_URL
  const pollTimerRef = useRef(null)
  const timeoutRef = useRef(null)
  const FETCH_TIMEOUT_MS = 8_000

  const locationRegister = register('location', {
    setValueAs: (value) => sanitizeText(value),
    validate: (value) => {
      if (!value || !String(value).trim()) {
        return true
      }
      return validateLocation(value) || true
    },
  })

  const backendOrigin = useMemo(() => {
    try {
      const parsed = new URL(apiBase)
      return parsed.origin
    } catch {
      return apiBase
    }
  }, [apiBase])

  const isMobileClient = useMemo(() => {
    if (typeof navigator === 'undefined') {
      return false
    }

    const ua = String(navigator.userAgent || '').toLowerCase()
    const mobileByUA = /android|iphone|ipad|ipod|iemobile|opera mini|mobile/i.test(ua)
    const hasTouch = Number(navigator.maxTouchPoints || 0) > 1
    const narrowViewport = typeof window !== 'undefined' && window.innerWidth <= 1024
    return Boolean(mobileByUA || (hasTouch && narrowViewport))
  }, [])

  const publicBaseUrl = useMemo(() => {
    const configured = String(import.meta.env.VITE_PUBLIC_BASE_URL || '').trim()
    return configured.replace(/\/+$/, '')
  }, [])

  const isPublicBaseConfigured = Boolean(publicBaseUrl)

  const isPublicBaseLocalhost = useMemo(() => {
    if (!publicBaseUrl) {
      return false
    }
    try {
      const parsed = new URL(publicBaseUrl)
      const host = String(parsed.hostname || '').toLowerCase()
      return host === 'localhost' || host === '127.0.0.1'
    } catch {
      const value = String(publicBaseUrl).toLowerCase()
      return value.includes('localhost') || value.includes('127.0.0.1')
    }
  }, [publicBaseUrl])

  useEffect(() => {
    if (isMobileClient) {
      setGpsMode('current-device')
    }
  }, [isMobileClient])

  const buildMobileSessionUrl = (sessionId) => {
    if (!isPublicBaseConfigured) {
      return ''
    }
    const normalizedBase = String(publicBaseUrl || '').replace(/\/+$/, '')
    return `${normalizedBase}/mobile-gps?session_id=${encodeURIComponent(sessionId)}`
  }

  const createGpsSession = async () => {
    try {
      const response = await fetch(`${backendOrigin}/api/gps/session/new`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('Failed to create GPS session')
      }
      const data = await response.json()
      const sessionId = String(data?.session_id || '')
      if (!sessionId) {
        throw new Error('Session id missing from server response')
      }
      const mobilePageUrl = buildMobileSessionUrl(sessionId)
      setGpsSessionId(sessionId)
      setMobilePageUrl(mobilePageUrl)
      return {
        sessionId,
        mobilePageUrl,
        pollIntervalSeconds: Number(data?.poll_interval_seconds) || 2,
        expiresInSeconds: Number(data?.expires_in_seconds) || 120,
      }
    } catch {
      setGpsSessionId('')
      setMobilePageUrl('')
      return null
    }
  }

  const clearPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  const clearGpsSelection = () => {
    clearPolling()
    setIsWaitingMobileGps(false)
    setShowQr(false)
    setMobileGpsSuccess(false)
    setMobileStatus('')
    setShowManualFallbackHint(false)
    setMobilePageUrl('')
    setGpsSessionId('')
    setLocationText('')
    setLatitude('')
    setLongitude('')
    if (setValue) {
      setValue('location', '', { shouldValidate: true })
      setValue('latitude', '', { shouldValidate: false })
      setValue('longitude', '', { shouldValidate: false })
    }
  }

  const hasAnyGpsData = Boolean(
    String(locationText || '').trim()
    || String(latitude || '').trim()
    || String(longitude || '').trim()
    || showQr
    || mobileGpsSuccess
    || mobileStatus
  )

  useEffect(() => {
    register('latitude')
    register('longitude')
    return () => clearPolling()
  }, [register])

  useEffect(() => {
    clearGpsSelection()
  }, [resetKey, setValue])

  const reverseGeocode = async (lat, lng) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      const response = await fetch(`${backendOrigin}/location/reverse?lat=${lat}&lng=${lng}`, { signal: controller.signal })
      if (!response.ok) {
        throw new Error('Reverse geocode failed')
      }
      const data = await response.json()
      return data?.formatted || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    } finally {
      clearTimeout(timeoutId)
    }
  }

  const applyResolvedCoordinates = async (lat, lng, successMessage) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error('Invalid GPS coordinates')
    }
    if (lat === 0 && lng === 0) {
      throw new Error('GPS not received yet. Please retry location sharing.')
    }

    const coordinateText = `${lat.toFixed(6)}, ${lng.toFixed(6)}`

    setLatitude(lat.toFixed(6))
    setLongitude(lng.toFixed(6))
    setLocationText(coordinateText)

    setValue('latitude', lat, { shouldValidate: false })
    setValue('longitude', lng, { shouldValidate: false })
    setValue('location', coordinateText, { shouldValidate: true })

    try {
      const address = await reverseGeocode(lat, lng)
      if (address && String(address).trim()) {
        setLocationText(address)
        setValue('location', address, { shouldValidate: true })
      }
    } catch {
      // Keep coordinate text when reverse geocoding is unavailable.
    }

    setMobileGpsSuccess(true)
    setShowManualFallbackHint(false)
    setMobileStatus(successMessage)
    setIsWaitingMobileGps(false)
    clearPolling()
  }

  const getSessionLocation = async (sessionId) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    let response
    try {
      response = await fetch(`${backendOrigin}/api/gps/session/${encodeURIComponent(sessionId)}`, { signal: controller.signal })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      throw new Error('No mobile location yet')
    }

    const data = await response.json()

    // Strict validation: reject if not available, null, or (0,0)
    if (
      data.available !== true
      || data.lat === null
      || data.lng === null
      || data.lat === undefined
      || data.lng === undefined
    ) {
      if (data.status === 'expired_or_missing') {
        throw new Error('GPS session expired. Generate a new QR and retry.')
      }
      throw new Error('GPS not received yet. Please scan QR and allow location access.')
    }

    const lat = Number(data.lat)
    const lng = Number(data.lng)
    await applyResolvedCoordinates(lat, lng, 'Location received successfully')
  }

  const readDirectMobileLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported on this device.'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 25000,
    })
  })

  const startDirectMobileFlow = async () => {
    clearPolling()
    setShowQr(false)
    setMobileGpsSuccess(false)
    setIsWaitingMobileGps(true)
    setShowManualFallbackHint(false)
    setMobileStatus('Reading GPS from this device...')

    try {
      const position = await readDirectMobileLocation()
      const lat = Number(position?.coords?.latitude)
      const lng = Number(position?.coords?.longitude)
      await applyResolvedCoordinates(lat, lng, 'Location received successfully')
    } catch (err) {
      const code = Number(err?.code)
      if (code === 1) {
        setMobileStatus('Location permission denied. Enable location access in browser settings and retry.')
      } else if (code === 2) {
        setMobileStatus('GPS signal unavailable. Move to an open area and retry.')
      } else {
        setMobileStatus('Could not fetch location from this device. Please retry or use QR flow.')
      }
      setShowManualFallbackHint(true)
      setIsWaitingMobileGps(false)
    }
  }

  const startSessionMobileGpsFlow = async () => {
    clearPolling()
    setShowQr(true)
    setMobileGpsSuccess(false)
    setIsWaitingMobileGps(true)
    setShowManualFallbackHint(false)
    setMobileStatus('Creating secure GPS session...')

    const sessionData = await createGpsSession()

    if (!sessionData?.sessionId || !sessionData?.mobilePageUrl) {
      setIsWaitingMobileGps(false)
      setShowManualFallbackHint(true)
      if (!isPublicBaseConfigured) {
        setMobileStatus('Missing VITE_PUBLIC_BASE_URL. Set a public frontend URL before using QR mode.')
      } else {
        setMobileStatus('Could not generate GPS session. Check server connection.')
      }
      return
    }

    const pollMs = Math.max(1000, Number(sessionData.pollIntervalSeconds || 2) * 1000)
    const timeoutMs = Math.min(
      Math.max(60000, Number(sessionData.expiresInSeconds || 120) * 1000),
      5 * 60 * 1000,
    )

    setMobileStatus('Scan the QR from any network and share location from your phone...')

    pollTimerRef.current = setInterval(() => {
      getSessionLocation(sessionData.sessionId).catch((err) => {
        const msg = err?.message || ''
        if (msg.includes('expired')) {
          setIsWaitingMobileGps(false)
          setShowManualFallbackHint(true)
          setMobileStatus('GPS session expired. Generate a new QR and try again.')
          clearPolling()
          return
        }
        if (msg.includes('GPS not received') || msg.includes('No mobile location') || msg.includes('Please scan QR')) {
          setMobileStatus('Waiting for GPS from mobile...')
        } else {
          setMobileStatus('Waiting for mobile GPS update...')
        }
      })
    }, pollMs)

    timeoutRef.current = setTimeout(() => {
      setIsWaitingMobileGps(false)
      setShowManualFallbackHint(true)
      setMobileStatus('Timed out waiting for mobile GPS. Please scan QR again.')
      clearPolling()
    }, timeoutMs)
  }

  const handleGetLocation = () => {
    if (gpsMode === 'current-device') {
      startDirectMobileFlow()
      return
    }
    startSessionMobileGpsFlow()
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline gap-3">
        <label className="block text-sm font-medium text-primary">
          Location
        </label>
        {setValue ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={isWaitingMobileGps}
              className="text-xs flex items-center gap-1.5 text-blue-600 hover:text-blue-800 transition-colors font-semibold"
            >
              {isWaitingMobileGps ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  <span>Waiting for mobile GPS...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Get GPS Location</span>
                </>
              )}
            </button>
            {hasAnyGpsData ? (
              <button
                type="button"
                onClick={clearGpsSelection}
                className="text-xs flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors font-semibold"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Remove GPS</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setGpsMode('current-device')}
          className={`text-xs font-semibold px-3 py-2 rounded border transition-colors ${
            gpsMode === 'current-device'
              ? 'border-blue-600 bg-blue-50 text-blue-700'
              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
          }`}
          aria-pressed={gpsMode === 'current-device'}
        >
          Use current device GPS
        </button>
        <button
          type="button"
          onClick={() => setGpsMode('mobile-qr')}
          className={`text-xs font-semibold px-3 py-2 rounded border transition-colors ${
            gpsMode === 'mobile-qr'
              ? 'border-blue-600 bg-blue-50 text-blue-700'
              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
          }`}
          aria-pressed={gpsMode === 'mobile-qr'}
        >
          Use mobile (scan QR)
        </button>
      </div>

      {showQr ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
          <p className="text-sm text-primary font-medium">Scan this QR using your phone</p>
          {mobilePageUrl ? (
            <>
              <div className="bg-white inline-block p-2 rounded border border-gray-200">
                <QRCodeSVG value={mobilePageUrl} size={180} />
              </div>
              <p className="text-xs text-secondary break-all">{mobilePageUrl}</p>
              {gpsSessionId ? <p className="text-xs text-secondary">Session: {gpsSessionId}</p> : null}
              {isPublicBaseLocalhost ? (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  QR will not work on mobile. Use public URL (ngrok or deployed domain).
                </p>
              ) : null}
              {!isPublicBaseConfigured ? (
                <p className="text-xs text-danger bg-red-50 border border-red-200 rounded px-2 py-1">
                  Missing VITE_PUBLIC_BASE_URL. QR mode requires a public frontend URL.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-danger">Could not generate mobile QR URL. Retry in a few seconds.</p>
          )}
          {mobileStatus ? (
            <p className={`text-xs ${mobileGpsSuccess ? 'text-green-700' : 'text-secondary'}`}>{mobileStatus}</p>
          ) : null}
        </div>
      ) : null}

      {showManualFallbackHint ? (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          GPS could not be fetched automatically. Enter latitude and longitude manually below.
        </p>
      ) : null}

      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
        <input
          type="text"
          {...locationRegister}
          value={locationText}
          onChange={(e) => {
            locationRegister.onChange(e)
            const value = e.target.value
            setLocationText(value)
            setValue('location', value, { shouldValidate: true })
          }}
          placeholder="Location address"
          className={`input-field pl-11 ${error ? 'border-danger' : ''}`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          type="text"
          value={latitude}
          onChange={(e) => {
            setLatitude(e.target.value)
            setValue('latitude', e.target.value, { shouldValidate: false })
          }}
          placeholder="Latitude"
          className="input-field"
        />
        <input
          type="text"
          value={longitude}
          onChange={(e) => {
            setLongitude(e.target.value)
            setValue('longitude', e.target.value, { shouldValidate: false })
          }}
          placeholder="Longitude"
          className="input-field"
        />
      </div>

      <p className="text-xs text-secondary">Use one location mode only: manual address (City, State, Pincode) or GPS location.</p>
      <p className="text-xs text-secondary">Set VITE_PUBLIC_BASE_URL to a scannable URL (for example ngrok) so QR works across devices and networks.</p>
      {error && (
        <p className="text-sm text-danger">{error.message}</p>
      )}
    </div>
  )
}

export default LocationInput
