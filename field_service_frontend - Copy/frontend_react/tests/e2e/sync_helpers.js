import { apiGet } from './helpers.js'

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Poll an admin API path until predicate(body) returns truthy or timeout.
 * Uses a small interval between polls to avoid busy-waiting.
 */
export async function pollApi(request, adminToken, path, predicate, opts = {}) {
  const timeout = opts.timeout || 60_000
  const interval = opts.interval || 1000
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const { status, body } = await apiGet(request, adminToken, path)
    if (status === 200) {
      try {
        if (await predicate(body)) return body
      } catch (e) {
        // ignore predicate errors and retry
      }
    }
    await sleep(interval)
  }
  throw new Error(`Timeout waiting for ${path}`)
}

export async function pollE2eScan(request, adminToken, testRunId, predicate, opts = {}) {
  const encoded = encodeURIComponent(testRunId)
  return await pollApi(
    request,
    adminToken,
    `/admin/test/scan?test_run_id=${encoded}`,
    predicate,
    opts,
  )
}

function findRequest(snapshot, requestId) {
  return (snapshot?.service_requests || []).find((item) => String(item.id) === String(requestId)) || null
}

function findTechnician(snapshot, techId) {
  return (snapshot?.technicians || []).find((item) => String(item.id) === String(techId)) || null
}

function routeContainsRequest(routeState, techId, requestId) {
  const route = routeState?.[String(techId)] || null
  if (!route) return false
  const routeOrder = route.route_order || []
  return routeOrder.some((item) => String(item) === String(requestId))
}

export async function waitForE2eServiceRequest(request, adminToken, testRunId, requestId, predicate, opts = {}) {
  return await pollE2eScan(request, adminToken, testRunId, (snapshot) => {
    const item = findRequest(snapshot, requestId)
    return item ? Boolean(predicate(item, snapshot)) : false
  }, opts)
}

export async function waitForE2eTechnician(request, adminToken, testRunId, techId, predicate, opts = {}) {
  return await pollE2eScan(request, adminToken, testRunId, (snapshot) => {
    const item = findTechnician(snapshot, techId)
    return item ? Boolean(predicate(item, snapshot)) : false
  }, opts)
}

export async function waitForE2eReassignmentRequested(request, adminToken, testRunId, requestId, opts = {}) {
  return await waitForE2eServiceRequest(
    request,
    adminToken,
    testRunId,
    requestId,
    (item) => Boolean(item.reassignment_requested),
    opts,
  )
}

export async function waitForE2eReassignmentProcessed(request, adminToken, testRunId, requestId, originalTechId, opts = {}) {
  return await waitForE2eServiceRequest(
    request,
    adminToken,
    testRunId,
    requestId,
    (item) => {
      const status = String(item.reassignment_status || '').toLowerCase()
      const assigned = item.assigned_technician
      if (!status) return false
      if (['processed', 'skipped', 'failed'].includes(status)) {
        if (assigned && String(assigned) !== String(originalTechId)) return true
        if (status === 'processed' || status === 'skipped') return true
      }
      return false
    },
    opts,
  )
}

export async function waitForE2eRouteContainsRequest(request, adminToken, testRunId, techId, requestId, opts = {}) {
  return await pollE2eScan(request, adminToken, testRunId, (snapshot) => {
    if (routeContainsRequest(snapshot.route_state, techId, requestId)) return true
    const item = findRequest(snapshot, requestId)
    return Boolean(item && item.reassignment_route_refreshed)
  }, opts)
}

export async function waitForE2eTechnicianJobsContain(request, adminToken, testRunId, techId, requestId, opts = {}) {
  return await pollE2eScan(request, adminToken, testRunId, (snapshot) => {
    const item = findRequest(snapshot, requestId)
    if (!item) return false
    return String(item.assigned_technician) === String(techId)
  }, opts)
}

export async function waitForE2eLiveTracking(request, adminToken, testRunId, requestId, opts = {}) {
  return await waitForE2eServiceRequest(
    request,
    adminToken,
    testRunId,
    requestId,
    (item) => Boolean(item.live_tracking_updated_at),
    opts,
  )
}

export async function waitForE2eCustomerIsolation(request, adminToken, testRunIdOrIds, customerAId, customerBId, opts = {}) {
  const testRunIds = Array.isArray(testRunIdOrIds) ? testRunIdOrIds : [testRunIdOrIds]
  if (testRunIds.length === 0) throw new Error('waitForE2eCustomerIsolation requires at least one testRunId')

  return await pollE2eScan(request, adminToken, testRunIds[0], async (snapshotA) => {
    const snapshots = [snapshotA]
    for (let i = 1; i < testRunIds.length; i += 1) {
      const { status, body } = await apiGet(request, adminToken, `/admin/test/scan?test_run_id=${encodeURIComponent(testRunIds[i])}`)
      if (status !== 200) return false
      snapshots.push(body)
    }

    const records = snapshots.flatMap((snapshot) => snapshot?.service_requests || [])
    const aRecords = records.filter((item) => String(item.customer_id) === String(customerAId) || String(item.customer_user_id) === String(customerAId))
    const bRecords = records.filter((item) => String(item.customer_id) === String(customerBId) || String(item.customer_user_id) === String(customerBId))
    if (aRecords.length === 0 || bRecords.length === 0) return false

    const aIsolated = aRecords.every((item) => String(item.customer_id || item.customer_user_id) === String(customerAId))
    const bIsolated = bRecords.every((item) => String(item.customer_id || item.customer_user_id) === String(customerBId))
    return aIsolated && bIsolated
  }, opts)
}

export async function waitForTechnicianProfile(request, technicianToken, techId, opts = {}) {
  return await pollApi(request, technicianToken, '/technician/profile', (body) => {
    return Boolean(body && Number(body.id) === Number(techId))
  }, opts)
}

export async function waitForReassignmentRequested(request, adminToken, requestId, opts = {}) {
  const testRunId = opts.testRunId
  if (!testRunId) throw new Error('waitForReassignmentRequested requires opts.testRunId')
  return await waitForE2eReassignmentRequested(request, adminToken, testRunId, requestId, opts)
}

export async function waitForReassignmentProcessed(request, adminToken, requestId, originalTechId, opts = {}) {
  const testRunId = opts.testRunId
  if (!testRunId) throw new Error('waitForReassignmentProcessed requires opts.testRunId')
  return await waitForE2eReassignmentProcessed(request, adminToken, testRunId, requestId, originalTechId, opts)
}

export async function waitForRouteContainsRequest(request, adminToken, techId, requestId, opts = {}) {
  const testRunId = opts.testRunId
  if (!testRunId) throw new Error('waitForRouteContainsRequest requires opts.testRunId')
  return await waitForE2eRouteContainsRequest(request, adminToken, testRunId, techId, requestId, opts)
}

export async function waitForTechnicianJobsContain(request, adminToken, techId, requestId, opts = {}) {
  const testRunId = opts.testRunId
  if (!testRunId) throw new Error('waitForTechnicianJobsContain requires opts.testRunId')
  return await waitForE2eTechnicianJobsContain(request, adminToken, testRunId, techId, requestId, opts)
}

export default {
  pollApi,
  pollE2eScan,
  waitForE2eServiceRequest,
  waitForE2eTechnician,
  waitForE2eReassignmentRequested,
  waitForE2eReassignmentProcessed,
  waitForE2eRouteContainsRequest,
  waitForE2eTechnicianJobsContain,
  waitForE2eLiveTracking,
  waitForE2eCustomerIsolation,
  waitForTechnicianProfile,
  waitForReassignmentRequested,
  waitForReassignmentProcessed,
  waitForRouteContainsRequest,
  waitForTechnicianJobsContain,
}
