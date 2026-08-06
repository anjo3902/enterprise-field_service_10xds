import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, ClipboardCheck, Lock, Map as MapIcon, MapPin, MapPinned, Phone, PlayCircle, Route, Wrench } from 'lucide-react'

import Card from '../../components/Card'
import InlineAlert from '../../components/InlineAlert'
import LoadingState from '../../components/LoadingState'
import Skeleton from '../../components/Skeleton'
import Modal from '../../components/Modal'
import Table from '../../components/Table'
import ReassignmentModal from '../../components/ReassignmentModal'
import { technicianApi } from '../../services/api'
import useNotification from '../../hooks/useNotification'
import { usePopup } from '../../components/ui/PopupProvider'
import useDetailModal from '../../hooks/useDetailModal'
import { useTechnicianDashboard, mergeJobsById } from '../../hooks/useData'

const RouteMap = lazy(() => import('../../components/RouteMap'))

const toFiniteCoordinate = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const hasStrictCoordinates = (lat, lng) => (
  lat !== null
  && lng !== null
  && !(Number(lat) === 0 && Number(lng) === 0)
)

const isKeralaBounds = (lat, lng) => (
  Number.isFinite(lat)
  && Number.isFinite(lng)
  && lat >= 8
  && lat <= 13
  && lng >= 74
  && lng <= 78
)

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const PREVISIT_TIMEOUT_MS = 18_000
const PREVISIT_COOLDOWN_MS = 2_000
const PREVISIT_PROGRESS_MESSAGES = [
  'Analyzing issue...',
  'Identifying tools...',
  'Preparing steps...',
]
const REPORT_TIMEOUT_MS = 8_000
const MAX_REPORT_PHOTO_BYTES = 5 * 1024 * 1024
const ALLOWED_REPORT_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const LIVE_LOCATION_INTERVAL_MS = 5_000
const LIVE_LOCATION_GEO_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 5_000,
  timeout: 10_000,
}

const isAbortError = (error) => error?.name === 'AbortError' || String(error?.message || '').toLowerCase().includes('aborted')
const formatDate = (iso) => {
  if (!iso) return 'Not provided'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? 'Not provided' : date.toLocaleString()
}

const formatField = (value) => {
  if (value === null || value === undefined) return 'Not provided'
  const text = String(value).trim()
  return text ? text : 'Not provided'
}

const normalizeSpaces = (value) => String(value || '').replace(/\s+/g, ' ').trim()

const normalizeSentence = (value) => {
  const cleaned = normalizeSpaces(value)
  if (!cleaned) return ''
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

const formatContent = (text) => {
  if (!text) return ''

  return String(text)
    .split('\n')
    .map((line) => (
      line.trim().match(/^\d+\.\s/)
        ? `• ${line.replace(/^\d+\.\s/, '')}`
        : line
    ))
    .join('\n')
}

const normalizePartsUsed = (value) => {
  const raw = String(value || '')
  const items = raw.split(',').map((entry) => normalizeSpaces(entry)).filter(Boolean)
  return items.join(', ')
}

const toApiUrl = (pathOrUrl) => {
  if (!pathOrUrl) return ''
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  const normalized = String(pathOrUrl).startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${base}${normalized}`
}

const ensureMaterialsRows = (rows = []) => {
  const normalizedRows = Array.isArray(rows)
    ? rows.map((row) => ({
      name: normalizeSpaces(row?.name),
      quantity: normalizeSpaces(row?.quantity),
    }))
    : []
  return normalizedRows.length > 0 ? normalizedRows : [{ name: '', quantity: '' }]
}

const parseMaterialsFromReport = (reportData) => {
  if (Array.isArray(reportData?.materials_used) && reportData.materials_used.length > 0) {
    return ensureMaterialsRows(reportData.materials_used)
  }

  const parts = String(reportData?.parts_used || '')
    .split(',')
    .map((item) => normalizeSpaces(item))
    .filter(Boolean)
    .map((name) => ({ name, quantity: '' }))
  return ensureMaterialsRows(parts)
}

const getStoredUserName = () => {
  try {
    const raw = sessionStorage.getItem('fsm_user')
    if (!raw) return ''
    const parsed = JSON.parse(raw)
    return normalizeSpaces(parsed?.name)
  } catch {
    return ''
  }
}

const tokenizeForSimilarity = (value) => (
  normalizeSpaces(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4)
)

const isLikelyRelatedText = (source, candidate) => {
  const normalizedSource = normalizeSpaces(source).toLowerCase()
  const normalizedCandidate = normalizeSpaces(candidate).toLowerCase()
  if (!normalizedSource || !normalizedCandidate) return false

  if (normalizedCandidate.includes(normalizedSource) || normalizedSource.includes(normalizedCandidate)) {
    return true
  }

  const sourceTokens = new Set(tokenizeForSimilarity(source))
  const candidateTokens = tokenizeForSimilarity(candidate)
  if (sourceTokens.size === 0 || candidateTokens.length === 0) return false

  let overlap = 0
  for (const token of candidateTokens) {
    if (sourceTokens.has(token)) {
      overlap += 1
    }
  }

  return overlap > 0
}

export default function TechnicianDashboard({ routeOnly = false }) {
  // ── SWR data layer ────────────────────────────────────────────────────
  const {
    activeJobs: swrActiveJobs, completedJobs, routeData: swrRouteData, technicianLocation,
    loading, error, isValidating,
    mutateJobs, mutateRoute, refreshAll,
  } = useTechnicianDashboard()

  // ── UI state ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('jobs')
  const [activeJobs, setActiveJobs] = useState([])
  const [routeData, setRouteData] = useState({ route_order: [] })
  const [linkCode, setLinkCode] = useState('')
  const [linking, setLinking] = useState(false)
  const [completingJobIds, setCompletingJobIds] = useState([])
  const [startingJobIds, setStartingJobIds] = useState([])
  const [loadingJobId, setLoadingJobId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [previsitData, setPrevisitData] = useState(null)
  const [previsitFileName, setPrevisitFileName] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeJobId, setActiveJobId] = useState(null)
  const debounceRef = useRef(null)
  const activeJobIdRef = useRef(null)
  const warningTimerRef = useRef(null)
  const controllerRef = useRef(null)
  const latestPrevisitRequestIdRef = useRef(null)
  const lastPrevisitSuccessRef = useRef(new Map())
  const lastClickRef = useRef(0)
  const liveLocationRef = useRef({ watchId: null, activeJobId: null, lastSentAt: 0 })
  const geoWarningRef = useRef(false)
  const warnedCoordsRef = useRef(new Set())
  const [reportFormOpen, setReportFormOpen] = useState(false)
  const [reportFormJob, setReportFormJob] = useState(null)
  const [reportFormData, setReportFormData] = useState({
    issue_observed: '',
    root_cause: '',
    work_done: '',
    parts_used: '',
    time_taken: '',
    customer_comments: '',
    notes: '',
  })
  const [reportFormErrors, setReportFormErrors] = useState({})
  const [materialsUsedRows, setMaterialsUsedRows] = useState([{ name: '', quantity: '' }])
  const [beforePhotoFile, setBeforePhotoFile] = useState(null)
  const [afterPhotoFile, setAfterPhotoFile] = useState(null)
  const [beforePhotoPreview, setBeforePhotoPreview] = useState('')
  const [afterPhotoPreview, setAfterPhotoPreview] = useState('')
  const [reportMeta, setReportMeta] = useState(null)
  const [reportImproving, setReportImproving] = useState(false)
  const [improvingField, setImprovingField] = useState('issue_observed')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportViewOpen, setReportViewOpen] = useState(false)
  const [reportViewLoading, setReportViewLoading] = useState(false)
  const [reportViewData, setReportViewData] = useState(null)
  const [actionError, setActionError] = useState('')
  const [previsitStatusMessage, setPrevisitStatusMessage] = useState('')
  const [reassignmentModalOpen, setReassignmentModalOpen] = useState(false)
  const [reassignmentJobId, setReassignmentJobId] = useState(null)
  const [reassignmentJobDetails, setReassignmentJobDetails] = useState(null)
  const [reassignmentSubmitting, setReassignmentSubmitting] = useState(false)
  const notification = useNotification()
  const { showPopup } = usePopup()

  const detail = useDetailModal({
    fetchDetail: technicianApi.getJobById,
    fetchImageBlob: technicianApi.getJobImageBlob,
  })

  const { jobId: jobIdParam } = useParams()
  const deepLinkJobId = useMemo(() => (jobIdParam ? String(jobIdParam) : ''), [jobIdParam])
  const deepLinkHandledRef = useRef(false)

  useEffect(() => {
    deepLinkHandledRef.current = false
  }, [deepLinkJobId])

  useEffect(() => {
    if (!deepLinkJobId || deepLinkHandledRef.current) return
    deepLinkHandledRef.current = true
    setActiveTab('jobs')
    detail.open(deepLinkJobId)
  }, [deepLinkJobId, detail.open])

  // Ensure fresh data on mount to reduce E2E flakiness (start/complete race)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        await refreshAll()
        // Also perform a direct fetch and update local state to avoid SWR cache lag
        try {
          const fresh = await technicianApi.getAssignedJobs()
          const rows = Array.isArray(fresh) ? fresh : (fresh.jobs || [])
          if (mounted) {
            setActiveJobs(rows.filter((j) => String(j.status || '').toLowerCase() !== 'completed'))
            // Update SWR cache to keep hooks in sync
            try { await mutateJobs(fresh, { revalidate: false }) } catch (_) { }
          }
        } catch (err) {
          // ignore transient fetch failures
        }
      } catch (e) {
        // best-effort
      }
    })()
    return () => { mounted = false }
  }, [])

  // If the test/worker started a job before navigation, the SWR cached value
  // may not immediately reflect it. Poll the backend briefly for an
  // `in_progress` job so UI elements (Mark Complete button, map) appear
  // deterministically during tests.
  useEffect(() => {
    let mounted = true
    const POLL_ATTEMPTS = 8
    const POLL_DELAY_MS = 500
    ;(async () => {
      try {
        if (!Array.isArray(swrActiveJobs)) return
        const hasInProgress = swrActiveJobs.some((j) => String(j.status || '').toLowerCase() === 'in_progress')
        if (hasInProgress) return
        for (let i = 0; i < POLL_ATTEMPTS && mounted; i += 1) {
          try {
            await mutateJobs()
            // also directly fetch to avoid SWR cache lag
            const fresh = await technicianApi.getAssignedJobs()
            const rows = Array.isArray(fresh) ? fresh : (fresh.jobs || [])
            const found = rows.find((j) => String(j.status || '').toLowerCase() === 'in_progress')
            if (found && mounted) {
              // trigger state update via SWR mutate
              await mutateJobs()
              break
            }
          } catch (err) {
            // ignore transient errors
          }
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, POLL_DELAY_MS))
        }
      } catch (e) {
        // best effort
      }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!Array.isArray(swrActiveJobs)) {
      setActiveJobs([])
      return
    }
    const completingIds = new Set(completingJobIds.map((id) => String(id)))
    const nextActive = swrActiveJobs.filter((job) => {
      if (!job) return false
      if (completingIds.has(String(job.id))) return false
      return String(job.status || '').toLowerCase() !== 'completed'
    })
    setActiveJobs((prevActive) => {
      const prevHasInProgress = Array.isArray(prevActive)
        && prevActive.some((job) => String(job?.status || '').toLowerCase() === 'in_progress')
      const nextHasInProgress = nextActive.some((job) => String(job?.status || '').toLowerCase() === 'in_progress')

      // Preserve a freshly started job if SWR briefly replays a stale assigned snapshot.
      if (prevHasInProgress && !nextHasInProgress) {
        return prevActive
      }

      return nextActive
    })
  }, [swrActiveJobs, completingJobIds])

  useEffect(() => {
    setRouteData(swrRouteData || { route_order: [] })
  }, [swrRouteData])

  useEffect(() => {
    console.log('ACTIVE JOBS:', activeJobs)
  }, [activeJobs])

  useEffect(() => {
    console.log('ROUTE DATA:', routeData)
  }, [routeData])

  const fetchOptimizedRoute = useCallback(async (jobsForRoute = []) => {
    if (!jobsForRoute.length) {
      setRouteData({ route_order: [] })
      if (typeof window !== 'undefined') window.MAP_MARKERS_COUNT = 0
      return
    }

    // Retry route fetch a few times to allow backend to persist changes
    // (useful when a job was just completed and DB propagation may be eventual).
    const MAX_RETRIES = 5
    const RETRY_DELAY_MS = 400
    let attempts = 0
    try {
      while (attempts < MAX_RETRIES) {
        attempts += 1
        try {
          const data = await technicianApi.getMyRoute()
          const payload = data || { route_order: [] }
          setRouteData(payload)

          // If the current jobsForRoute contain an id that is still present in
          // the returned route_order, wait and retry a few times to let the
          // backend settle (this prevents flaky E2E assertions).
          const routeIds = new Set((payload.route_order || []).map((id) => String(id)))
          const stale = jobsForRoute.some((j) => String(j.id) && routeIds.has(String(j.id)) === false && attempts < MAX_RETRIES)
          // If none of the jobs are present in the route_order and we previously
          // expected jobs, break early.
          if (!stale) break
        } catch (err) {
          // swallow intermediate errors and retry
          if (attempts >= MAX_RETRIES) throw err
        }
        // small backoff
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
      }
    } catch (err) {
      console.error('Route fetch failed', err)
    }
  }, [])

  useEffect(() => {
    if (!activeJobs.length) return
    fetchOptimizedRoute(activeJobs)
  }, [activeJobs, fetchOptimizedRoute])

  const activeRouteOrder = useMemo(() => {
    const order = Array.isArray(routeData?.route_order) ? routeData.route_order : []
    if (!Array.isArray(activeJobs) || activeJobs.length === 0) return []
    const activeIds = new Set(activeJobs.map((job) => String(job.id)))
    return order.filter((id) => activeIds.has(String(id)))
  }, [routeData, activeJobs])

  const orderedActiveJobs = useMemo(() => {
    if (!Array.isArray(activeJobs) || activeJobs.length === 0) {
      return []
    }

    const order = activeRouteOrder
    if (order.length === 0) {
      return activeJobs
    }

    const byId = new Map(activeJobs.map((job) => [Number(job.id), job]))
    const ordered = order.map((id) => byId.get(Number(id))).filter(Boolean)
    const orderedIds = new Set(ordered.map((job) => Number(job.id)))
    const remainder = activeJobs.filter((job) => !orderedIds.has(Number(job.id)))
    return [...ordered, ...remainder]
  }, [activeJobs, activeRouteOrder])

  const inProgressJob = useMemo(
    () => orderedActiveJobs.find((job) => String(job?.status || '').toLowerCase() === 'in_progress'),
    [orderedActiveJobs]
  )

  const warnIfOutOfKerala = useCallback((label, lat, lng) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
    if (isKeralaBounds(lat, lng)) return false
    const key = `${label}:${lat}:${lng}`
    if (!warnedCoordsRef.current.has(key)) {
      warnedCoordsRef.current.add(key)
      console.warn('Invalid coordinates detected', { label, lat, lng })
    }
    return true
  }, [])

  const googleMapsUrl = useMemo(() => {
    if (!technicianLocation || !Array.isArray(orderedActiveJobs) || orderedActiveJobs.length === 0) {
      return ''
    }

    const originLat = toFiniteCoordinate(technicianLocation.latitude)
    const originLng = toFiniteCoordinate(technicianLocation.longitude)
    if (!hasStrictCoordinates(originLat, originLng)) {
      return ''
    }
    warnIfOutOfKerala('technician-origin', originLat, originLng)

    const routeJobs = orderedActiveJobs
      .map((job) => ({
        id: job.id,
        lat: toFiniteCoordinate(job.latitude),
        lng: toFiniteCoordinate(job.longitude),
      }))
      .filter((job) => hasStrictCoordinates(job.lat, job.lng))
      .filter((job) => {
        warnIfOutOfKerala(`job-${job.id}`, job.lat, job.lng)
        return true
      })

    if (routeJobs.length === 0) {
      return ''
    }

    const origin = `${originLat},${originLng}`
    const destinationJob = routeJobs[routeJobs.length - 1]
    const destination = `${destinationJob.lat},${destinationJob.lng}`

    const params = new URLSearchParams({
      api: '1',
      origin,
      destination,
      travelmode: 'driving',
    })

    if (routeJobs.length > 1) {
      const waypointJobs = routeJobs.slice(0, -1)
      if (waypointJobs.length > 0) {
        const waypoints = waypointJobs.map((job) => `${job.lat},${job.lng}`).join('|')
        params.set('waypoints', waypoints)
      }
    }

    return `https://www.google.com/maps/dir/?${params.toString()}`
  }, [technicianLocation, orderedActiveJobs])

  const openGoogleMapsNavigation = () => {
    if (!googleMapsUrl) {
      return
    }
    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer')
  }

  useEffect(() => {
    if (!isGenerating) {
      setPrevisitStatusMessage('')
      return undefined
    }

    let index = 0
    setPrevisitStatusMessage(PREVISIT_PROGRESS_MESSAGES[index])
    const intervalId = window.setInterval(() => {
      index = (index + 1) % PREVISIT_PROGRESS_MESSAGES.length
      setPrevisitStatusMessage(PREVISIT_PROGRESS_MESSAGES[index])
    }, 2500)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isGenerating])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return undefined
    }

    const stopTracking = () => {
      if (liveLocationRef.current.watchId != null) {
        navigator.geolocation.clearWatch(liveLocationRef.current.watchId)
      }
      liveLocationRef.current.watchId = null
      liveLocationRef.current.activeJobId = null
      liveLocationRef.current.lastSentAt = 0
    }

    if (!inProgressJob) {
      stopTracking()
      return undefined
    }

    const activeJobId = String(inProgressJob.id)
    if (liveLocationRef.current.activeJobId === activeJobId) {
      return undefined
    }

    stopTracking()
    liveLocationRef.current.activeJobId = activeJobId
    geoWarningRef.current = false

    const onSuccess = (pos) => {
      const now = Date.now()
      if (now - liveLocationRef.current.lastSentAt < LIVE_LOCATION_INTERVAL_MS) {
        return
      }
      liveLocationRef.current.lastSentAt = now

      const coords = pos?.coords || {}
      if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
        return
      }
      const payload = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy_m: coords.accuracy,
        heading: coords.heading,
        speed_mps: coords.speed,
        timestamp: new Date(pos.timestamp || Date.now()).toISOString(),
      }

      technicianApi.updateLiveLocation(activeJobId, payload).catch((err) => {
        const msg = err?.response?.data?.detail || 'Unable to send live location updates.'
        if (!geoWarningRef.current) {
          geoWarningRef.current = true
          notification.warning({
            title: 'Live Tracking Warning',
            message: msg,
            dedupeKey: `technician-live-tracking:${activeJobId}`,
          })
        }
      })
    }

    const onError = (err) => {
      if (geoWarningRef.current) return
      geoWarningRef.current = true
      notification.warning({
        title: 'Live Tracking Disabled',
        message: err?.message || 'Enable location services to share live technician updates.',
        dedupeKey: 'technician-live-tracking:geo-disabled',
      })
    }

    const watchId = navigator.geolocation.watchPosition(
      onSuccess,
      onError,
      LIVE_LOCATION_GEO_OPTIONS
    )

    liveLocationRef.current.watchId = watchId

    return () => {
      stopTracking()
    }
  }, [inProgressJob, notification])

  const canLinkProfile = error.toLowerCase().includes('technician profile is not linked')

  const handleLinkProfile = useCallback(async (e) => {
    e.preventDefault()
    if (!linkCode.trim()) {
      notification.warning({
        title: 'Technician Code Required',
        message: 'Enter a valid technician code to link your profile.',
        dedupeKey: 'technician-dashboard:link-code-required',
      })
      return
    }

    setLinking(true)
    try {
      const result = await technicianApi.linkProfile({ technician_code: linkCode.trim() })
      notification.success({
        title: 'Profile Linked',
        message: `Linked successfully: ${result.technician_code} - ${result.technician_name}`,
        dedupeKey: `technician-dashboard:profile-linked:${result.technician_code}`,
      })
      setLinkCode('')
      await refreshAll()
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to link technician profile'
      setActionError(msg)
      notification.error({
        title: 'Profile Link Failed',
        message: msg,
        dedupeKey: `technician-dashboard:profile-link-failed:${msg}`,
      })
    } finally {
      setLinking(false)
    }
  }, [linkCode, refreshAll, notification])

  const handleMarkCompleted = useCallback(async (jobId) => {
    if (completingJobIds.includes(jobId)) {
      return
    }

    // Client-side guard: only allow completing in_progress jobs
    const job = activeJobs.find((j) => Number(j.id) === Number(jobId))
    if (job && job.status !== 'in_progress') {
      notification.warning({
        title: 'Cannot Complete Yet',
        message: 'Start the job before marking it complete.',
        dedupeKey: 'technician-dashboard:complete-before-start',
      })
      return
    }

    setCompletingJobIds((prev) => [...prev, jobId])
    setActionError('')
    try {
      const result = await technicianApi.completeJob(jobId)
      const completedAt = result?.completed_at || new Date().toISOString()
      const normalizedJobId = Number(jobId)

      // Optimistic SWR cache update
      mutateJobs((prev) => {
        if (!prev) return prev
        const jobs = Array.isArray(prev.jobs) ? prev.jobs : Array.isArray(prev) ? prev : []
        const completed = Array.isArray(prev.completed_jobs) ? prev.completed_jobs : []
        const target = jobs.find((j) => Number(j.id) === normalizedJobId)
        return {
          ...prev,
          jobs: jobs.filter((j) => Number(j.id) !== normalizedJobId),
          completed_jobs: target
            ? [{ ...target, status: 'completed', completed_at: completedAt }, ...completed]
            : completed,
        }
      }, { revalidate: false })

      const nextActiveJobs = activeJobs.filter((j) => Number(j.id) !== normalizedJobId)
      setActiveJobs(nextActiveJobs)
      setRouteData((prev) => ({
        ...prev,
        route_order: Array.isArray(prev?.route_order)
          ? prev.route_order.filter((id) => Number(id) !== normalizedJobId)
          : [],
      }))

      notification.success({
        title: 'Job Completed',
        message: `Job #${jobId} marked as completed.`,
        dedupeKey: `technician-dashboard:job-completed:${jobId}`,
      })

      await refreshAll()
      await fetchOptimizedRoute(nextActiveJobs)
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to mark job as completed'
      notification.error({
        title: 'Complete Job Failed',
        message: msg,
        dedupeKey: `technician-dashboard:complete-failed:${jobId}:${msg}`,
      })
    } finally {
      setCompletingJobIds((prev) => prev.filter((id) => id !== jobId))
    }
  }, [activeJobs, completingJobIds, mutateJobs, refreshAll, notification, fetchOptimizedRoute])

  const handleStartJob = useCallback(async (jobId) => {
    if (startingJobIds.includes(jobId)) return
    setStartingJobIds((prev) => [...prev, jobId])
    setActionError('')
    try {
      await technicianApi.startJob(jobId)

      // Optimistic SWR cache update
      mutateJobs((prev) => {
        if (!prev) return prev
        const jobs = Array.isArray(prev.jobs) ? prev.jobs : Array.isArray(prev) ? prev : []
        return {
          ...prev,
          jobs: jobs.map((j) =>
            Number(j.id) === Number(jobId)
              ? { ...j, status: 'in_progress', is_locked: true }
              : { ...j, is_locked: false, status: j.status === 'in_progress' ? 'assigned' : j.status }
          ),
        }
      }, { revalidate: false })

      await refreshAll()
      notification.success({
        title: 'Job Started',
        message: `Job #${jobId} is now in progress.`,
        dedupeKey: `technician-dashboard:job-started:${jobId}`,
      })
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to start job'
      notification.error({
        title: 'Start Job Failed',
        message: msg,
        dedupeKey: `technician-dashboard:start-failed:${jobId}:${msg}`,
      })
    } finally {
      setStartingJobIds((prev) => prev.filter((id) => id !== jobId))
    }
  }, [startingJobIds, mutateJobs, refreshAll, notification])

  const handleRequestReassignment = useCallback((jobId) => {
    const job = activeJobs.find((j) => Number(j.id) === Number(jobId))
    if (!job) {
      notification.warning({
        title: 'Job Not Found',
        message: 'Unable to locate job for reassignment.',
        dedupeKey: 'technician-dashboard:job-not-found',
      })
      return
    }

    const jobStatus = String(job.status || '').toLowerCase()
    if (jobStatus === 'in_progress') {
      notification.warning({
        title: 'Work Started',
        message: 'Reassignment is not allowed after work has started.',
        dedupeKey: `technician-dashboard:reassignment-in-progress:${job.id}`,
      })
      return
    }
    if (['completed', 'cancelled', 'canceled', 'closed', 'failed'].includes(jobStatus)) {
      notification.warning({
        title: 'Reassignment Unavailable',
        message: 'Cannot request reassignment for a closed job.',
        dedupeKey: `technician-dashboard:reassignment-closed:${job.id}`,
      })
      return
    }
    if (!['assigned', 'scheduled', 'dispatched'].includes(jobStatus)) {
      notification.warning({
        title: 'Reassignment Unavailable',
        message: 'Reassignment is only allowed before work starts.',
        dedupeKey: `technician-dashboard:reassignment-not-eligible:${job.id}`,
      })
      return
    }

    const reassignmentStatus = String(job.reassignment_status || '').toLowerCase()
    if (job.reassignment_requested || reassignmentStatus === 'requested' || reassignmentStatus === 'pending' || reassignmentStatus === 'processing') {
      notification.info({
        title: 'Reassignment Pending',
        message: `Job #${job.id} already has a reassignment request in progress.`,
        dedupeKey: `technician-dashboard:reassignment-pending:${job.id}`,
      })
      return
    }

    setReassignmentJobId(jobId)
    setReassignmentJobDetails({
      id: job.id,
      fault_type: job.fault_type,
      location_text: job.location_text,
      severity: job.severity,
    })
    setReassignmentModalOpen(true)
  }, [activeJobs, notification])

  const handleReassignmentSubmit = useCallback(async (payload) => {
    if (reassignmentSubmitting) return
    setReassignmentSubmitting(true)
    const targetJobId = reassignmentJobId

    try {
      await technicianApi.requestReassignment(targetJobId, payload)

      mutateJobs((prev) => {
        if (!prev) return prev
        const jobs = Array.isArray(prev.jobs) ? prev.jobs : Array.isArray(prev) ? prev : []
        const updatedJobs = jobs.map((job) => (
          Number(job.id) === Number(targetJobId)
            ? { ...job, reassignment_requested: true, reassignment_status: 'requested' }
            : job
        ))
        if (Array.isArray(prev.jobs)) {
          return { ...prev, jobs: updatedJobs }
        }
        return updatedJobs
      }, { revalidate: false })

      setActiveJobs((prev) => prev.map((job) => (
        Number(job.id) === Number(targetJobId)
          ? { ...job, reassignment_requested: true, reassignment_status: 'requested' }
          : job
      )))

      notification.success({
        title: 'Reassignment Requested',
        message: `Job #${targetJobId} reassignment request submitted for admin approval.`,
        dedupeKey: `technician-dashboard:reassignment-requested:${targetJobId}`,
      })

      setReassignmentModalOpen(false)
      setReassignmentJobId(null)
      setReassignmentJobDetails(null)

      // Refresh data to reflect any changes
      await refreshAll()
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to request reassignment'
      notification.error({
        title: 'Reassignment Request Failed',
        message: msg,
        dedupeKey: `technician-dashboard:reassignment-failed:${targetJobId}:${msg}`,
      })
    } finally {
      setReassignmentSubmitting(false)
    }
  }, [reassignmentJobId, reassignmentSubmitting, mutateJobs, notification, refreshAll])

  const openReportForm = useCallback((job) => {
    if (reportSubmitting) return
    setReportFormJob(job)
    setReportMeta({
      jobId: String(job?.id || ''),
      technicianName: getStoredUserName() || 'Technician',
      serviceDate: new Date().toISOString(),
      serviceLocation: normalizeSpaces(job?.location_text || job?.location_zone || ''),
    })
    setReportFormErrors({})
    setReportFormData({
      issue_observed: '',
      root_cause: '',
      work_done: '',
      parts_used: '',
      time_taken: '',
      customer_comments: '',
      notes: '',
    })
    setMaterialsUsedRows([{ name: '', quantity: '' }])
    setBeforePhotoFile(null)
    setAfterPhotoFile(null)
    setBeforePhotoPreview('')
    setAfterPhotoPreview('')
    setReportFormOpen(true)
  }, [])

  const fetchReportWithTimeout = useCallback(async (jobId) => {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), REPORT_TIMEOUT_MS)
    try {
      return await technicianApi.getReport(jobId, { signal: controller.signal })
    } finally {
      window.clearTimeout(timeoutId)
    }
  }, [])

  const fetchReportWithRetry = useCallback(async (jobId) => {
    try {
      return await fetchReportWithTimeout(jobId)
    } catch (firstError) {
      if (isAbortError(firstError)) {
        showPopup({
          type: 'warning',
          title: 'Server taking too long. Please retry.',
          message: 'Server taking too long. Please retry.',
        })
        throw firstError
      }
      showPopup({
        type: 'warning',
        title: 'Network issue, retrying...',
        message: 'Network issue, retrying report fetch once.',
      })
      await delay(1000)
      try {
        return await fetchReportWithTimeout(jobId)
      } catch (secondError) {
        if (isAbortError(secondError)) {
          showPopup({
            type: 'warning',
            title: 'Server taking too long. Please retry.',
            message: 'Server taking too long. Please retry.',
          })
        }
        throw secondError
      }
    }
  }, [fetchReportWithTimeout, showPopup])

  const openReportView = useCallback(async (jobId) => {
    if (reportViewLoading) return
    setReportViewLoading(true)
    setReportViewOpen(true)
    setReportViewData(null)

    try {
      const data = await fetchReportWithRetry(jobId)
      if (data && data.status === 'missing') {
        showPopup({ type: 'warning', title: 'Report still processing', message: 'Report still processing. Please try again.' })
        setReportViewOpen(false)
        return
      }
      setReportViewData(data?.report_data || data?.report || null)
    } catch (err) {
      showPopup({ type: 'error', title: 'Failed to load report', message: err?.message || 'Unable to fetch report' })
      setReportViewOpen(false)
    } finally {
      setReportViewLoading(false)
    }
  }, [fetchReportWithRetry, reportViewLoading, showPopup])

  const visibleReport = useMemo(() => ({
    jobId: formatField(reportViewData?.job_id),
    submittedAt: formatDate(reportViewData?.submitted_at),
    technicianName: formatField(reportViewData?.technician_name),
    serviceLocation: formatField(reportViewData?.service_location),
    issueObserved: formatField(reportViewData?.issue_observed),
    rootCause: formatField(reportViewData?.root_cause),
    workDone: formatField(reportViewData?.work_done),
    partsUsed: formatField(reportViewData?.parts_used),
    timeTaken: formatField(reportViewData?.time_taken),
    customerComments: formatField(reportViewData?.customer_comments),
    notes: formatField(reportViewData?.notes),
    beforePhotoUrl: toApiUrl(reportViewData?.before_photo_url),
    afterPhotoUrl: toApiUrl(reportViewData?.after_photo_url),
    materialsUsed: parseMaterialsFromReport(reportViewData),
  }), [reportViewData])

  const closeReportForm = useCallback(() => {
    setReportFormOpen(false)
    setReportFormJob(null)
    setReportMeta(null)
    setReportFormErrors({})
    setReportFormData({
      issue_observed: '',
      root_cause: '',
      work_done: '',
      parts_used: '',
      time_taken: '',
      customer_comments: '',
      notes: '',
    })
    setMaterialsUsedRows([{ name: '', quantity: '' }])
    setBeforePhotoFile(null)
    setAfterPhotoFile(null)
    setBeforePhotoPreview('')
    setAfterPhotoPreview('')
  }, [])

  const updateReportField = useCallback((field, value) => {
    setReportFormData((prev) => ({ ...prev, [field]: value }))
    setReportFormErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const updateMaterialRow = useCallback((index, field, value) => {
    setMaterialsUsedRows((prev) => prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row)))
    setReportFormErrors((prev) => {
      if (!prev.materials_used) return prev
      const next = { ...prev }
      delete next.materials_used
      return next
    })
  }, [])

  const addMaterialRow = useCallback(() => {
    setMaterialsUsedRows((prev) => [...prev, { name: '', quantity: '' }])
  }, [])

  const removeMaterialRow = useCallback((index) => {
    setMaterialsUsedRows((prev) => {
      const next = prev.filter((_, idx) => idx !== index)
      return next.length > 0 ? next : [{ name: '', quantity: '' }]
    })
  }, [])

  const handlePhotoSelection = useCallback((event, kind) => {
    const file = event?.target?.files?.[0] || null
    if (!file) {
      if (kind === 'before') {
        setBeforePhotoFile(null)
        setBeforePhotoPreview('')
      } else {
        setAfterPhotoFile(null)
        setAfterPhotoPreview('')
      }
      return
    }

    if (!ALLOWED_REPORT_PHOTO_TYPES.has(file.type)) {
      showPopup({ type: 'warning', title: 'Invalid Photo', message: 'Please upload JPG, PNG, or WEBP image files only.' })
      event.target.value = ''
      return
    }

    if (file.size > MAX_REPORT_PHOTO_BYTES) {
      showPopup({ type: 'warning', title: 'Photo Too Large', message: 'Photo must be 5MB or smaller.' })
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const preview = String(reader.result || '')
      if (kind === 'before') {
        setBeforePhotoFile(file)
        setBeforePhotoPreview(preview)
      } else {
        setAfterPhotoFile(file)
        setAfterPhotoPreview(preview)
      }
    }
    reader.onerror = () => {
      showPopup({ type: 'error', title: 'Preview Failed', message: 'Unable to preview selected image.' })
    }
    reader.readAsDataURL(file)
  }, [showPopup])

  const uploadReportPhoto = useCallback(async (file, kind, jobId) => {
    if (!file) return ''

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), REPORT_TIMEOUT_MS)
    try {
      const body = new FormData()
      body.append('job_id', String(jobId))
      body.append('photo_kind', kind)
      body.append('image', file)

      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/technician/report-photo-upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('fsm_token')}`,
        },
        signal: controller.signal,
        body,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.detail || `Failed to upload ${kind} photo`)
      }

      const data = await response.json().catch(() => ({}))
      return String(data?.url || '')
    } finally {
      window.clearTimeout(timeoutId)
    }
  }, [])

  const validateAndNormalizeReport = useCallback((formData, materialRows) => {
    const normalized = {
      issue_observed: normalizeSentence(formData.issue_observed),
      root_cause: normalizeSentence(formData.root_cause),
      work_done: normalizeSentence(formData.work_done),
      parts_used: normalizePartsUsed(formData.parts_used),
      time_taken: normalizeSpaces(formData.time_taken),
      notes: normalizeSentence(formData.notes),
    }

    const errors = {}

    if (normalized.issue_observed.length < 10) {
      errors.issue_observed = 'Please describe the issue properly (min 10 characters)'
    }

    if (normalized.work_done.length < 10) {
      errors.work_done = 'Please describe the work done properly (min 10 characters)'
    }

    const minutes = Number(normalized.time_taken)
    if (!normalized.time_taken || !Number.isFinite(minutes) || minutes <= 0) {
      errors.time_taken = 'Please provide valid time taken in minutes'
    } else if (minutes < 1 || minutes > 600) {
      errors.time_taken = 'Time taken must be between 1 and 600 minutes'
    }

    const normalizedMaterials = ensureMaterialsRows(materialRows)
      .map((row) => ({
        name: normalizeSentence(row.name),
        quantity: normalizeSpaces(row.quantity),
      }))
      .filter((row) => row.name || row.quantity)

    const invalidMaterial = normalizedMaterials.find((row) => {
      const hasName = Boolean(row.name)
      const hasQuantity = Boolean(row.quantity)
      if (hasName !== hasQuantity) return true
      const qty = Number(row.quantity)
      if (!Number.isFinite(qty) || qty <= 0) return true
      return false
    })
    if (invalidMaterial) {
      errors.materials_used = 'Each material row requires both name and positive quantity.'
    }

    return {
      errors,
      payload: {
        issue_observed: normalized.issue_observed,
        root_cause: normalized.root_cause,
        work_done: normalized.work_done,
        parts_used: normalizedMaterials.map((row) => `${row.name} (x${Math.round(Number(row.quantity))})`).join(', ') || normalized.parts_used,
        materials_used: normalizedMaterials.map((row) => ({ name: row.name, quantity: Math.round(Number(row.quantity)) })),
        time_taken: Math.round(minutes),
        customer_comments: normalizeSentence(formData.customer_comments),
        notes: normalized.notes,
      },
    }
  }, [])

  const handleImproveWithAI = useCallback(async (fieldName) => {
    const targetField = fieldName || improvingField || 'issue_observed'
    const textToImprove = normalizeSentence(reportFormData[targetField])
    if (!textToImprove.trim()) {
      showPopup({
        type: 'warning',
        title: 'No Content',
        message: 'Please write text in the selected field before requesting AI assistance.',
      })
      return
    }
    if (textToImprove.length < 10) {
      showPopup({
        type: 'warning',
        title: 'More Detail Needed',
        message: 'Please describe the issue properly (min 10 characters).',
      })
      return
    }

    setReportImproving(true)
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), REPORT_TIMEOUT_MS)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/reports/improve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('fsm_token')}`,
        },
        signal: controller.signal,
        body: JSON.stringify({ text: textToImprove }),
      })

      if (!response.ok) throw new Error('Failed to improve text')
      const result = await response.json()
      const candidateText = normalizeSentence(result?.improved_text || '')
      const isEmpty = !candidateText
      const isTooShort = candidateText.length < Math.floor(textToImprove.length * 0.8)
      const isUnrelated = !isLikelyRelatedText(textToImprove, candidateText)
      const safeText = (isEmpty || isTooShort || isUnrelated) ? textToImprove : candidateText

      updateReportField(targetField, safeText)
      notification.success({
        title: 'AI Assist',
        message: 'Text improved successfully',
        dedupeKey: `technician-report:ai-improved:${targetField}`,
      })
    } catch (error) {
      if (isAbortError(error)) {
        showPopup({ type: 'warning', title: 'Server taking too long. Please retry.', message: 'Server taking too long. Please retry.' })
      } else {
        showPopup({
          type: 'error',
          title: 'AI Assist Failed',
          message: error?.message || 'Unable to improve text',
        })
      }
    } finally {
      window.clearTimeout(timeoutId)
      setReportImproving(false)
    }
  }, [improvingField, notification, reportFormData, showPopup, updateReportField])

  const handleSubmitReport = useCallback(async () => {
    if (!reportFormJob) return
    if (reportFormJob.report_submitted) {
      showPopup({
        type: 'warning',
        title: 'Already Submitted',
        message: 'Report for this job has already been submitted.',
      })
      closeReportForm()
      return
    }
    const { errors, payload: normalizedPayload } = validateAndNormalizeReport(reportFormData, materialsUsedRows)
    if (Object.keys(errors).length > 0) {
      setReportFormErrors(errors)
      return
    }
    if (reportSubmitting) return
    setReportSubmitting(true)

    try {
      const [beforePhotoUrl, afterPhotoUrl] = await Promise.all([
        uploadReportPhoto(beforePhotoFile, 'before', reportFormJob.id),
        uploadReportPhoto(afterPhotoFile, 'after', reportFormJob.id),
      ])

      const payload = {
        job_id: reportFormJob.id,
        issue_observed: normalizedPayload.issue_observed,
        root_cause: normalizedPayload.root_cause,
        work_done: normalizedPayload.work_done,
        parts_used: normalizedPayload.parts_used,
        materials_used: normalizedPayload.materials_used,
        time_taken: normalizedPayload.time_taken,
        customer_comments: normalizedPayload.customer_comments,
        notes: normalizedPayload.notes,
        before_photo_url: beforePhotoUrl,
        after_photo_url: afterPhotoUrl,
        review_notes: 'E2E_REPORT', // Tag for cleanup purposes
      }

      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), REPORT_TIMEOUT_MS)
      let response
      try {
        response = await fetch(`${import.meta.env.VITE_API_URL || ''}/technician/submit-report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('fsm_token')}`,
          },
          signal: controller.signal,
          body: JSON.stringify(payload),
        })
      } finally {
        window.clearTimeout(timeoutId)
      }

      const status = response.status
      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        // Fetch persisted report to confirm it exists before updating UI
        try {
          const fetched = await fetchReportWithRetry(reportFormJob.id)
          if (fetched && fetched.report_data) {
            setReportViewData(fetched.report_data)
            mutateJobs((prev) => {
              if (!prev) return prev
              const jobs = Array.isArray(prev.jobs) ? prev.jobs : Array.isArray(prev) ? prev : []
              const completed = Array.isArray(prev.completed_jobs) ? prev.completed_jobs : []
              const normalize = (arr) => arr.map((j) => (String(j.id) === String(reportFormJob.id) ? { ...j, report_submitted: true } : j))
              return {
                ...prev,
                jobs: normalize(jobs),
                completed_jobs: normalize(completed),
              }
            }, { revalidate: false })
            showPopup({ type: 'success', title: 'Report Submitted', message: 'Your report has been submitted successfully.' })
            closeReportForm()
            await refreshAll()
          } else if (fetched && fetched.status === 'missing') {
            // Backend says report not yet available — don't mark as submitted
            showPopup({ type: 'warning', title: 'Report still processing', message: 'Report still processing. Please try again.' })
          } else {
            // Unexpected shape — still notify success but avoid changing submitted flag
            showPopup({ type: 'success', title: 'Report Submitted', message: 'Your report was submitted; refresh to check status.' })
            closeReportForm()
          }
        } catch (err) {
          showPopup({ type: 'warning', title: 'Report still processing', message: 'Report still processing. Please try again.' })
        }
      } else if (status === 409) {
        // Duplicate detected — fetch the existing report to update UI
        try {
          const fetched = await fetchReportWithRetry(reportFormJob.id)
          if (fetched && fetched.report_data) {
            setReportViewData(fetched.report_data)
            mutateJobs((prev) => {
              if (!prev) return prev
              const jobs = Array.isArray(prev.jobs) ? prev.jobs : Array.isArray(prev) ? prev : []
              const completed = Array.isArray(prev.completed_jobs) ? prev.completed_jobs : []
              const normalize = (arr) => arr.map((j) => (String(j.id) === String(reportFormJob.id) ? { ...j, report_submitted: true } : j))
              return {
                ...prev,
                jobs: normalize(jobs),
                completed_jobs: normalize(completed),
              }
            }, { revalidate: false })
            showPopup({ type: 'success', title: 'Report Submitted', message: 'Report was already submitted — refreshed view.' })
            closeReportForm()
          } else if (fetched && fetched.status === 'missing') {
            showPopup({ type: 'warning', title: 'Report still processing', message: 'Report still processing. Please try again.' })
          } else {
            showPopup({ type: 'success', title: 'Report Submitted', message: 'Report was already submitted.' })
            closeReportForm()
          }
        } catch (err) {
          showPopup({ type: 'warning', title: 'Report still processing', message: 'Report still processing. Please try again.' })
        }
      } else {
        throw new Error(data.detail || 'Failed to submit report')
      }
    } catch (error) {
      if (isAbortError(error)) {
        showPopup({
          type: 'warning',
          title: 'Server taking too long. Please retry.',
          message: 'Server taking too long. Please retry.',
        })
        return
      }
      showPopup({ type: 'error', title: 'Report Submission Failed', message: error?.message || 'Unable to submit report' })
    } finally {
      setReportSubmitting(false)
    }
  }, [
    afterPhotoFile,
    beforePhotoFile,
    closeReportForm,
    fetchReportWithRetry,
    materialsUsedRows,
    mutateJobs,
    refreshAll,
    reportFormData,
    reportFormJob,
    reportSubmitting,
    showPopup,
    uploadReportPhoto,
    validateAndNormalizeReport,
  ])

  const downloadReport = useCallback((reportText, fileName) => {
    const fallbackName = 'previsit_report.txt'
    const resolvedFileName = typeof fileName === 'string' && fileName.trim() ? fileName.trim() : fallbackName
    const url = `data:text/plain;charset=utf-8,${encodeURIComponent(reportText || '')}`
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = resolvedFileName
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    window.setTimeout(() => {
      anchor.remove()
    }, 300)
  }, [])

  const handlePrevisitReport = useCallback(async (jobId) => {
    const now = Date.now()
    if (now - lastClickRef.current < PREVISIT_COOLDOWN_MS) return
    lastClickRef.current = now

    if (activeJobId === jobId) return

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      const cached = lastPrevisitSuccessRef.current.get(String(jobId))
      const offlineText = cached?.reportText || [
        'SECTION 1: SUMMARY',
        'No internet connection. Please check your network.',
        'SECTION 2: SUGGESTION',
        '- Check device, tools, and safety before visit.',
      ].join('\n')
      setPrevisitData(offlineText)
      setPrevisitFileName(cached?.fileName || `previsit_job_${jobId}.txt`)
      setActionError('')
      setModalOpen(true)
      showPopup({
        type: 'warning',
        title: 'No internet connection',
        message: 'No internet connection. Please check your network.',
      })
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current)
      warningTimerRef.current = null
    }

    setPrevisitData(null)
    setPrevisitFileName('')
    setActionError('')

    setIsGenerating(true)
    setActiveJobId(jobId)
    activeJobIdRef.current = jobId
    setLoadingJobId(jobId)

    warningTimerRef.current = window.setTimeout(() => {
      if (activeJobIdRef.current === jobId) {
        showPopup({
          type: 'warning',
          title: 'Still Processing',
          message: 'AI is taking longer than expected...',
        })
      }
    }, 5000)

    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    latestPrevisitRequestIdRef.current = requestId

    const fetchPrevisit = async () => {
      const token = sessionStorage.getItem('fsm_token')
      const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
      const maxAttempts = 2
      let attempts = 0
      let lastError = null

      while (attempts < maxAttempts) {
        attempts += 1

        try {
          console.log({ event: 'previsit_request', jobId, attempt: attempts })

          if (controllerRef.current) {
            try {
              controllerRef.current.abort()
            } catch (abortError) {
              // ignore abort cleanup errors
            }
          }

          const controller = new AbortController()
          controllerRef.current = controller
          const timeoutId = window.setTimeout(() => controller.abort(), PREVISIT_TIMEOUT_MS)
          const startedAt = performance.now()

          try {
            const response = await fetch(`${base}/reports/previsit`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: token ? `Bearer ${token}` : undefined,
              },
              signal: controller.signal,
              body: JSON.stringify({ job_id: jobId }),
            })

            const payload = await response.json().catch(() => ({}))
            const duration = Math.round(performance.now() - startedAt)

            if (!response.ok) {
              throw new Error(payload?.detail || 'Unable to generate report')
            }

            if (latestPrevisitRequestIdRef.current !== requestId) {
              return { stale: true }
            }

            console.log({ event: 'previsit_response', jobId, attempt: attempts, duration })
            return {
              reportText: payload?.report_text || '',
              fileName: payload?.file_name || `previsit_job_${jobId}.txt`,
            }
          } finally {
            window.clearTimeout(timeoutId)
          }
        } catch (error) {
          lastError = error
          if (latestPrevisitRequestIdRef.current !== requestId) {
            return { stale: true }
          }

          if (attempts < maxAttempts) {
            await delay(1000)
            continue
          }

          throw lastError
        }
      }

      throw lastError || new Error('Unable to generate report')
    }

    try {
      const result = await fetchPrevisit()
      if (!result || result.stale) {
        return
      }

      lastPrevisitSuccessRef.current.set(String(jobId), {
        reportText: result.reportText,
        fileName: result.fileName,
      })

      setPrevisitData(result.reportText)
      setPrevisitFileName(result.fileName)
      setActionError('')
      setModalOpen(true)
    } catch (error) {
      console.error('PREVISIT ERROR:', error)
      if (latestPrevisitRequestIdRef.current !== requestId) {
        return
      }

      const cached = lastPrevisitSuccessRef.current.get(String(jobId))
      if (cached?.reportText) {
        setPrevisitData(cached.reportText)
        setPrevisitFileName(cached.fileName || `previsit_job_${jobId}.txt`)
        setActionError('')
        setModalOpen(true)
        showPopup({
          type: 'warning',
          title: 'Showing last saved briefing',
          message: 'Unable to refresh AI plan right now. Showing the most recent successful result.',
        })
        return
      }

      const fallbackText = [
        'SECTION 1: SUMMARY',
        'Unable to generate AI plan. Please proceed manually.',
        'SECTION 2: SUGGESTION',
        '- Check device, tools, and safety before visit.',
      ].join('\n')

      setPrevisitData(fallbackText)
      setPrevisitFileName(`previsit_job_${jobId}.txt`)
      setActionError('')
      setModalOpen(true)
      showPopup({
        type: 'warning',
        title: 'Fallback guidance shown',
        message: 'Unable to generate AI plan. A manual fallback plan is shown instead.',
      })
    } finally {
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current)
        warningTimerRef.current = null
      }
      controllerRef.current = null
      latestPrevisitRequestIdRef.current = null
      activeJobIdRef.current = null
      setActiveJobId(null)
      setLoadingJobId(null)
      setIsGenerating(false)
    }
  }, [activeJobId, showPopup])

  // Parse raw AI output into structured sections
  const parseSections = useCallback((text) => {
    if (!text) return []
    const lines = String(text).split(/\r?\n/)
    const sections = []
    let current = { title: 'Summary', items: [] }
    const startNew = (title) => {
      if (current && (current.items.length > 0 || current.title)) sections.push(current)
      current = { title: title || 'Details', items: [] }
    }

    for (let raw of lines) {
      const line = raw.trim()
      if (!line) {
        // preserve paragraph break
        if (current && current.items.length > 0 && current.items[current.items.length - 1].type === 'para') {
          current.items.push({ type: 'para', text: '' })
        }
        continue
      }

      // SECTION headers like "SECTION 1:", "Problem Summary:", or numbered headings
      const sectionMatch = line.match(/^(?:SECTION\s*\d+[:\-]?|[A-Z][A-Z0-9\s\-\/&]{2,}|[A-Za-z][A-Za-z0-9\s\-\/&]{2,})[:\-]?\s*$/)
        || line.match(/^\d+[.)]\s*[A-Za-z][A-Za-z0-9\s\-\/&]{2,}$/)
      if (sectionMatch) {
        const title = line.replace(/[:\-]$/, '').replace(/^\d+[.)]\s*/, '')
        startNew(title)
        continue
      }

      if (/^[\-*•]\s+/.test(line)) {
        if (!current) startNew('Details')
        const text = line.replace(/^[\-*•]\s+/, '')
        current.items.push({ type: 'bullet', text })
        continue
      }

      if (/^\d+[\).]\s+/.test(line)) {
        if (!current) startNew('Steps')
        const text = line.replace(/^\d+[\).]\s+/, '')
        current.items.push({ type: 'step', text })
        continue
      }

      if (!current) startNew('Details')
      const last = current.items[current.items.length - 1]
      if (last && last.type === 'para') {
        last.text = `${last.text} ${line}`.trim()
      } else {
        current.items.push({ type: 'para', text: line })
      }
    }

    if (current) sections.push(current)
    return sections
  }, [])

  const allJobs = useMemo(() => mergeJobsById([orderedActiveJobs, completedJobs]), [orderedActiveJobs, completedJobs])

  const aiColumns = useMemo(
    () => [
      { key: 'id', label: 'Job ID' },
      { key: 'fault_type', label: 'Fault Type', render: (v) => v || '-' },
      { key: 'severity', label: 'Severity', render: (v) => <span className="capitalize font-medium">{v || '-'}</span> },
      { key: 'review_priority', label: 'Priority', render: (v) => <span className="capitalize">{v || 'normal'}</span> },
      {
        key: 'diagnosis_confidence',
        label: 'Confidence',
        render: (v) => (v || v === 0 ? `${Math.round(Number(v) * 100)}%` : '-'),
      },
      {
        key: 'hitl_triggers',
        label: 'HITL Triggers',
        render: (v) => {
          let triggers = []
          if (Array.isArray(v)) {
            triggers = v
          } else if (typeof v === 'string') {
            try {
              triggers = JSON.parse(v)
            } catch {
              // Ignore parse error
            }
          }
          if (!triggers || triggers.length === 0) {
            return <span className='text-sm text-secondary'>Auto-approved (No HITL)</span>
          }

          const formatTrigger = (t) => {
            if (t === 'LOW_CONFIDENCE') return 'Low Confidence'
            if (t === 'CRITICAL_REQUIRES_VERIFICATION' || t === 'CRITICAL_SEVERITY') return 'Critical Review'
            if (t === 'SAFETY_ESCALATION') return 'Safety Risk'
            if (t === 'INVALID_IMAGE') return 'Invalid Image'
            if (t === 'UNLISTED_FAULT') return 'Unlisted Fault'
            return t
          }

          return (
            <div className='flex flex-wrap gap-1'>
              {triggers.map((trigger, idx) => (
                <span key={idx} className='hitl-badge'>
                  {formatTrigger(typeof trigger === 'string' ? trigger : (trigger?.type || 'Unknown'))}
                </span>
              ))}
            </div>
          )
        },
      },
      { key: 'diagnosis_reason', label: 'Diagnosis Notes', render: (v) => v || '-' },
    ],
    []
  )

  return (
    <div className='space-y-6'>
      {!routeOnly ? (
        <Card title='Assigned Jobs Workspace' subtitle='Track assigned jobs and AI diagnosis details'>
          <p className='mb-4 text-xs text-secondary'>Use the Profile Details menu in the top navigation to manage technician profile data.</p>

          {loading ? (
            <div data-testid='jobs-loading'>
              <LoadingState
                label='Loading assigned jobs'
                detail='Fetching assigned jobs, AI diagnosis details, and route information.'
              />
            </div>
          ) : null}
          {!loading && isValidating ? <p className='text-xs text-blue-500 animate-pulse'>Refreshing data...</p> : null}
          {error ? <InlineAlert type='error' title='Technician Workspace' message={error} /> : null}
          {actionError ? <InlineAlert type='error' title='Action Failed' message={actionError} dismissible onDismiss={() => setActionError('')} /> : null}

          {canLinkProfile ? (
            <form onSubmit={handleLinkProfile} className='mt-4 p-4 rounded-lg border border-amber-200 bg-amber-50'>
              <p className='text-sm text-amber-900 font-medium'>Link your technician profile to continue</p>
              <p className='text-xs text-amber-800 mt-1'>Enter your assigned technician code (example: TCH-0001).</p>
              <div className='mt-3 flex flex-col sm:flex-row gap-2'>
                <input
                  className='input'
                  value={linkCode}
                  onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                  placeholder='TCH-0001'
                />
                <button className='button whitespace-nowrap w-full sm:w-auto' type='submit' disabled={linking}>
                  {linking ? 'Linking...' : 'Link Profile'}
                </button>
              </div>
            </form>
          ) : null}

          {!loading && !error ? (
            <>
              <div aria-hidden={modalOpen ? 'true' : undefined}>
              <div className='workspace-tab-group'>
                <button
                  type='button'
                  className={`workspace-tab-btn ${
                    activeTab === 'jobs' ? 'workspace-tab-btn-active' : ''
                  }`}
                  onClick={() => setActiveTab('jobs')}
                >
                  <ClipboardCheck className='w-4 h-4' />
                  Assigned Jobs
                </button>
                <button
                  type='button'
                  className={`workspace-tab-btn ${
                    activeTab === 'ai' ? 'workspace-tab-btn-active' : ''
                  }`}
                  onClick={() => setActiveTab('ai')}
                >
                  <CheckCircle2 className='w-4 h-4' />
                  AI Diagnosis
                </button>
              </div>

              {activeTab === 'jobs' ? (
                <div className='space-y-3'>
                  {/* Route locking note */}
                  {orderedActiveJobs.some((j) => j.is_locked || j.status === 'in_progress') && (
                    <div className='flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[0.8rem] text-amber-800'>
                      <Lock className='mt-px h-[15px] w-[15px] shrink-0' />
                      <span>
                        <strong>Route Locked</strong> - the <em>In Progress</em> job is pinned first in your route.
                        Remaining jobs are dynamically re-optimized as you move.
                      </span>
                    </div>
                  )}

                  {orderedActiveJobs.map((job, idx) => {
                    const statusValue = String(job.status || '').toLowerCase()
                    const isLocked = job.is_locked || statusValue === 'in_progress'
                    const isCompleted = statusValue === 'completed'
                    const reassignmentStatus = String(job.reassignment_status || '').toLowerCase()
                    const isReassignmentSubmitting = reassignmentSubmitting && reassignmentJobId === job.id
                    const isReassignmentPending = Boolean(job.reassignment_requested)
                      || reassignmentStatus === 'requested'
                      || reassignmentStatus === 'pending'
                      || reassignmentStatus === 'processing'
                      || isReassignmentSubmitting
                    const isReassignmentEligible = ['assigned', 'scheduled', 'dispatched'].includes(statusValue)
                    const isReassignmentBlocked = statusValue === 'in_progress'
                    const isStarting = startingJobIds.includes(job.id)
                    const isCompleting = completingJobIds.includes(job.id)
                    const severity = (job.final_severity || job.severity || 'medium').toLowerCase()
                    const severityClass =
                      severity === 'critical'
                        ? 'bg-red-100 text-red-800'
                        : severity === 'high'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-700'
                    const serviceLat = toFiniteCoordinate(job.latitude)
                    const serviceLng = toFiniteCoordinate(job.longitude)
                    const hasServiceCoordinates = hasStrictCoordinates(serviceLat, serviceLng)
                    if (hasServiceCoordinates) {
                      warnIfOutOfKerala(`job-${job.id}`, serviceLat, serviceLng)
                    }
                    const serviceMapUrl = hasServiceCoordinates
                      ? `https://www.google.com/maps/search/?api=1&query=${serviceLat},${serviceLng}`
                      : ''
                    const locationLabel = job.location_zone
                      ? `${job.location_text || '-'} (${job.location_zone})`
                      : (job.location_text || '-')
                    const cleanContact = String(job.contact_number || '').replace(/\D/g, '')

                    return (
                      <div
                        key={job.id}
                        data-testid='job-card'
                        data-job-id={job.id}
                        className={`job-card relative rounded-[10px] px-4 py-3 ${
                          isLocked
                            ? 'border-2 border-amber-500 bg-amber-50/40'
                            : isCompleted
                              ? 'border border-emerald-200 bg-emerald-50/50'
                              : 'border border-gray-200 bg-white'
                        }`}
                      >
                        {/* Header row */}
                        <div className='flex flex-wrap items-center justify-between gap-2'>
                          <div className='flex items-center gap-2'>
                            <span className='text-[0.85rem] font-bold text-gray-700'>
                              #{idx + 1} - Job {job.id}
                            </span>
                            {isLocked && (
                              <span className='inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800'>
                                <Lock className='h-2.5 w-2.5' />
                                IN PROGRESS
                              </span>
                            )}
                            {isCompleted && (
                              <span className='rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800'>
                                COMPLETED
                              </span>
                            )}
                            {!isLocked && !isCompleted && (
                              <span className='rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700'>
                                ASSIGNED
                              </span>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className='action-btn-group'>
                            <button
                              type='button'
                              className='action-btn action-btn-view'
                              onClick={() => detail.open(job.id)}
                            >
                              View Details
                            </button>

                            {(job.status || '').toLowerCase() === 'assigned' && (
                              <button
                                type='button'
                                className='action-btn action-btn-view'
                                onClick={() => handlePrevisitReport(job.id)}
                                disabled={activeJobId === job.id}
                              >
                                {activeJobId === job.id ? 'Preparing...' : 'Prepare Visit (AI)'}
                              </button>
                            )}

                            {!isLocked && !isCompleted && (
                              <button
                                type='button'
                                disabled={isStarting}
                                className='action-btn action-btn-primary'
                                onClick={() => handleStartJob(job.id)}
                              >
                                <PlayCircle className='h-3.5 w-3.5' />
                                {isStarting ? 'Starting...' : 'Start Job'}
                              </button>
                            )}

                            {isLocked && !isCompleted && (
                              <button
                                type='button'
                                data-testid={`mark-complete-${job.id}`}
                                disabled={isCompleting}
                                title={isLocked ? 'Mark this job as complete' : 'Start the job before marking complete'}
                                className='action-btn action-btn-success'
                                onClick={() => handleMarkCompleted(job.id)}
                              >
                                <CheckCircle2 className='h-3.5 w-3.5' />
                                {isCompleting ? 'Completing...' : 'Mark Complete'}
                              </button>
                            )}
                            {!isLocked && !isCompleted && (
                              <span
                                className='inline-flex select-none items-center gap-1.5 rounded-md border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-400'
                                title='Start the job before marking complete'
                              >
                                <CheckCircle2 className='h-3.5 w-3.5' />
                                Mark Complete
                              </span>
                            )}

                            {!isCompleted && !isReassignmentPending && isReassignmentEligible && (
                              <button
                                type='button'
                                className='action-btn action-btn-warning'
                                onClick={() => handleRequestReassignment(job.id)}
                                title='Request reassignment of this job'
                              >
                                <AlertCircle className='h-3.5 w-3.5' />
                                Request Reassignment
                              </button>
                            )}
                            {!isCompleted && isReassignmentPending && (
                              <span
                                className='inline-flex select-none items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700'
                                title='Reassignment request is pending'
                              >
                                <AlertCircle className='h-3.5 w-3.5' />
                                {isReassignmentSubmitting ? 'Requesting...' : 'Reassignment Pending'}
                              </span>
                            )}
                            {!isCompleted && !isReassignmentPending && isReassignmentBlocked && (
                              <span
                                className='inline-flex select-none items-center gap-1.5 rounded-md border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-500'
                                title='Reassignment is not allowed after work has started'
                              >
                                <AlertCircle className='h-3.5 w-3.5' />
                                Work Started
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Details Grid */}
                        <div className='mt-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:gap-x-6 md:gap-y-3'>
                          {/* Row 1: Fault & Severity */}
                          <div className='flex flex-col gap-1'>
                            <span className='text-[11px] font-semibold uppercase tracking-wider text-gray-500'>Fault Type</span>
                            <div className='flex items-center gap-1.5 text-sm font-medium text-gray-900'>
                              <Wrench className='h-4 w-4 text-gray-500' />
                              <span className='truncate' title={job.fault_type || 'Unknown'}>
                                {job.fault_type || '-'}
                              </span>
                            </div>
                          </div>

                          <div className='flex flex-col gap-1 md:items-end'>
                            <span className='text-[11px] font-semibold uppercase tracking-wider text-gray-500'>Severity</span>
                            <span className={`rounded-md px-2.5 py-1 text-xs font-bold capitalize ${severityClass}`}>
                              {severity}
                            </span>
                          </div>

                          {/* Row 2: Location (Full Width) */}
                          <div className='flex flex-col gap-1 md:col-span-2'>
                            <span className='text-[11px] font-semibold uppercase tracking-wider text-gray-500'>Service Location</span>
                            <div className='flex items-start gap-1.5 text-sm font-medium text-gray-900'>
                              <MapPin className='mt-0.5 h-4 w-4 shrink-0 text-gray-500' />
                              <div className='min-w-0 flex-1'>
                                {hasServiceCoordinates ? (
                                  <a
                                    href={serviceMapUrl}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                    className='block truncate text-blue-600 underline-offset-2 hover:underline'
                                    title={`Open coordinates ${serviceLat.toFixed(6)}, ${serviceLng.toFixed(6)} in Google Maps`}
                                  >
                                    {serviceLat.toFixed(6)}, {serviceLng.toFixed(6)}
                                  </a>
                                ) : (
                                  <p className='text-amber-700'>Coordinates unavailable for navigation.</p>
                                )}
                                {locationLabel && locationLabel !== '-' ? (
                                  <p className='mt-1 break-words text-xs font-normal text-secondary'>{locationLabel}</p>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          {/* Row 3: Contact (Full Width) */}
                          {job.contact_number && (
                            <div className='flex flex-col gap-1 md:col-span-2'>
                              <span className='text-[11px] font-semibold uppercase tracking-wider text-gray-500'>Customer Contact</span>
                              <div className='flex items-center gap-1.5 text-sm font-medium text-gray-900'>
                                <Phone className='h-4 w-4 text-gray-500' />
                                <a
                                  href={`tel:${cleanContact}`}
                                  className='underline underline-offset-2 hover:text-blue-600'
                                >
                                  {job.contact_number}
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {/* Show completed today */}
                  {!modalOpen && completedJobs.length > 0 && (
                    <div className='mt-2'>
                      <p className='mb-1.5 text-xs font-semibold text-gray-500'>COMPLETED TODAY</p>
                      {completedJobs.map((job) => (
                        <div
                          key={job.id}
                          className='mb-1.5 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[0.8rem] text-gray-700'
                        >
                          <span>Job #{job.id} - {job.fault_type || '-'}</span>
                          <div className='flex items-center gap-2'>
                            <span className='text-[11px] font-bold text-emerald-600'>DONE</span>
                              {!job.report_submitted ? (
                                <button
                                  type='button'
                                  className='action-btn action-btn-success'
                                  onClick={() => openReportForm(job)}
                                >
                                  Submit Report
                                </button>
                              ) : (
                                <div className='flex items-center gap-2'>
                                  <span className='inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-bold text-green-700'>
                                    ✔ Submitted
                                  </span>
                                  <button
                                    type='button'
                                    className='px-2 py-1 text-xs border rounded-md bg-white hover:bg-gray-50'
                                    disabled={reportViewLoading}
                                    onClick={() => openReportView(job.id)}
                                  >
                                    View Report
                                  </button>
                                </div>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Table columns={aiColumns} rows={allJobs} emptyText='No diagnosis records found' />
              )}

              {orderedActiveJobs.length === 0 && completedJobs.length === 0 ? (
                <p className='text-xs text-secondary mt-3' data-testid='no-jobs'>
                  No active assigned jobs right now. New dispatches will appear here automatically.
                </p>
              ) : null}

              <Modal
                isOpen={detail.isOpen}
                onClose={detail.close}
                title='Job Detail'
                description={`Job #${detail.detail?.id || '-'}`}
                maxWidth='max-w-3xl'
                closeLabel='Close'
              >
                {detail.loading ? <LoadingState label='Loading selected job' compact className='mt-1' /> : null}
                {detail.error ? <p className='text-red-600 text-sm mt-1'>{detail.error}</p> : null}

                {!detail.loading && detail.detail ? (
                  <div className='space-y-5'>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-3 text-sm'>
                      <div className='rounded border border-gray-200 p-4'>
                        <p className='text-xs text-secondary'>Customer</p>
                        <p className='text-primary mt-1'>{detail.detail.customer_name || '-'}</p>
                      </div>
                      <div className='rounded border border-gray-200 p-4'>
                        <p className='text-xs text-secondary'>Customer Email</p>
                        <p className='text-primary mt-1'>{detail.detail.customer_email || '-'}</p>
                      </div>
                      <div className='rounded border border-gray-200 p-4'>
                        <p className='text-xs text-secondary'>Customer Contact</p>
                        <p className='text-primary mt-1'>{detail.detail.contact_number || '-'}</p>
                      </div>
                      <div className='rounded border border-gray-200 p-4'>
                        <p className='text-xs text-secondary'>Fault & Severity</p>
                        <p className='text-primary mt-1'>{detail.detail.fault_type || '-'} | {detail.detail.severity || '-'}</p>
                      </div>
                      <div className='rounded border border-gray-200 p-4'>
                        <p className='text-xs text-secondary'>Final Severity</p>
                        <p className='text-primary mt-1'>{detail.detail.final_severity || detail.detail.severity || '-'}</p>
                      </div>
                      <div className='rounded border border-gray-200 p-4'>
                        <p className='text-xs text-secondary'>Image Severity</p>
                        <p className='text-primary mt-1'>{detail.detail.image_severity || '-'}</p>
                      </div>
                      <div className='rounded border border-gray-200 p-4'>
                        <p className='text-xs text-secondary'>Description Severity</p>
                        <p className='text-primary mt-1'>{detail.detail.description_severity || '-'}</p>
                      </div>
                      <div className='rounded border border-gray-200 p-4'>
                        <p className='text-xs text-secondary'>Confidence</p>
                        <p className='text-primary mt-1'>
                          {detail.detail.confidence || detail.detail.confidence === 0
                            ? `${Math.round(Number(detail.detail.confidence) * 100)}%`
                            : detail.detail.diagnosis_confidence || detail.detail.diagnosis_confidence === 0
                              ? `${Math.round(Number(detail.detail.diagnosis_confidence) * 100)}%`
                              : '-'}
                        </p>
                      </div>
                      <div className='rounded border border-gray-200 p-4'>
                        <p className='text-xs text-secondary'>Safety Escalation</p>
                        <p className='text-primary mt-1'>{detail.detail.safety_escalation ? 'Yes' : 'No'}</p>
                      </div>
                      <div className='rounded border border-gray-200 p-4'>
                        <p className='text-xs text-secondary'>Safety Score</p>
                        <p className='text-primary mt-1'>{detail.detail.safety_score || detail.detail.safety_score === 0 ? `${detail.detail.safety_score}/5` : '-'}</p>
                      </div>
                      <div className='rounded border border-gray-200 p-4'>
                        <p className='text-xs text-secondary'>Operational Impact</p>
                        <p className='text-primary mt-1'>{detail.detail.operational_impact || detail.detail.operational_impact === 0 ? `${detail.detail.operational_impact}/5` : '-'}</p>
                      </div>
                      <div className='rounded border border-gray-200 p-4'>
                        <p className='text-xs text-secondary'>Escalation Risk</p>
                        <p className='text-primary mt-1'>{detail.detail.escalation_risk || detail.detail.escalation_risk === 0 ? `${detail.detail.escalation_risk}/5` : '-'}</p>
                      </div>
                      <div className='rounded border border-gray-200 p-4'>
                        <p className='text-xs text-secondary'>Status</p>
                        <p className='text-primary mt-1'>{detail.detail.status || '-'}</p>
                      </div>
                      <div className='rounded border border-gray-200 p-4'>
                        <p className='text-xs text-secondary'>Created At</p>
                        <p className='text-primary mt-1'>{detail.detail.created_at ? new Date(detail.detail.created_at).toLocaleString() : '-'}</p>
                      </div>
                    </div>

                    <div className='rounded border border-gray-200 p-4'>
                      <p className='text-xs text-secondary'>Location</p>
                      <p className='text-primary mt-1'>
                        {detail.detail.location_zone
                          ? `${detail.detail.location_text || '-'} (${detail.detail.location_zone})`
                          : (detail.detail.location_text || '-')}
                      </p>
                    </div>

                    <div className='rounded border border-gray-200 p-4'>
                      <p className='text-xs text-secondary'>Customer Problem Description</p>
                      <p className='text-primary mt-1'>{detail.detail.issue_description || detail.detail.description || '-'}</p>
                    </div>

                    {detail.imageUrl ? (
                      <div className='rounded border border-gray-200 p-4'>
                        <p className='text-xs text-secondary mb-2'>Customer Uploaded Image</p>
                        <img src={detail.imageUrl} alt='Customer uploaded evidence' className='w-full max-h-[360px] object-contain rounded border border-gray-100' />
                      </div>
                    ) : (
                      <div className='rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800'>
                        No image evidence available for this job.
                      </div>
                    )}
                  </div>
                ) : null}
              </Modal>
              </div>

              <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title='Prepare Visit (AI)'
                description='AI-generated preparation guide'
                maxWidth='max-w-3xl'
              >
                <div className='space-y-4 max-h-[64vh] overflow-auto pr-2'>
                  {!previsitData && !actionError ? (
                    isGenerating ? (
                      <div className='space-y-3 py-6 text-center'>
                        <LoadingState />
                        <p className='text-sm font-medium text-gray-700'>{previsitStatusMessage || 'Preparing guidance...'}</p>
                      </div>
                    ) : (
                      <div className='text-sm text-secondary'>Preparing guidance...</div>
                    )
                  ) : null}

                  {actionError ? (
                    <div className='rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800'>
                      {actionError}
                    </div>
                  ) : null}

                  {previsitData ? (
                    (() => {
                      const sections = parseSections(previsitData)
                      return (
                        <div className='space-y-3'>
                          {sections.map((sec, idx) => (
                            <div key={idx} className='rounded-lg border border-gray-100 p-4 bg-white shadow-sm'>
                              <div className='flex items-center justify-between'>
                                <h4 className='text-sm font-semibold text-gray-900'>{sec.title || `Section ${idx + 1}`}</h4>
                              </div>
                              <div className='mt-2 space-y-2 text-sm leading-relaxed text-gray-700'>
                                {sec.items.map((it, iidx) => {
                                  if (it.type === 'bullet') {
                                    return (
                                      <ul key={iidx} className='list-disc pl-5'>
                                        <li>{formatContent(it.text)}</li>
                                      </ul>
                                    )
                                  }
                                  if (it.type === 'step') {
                                    return (
                                      <ul key={iidx} className='list-disc pl-5'>
                                        <li>{formatContent(it.text)}</li>
                                      </ul>
                                    )
                                  }
                                  return (
                                    <p key={iidx} className='mb-0 whitespace-pre-line leading-6'>
                                      {formatContent(it.text)}
                                    </p>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })()
                  ) : null}

                  <div className='flex justify-end gap-2'>
                    <button
                      type='button'
                      className='action-btn'
                      onClick={() => {
                        try {
                          navigator.clipboard.writeText(previsitData || '')
                          notification.success({ title: 'Copied', message: 'Preparation text copied to clipboard.' })
                        } catch (e) {
                          notification.error({ title: 'Copy Failed', message: 'Unable to copy to clipboard.' })
                        }
                      }}
                      disabled={!previsitData}
                    >
                      Copy to Clipboard
                    </button>
                    <button
                      type='button'
                      className='action-btn action-btn-primary'
                      onClick={() => setModalOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </Modal>

              <Modal
                isOpen={reportFormOpen}
                onClose={closeReportForm}
                title='Submit Job Report'
                description={reportFormJob ? `Job #${reportFormJob.id} - ${reportFormJob.fault_type || ''}` : ''}
                maxWidth='max-w-3xl'
              >
                <div className='max-h-[72vh] space-y-6 overflow-auto pr-1'>
                  <section className='space-y-3 rounded-lg border border-gray-200 p-4'>
                    <h3 className='text-sm font-semibold text-gray-900'>Section A - Service Details</h3>
                    <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                      <div>
                        <label className='mb-1 block text-xs font-medium text-gray-600'>Job ID</label>
                        <input type='text' readOnly value={reportMeta?.jobId || ''} className='w-full rounded-md border border-gray-200 bg-gray-50 p-2 text-sm text-gray-700' />
                      </div>
                      <div>
                        <label className='mb-1 block text-xs font-medium text-gray-600'>Technician Name</label>
                        <input type='text' readOnly value={reportMeta?.technicianName || ''} className='w-full rounded-md border border-gray-200 bg-gray-50 p-2 text-sm text-gray-700' />
                      </div>
                      <div>
                        <label className='mb-1 block text-xs font-medium text-gray-600'>Date</label>
                        <input type='text' readOnly value={formatDate(reportMeta?.serviceDate)} className='w-full rounded-md border border-gray-200 bg-gray-50 p-2 text-sm text-gray-700' />
                      </div>
                      <div>
                        <label className='mb-1 block text-xs font-medium text-gray-600'>Service Location</label>
                        <input type='text' readOnly value={reportMeta?.serviceLocation || 'Not provided'} className='w-full rounded-md border border-gray-200 bg-gray-50 p-2 text-sm text-gray-700' />
                      </div>
                    </div>
                  </section>

                  <section className='space-y-3 rounded-lg border border-gray-200 p-4'>
                    <h3 className='text-sm font-semibold text-gray-900'>Section B - Issue Details</h3>
                    <div>
                      <div className='mb-2 flex items-center justify-between'>
                        <label className='block text-sm font-medium text-gray-700'>Issue Observed</label>
                        <button type='button' data-testid='ai-improve-issue' disabled={reportImproving} onClick={() => { setImprovingField('issue_observed'); handleImproveWithAI('issue_observed') }} className='text-xs font-medium text-blue-700 hover:text-blue-800'>
                          {reportImproving && improvingField === 'issue_observed' ? 'Improving...' : 'Improve with AI'}
                        </button>
                      </div>
                      <textarea
                        className='h-24 w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-blue-500'
                        value={reportFormData.issue_observed}
                        onChange={(e) => updateReportField('issue_observed', e.target.value)}
                        placeholder='Describe what you found (symptoms, condition, visible damage)'
                      />
                      {reportFormErrors.issue_observed ? <p className='mt-1 text-xs text-red-600'>{reportFormErrors.issue_observed}</p> : null}
                    </div>
                    <div>
                      <div className='mb-2 flex items-center justify-between'>
                        <label className='block text-sm font-medium text-gray-700'>Root Cause</label>
                        <button type='button' data-testid='ai-improve-root-cause' disabled={reportImproving || !normalizeSpaces(reportFormData.root_cause)} onClick={() => { setImprovingField('root_cause'); handleImproveWithAI('root_cause') }} className='text-xs font-medium text-blue-700 hover:text-blue-800 disabled:opacity-40'>
                          {reportImproving && improvingField === 'root_cause' ? 'Improving...' : 'Improve with AI'}
                        </button>
                      </div>
                      <textarea
                        className='h-20 w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-blue-500'
                        value={reportFormData.root_cause}
                        onChange={(e) => updateReportField('root_cause', e.target.value)}
                        placeholder='Explain why the issue occurred (if known)'
                      />
                    </div>
                  </section>

                  <section className='space-y-3 rounded-lg border border-gray-200 p-4'>
                    <h3 className='text-sm font-semibold text-gray-900'>Section C - Work Performed</h3>
                    <div>
                      <div className='mb-2 flex items-center justify-between'>
                        <label className='block text-sm font-medium text-gray-700'>Work Done</label>
                        <button type='button' data-testid='ai-improve-work-done' disabled={reportImproving} onClick={() => { setImprovingField('work_done'); handleImproveWithAI('work_done') }} className='text-xs font-medium text-blue-700 hover:text-blue-800'>
                          {reportImproving && improvingField === 'work_done' ? 'Improving...' : 'Improve with AI'}
                        </button>
                      </div>
                      <textarea
                        className='h-24 w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-blue-500'
                        value={reportFormData.work_done}
                        onChange={(e) => updateReportField('work_done', e.target.value)}
                        placeholder='Describe actions taken to fix the issue'
                      />
                      {reportFormErrors.work_done ? <p className='mt-1 text-xs text-red-600'>{reportFormErrors.work_done}</p> : null}
                    </div>
                  </section>

                  <section className='space-y-3 rounded-lg border border-gray-200 p-4'>
                    <div className='flex items-center justify-between'>
                      <h3 className='text-sm font-semibold text-gray-900'>Section D - Materials Used</h3>
                      <button type='button' onClick={addMaterialRow} className='rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50'>Add Row</button>
                    </div>
                    <div className='space-y-2'>
                      {materialsUsedRows.map((row, index) => (
                        <div key={`material-${index}`} className='grid grid-cols-1 gap-2 md:grid-cols-[1fr_120px_80px]'>
                          <input
                            type='text'
                            value={row.name}
                            onChange={(e) => updateMaterialRow(index, 'name', e.target.value)}
                            placeholder='Material name'
                            className='w-full rounded-md border border-gray-300 p-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500'
                          />
                          <input
                            type='number'
                            min={1}
                            step={1}
                            value={row.quantity}
                            onChange={(e) => updateMaterialRow(index, 'quantity', e.target.value.replace(/[^\d]/g, ''))}
                            placeholder='Qty'
                            className='w-full rounded-md border border-gray-300 p-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500'
                          />
                          <button type='button' onClick={() => removeMaterialRow(index)} className='rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50'>Remove</button>
                        </div>
                      ))}
                    </div>
                    {reportFormErrors.materials_used ? <p className='text-xs text-red-600'>{reportFormErrors.materials_used}</p> : null}
                  </section>

                  <section className='space-y-3 rounded-lg border border-gray-200 p-4'>
                    <h3 className='text-sm font-semibold text-gray-900'>Section E - Photos</h3>
                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                      <div className='space-y-2'>
                        <label className='block text-sm font-medium text-gray-700'>Before Photo</label>
                        <input type='file' accept='image/*' onChange={(e) => handlePhotoSelection(e, 'before')} className='w-full rounded-md border border-gray-300 p-2 text-xs' />
                        {beforePhotoPreview ? <img src={beforePhotoPreview} alt='Before preview' className='h-36 w-full rounded-md border border-gray-200 object-cover' /> : <div className='flex h-36 items-center justify-center rounded-md border border-dashed border-gray-300 text-xs text-gray-500'>No before photo selected</div>}
                      </div>
                      <div className='space-y-2'>
                        <label className='block text-sm font-medium text-gray-700'>After Photo</label>
                        <input type='file' accept='image/*' onChange={(e) => handlePhotoSelection(e, 'after')} className='w-full rounded-md border border-gray-300 p-2 text-xs' />
                        {afterPhotoPreview ? <img src={afterPhotoPreview} alt='After preview' className='h-36 w-full rounded-md border border-gray-200 object-cover' /> : <div className='flex h-36 items-center justify-center rounded-md border border-dashed border-gray-300 text-xs text-gray-500'>No after photo selected</div>}
                      </div>
                    </div>
                    <p className='text-xs text-gray-500'>Image types: JPG, PNG, WEBP. Maximum size: 5MB each.</p>
                  </section>

                  <section className='space-y-3 rounded-lg border border-gray-200 p-4'>
                    <h3 className='text-sm font-semibold text-gray-900'>Section F - Time & Notes</h3>
                    <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                      <div>
                        <label className='mb-2 block text-sm font-medium text-gray-700'>Time Taken (minutes)</label>
                        <input
                          type='number'
                          min={1}
                          max={600}
                          step={1}
                          className='w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-blue-500'
                          value={reportFormData.time_taken}
                          onChange={(e) => updateReportField('time_taken', e.target.value.replace(/[^\d]/g, ''))}
                          placeholder='Enter time in minutes (1-600)'
                        />
                        {reportFormErrors.time_taken ? <p className='mt-1 text-xs text-red-600'>{reportFormErrors.time_taken}</p> : null}
                      </div>
                      <div>
                        <label className='mb-2 block text-sm font-medium text-gray-700'>Customer Comments</label>
                        <textarea
                          className='h-[84px] w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-blue-500'
                          value={reportFormData.customer_comments}
                          onChange={(e) => updateReportField('customer_comments', e.target.value)}
                          placeholder='Customer comments (optional)'
                        />
                      </div>
                    </div>
                    <div>
                      <label className='mb-2 block text-sm font-medium text-gray-700'>Additional Notes</label>
                      <textarea
                        className='h-20 w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-blue-500'
                        value={reportFormData.notes}
                        onChange={(e) => updateReportField('notes', e.target.value)}
                        placeholder='Additional remarks (optional)'
                      />
                    </div>
                  </section>

                  <div className='flex gap-2 justify-end'>
                    <button
                      type='button'
                      onClick={closeReportForm}
                      className='rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50'
                    >
                      Cancel
                    </button>
                    <button
                      type='button'
                      onClick={handleSubmitReport}
                      disabled={reportSubmitting}
                      className='action-btn action-btn-primary'
                    >
                      {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                    </button>
                  </div>
                </div>
              </Modal>
              <Modal
                isOpen={reportViewOpen}
                onClose={() => {
                  if (!reportViewLoading) {
                    setReportViewOpen(false)
                  }
                }}
                title='View Submitted Report'
                description='Read-only view of the saved report'
                maxWidth='max-w-3xl'
              >
                <div className='space-y-4'>
                  {reportViewLoading ? (
                    <LoadingState label='Loading report' detail='Fetching the saved report. Please wait.' compact />
                  ) : (
                    reportViewData ? (
                      <section className='space-y-6 rounded-xl border border-gray-200 bg-white p-5 text-sm text-primary shadow-sm'>
                        <div className='space-y-1'>
                          <h2 className='text-lg font-semibold text-gray-900'>FIELD SERVICE REPORT</h2>
                          <p className='text-xs text-gray-500'>Read-only submitted report record</p>
                        </div>

                        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                          <div className='rounded-md border border-gray-200 p-3'>
                            <h3 className='text-xs font-semibold uppercase tracking-wide text-gray-500'>Client Info</h3>
                            <p className='mt-2 text-sm text-gray-700'><strong>Job ID:</strong> {visibleReport.jobId}</p>
                            <p className='mt-1 text-sm text-gray-700'><strong>Service Location:</strong> {visibleReport.serviceLocation}</p>
                          </div>
                          <div className='rounded-md border border-gray-200 p-3'>
                            <h3 className='text-xs font-semibold uppercase tracking-wide text-gray-500'>Technician Info</h3>
                            <p className='mt-2 text-sm text-gray-700'><strong>Name:</strong> {visibleReport.technicianName}</p>
                            <p className='mt-1 text-sm text-gray-700'><strong>Submitted At:</strong> {visibleReport.submittedAt}</p>
                          </div>
                        </div>

                        <div className='space-y-4'>
                          <div>
                            <h3 className='text-sm font-semibold text-gray-900'>Issue Observed</h3>
                            <p className='mt-1 whitespace-pre-wrap text-gray-700'>{visibleReport.issueObserved}</p>
                          </div>
                          <div>
                            <h3 className='text-sm font-semibold text-gray-900'>Root Cause</h3>
                            <p className='mt-1 whitespace-pre-wrap text-gray-700'>{visibleReport.rootCause}</p>
                          </div>
                          <div>
                            <h3 className='text-sm font-semibold text-gray-900'>Work Done</h3>
                            <p className='mt-1 whitespace-pre-wrap text-gray-700'>{visibleReport.workDone}</p>
                          </div>
                        </div>

                        <div>
                          <h3 className='text-sm font-semibold text-gray-900'>Materials Used</h3>
                          <div className='mt-2 overflow-hidden rounded-md border border-gray-200'>
                            <table className='min-w-full divide-y divide-gray-200 text-sm'>
                              <thead className='bg-gray-50'>
                                <tr>
                                  <th className='px-3 py-2 text-left font-medium text-gray-600'>Description</th>
                                  <th className='px-3 py-2 text-left font-medium text-gray-600'>Quantity</th>
                                </tr>
                              </thead>
                              <tbody className='divide-y divide-gray-200'>
                                {visibleReport.materialsUsed.map((row, idx) => (
                                  <tr key={`report-material-${idx}`}>
                                    <td className='px-3 py-2 text-gray-700'>{formatField(row.name)}</td>
                                    <td className='px-3 py-2 text-gray-700'>{formatField(row.quantity)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div>
                          <h3 className='text-sm font-semibold text-gray-900'>Photos</h3>
                          <div className='mt-2 grid grid-cols-1 gap-4 md:grid-cols-2'>
                            <div className='space-y-1'>
                              <p className='text-xs font-medium uppercase tracking-wide text-gray-500'>Before Image</p>
                              {visibleReport.beforePhotoUrl ? (
                                <img src={visibleReport.beforePhotoUrl} alt='Before report photo' className='h-44 w-full rounded-md border border-gray-200 object-cover' />
                              ) : (
                                <div className='flex h-44 items-center justify-center rounded-md border border-dashed border-gray-300 text-xs text-gray-500'>Not provided</div>
                              )}
                            </div>
                            <div className='space-y-1'>
                              <p className='text-xs font-medium uppercase tracking-wide text-gray-500'>After Image</p>
                              {visibleReport.afterPhotoUrl ? (
                                <img src={visibleReport.afterPhotoUrl} alt='After report photo' className='h-44 w-full rounded-md border border-gray-200 object-cover' />
                              ) : (
                                <div className='flex h-44 items-center justify-center rounded-md border border-dashed border-gray-300 text-xs text-gray-500'>Not provided</div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                          <div>
                            <h3 className='text-sm font-semibold text-gray-900'>Time Taken</h3>
                            <p className='mt-1 text-gray-700'>
                              {visibleReport.timeTaken === 'Not provided' ? 'Not provided' : `${visibleReport.timeTaken} minutes`}
                            </p>
                          </div>
                          <div>
                            <h3 className='text-sm font-semibold text-gray-900'>Customer Comments</h3>
                            <p className='mt-1 whitespace-pre-wrap text-gray-700'>{visibleReport.customerComments}</p>
                          </div>
                        </div>

                        <div>
                          <h3 className='text-sm font-semibold text-gray-900'>Additional Notes</h3>
                          <p className='mt-1 whitespace-pre-wrap text-gray-700'>{visibleReport.notes}</p>
                        </div>
                      </section>
                    ) : (
                      <p className='rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-secondary'>No report available.</p>
                    )
                  )}
                </div>
              </Modal>
            </>
          ) : null}
        </Card>
      ) : null}

      <Card title='Optimized Route Map' subtitle={routeOnly ? 'Route view for your assigned jobs' : 'Route sequence from dispatch engine'}>
        {routeOnly && error ? <InlineAlert type='error' className='mb-3' title='Route View' message={error} /> : null}
        {loading ? (
          <LoadingState
            label='Loading route map'
            detail='Generating optimized route sequence from dispatch engine.'
          />
        ) : null}
        {!loading ? (
          <div>
            <div className='mb-3'>
              <button
                type='button'
                className='px-3 py-2 rounded-md border border-gray-300 bg-white text-primary text-sm font-medium hover:bg-gray-50 disabled:opacity-60 inline-flex items-center gap-1.5'
                onClick={openGoogleMapsNavigation}
                disabled={!googleMapsUrl}
              >
                <MapIcon className='w-4 h-4' />
                Navigate in Google Maps
              </button>
            </div>
            {!routeOnly ? (
              <div className='mb-3 text-xs text-secondary inline-flex items-center gap-1.5'>
                <MapPinned className='w-4 h-4' />
                <Route className='w-4 h-4' />
                Route plan updates from assigned jobs and technician origin point.
              </div>
            ) : null}
            <Suspense fallback={<LoadingState label='Loading map view' compact className='p-4' />}>
              <RouteMap
                technicianLocation={technicianLocation}
                jobs={activeJobs}
                routeOrder={activeRouteOrder}
              />
            </Suspense>
          </div>
        ) : null}
      </Card>

      <ReassignmentModal
        jobId={reassignmentJobId}
        jobDetails={reassignmentJobDetails}
        isOpen={reassignmentModalOpen}
        isSubmitting={reassignmentSubmitting}
        onSubmit={handleReassignmentSubmit}
        onClose={() => setReassignmentModalOpen(false)}
      />
    </div>
  )
}
