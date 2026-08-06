import { useCallback, useEffect, useMemo, useRef } from 'react'
import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'
import { adminApi, customerApi, technicianApi } from '../services/api'

const POLL = 30_000
const POLL_SLOW = 60_000
const PAGE_LIMIT = 5

// ─── Helpers ────────────────────────────────────────────────────────────────

export function mergeJobsById(groups = []) {
  const map = new Map()
  groups.flat().forEach((job) => {
    if (!job || job.id == null) return
    const key = String(job.id)
    const existing = map.get(key)
    if (!existing || (job.status || '').toLowerCase() === 'completed') {
      map.set(key, job)
    }
  })
  return Array.from(map.values())
}

function validCoords(lat, lng) {
  return (
    lat != null && lng != null &&
    Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) &&
    !(Number(lat) === 0 && Number(lng) === 0)
  )
}

// ─── Shared admin cache keys ────────────────────────────────────────────────

const K_KPIS = 'admin/kpis'
const K_PENDING = 'admin/pending-hitl'

function getTicketsKeyWithMode(mode = 'all', excludeE2E = false) {
  return (pageIndex, previousPageData) => {
    if (previousPageData && !previousPageData.has_more) return null
    const cursor = previousPageData?.last_id ?? null
    return ['admin/service-requests', mode, excludeE2E, cursor]
  }
}

function ticketsFetcherWithMode([, mode, excludeE2E, cursor]) {
  return adminApi.getServiceRequestsPage({
    lastId: cursor,
    limit: PAGE_LIMIT,
    mode,
    exclude_e2e: excludeE2E,
  })
}

// ─── Customer ───────────────────────────────────────────────────────────────

export function useMyRequests() {
  return useSWR('customer/my-requests', () => customerApi.getMyRequests(), {
    refreshInterval: POLL,
  })
}

// ─── Admin: shared infinite pagination for tickets ──────────────────────────

function useAdminTickets({ mode = 'all', excludeE2E = false } = {}) {
  const {
    data, size, setSize, isLoading, isValidating, error, mutate,
  } = useSWRInfinite(getTicketsKeyWithMode(mode, excludeE2E), ticketsFetcherWithMode, {
    refreshInterval: POLL,
    revalidateFirstPage: true,
    parallel: false,
  })

  const tickets = useMemo(() => {
    if (!data) return []
    const combined = data.flatMap((page) => page.data || [])
    const seen = new Set()
    const out = []
    for (const t of combined) {
      if (!t || t.id == null) continue
      const k = String(t.id)
      if (seen.has(k)) continue
      seen.add(k)
      out.push(t)
    }
    return out
  }, [data, mode, excludeE2E])
  const hasMore = data ? data[data.length - 1]?.has_more ?? false : false

  const loadMore = useCallback((options = {}) => {
    const { force = false } = options
    if ((!isValidating || force) && hasMore) {
      return setSize((current) => current + 1)
    }
    return Promise.resolve(null)
  }, [isValidating, hasMore, setSize])

  return { tickets, hasMore, loading: isLoading, isValidating, error, mutate, loadMore }
}

// ─── Admin: Operations dashboard ────────────────────────────────────────────

export function useAdminDashboard() {
  const {
    tickets,
    hasMore,
    loading: ticketsLoading,
    isValidating,
    error,
    mutate,
    loadMore,
  } = useAdminTickets({ mode: 'finalized', excludeE2E: true })
  // KPI - request E2E-excluded counts to match the finalized dataset
  const kpisKey = `${K_KPIS}?exclude_e2e=true`
  const kpis = useSWR(kpisKey, () => adminApi.getKpis({ exclude_e2e: true }), {
    refreshInterval: POLL,
    revalidateOnFocus: false,
    keepPreviousData: true,
    onError: () => {},
  })

  return {
    tickets,
    hasMore,
    kpis: kpis.data ?? null,
    loading: ticketsLoading,
    ticketsLoading,
    kpisLoading: kpis.isLoading,
    error: error?.response?.data?.detail || (error ? 'Failed to load admin tickets' : ''),
    mutateTickets: mutate,
    mutateKpis: kpis.mutate,
    isValidating,
    loadMore,
  }
}

// ─── Admin: Activity feed (shares infinite cache with Operations) ───────────

export function useActivityFeed({ finalizedMode = 'finalized', excludeE2E = true } = {}) {
  // Finalized
  const { tickets, hasMore, loading, isValidating, error, mutate, loadMore } = useAdminTickets({ mode: finalizedMode, excludeE2E })
  // Pending HITL
  const { tickets: pendingItems } = useAdminTickets({ mode: 'pending_hitl', excludeE2E })
  // KPI - request E2E-excluded counts to match the finalized dataset
  const kpisKey = excludeE2E ? `${K_KPIS}?exclude_e2e=true` : K_KPIS
  const kpis = useSWR(kpisKey, () => adminApi.getKpis({ exclude_e2e: excludeE2E }), {
    refreshInterval: POLL,
    onError: () => {},
  })

  return {
    tickets,
    hasMore,
    kpis: kpis.data ?? null,
    pendingItems: pendingItems ?? [],
    loading,
    isValidating,
    error: error?.response?.data?.detail || (error ? 'Failed to load activity feed' : ''),
    mutateTickets: mutate,
    mutateKpis: kpis.mutate,
    // mutatePending: pending.mutate, // not needed with useAdminTickets
    loadMore,
    refreshAll: () => Promise.all([mutate(), kpis.mutate()]),
  }
}

export function usePendingHitl() {
  return useSWR(K_PENDING, () => adminApi.getPendingHitl(), {
    refreshInterval: POLL,
  })
}

export function useReassignmentActivity({ limit = 50, eventType = null } = {}) {
  const cacheKey = eventType ? `admin/reassignment-activity?limit=${limit}&eventType=${eventType}` : `admin/reassignment-activity?limit=${limit}`
  
  const { data, error, isValidating, mutate } = useSWR(
    cacheKey,
    () => adminApi.getReassignmentActivity({ limit, eventType }),
    {
      refreshInterval: POLL,
      onError: () => {},
    }
  )

  return {
    events: data?.events ?? [],
    count: data?.count ?? 0,
    summary: data?.summary ?? {},
    loading: !data && !error,
    isValidating,
    error: error ? 'Failed to load reassignment activity' : '',
    mutate,
  }
}

// ─── Technician ─────────────────────────────────────────────────────────────

export function useTechnicianDashboard() {
  const jobs = useSWR('technician/jobs', () => technicianApi.getAssignedJobs(), {
    refreshInterval: POLL,
  })
  const route = useSWR('technician/route', () => technicianApi.getMyRoute(), {
    refreshInterval: POLL,
  })
  const profile = useSWR('technician/profile', () => technicianApi.getProfile(), {
    refreshInterval: POLL_SLOW,
  })

  const completedRef = useRef([])

  const jobRows = useMemo(() => {
    const d = jobs.data
    if (!d) return []
    return Array.isArray(d?.jobs) ? d.jobs : Array.isArray(d) ? d : []
  }, [jobs.data])

  const activeJobs = useMemo(
    () => jobRows.filter((j) => (j.status || '').toLowerCase() !== 'completed'),
    [jobRows]
  )

  const completedJobs = useMemo(() => {
    const completedRows = Array.isArray(jobs.data?.completed_jobs) ? jobs.data.completed_jobs : []
    const inferred = jobRows.filter((j) => (j.status || '').toLowerCase() === 'completed')
    return mergeJobsById([completedRows, inferred, completedRef.current])
  }, [jobRows, jobs.data])

  useEffect(() => { completedRef.current = completedJobs }, [completedJobs])

  const technicianLocation = useMemo(() => {
    const p = profile.data
    const r = route.data
    const summary = jobs.data?.summary
    if (validCoords(p?.current_latitude, p?.current_longitude)) {
      return { latitude: Number(p.current_latitude), longitude: Number(p.current_longitude) }
    }
    if (validCoords(p?.latitude, p?.longitude)) {
      return { latitude: Number(p.latitude), longitude: Number(p.longitude) }
    }
    if (r?.technician_location) return r.technician_location
    if (validCoords(summary?.latitude, summary?.longitude)) {
      return { latitude: summary.latitude, longitude: summary.longitude }
    }
    if (activeJobs.length > 0) {
      const f = activeJobs[0]
      if (validCoords(f?.technician_latitude, f?.technician_longitude)) {
        return { latitude: f.technician_latitude, longitude: f.technician_longitude }
      }
    }
    return null
  }, [profile.data, route.data, jobs.data, activeJobs])

  return {
    activeJobs,
    completedJobs,
    routeData: route.data || { route_order: [] },
    technicianLocation,
    loading: jobs.isLoading,
    isValidating: jobs.isValidating || route.isValidating,
    error: jobs.error?.response?.data?.detail || (jobs.error ? 'Failed to load technician dashboard' : ''),
    mutateJobs: jobs.mutate,
    mutateRoute: route.mutate,
    mutateProfile: profile.mutate,
    refreshAll: () => Promise.all([jobs.mutate(), route.mutate(), profile.mutate()]),
  }
}
