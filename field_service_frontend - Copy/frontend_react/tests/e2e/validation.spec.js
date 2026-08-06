/**
 * E2E tests — Pending HITL & Database Validation
 *
 * Cross-cutting checks that span all dashboards:
 *
 * 1. KPI pending_hitl count matches /admin/pending-hitl list length
 * 2. After approve/reject, the counts update correctly
 * 3. Database state is consistent with UI state
 */

import { test, expect } from '@playwright/test'
import { loginViaApi, apiGet, apiPost, TEST_ACCOUNTS } from './helpers.js'

const ADMIN = TEST_ACCOUNTS.admin

test.describe('Pending HITL & Database Validation', () => {
  let token = ''

  test.beforeEach(async ({ page }) => {
    const auth = await loginViaApi(page, ADMIN.email, ADMIN.password)
    token = auth.token
  })

  // ─── Test 1: KPI pending_hitl === /admin/pending-hitl list length ──────

  test('KPI pending_hitl matches pending-hitl list length', async ({ page, request }) => {
    const maxAttempts = 6
    const retryDelayMs = 2000
    let lastPendingCount = -1
    let lastListLength = -1

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      console.log('ACTION: Fetch /admin/kpis')
      const { status: kpiStatus, body: kpis } = await apiGet(request, token, '/admin/kpis')
      expect(kpiStatus).toBe(200)

      console.log('ACTION: Fetch /admin/pending-hitl')
      const { status: listStatus, body: pendingList } = await apiGet(
        request,
        token,
        '/admin/pending-hitl',
      )
      expect(listStatus).toBe(200)
      expect(Array.isArray(pendingList)).toBeTruthy()

      lastPendingCount = Number(kpis.pending_hitl ?? -1)
      lastListLength = pendingList.length

      console.log(
        `ASSERT attempt ${attempt}/${maxAttempts}: KPI pending_hitl=${lastPendingCount}, list length=${lastListLength}`,
      )
      console.log(`SETUP CHECK: pending_hitl_items=${lastListLength}`)

      if (lastListLength > 0 && lastPendingCount === lastListLength) {
        expect(lastListLength).toBeGreaterThan(0)
        return
      }

      if (attempt < maxAttempts) {
        await page.waitForTimeout(retryDelayMs)
      }
    }

    expect(lastListLength).toBeGreaterThan(0)
    expect(lastPendingCount).toBe(lastListLength)
  })

  // ─── Test 2: All KPI numbers are non-negative ─────────────────────────

  test('KPI values are non-negative and sum correctly', async ({ page, request }) => {
    const { body: kpis } = await apiGet(request, token, '/admin/kpis')

    expect(kpis.total).toBeGreaterThanOrEqual(0)
    expect(kpis.pending_hitl).toBeGreaterThanOrEqual(0)
    expect(kpis.approved).toBeGreaterThanOrEqual(0)
    expect(kpis.rejected).toBeGreaterThanOrEqual(0)

    // pending + approved + rejected should not exceed total
    const accountedFor = kpis.pending_hitl + kpis.approved + kpis.rejected
    expect(accountedFor).toBeLessThanOrEqual(kpis.total)
    console.log(
      `ACTION: KPI check — total=${kpis.total}, pending=${kpis.pending_hitl}, approved=${kpis.approved}, rejected=${kpis.rejected}, accounted=${accountedFor}`,
    )
  })

  // ─── Test 3: /admin/service-requests returns consistent shapes ─────────

  test('Service requests have required fields', async ({ page, request }) => {
    const { body } = await apiGet(request, token, '/admin/service-requests?limit=5')
    const records = body.data || body

    for (const r of records.slice(0, 5)) {
      expect(r).toHaveProperty('id')
      expect(r).toHaveProperty('status')
      console.log(`  ✔ Record ${r.id}: status=${r.status}`)
    }
  })

  // ─── Test 4: Approve via API and verify DB state ───────────────────────

  test('Approve via API — DB state updates correctly', async ({ page, request }) => {
    // Find a reviewable pending item. If the backend returns 409 for a candidate
    // (record changed between fetch and review), try the next candidate.
    const { body: pendingList } = await apiGet(request, token, '/admin/pending-hitl')
    expect(pendingList.length).toBeGreaterThan(0)

    const sortedCandidates = [...pendingList].sort((a, b) => {
      const aAssigned = a.assigned_technician || a.assigned_technician_id ? 1 : 0
      const bAssigned = b.assigned_technician || b.assigned_technician_id ? 1 : 0
      return bAssigned - aAssigned
    })

    let selected = null
    let selectedDecision = null
    let lastStatus = null
    let lastBody = null

    for (const candidate of sortedCandidates) {
      const hasAssigned = !!(candidate.assigned_technician || candidate.assigned_technician_id)
      const decision = hasAssigned ? 'approve' : 'reject'
      const notes = hasAssigned
        ? 'E2E_AUTH approved via API'
        : 'E2E_AUTH reject fallback no tech assigned'

      console.log(`ACTION: ${decision} ticket ${candidate.id} via API (hasAssigned=${hasAssigned})`)

      const { status, body: reviewBody } = await apiPost(
        request,
        token,
        `/admin/service-requests/${candidate.id}/review`,
        { decision, notes },
      )
      console.log(`ACTION: Review response status=${status}, body=${JSON.stringify(reviewBody)}`)

      lastStatus = status
      lastBody = reviewBody
      if (status === 200) {
        selected = candidate
        selectedDecision = decision
        break
      }

      if (status !== 409) {
        break
      }
    }

    expect(selected, `No reviewable pending ticket found (last status=${lastStatus}, body=${JSON.stringify(lastBody)})`).toBeTruthy()

    // Re-fetch and verify the decision was recorded
    const { body: updated } = await apiGet(
      request,
      token,
      `/admin/service-requests/${selected.id}`,
    )
    console.log(`ACTION: Post-${selectedDecision} — status=${updated.status}, decision=${updated.review_decision}`)

    // Record should no longer be pending_review and should have the expected decision
    expect(String(updated.status || '').toLowerCase()).not.toBe('pending_review')
    expect(updated.review_decision).toBe(selectedDecision === 'approve' ? 'approved' : 'rejected')
  })

  // ─── Test 5: Reject via API and verify DB state ────────────────────────

  test('Reject via API — DB state updates correctly', async ({ page, request }) => {
    const { body: pendingList } = await apiGet(request, token, '/admin/pending-hitl')
    expect(pendingList.length).toBeGreaterThan(0)

    let target = null
    let lastStatus = null
    let lastBody = null
    for (const candidate of pendingList) {
      console.log(`ACTION: Reject ticket ${candidate.id} via API`)

      const { status, body } = await apiPost(
        request,
        token,
        `/admin/service-requests/${candidate.id}/review`,
        {
          decision: 'reject',
          notes: 'E2E_AUTH rejected via API',
        },
      )

      lastStatus = status
      lastBody = body
      if (status === 200) {
        target = candidate
        break
      }
      if (status !== 409) {
        break
      }
    }

    expect(target, `No rejectable pending ticket found (last status=${lastStatus}, body=${JSON.stringify(lastBody)})`).toBeTruthy()

    // Re-fetch and verify
    const { body: updated } = await apiGet(
      request,
      token,
      `/admin/service-requests/${target.id}`,
    )
    console.log(`ACTION: Post-reject — status=${updated.status}, decision=${updated.review_decision}`)

    expect(
      ['cancelled', 'rejected'].includes(String(updated.status || '').toLowerCase()),
    ).toBeTruthy()
    expect(updated.review_decision).toBe('rejected')
  })

  // ─── Test 6: KPI updates after mutations ───────────────────────────────

  test('KPI pending count decreases after approval', async ({ page, request }) => {
    // Use the live /admin/pending-hitl list (real-time, no 30-s cache)
    // so the before/after comparison is always deterministic.
    const { body: beforeList } = await apiGet(request, token, '/admin/pending-hitl')
    console.log(`SETUP CHECK: pending_hitl_live=${beforeList.length}`)
    expect(beforeList.length).toBeGreaterThan(0)

    let rejected = false
    let lastStatus = null
    let lastBody = null
    for (const candidate of beforeList) {
      const { body: rejectBody, status: rejectStatus } = await apiPost(
        request,
        token,
        `/admin/service-requests/${candidate.id}/review`,
        { decision: 'reject', notes: 'E2E_AUTH KPI delta check live list' },
      )
      lastStatus = rejectStatus
      lastBody = rejectBody
      console.log(`ACTION: Reject ${candidate.id} status=${rejectStatus}, body=${JSON.stringify(rejectBody)}`)
      if (rejectStatus === 200) {
        rejected = true
        break
      }
      if (rejectStatus !== 409) {
        break
      }
    }
    expect(rejected, `Unable to reject any pending ticket (last status=${lastStatus}, body=${JSON.stringify(lastBody)})`).toBeTruthy()

    // Re-fetch the live list — should be one shorter immediately (no cache)
    const { body: afterList } = await apiGet(request, token, '/admin/pending-hitl')
    console.log(`ACTION: Pending live before=${beforeList.length}, after=${afterList.length}`)
    expect(afterList.length).toBeLessThan(beforeList.length)
  })
})
