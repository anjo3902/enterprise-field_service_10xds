import { useEffect, useMemo, useRef, useState } from 'react'
import GoogleMapEmbed from './GoogleMapEmbed'
import { loadGoogleMaps } from '../utils/googleMapsLoader'

const MAPS_API_KEY_NAME = 'VITE_GOOGLE_MAPS_API_KEY'
const PLACEHOLDER_KEYS = new Set([
  'your_key',
  'your_key_here',
  'your-google-maps-key',
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

const toPoint = (point) => {
  if (!point) return null
  const lat = toNumber(point.lat ?? point.latitude)
  const lng = toNumber(point.lng ?? point.longitude)
  return hasStrictCoordinates(lat, lng) ? { lat, lng } : null
}

const isConfiguredApiKey = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  return Boolean(normalized) && !PLACEHOLDER_KEYS.has(normalized)
}

const buildFallbackLabel = (message) => message || 'Map service unavailable.'

export default function TrackingMap({ technicianLocation, destination, zoom = 13 }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const destMarkerRef = useRef(null)
  const mapInitializedRef = useRef(false)
  const centerSetRef = useRef(false)
  const logOnceRef = useRef(false)
  const fallbackLoggedRef = useRef(false)
  const [mapError, setMapError] = useState('')
  const [mapLoadFailed, setMapLoadFailed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isMapReady, setIsMapReady] = useState(false)

  const apiKey = useMemo(() => {
    const raw = String(import.meta.env[MAPS_API_KEY_NAME] || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim()
    return isConfiguredApiKey(raw) ? raw : ''
  }, [])

  const techPoint = useMemo(() => toPoint(technicianLocation), [technicianLocation])
  const destPoint = useMemo(() => toPoint(destination), [destination])
  const shouldShowFallback = mapLoadFailed && !isMapReady
  const shouldShowError = !isMapReady && !shouldShowFallback && Boolean(mapError)
  const shouldShowLoading = !isMapReady && !shouldShowFallback && isLoading

  useEffect(() => {
    setMapLoadFailed(false)
    setIsLoading(true)
    setMapError('')
    setIsMapReady(false)
  }, [])

  useEffect(() => {
    let isMounted = true

    if (!logOnceRef.current) {
      logOnceRef.current = true
      console.log('MAP STATE:', {
        mapLoadFailed,
        isLoading,
        hasGoogle: typeof window !== 'undefined' && !!(window.google && window.google.maps),
      })
      console.log('VITE_GOOGLE_MAPS_API_KEY:', import.meta.env.VITE_GOOGLE_MAPS_API_KEY)
    }

    console.log('MAP STATE:', {
      mapLoadFailed,
      isLoading,
      hasGoogle: typeof window !== 'undefined' && !!(window.google && window.google.maps),
    })

    if (!apiKey) {
      setIsLoading(false)
      setMapError('Map configuration issue.')
      return () => {}
    }

    if (mapLoadFailed) {
      setIsLoading(false)
      return () => {}
    }

    if (!mapRef.current || !techPoint) {
      setIsLoading(false)
      setMapError('Waiting for location...')
      return () => {}
    }

    if (mapInitializedRef.current) {
      setIsLoading(false)
      setMapError('')
      setMapLoadFailed(false)
      setIsMapReady(true)
      return () => {}
    }

    setIsLoading(true)
    setMapError('')

    loadGoogleMaps(apiKey)
      .then((maps) => {
        if (!isMounted || !mapRef.current) return
        if (!window.google || !window.google.maps) {
          console.error('Google object not available')
          setMapError('Map service unavailable.')
          if (!mapInitializedRef.current) {
            setMapLoadFailed(true)
            if (!fallbackLoggedRef.current) {
              fallbackLoggedRef.current = true
              console.log('FALLBACK TRIGGERED')
            }
          }
          setIsLoading(false)
          return
        }

        try {
          if (!mapInitializedRef.current) {
            console.log('MAP INIT')
            mapInstanceRef.current = new maps.Map(mapRef.current, {
              center: techPoint,
              zoom,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false,
            })
            mapInitializedRef.current = true
          }

          if (!markerRef.current && mapInstanceRef.current) {
            markerRef.current = new maps.Marker({
              map: mapInstanceRef.current,
              position: techPoint,
              title: 'Technician',
            })
          }

          if (destPoint && !destMarkerRef.current && mapInstanceRef.current) {
            destMarkerRef.current = new maps.Marker({
              map: mapInstanceRef.current,
              position: destPoint,
              title: 'Destination',
              icon: {
                path: maps.SymbolPath.CIRCLE,
                scale: 6,
                fillColor: '#dc2626',
                fillOpacity: 1,
                strokeOpacity: 0,
              },
            })
          }

          if (!centerSetRef.current && mapInstanceRef.current) {
            mapInstanceRef.current.setCenter(techPoint)
            centerSetRef.current = true
          }

          setMapError('')
          setMapLoadFailed(false)
          setIsLoading(false)
          setIsMapReady(true)
        } catch (err) {
          console.error('Map init failed:', err)
          setMapError('Map service unavailable.')
          setIsLoading(false)
          if (!mapInitializedRef.current) {
            setMapLoadFailed(true)
            if (!fallbackLoggedRef.current) {
              fallbackLoggedRef.current = true
              console.log('FALLBACK TRIGGERED')
            }
          }
        }
      })
      .catch((err) => {
        console.error('Google Maps failed to load:', err)
        if (!isMounted) return
        setMapError('Map service unavailable.')
        setIsLoading(false)
        if (!mapInitializedRef.current) {
          setMapLoadFailed(true)
          if (!fallbackLoggedRef.current) {
            fallbackLoggedRef.current = true
            console.log('FALLBACK TRIGGERED')
          }
        }
      })

    return () => {
      isMounted = false
    }
  }, [apiKey, techPoint, destPoint, zoom])

  useEffect(() => {
    if (!mapInstanceRef.current || !window.google || !window.google.maps) return
    if (techPoint && markerRef.current) {
      console.log('MAP UPDATE')
      markerRef.current.setPosition(techPoint)
    }

    if (destPoint) {
      if (destMarkerRef.current) {
        destMarkerRef.current.setPosition(destPoint)
      } else {
        destMarkerRef.current = new window.google.maps.Marker({
          map: mapInstanceRef.current,
          position: destPoint,
          title: 'Destination',
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: '#dc2626',
            fillOpacity: 1,
            strokeOpacity: 0,
          },
        })
      }
    }
  }, [techPoint, destPoint])

  useEffect(() => () => {
    mapInstanceRef.current = null
    markerRef.current = null
    destMarkerRef.current = null
    mapInitializedRef.current = false
    centerSetRef.current = false
  }, [])

  return (
    <div
      data-testid='tracking-map'
      className='relative h-[260px] w-full overflow-hidden rounded-lg border border-gray-100 bg-white'
    >
      <div
        ref={mapRef}
        className={`h-full w-full ${shouldShowFallback ? 'hidden' : ''}`}
      />

      {shouldShowFallback ? (
        <div className='absolute inset-0 flex flex-col gap-2 p-3 bg-white'>
          {techPoint && destPoint ? (
            <div className='flex-1 overflow-hidden rounded-lg border border-amber-200'>
              <GoogleMapEmbed
                title='Live technician route (fallback)'
                latitude={techPoint.lat}
                longitude={techPoint.lng}
                origin={techPoint}
                destination={destPoint}
                className='h-full w-full border-0'
                zoom={zoom}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {shouldShowError ? (
        <div className='absolute inset-0 flex items-center justify-center bg-white/80 text-xs text-amber-900'>
          {mapError || buildFallbackLabel(mapError)}
        </div>
      ) : null}

      {shouldShowLoading ? (
        <div className='absolute inset-0 flex items-center justify-center bg-white/70 text-xs text-secondary'>
          Loading map...
        </div>
      ) : null}
    </div>
  )
}
