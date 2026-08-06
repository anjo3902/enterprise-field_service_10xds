import { memo, useEffect, useMemo } from 'react'
import { AlertTriangle, Navigation } from 'lucide-react'
import GoogleMapEmbed from './GoogleMapEmbed'

const MAPS_EMBED_KEY_NAME = 'VITE_GOOGLE_MAPS_EMBED_API_KEY'
const MAX_WAYPOINTS = 8
const PLACEHOLDER_EMBED_KEYS = new Set([
  'your_key',
  'your_key_here',
  'your-embed-api-key-here',
  'replace_me',
])

const toNumber = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const hasStrictCoordinates = (lat, lng) => (
  lat !== null
  && lng !== null
  && !(Number(lat) === 0 && Number(lng) === 0)
)

const isConfiguredEmbedKey = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  return Boolean(normalized) && !PLACEHOLDER_EMBED_KEYS.has(normalized)
}

const coordinatesToLabel = (point) => `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`

function RouteMap({ technicianLocation, jobs = [], routeOrder = [] }) {
  const technicianPoint = useMemo(() => {
    if (!technicianLocation) return null
    const lat = toNumber(technicianLocation.latitude)
    const lng = toNumber(technicianLocation.longitude)
    return hasStrictCoordinates(lat, lng) ? { lat, lng } : null
  }, [technicianLocation])

  const activeRouteStops = useMemo(() => {
    const validJobs = jobs
      .map((job) => {
        const lat = toNumber(job.latitude)
        const lng = toNumber(job.longitude)
        return hasStrictCoordinates(lat, lng)
          ? { ...job, _lat: lat, _lng: lng }
          : null
      })
      .filter(Boolean)

    const jobsById = new Map(validJobs.map((job) => [String(job.id), job]))
    const orderedJobs = routeOrder.map((id) => jobsById.get(String(id))).filter(Boolean)
    const orderedIds = new Set(orderedJobs.map((job) => String(job.id)))
    const remainingJobs = validJobs.filter((job) => !orderedIds.has(String(job.id)))

    return [...orderedJobs, ...remainingJobs].map((job) => ({
      id: job.id,
      faultType: job.fault_type || '-',
      status: job.status || '-',
      lat: job._lat,
      lng: job._lng,
    }))
  }, [jobs, routeOrder])


  const mapsEmbedApiKey = useMemo(() => {
    const raw = String(import.meta.env[MAPS_EMBED_KEY_NAME] || '').trim()
    return isConfiguredEmbedKey(raw) ? raw : ''
  }, [])

  const directionsConfig = useMemo(() => {
    if (!technicianPoint || activeRouteStops.length === 0) {
      return null
    }

    const destination = activeRouteStops[activeRouteStops.length - 1]
    const waypoints = activeRouteStops.slice(0, -1).slice(0, MAX_WAYPOINTS)

    return {
      origin: technicianPoint,
      destination,
      waypoints,
    }
  }, [technicianPoint, activeRouteStops])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.MAP_MARKERS_COUNT = activeRouteStops.length
  }, [activeRouteStops])

  return (
    <div id='technician-map' data-testid='technician-map' className='space-y-3'>
      {!technicianPoint ? (
        <div className='rounded-lg border border-gray-200 bg-white p-4 text-sm text-secondary'>
          No technician location available for route mapping.
        </div>
      ) : !mapsEmbedApiKey ? (
        <div className='rounded-lg border border-amber-200 bg-amber-50 p-4'>
          <div className='flex items-start gap-2'>
            <AlertTriangle className='h-4 w-4 text-amber-700 mt-0.5 shrink-0' />
            <div>
              <p className='text-sm font-semibold text-amber-900'>Map configuration required</p>
              <p className='mt-1 text-xs text-amber-800'>
                Set {MAPS_EMBED_KEY_NAME} in the frontend environment to render the embedded route map.
              </p>
              <p className='mt-1 text-xs text-amber-800'>
                This route preview is intentionally disabled until Google Maps credentials are configured.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className='w-full h-[300px] sm:h-[360px] rounded-lg overflow-hidden border border-gray-200'>
          <GoogleMapEmbed
            title='Optimized route map'
            latitude={technicianPoint.lat}
            longitude={technicianPoint.lng}
            origin={directionsConfig?.origin}
            destination={directionsConfig?.destination}
            waypoints={directionsConfig?.waypoints || []}
            className='h-full w-full border-0'
            zoom={12}
          />
        </div>
      )}

      <div className='rounded-lg border border-gray-200 bg-white p-3'>
        <p className='text-xs font-semibold text-secondary uppercase tracking-wide flex items-center gap-1.5'>
          <Navigation className='h-3.5 w-3.5' />
          Active Route Stops
        </p>
        {activeRouteStops.length === 0 ? (
          <p className='mt-2 text-xs text-secondary'>No active stops with valid coordinates.</p>
        ) : (
          <ol className='mt-2 space-y-1 text-xs text-primary'>
            {activeRouteStops.map((stop, index) => (
              <li key={`active-${stop.id}`} className='flex items-start gap-2'>
                <span className='mt-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-100 px-1 text-[10px] font-semibold text-blue-700'>
                  {index + 1}
                </span>
                <span>
                  Job #{stop.id} | {stop.faultType} | {coordinatesToLabel(stop)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

const serializeJobs = (rows = []) => rows
  .map((row) => [row.id, row.latitude, row.longitude, row.status].join(':'))
  .join('|')

export default memo(RouteMap, (prev, next) => {
  const prevLat = prev.technicianLocation?.latitude
  const prevLng = prev.technicianLocation?.longitude
  const nextLat = next.technicianLocation?.latitude
  const nextLng = next.technicianLocation?.longitude

  if (prevLat !== nextLat || prevLng !== nextLng) return false
  if (JSON.stringify(prev.routeOrder || []) !== JSON.stringify(next.routeOrder || [])) return false
  if (serializeJobs(prev.jobs) !== serializeJobs(next.jobs)) return false
  return true
})
