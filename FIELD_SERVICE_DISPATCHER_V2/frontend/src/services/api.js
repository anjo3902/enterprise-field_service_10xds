import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL
const API_TIMEOUT_MS = 10_000
const LLM_TIMEOUT_MS = 60_000  // 60 seconds for LLM calls
const TOKEN_KEY = 'fsm_token'
const USER_KEY = 'fsm_user'
const ACTIVE_SESSION_KEY = 'fsm_had_active_session'
const SESSION_EXPIRED_KEY = 'fsm_session_expired'

function getSessionItem(key) {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function setSessionItem(key, value) {
  try {
    if (value) {
      sessionStorage.setItem(key, value)
    } else {
      sessionStorage.removeItem(key)
    }
  } catch {
    // ignore storage failures in restricted environments
  }
}

function removeSessionItem(key) {
  try {
    sessionStorage.removeItem(key)
  } catch {
    // ignore storage failures in restricted environments
  }
}

/**
 * Safely coerce any API response to an array.
 * Handles plain arrays, {items:[...]}, {results:[...]}, {jobs:[...]},
 * {requests:[...]}, and null / undefined / non-array returns.
 */
function safeArray(data) {
  if (Array.isArray(data)) return data
  const keys = ['items', 'results', 'jobs', 'requests', 'data']
  for (const k of keys) {
    if (data && Array.isArray(data[k])) return data[k]
  }
  return []
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
})

api.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }

  // Use longer timeout for LLM endpoints (reports/previsit, reports/full, etc.)
  const isLLMEndpoint = config.url?.includes('/reports/previsit') || config.url?.includes('/reports/full')
  const timeout = isLLMEndpoint ? LLM_TIMEOUT_MS : API_TIMEOUT_MS
  // Store timeout value for instrumentation/debugging only. Do not cancel requests.
  config.metadata = { ...(config.metadata || {}), timeout }

  return config
})

api.interceptors.response.use(
  (response) => {
    // No abort/cancel cleanup needed; metadata may contain timeout for metrics
    return response
  },
  (error) => {
    // No abort/cancel cleanup needed; metadata may contain timeout for metrics

    const status = error?.response?.status
    const method = String(error?.config?.method || 'get').toUpperCase()
    const endpoint = error?.config?.url || 'unknown-endpoint'
    // Never log response payloads here to avoid exposing sensitive data in console.
    console.error(`API ERROR: ${method} ${endpoint} (${status || 'network-error'})`)
    if (status === 401) {
      const hadActiveSession = getHadActiveSession()
      clearAuth()
      setHadActiveSession(false)

      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        if (hadActiveSession) {
          markSessionExpired()
        }
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  async login(payload) {
    console.log('API URL:', import.meta.env.VITE_API_URL)
    console.log('LOGIN REQUEST PAYLOAD:', payload)
    try {
      const response = await api.post('/auth/login', payload)
      console.log('LOGIN SUCCESS:', response.data)
      return response.data
    } catch (err) {
      console.error('LOGIN ERROR FULL:', err)
      console.error('ERR RESPONSE:', err?.response)
      console.error('ERR REQUEST:', err?.request)
      throw err
    }
  },
  async signup(payload) {
    const response = await api.post('/auth/signup', payload)
    return response.data
  },
  async exchangeWorkspaceToken(payload) {
    const response = await api.post('/auth/telegram/claim', payload)
    return response.data
  },
}

export const customerApi = {
  async reportIssue(formData) {
    const response = await api.post('/customer/report-issue', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
  async getMyRequests() {
    const response = await api.get('/customer/my-requests')
    return safeArray(response.data)
  },
  async getMyRequestById(requestId) {
    const response = await api.get(`/customer/my-requests/${requestId}`)
    return response.data
  },
  async getMyRequestImageBlob(requestId) {
    const response = await api.get(`/customer/my-requests/${requestId}/image`, { responseType: 'blob' })
    return response.data
  },
}

export const technicianApi = {
  async getJobs() {
    const response = await api.get('/technician/jobs')
    return response.data
  },
  async getAssignedJobs() {
    return this.getJobs()
  },
  async getRoute(technicianId) {
    const response = await api.get(`/technician/route/${technicianId}`)
    return response.data
  },
  async getMyRoute() {
    const response = await api.get('/technician/my-route')
    return response.data
  },
  async getProfile() {
    const response = await api.get('/technician/profile')
    return response.data
  },
  async updateStatus(payload) {
    const response = await api.post('/technician/update-status', payload)
    return response.data
  },
  async completeJob(jobId) {
    try {
      const response = await api.put(`/technician/jobs/${jobId}/complete`)
      return response.data
    } catch (error) {
      if (error?.response?.status === 404) {
        const fallback = await api.post('/technician/update-status', {
          request_id: jobId,
          status: 'completed',
        })
        return {
          ...fallback.data,
          job_id: jobId,
          status: 'completed',
        }
      }
      throw error
    }
  },
  async startJob(jobId) {
    const response = await api.post(`/technician/jobs/${jobId}/start`)
    return response.data
  },
  async updateLiveLocation(jobId, payload) {
    const response = await api.post(`/technician/jobs/${jobId}/live-location`, payload)
    return response.data
  },
  async getJobById(jobId, { signal } = {}) {
    const response = await api.get(`/technician/jobs/${jobId}`, { signal })
    return response.data
  },
  async getJobImageBlob(jobId, { signal } = {}) {
    const response = await api.get(`/technician/jobs/${jobId}/image`, { responseType: 'blob', signal })
    return response.data
  },
  async generateReport(jobId) {
    const response = await api.post('/reports/generate', { job_id: Number(jobId) })
    return response.data
  },
  async generatePrevisitReport(jobId) {
    const response = await api.post('/reports/previsit', { job_id: jobId })
    return response.data
  },
  async getReport(jobId, { signal } = {}) {
    const response = await api.get(`/technician/report/${jobId}`, { signal })
    return response.data
  },
  async linkProfile(payload) {
    const response = await api.post('/technician/link-profile', payload)
    return response.data
  },
  async updateSkills(payload) {
    const response = await api.put('/technician/update-skills', payload)
    return response.data
  },
  async updateSchedule(payload) {
    const response = await api.put('/technician/update-schedule', payload)
    return response.data
  },
  async requestReassignment(jobId, payload) {
    const response = await api.post(`/technician/jobs/${jobId}/request-reassignment`, payload)
    return response.data
  },
}

export const adminApi = {
  async getServiceRequestsPage({ lastId = null, limit = 50, view, mode, exclude_e2e } = {}) {
    const params = { limit }
    if (lastId) params.last_id = lastId
    if (view) params.view = view
    if (mode) params.mode = mode
    if (exclude_e2e != null) params.exclude_e2e = exclude_e2e
    const response = await api.get('/admin/service-requests', { params })
    const payload = response.data
    // Support both new envelope shape and legacy plain array
    if (Array.isArray(payload)) {
      return { data: payload, last_id: null, has_more: false, total_visible: payload.length }
    }
    const data = safeArray(payload.items != null ? payload.items : (payload.data != null ? payload.data : payload))
    return {
      data,
      last_id: payload.last_id || null,
      has_more: Boolean(payload.has_more),
      total_visible: payload.total_visible ?? data.length,
    }
  },
  async getServiceRequests() {
    const result = await this.getServiceRequestsPage()
    return result.data
  },
  async getAllTickets() {
    return this.getServiceRequests()
  },
  async getTechnicians() {
    const response = await api.get('/admin/technicians')
    return response.data
  },
  async dispatch(payload) {
    const response = await api.post('/admin/dispatch', payload)
    return response.data
  },
  async reviewServiceRequest(requestId, payload) {
    const response = await api.post(`/admin/service-requests/${requestId}/review`, payload)
    return response.data
  },
  async getServiceRequestById(requestId, { signal } = {}) {
    const response = await api.get(`/admin/service-requests/${requestId}`, { signal })
    return response.data
  },
  async getServiceRequestImageBlob(requestId, { signal } = {}) {
    const response = await api.get(`/admin/service-requests/${requestId}/image`, { responseType: 'blob', signal })
    return response.data
  },
  async getKpis({ exclude_e2e } = {}) {
    const params = {}
    if (exclude_e2e != null) params.exclude_e2e = exclude_e2e
    const response = await api.get('/admin/kpis', { params })
    return response.data
  },
  async getPendingHitl() {
    const response = await api.get('/admin/pending-hitl')
    return safeArray(response.data)
  },
  async getReassignmentActivity({ limit = 50, eventType = null } = {}) {
    const params = { limit }
    if (eventType) params.event_type = eventType
    const response = await api.get('/admin/reassignment-activity', { params })
    const data = response.data || {}
    return {
      events: data.events || [],
      count: data.count || 0,
      summary: data.summary || {},
    }
  },
  async decideReassignment(requestId, { decision, notes } = {}) {
    const response = await api.post(`/admin/service-requests/${requestId}/reassignment-decision`, {
      decision,
      notes,
    })
    return response.data
  },
}

export const diagnoseFault = async (formData) => {
  const response = await api.post('/diagnose', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const setAuthToken = (token) => {
  setSessionItem(TOKEN_KEY, token || '')
}

export const getAuthToken = () => getSessionItem(TOKEN_KEY)

export const setStoredUser = (user) => {
  setSessionItem(USER_KEY, user ? JSON.stringify(user) : '')
}

export const getStoredUser = () => {
  try {
    const raw = getSessionItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const clearAuth = () => {
  removeSessionItem(TOKEN_KEY)
  removeSessionItem(USER_KEY)
}

export const setHadActiveSession = (value) => {
  setSessionItem(ACTIVE_SESSION_KEY, value ? '1' : '')
}

export const getHadActiveSession = () => getSessionItem(ACTIVE_SESSION_KEY) === '1'

export const markSessionExpired = () => {
  setSessionItem(SESSION_EXPIRED_KEY, '1')
}

export const consumeSessionExpired = () => {
  const flagged = getSessionItem(SESSION_EXPIRED_KEY) === '1'
  if (flagged) {
    removeSessionItem(SESSION_EXPIRED_KEY)
  }
  return flagged
}

export default api
