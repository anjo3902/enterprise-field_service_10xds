import fs from 'fs'
import path from 'path'

const API_BASE = 'http://127.0.0.1:8000'

async function safeFetch(request, token, pathUrl) {
  try {
    const res = await request.get(`${API_BASE}${pathUrl}`, { headers: { Authorization: `Bearer ${token}` } })
    const body = await res.json().catch(() => null)
    return { status: res.status(), body }
  } catch (e) {
    return { status: 0, body: null, error: String(e) }
  }
}

export async function captureFailureDiagnostics({
  page,
  request,
  adminToken,
  testName,
  testRunId,
  createdRequestId,
  createdTechId,
  collectedConsole = [],
  collectedFailedRequests = [],
}) {
  const timestamp = Date.now()
  const baseDir = path.join(process.cwd(), 'playwright-report', 'diagnostics')
  fs.mkdirSync(baseDir, { recursive: true })
  const dir = path.join(baseDir, `${testName.replace(/[^a-zA-Z0-9-_]/g, '_')}-${timestamp}`)
  fs.mkdirSync(dir, { recursive: true })

  // 1) Playwright artifacts
  try {
    const screenshotPath = path.join(dir, 'page.failure.png')
    await page.screenshot({ path: screenshotPath, fullPage: true })
  } catch (e) {
    // ignore
  }

  try {
    const html = await page.content()
    fs.writeFileSync(path.join(dir, 'page.html'), html, 'utf-8')
  } catch (e) {}

  // Stop tracing if running
  try {
    const tracePath = path.join(dir, 'trace.zip')
    await page.context().tracing.stop({ path: tracePath })
  } catch (e) {}

  // Console and network logs
  try {
    fs.writeFileSync(path.join(dir, 'console.log'), collectedConsole.join('\n'), 'utf-8')
  } catch (e) {}
  try {
    fs.writeFileSync(path.join(dir, 'failed_requests.json'), JSON.stringify(collectedFailedRequests, null, 2), 'utf-8')
  } catch (e) {}

  // 2) Backend / Firestore snapshots
  const snapshots = {}
  if (createdRequestId) {
    snapshots.request = await safeFetch(request, adminToken, `/admin/service-requests/${createdRequestId}`)
  }
  if (createdTechId) {
    // fetch list of technicians and resolve by id
    snapshots.technicians = await safeFetch(request, adminToken, `/admin/technicians`)
  }
  // Fetch reassignment activity (audit logs)
  snapshots.reassignment_activity = await safeFetch(request, adminToken, `/admin/reassignment-activity`)

  // Route snapshot for assigned technician(s)
  try {
    const assignedId = snapshots.request?.body?.assigned_technician || null
    if (assignedId) {
      snapshots.route = await safeFetch(request, adminToken, `/technician/route/${assignedId}`)
    }
  } catch (e) {}

  fs.writeFileSync(path.join(dir, 'snapshots.json'), JSON.stringify(snapshots, null, 2), 'utf-8')

  // 3) Simple root cause classification heuristics
  const classification = {
    ui_failure: collectedConsole.length > 0,
    backend_failure: collectedFailedRequests.length > 0 || (snapshots.request && snapshots.request.status >= 500),
    firestore_failure: !(snapshots.request && snapshots.request.status === 200 && snapshots.request.body),
    optimizer_issue: false,
    route_refresh_issue: false,
    lock_issue: false,
    duplicate_prevention: false,
    timeout_cause: false,
  }

  // heuristics for route/optimizer
  try {
    const req = snapshots.request?.body || {}
    const status = (req.reassignment_status || '').toLowerCase()
    if (status === 'processing') classification.lock_issue = true
    if (snapshots.route && snapshots.route.status === 200) {
      const order = snapshots.route.body?.route_order || []
      if (createdRequestId && order.length > 0 && !order.some((r) => String(r) === String(createdRequestId) || (r && r.id && String(r.id) === String(createdRequestId)))) {
        classification.route_refresh_issue = true
        classification.optimizer_issue = true
      }
    }
  } catch (e) {}

  // More heuristics: check audit logs for failures
  try {
    const events = snapshots.reassignment_activity?.body?.events || []
    const related = events.filter((e) => String(e.request_id) === String(createdRequestId))
    if (related.some((e) => e.event_type === 'reassignment_failed')) classification.backend_failure = true
    if (related.length === 0) classification.timeout_cause = true
  } catch (e) {}

  fs.writeFileSync(path.join(dir, 'classification.json'), JSON.stringify(classification, null, 2), 'utf-8')

  return { dir, snapshots, classification }
}

export default captureFailureDiagnostics
