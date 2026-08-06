import { useEffect, useMemo, useRef, useState } from 'react'
import { getAuthToken } from '../services/api'

const STALE_AFTER_MS = 15_000
const TICK_MS = 5_000

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const toIso = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

export default function useLiveTracking(request, enabled = false) {
  const jobId = request?.id ? String(request.id) : ''
  const jobStatus = String(request?.status || '').toLowerCase()
  const sourceRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const healthTimerRef = useRef(null)
  const eventCountRef = useRef(0)
  const reconnectCountRef = useRef(0)
  const sessionStartRef = useRef(null)
  const [state, setState] = useState({
    status: jobStatus,
    location: null,
    technicianLocation: null,
    customerLocation: null,
    assignedTechnicianName: '',
    assignedTechnicianPhoneNumber: '',
    assignedTechnicianZone: '',
    reassignmentRequested: false,
    reassignmentStatus: '',
    reassignmentResult: '',
    etaMinutes: null,
    distanceKm: null,
    speedKmh: null,
    accuracyM: null,
    heading: null,
    lastUpdatedAt: '',
    connectionState: 'idle',
    error: '',
  })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((prev) => prev + 1), TICK_MS)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!enabled || !jobId) {
      if (sourceRef.current) {
        sourceRef.current.close()
        sourceRef.current = null
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (healthTimerRef.current) {
        clearInterval(healthTimerRef.current)
        healthTimerRef.current = null
      }
      setState((prev) => ({
        ...prev,
        status: jobStatus,
        location: null,
        technicianLocation: null,
        customerLocation: null,
        assignedTechnicianName: '',
        assignedTechnicianPhoneNumber: '',
        assignedTechnicianZone: '',
        reassignmentRequested: false,
        reassignmentStatus: '',
        reassignmentResult: '',
        etaMinutes: null,
        distanceKm: null,
        connectionState: 'idle',
        error: '',
      }))
      return undefined
    }

    const token = getAuthToken()
    const base = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
    if (!token) {
      setState((prev) => ({ ...prev, connectionState: 'error', error: 'Authentication required.' }))
      return undefined
    }
    if (!base) {
      setState((prev) => ({ ...prev, connectionState: 'error', error: 'API URL not configured.' }))
      return undefined
    }

    const url = new URL(`${base}/customer/jobs/${jobId}/live`)
    url.searchParams.set('token', token)

    eventCountRef.current = 0
    reconnectCountRef.current = 0
    sessionStartRef.current = Date.now()

    if (healthTimerRef.current) {
      clearInterval(healthTimerRef.current)
    }

    healthTimerRef.current = setInterval(() => {
      const memoryBytes = typeof performance !== 'undefined'
        && performance.memory
        && typeof performance.memory.usedJSHeapSize === 'number'
        ? performance.memory.usedJSHeapSize
        : null
      const memoryMb = memoryBytes != null ? Math.round(memoryBytes / (1024 * 1024)) : null
      const uptimeSec = sessionStartRef.current ? Math.round((Date.now() - sessionStartRef.current) / 1000) : null
      console.log('[TRACKING] session health:', {
        job_id: jobId,
        events: eventCountRef.current,
        reconnects: reconnectCountRef.current,
        memory_mb: memoryMb,
        uptime_sec: uptimeSec,
      })
    }, 60_000)

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    }

    const scheduleReconnect = () => {
      if (reconnectTimerRef.current) return
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null
        connect()
      }, 1000)
    }

    const connect = () => {
      if (!enabled || !jobId) return
      if (sourceRef.current) {
        sourceRef.current.close()
        sourceRef.current = null
      }

      const source = new EventSource(url.toString())
      sourceRef.current = source
      setState((prev) => ({ ...prev, connectionState: 'connecting', error: '' }))

      const handlePayload = (event) => {
        try {
          const payload = JSON.parse(event.data || '{}')
          const latitude = toNumber(payload.latitude)
          const longitude = toNumber(payload.longitude)
          const payloadTech = payload.technician_location || {}
          const payloadCustomer = payload.customer_location || {}
          const techLat = latitude ?? toNumber(payloadTech.lat)
          const techLng = longitude ?? toNumber(payloadTech.lng)
          const customerLat = toNumber(payloadCustomer.lat)
          const customerLng = toNumber(payloadCustomer.lng)
          const nextStatus = String(payload.status || jobStatus)
          const updatedAt = toIso(payload.updated_at) || new Date().toISOString()
          const payloadTimestamp = payload.timestamp || payload.updated_at || payload.last_update_timestamp
          const receivedAt = Date.now()
          const parsedTimestamp = payloadTimestamp ? Date.parse(payloadTimestamp) : NaN
          if (Number.isFinite(parsedTimestamp)) {
            const delayMs = receivedAt - parsedTimestamp
            if (typeof window !== 'undefined') {
              window.SSE_LATENCY = delayMs
            }
            if (delayMs > 2000) {
              console.warn('SSE latency high:', delayMs)
            }
          }

          eventCountRef.current += 1

          setState((prev) => ({
            ...prev,
            status: nextStatus,
            location: (techLat != null && techLng != null) ? { latitude: techLat, longitude: techLng } : prev.location,
            technicianLocation: (techLat != null && techLng != null) ? { lat: techLat, lng: techLng } : prev.technicianLocation,
            customerLocation: (customerLat != null && customerLng != null) ? { lat: customerLat, lng: customerLng } : prev.customerLocation,
            assignedTechnicianName: payload.assigned_technician_name ?? prev.assignedTechnicianName,
            assignedTechnicianPhoneNumber: payload.assigned_technician_phone_number ?? prev.assignedTechnicianPhoneNumber,
            assignedTechnicianZone: payload.assigned_technician_zone ?? prev.assignedTechnicianZone,
            reassignmentRequested: Boolean(payload.reassignment_requested ?? prev.reassignmentRequested),
            reassignmentStatus: payload.reassignment_status ?? prev.reassignmentStatus,
            reassignmentResult: payload.reassignment_result ?? prev.reassignmentResult,
            etaMinutes: toNumber(payload.eta_minutes) ?? prev.etaMinutes,
            distanceKm: toNumber(payload.distance_km) ?? prev.distanceKm,
            speedKmh: toNumber(payload.speed_kmh) ?? prev.speedKmh,
            accuracyM: toNumber(payload.accuracy_m) ?? prev.accuracyM,
            heading: toNumber(payload.heading) ?? prev.heading,
            lastUpdatedAt: updatedAt,
            connectionState: 'live',
            error: '',
          }))

          if (nextStatus && nextStatus !== 'in_progress') {
            source.close()
            sourceRef.current = null
            clearReconnectTimer()
            setState((prev) => ({ ...prev, connectionState: 'idle' }))
          }
        } catch {
          setState((prev) => ({ ...prev, connectionState: 'reconnecting' }))
        }
      }

      source.addEventListener('snapshot', handlePayload)
      source.addEventListener('update', handlePayload)
      source.addEventListener('status', handlePayload)
      source.onopen = () => {
        clearReconnectTimer()
        setState((prev) => ({ ...prev, connectionState: 'live' }))
      }
      source.onerror = () => {
        reconnectCountRef.current += 1
        setState((prev) => ({ ...prev, connectionState: 'reconnecting' }))
        if (sourceRef.current === source) {
          source.close()
          sourceRef.current = null
          scheduleReconnect()
        }
      }
    }

    connect()

    return () => {
      if (sourceRef.current) {
        sourceRef.current.close()
        sourceRef.current = null
      }
      clearReconnectTimer()
      if (healthTimerRef.current) {
        clearInterval(healthTimerRef.current)
        healthTimerRef.current = null
      }
      sourceRef.current = null
    }
  }, [enabled, jobId, jobStatus])

  const lastUpdateMs = useMemo(() => {
    if (!state.lastUpdatedAt) return 0
    const parsed = Date.parse(state.lastUpdatedAt)
    return Number.isNaN(parsed) ? 0 : parsed
  }, [state.lastUpdatedAt])

  const isStale = Boolean(
    enabled
    && jobId
    && String(state.status || '').toLowerCase() === 'in_progress'
    && lastUpdateMs
    && (Date.now() - lastUpdateMs > STALE_AFTER_MS)
  )

  return {
    ...state,
    isStale,
    tick,
  }
}
