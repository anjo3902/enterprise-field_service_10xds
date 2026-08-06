import { useMemo, useState } from 'react'

const MAPS_EMBED_KEY_NAME = 'VITE_GOOGLE_MAPS_EMBED_API_KEY'
const PLACEHOLDER_EMBED_KEYS = new Set([
  'your_key',
  'your_key_here',
  'your-embed-api-key-here',
  'replace_me',
])

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const hasStrictCoordinates = (lat, lng) => (
  lat !== null
  && lng !== null
  && !(Number(lat) === 0 && Number(lng) === 0)
)

const toQuery = (point) => `${point.lat},${point.lng}`

const isConfiguredEmbedKey = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  return Boolean(normalized) && !PLACEHOLDER_EMBED_KEYS.has(normalized)
}

function toPoint(rawPoint) {
  const lat = toNumber(rawPoint?.lat ?? rawPoint?.latitude)
  const lng = toNumber(rawPoint?.lng ?? rawPoint?.longitude)
  return hasStrictCoordinates(lat, lng) ? { lat, lng } : null
}

export default function GoogleMapEmbed({
  latitude,
  longitude,
  zoom = 15,
  origin,
  destination,
  waypoints = [],
  title = 'Google map preview',
  className = 'h-full w-full border-0',
  style,
}) {
  const apiKey = useMemo(() => {
    const raw = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env[MAPS_EMBED_KEY_NAME] || '').trim()
    return isConfiguredEmbedKey(raw) ? raw : ''
  }, [])

  const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'
  const isNgrok = hostname.includes('ngrok')
  const allowMap = isLocalhost || isNgrok || hostname !== ''
  const disableMap = !allowMap
  const [mapFailed, setMapFailed] = useState(false)

  const centerPoint = useMemo(() => {
    const lat = toNumber(latitude)
    const lng = toNumber(longitude)
    return hasStrictCoordinates(lat, lng) ? { lat, lng } : null
  }, [latitude, longitude])

  const directionsOrigin = useMemo(() => toPoint(origin), [origin])
  const directionsDestination = useMemo(() => toPoint(destination), [destination])

  const normalizedWaypoints = useMemo(
    () => (Array.isArray(waypoints) ? waypoints.map((point) => toPoint(point)).filter(Boolean) : []),
    [waypoints]
  )

  const src = useMemo(() => {
    if (!apiKey || !centerPoint || disableMap) return ''

    if (directionsOrigin && directionsDestination) {
      const params = new URLSearchParams({
        key: apiKey,
        origin: toQuery(directionsOrigin),
        destination: toQuery(directionsDestination),
        mode: 'driving',
      })

      if (normalizedWaypoints.length > 0) {
        params.set('waypoints', normalizedWaypoints.map((point) => toQuery(point)).join('|'))
      }

      return `https://www.google.com/maps/embed/v1/directions?${params.toString()}`
    }

    const params = new URLSearchParams({
      key: apiKey,
      center: toQuery(centerPoint),
      zoom: String(zoom),
    })

    return `https://www.google.com/maps/embed/v1/view?${params.toString()}`
  }, [
    apiKey,
    centerPoint,
    directionsOrigin,
    directionsDestination,
    normalizedWaypoints,
    disableMap,
    zoom,
  ])

  const fallbackHref = useMemo(() => {
    const destinationPoint = directionsDestination || centerPoint
    if (!destinationPoint) return ''
    return `https://www.google.com/maps/dir/?api=1&destination=${destinationPoint.lat},${destinationPoint.lng}`
  }, [centerPoint, directionsDestination])

  if (disableMap) {
    return (
      <div className='rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900'>
        Map preview is unavailable in this environment.
      </div>
    )
  }

  if (!src || mapFailed) {
    return fallbackHref ? (
      <div className='rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900'>
        <p className='font-medium'>Map preview could not load.</p>
        <a
          href={fallbackHref}
          target='_blank'
          rel='noreferrer noopener'
          className='mt-2 inline-flex items-center rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700'
        >
          Open directions in Google Maps
        </a>
      </div>
    ) : null
  }

  return (
    <iframe
      title={title}
      src={src}
      className={className}
      style={{ border: 0, borderRadius: '12px', ...style }}
      loading='lazy'
      allowFullScreen
      referrerPolicy='no-referrer-when-downgrade'
      onError={() => setMapFailed(true)}
    />
  )
}