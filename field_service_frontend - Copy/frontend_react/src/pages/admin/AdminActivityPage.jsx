import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Edit2, Eye, X } from 'lucide-react'

import Card from '../../components/Card'
import StatusBadge from '../../components/StatusBadge'
import { TriggerBadgeList, isPendingHitl } from '../../components/TriggerBadge'
import { adminApi } from '../../services/api'
import useDetailModal from '../../hooks/useDetailModal'
import { useActivityFeed, useReassignmentActivity } from '../../hooks/useData'
import useNotification from '../../hooks/useNotification'

import ModifyApproveModal from './components/ModifyApproveModal'
import RejectModal from './components/RejectModal'
import ReviewDetailsModal from './components/ReviewDetailsModal'
import ActivityDetailModal from './components/ActivityDetailModal'

const INTERNAL_TECH_NAME_RE = /playwright|e2e|test tech|test-tech|internal/i
const REASSIGNMENT_REASON_LABELS = {
  emergency_unavailable: 'Emergency unavailable',
  route_overload: 'Route overload',
  vehicle_issue: 'Vehicle issue',
  customer_reschedule: 'Customer reschedule',
  skill_mismatch: 'Skill mismatch',
  safety_issue: 'Safety issue',
  time_constraint: 'Time constraint',
}

const normalizeReassignmentStatus = (row) => {
  const raw = String(row?.status_display || row?.status || row?.event_type || '').trim().toLowerCase()
  if (!raw) return ''
  const normalized = raw.startsWith('reassignment_') ? raw.replace('reassignment_', '') : raw
  if (normalized === 'processed') return 'completed'
  if (normalized === 'skipped') return 'failed'
  return normalized
}

const formatSlaMinutes = (value) => {
  const minutes = Number(value)
  if (!Number.isFinite(minutes) || minutes < 0) return '-'
  if (minutes >= 60) {
    const totalMinutes = Math.round(minutes)
    const hours = Math.floor(totalMinutes / 60)
    const remaining = totalMinutes % 60
    return remaining ? `${hours}h ${remaining}m` : `${hours}h`
  }
  const decimals = minutes < 1 ? 2 : 1
  const trimmed = String(parseFloat(minutes.toFixed(decimals)))
  return `${trimmed}m`
}

function normalizeTechnicianName(name) {
  const cleaned = String(name || '').trim()
  if (!cleaned) return ''
  if (INTERNAL_TECH_NAME_RE.test(cleaned)) return ''
  return cleaned.replace(/\s+/g, ' ')
}

function normalizeTechnicianId(value) {
  if (value == null) return ''
  const cleaned = String(value).trim()
  if (!cleaned || cleaned === '-' || cleaned === '0' || cleaned === 'null' || cleaned === 'undefined') return ''
  return cleaned
}

function formatReassignmentTechnician({ name, id, status, previousId }) {
  const safeName = normalizeTechnicianName(name)
  const safeId = normalizeTechnicianId(id)

  const normalizedStatus = String(status || '').toLowerCase()
  if (['requested', 'processing'].includes(normalizedStatus)) {
    if (!safeId || (previousId && String(previousId) === safeId)) {
      return 'Pending assignment'
    }
  }

  if (!safeName && !safeId) return '-'

  if (safeName && safeId) return `Tech #${safeId} - ${safeName}`
  if (safeName) return safeName
  return `Tech #${safeId}`
}

function formatReassignmentReason(reason) {
  const normalized = String(reason || '').trim().toLowerCase()
  if (!normalized) return '-'
  return REASSIGNMENT_REASON_LABELS[normalized] || normalized.replace(/_/g, ' ')
}

// ─── Column: Final severity with admin-override indicator ───────────────────
function FinalSeverityCell({ row }) {
  const final = row.final_severity || row.severity
  const changed = row.final_severity && row.final_severity !== row.severity
  return (
    <div className='flex flex-col gap-0.5'>
      <span className='text-sm font-semibold capitalize text-primary'>{final || '-'}</span>
      {changed && <span className='text-[0.65rem] font-semibold text-amber-700'>Updated by Admin</span>}
    </div>
  )
}

function SimpleTable({ columns, rows, emptyText }) {
  return (
    <div className='w-full max-w-full rounded-lg border border-gray-200 bg-white'>
      <div className='hidden overflow-x-auto md:block'>
        <div className='max-h-[70vh] overflow-auto'>
          <table className='w-full min-w-[960px] table-auto text-sm'>
            <thead className='text-left'>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className='sticky top-0 z-10 border-b border-gray-200 bg-gray-50 px-4 py-3 align-top font-semibold text-primary'>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100'>
              {rows.length === 0 ? (
                <tr>
                  <td className='px-4 py-6 text-secondary' colSpan={Math.max(columns.length, 1)}>
                    {emptyText}
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row.id || idx}>
                    {columns.map((col) => (
                      <td key={col.key} className='min-w-0 px-4 py-3 align-top text-primary'>
                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className='md:hidden'>
        {rows.length === 0 ? (
          <div className='px-4 py-6 text-secondary text-sm'>{emptyText}</div>
        ) : (
          <div className='divide-y divide-gray-100'>
            {rows.map((row, idx) => (
              <article key={row.id || idx} className='p-4 bg-white'>
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  {columns.map((col) => (
                    <div key={col.key} className='min-w-0'>
                      <p className='text-xs font-medium leading-snug text-secondary'>{col.label}</p>
                      <div className='mt-1.5 min-w-0 break-words text-[0.95rem] text-primary'>
                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '-')}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function AdminActivityPage() {
  const [reviewFilter, setReviewFilter] = useState('all')
  const finalizedMode = reviewFilter === 'rejected' ? 'all' : 'finalized'

  // ── SWR data (shared infinite cache with AdminDashboard) ─────────────
  const {
    tickets: finalizedTickets, hasMore, kpis, pendingItems,
    loading, error: swrError, isValidating,
    mutateTickets, refreshAll, loadMore,
  } = useActivityFeed({ finalizedMode, excludeE2E: false })
  
  // ── Reassignment activity ──────────────────────────────────────────────
  const {
    events: reassignmentEvents,
    summary: reassignmentSummary,
    loading: reassignmentLoading,
    mutate: reassignmentMutate,
  } = useReassignmentActivity()
  
  const [reviewingId, setReviewingId] = useState(null)
  const [reassignmentDecisionId, setReassignmentDecisionId] = useState(null)
  const [reviewMessage, setReviewMessage] = useState('')
  const [error, setError] = useState('')
  const [isFilterLoading, setIsFilterLoading] = useState(false)

  // ── Modal triggers ─────────────────────────────────────────────────────
  const [modifyTicket, setModifyTicket] = useState(null)
  const [rejectTicket, setRejectTicket] = useState(null)
  const [reviewBadgeTicket, setReviewBadgeTicket] = useState(null)
  const notification = useNotification()

  const detailModal = useDetailModal({
    fetchDetail: adminApi.getServiceRequestById,
    fetchImageBlob: adminApi.getServiceRequestImageBlob,
  })

  // ── Derived lists ─────────────────────────────────────────────────────
  // Use finalizedTickets directly (already filtered by backend)
  const isApprovedReview = useCallback((ticket) => {
    const decision = String(ticket?.review_decision || '').toLowerCase()
    if (decision === 'approved' || decision === 'modify_approve' || decision === 'auto_approved') return true
    return String(ticket?.ai_review_status || '').toLowerCase() === 'auto_approved'
  }, [])

  const isRejectedReview = useCallback((ticket) => String(ticket?.review_decision || '').toLowerCase() === 'rejected', [])

  const approvedItems = useMemo(() => finalizedTickets.filter(isApprovedReview), [finalizedTickets, isApprovedReview])
  const rejectedItems = useMemo(() => finalizedTickets.filter(isRejectedReview), [finalizedTickets, isRejectedReview])
  const filteredReviewedItems = useMemo(() => {
    if (reviewFilter === 'approved') return approvedItems
    if (reviewFilter === 'rejected') return rejectedItems
    return finalizedTickets
  }, [reviewFilter, approvedItems, rejectedItems, finalizedTickets])

  const filteredTotal = useMemo(() => {
    if (!kpis) return null
    if (reviewFilter === 'approved') return Number(kpis.approved ?? 0)
    if (reviewFilter === 'rejected') return Number(kpis.rejected ?? 0)
    return null
  }, [kpis, reviewFilter])

  const canLoadMore = useMemo(() => {
    if (reviewFilter === 'all') return hasMore
    if (filteredTotal == null) return hasMore
    return filteredReviewedItems.length < filteredTotal && hasMore
  }, [reviewFilter, filteredTotal, filteredReviewedItems.length, hasMore])

  const shouldAutoScan = useMemo(() => {
    if (reviewFilter === 'all') return false
    if (!canLoadMore) return false
    if (filteredReviewedItems.length > 0) return false
    if (filteredTotal === 0) return false
    return true
  }, [reviewFilter, canLoadMore, filteredReviewedItems.length, filteredTotal])

  const countFilteredTickets = useCallback((pages, filter) => {
    if (!Array.isArray(pages)) return 0
    const seen = new Set()
    let count = 0
    for (const page of pages) {
      const rows = Array.isArray(page?.data) ? page.data : []
      for (const row of rows) {
        if (!row || row.id == null) continue
        const key = String(row.id)
        if (seen.has(key)) continue
        seen.add(key)
        if (filter === 'approved') {
          if (isApprovedReview(row)) count += 1
        } else if (filter === 'rejected') {
          if (isRejectedReview(row)) count += 1
        } else {
          count += 1
        }
      }
    }
    return count
  }, [isApprovedReview, isRejectedReview])

  const handleFilterChange = useCallback((nextFilter) => {
    setReviewFilter((current) => {
      if (nextFilter === 'all') return 'all'
      return current === nextFilter ? 'all' : nextFilter
    })
  }, [])

  // ── Action handlers ───────────────────────────────────────────────────
  const refreshData = useCallback(() => refreshAll(), [refreshAll])

  const handleReassignmentDecision = useCallback(async ({ requestId, decision }) => {
    if (!requestId || reassignmentDecisionId) return
    setReassignmentDecisionId(requestId)
    try {
      const result = await adminApi.decideReassignment(requestId, { decision })
      const message = result?.message || (decision === 'approve' ? 'Reassignment approved' : 'Reassignment rejected')
      if (decision === 'approve') {
        notification.success({
          title: 'Reassignment Approved',
          message,
          dedupeKey: `reassignment:approve:${requestId}`,
        })
      } else {
        notification.warning({
          title: 'Reassignment Rejected',
          message,
          dedupeKey: `reassignment:reject:${requestId}`,
        })
      }
      await reassignmentMutate()
      await refreshData()
    } catch (err) {
      const detail = err?.response?.data?.detail || 'Failed to submit reassignment decision'
      setError(detail)
      notification.error({
        title: 'Decision Failed',
        message: detail,
        dedupeKey: `reassignment:decision-error:${requestId}`,
      })
    } finally {
      setReassignmentDecisionId(null)
    }
  }, [notification, reassignmentDecisionId, reassignmentMutate, refreshData])

  const handleLoadMore = useCallback(async () => {
    if (isValidating || isFilterLoading || !canLoadMore) return
    if (reviewFilter === 'all') {
      await loadMore()
      return
    }

    setIsFilterLoading(true)
    try {
      const startCount = filteredReviewedItems.length
      const targetTotal = filteredTotal
      let nextHasMore = hasMore
      let lastPageCount = 0

      while (nextHasMore) {
        const data = await loadMore({ force: true })
        if (!data) break
        if (data.length === lastPageCount) break
        lastPageCount = data.length

        const nextCount = countFilteredTickets(data, reviewFilter)
        nextHasMore = Boolean(data[data.length - 1]?.has_more)
        if (targetTotal != null) {
          if (nextCount >= targetTotal) break
        } else if (nextCount > startCount) {
          break
        }
      }
    } finally {
      setIsFilterLoading(false)
    }
  }, [isValidating, isFilterLoading, canLoadMore, reviewFilter, loadMore, filteredTotal, filteredReviewedItems.length, countFilteredTickets])

  const autoScanRef = useRef({ filter: null, length: 0 })

  useEffect(() => {
    if (!shouldAutoScan || isFilterLoading || isValidating) return
    const signature = `${reviewFilter}:${finalizedTickets.length}`
    if (autoScanRef.current.filter === signature) return
    autoScanRef.current = { filter: signature, length: finalizedTickets.length }
    handleLoadMore()
  }, [shouldAutoScan, isFilterLoading, isValidating, reviewFilter, finalizedTickets.length, handleLoadMore])

  useEffect(() => {
    setIsFilterLoading(false)
  }, [reviewFilter])

  const finalizedTitle = useMemo(() => {
    if (reviewFilter === 'approved') return 'Approved Finalized Requests'
    if (reviewFilter === 'rejected') return 'Rejected Finalized Requests'
    return 'Finalized Requests'
  }, [reviewFilter])

  const isFilterScanning = useMemo(() => {
    if (reviewFilter === 'all') return false
    if (filteredReviewedItems.length > 0) return false
    return Boolean(isFilterLoading || (canLoadMore && (filteredTotal == null || filteredTotal > 0)))
  }, [reviewFilter, filteredReviewedItems.length, isFilterLoading, canLoadMore, filteredTotal])

  const handleApprove = useCallback(async (ticketId) => {
    setReviewingId(ticketId)
    setReviewMessage('')
    setError('')
    try {
      const result = await adminApi.reviewServiceRequest(ticketId, {
        decision: 'approve',
        notes: 'Approved by admin via activity queue',
      })
      setReviewMessage(result?.message || 'Request approved and dispatched')
      notification.success({
        title: 'Review Submitted',
        message: result?.message || 'Request approved and dispatched',
        dedupeKey: `admin-activity:approve:${ticketId}`,
      })
      await refreshData()
      if (detailModal.detail?.id === ticketId) detailModal.close()
    } catch (err) {
      const detail = err?.response?.data?.detail || 'Failed to approve request'
      setError(detail)
      notification.error({
        title: 'Approval Failed',
        message: detail,
        dedupeKey: `admin-activity:approve-error:${ticketId}`,
      })
    } finally {
      setReviewingId(null)
    }
  }, [refreshData, detailModal])

  const handleModifyApprove = useCallback(async ({ ticketId, final_severity, final_fault_type, notes }) => {
    setReviewingId(ticketId)
    setReviewMessage('')
    setError('')
    try {
      const result = await adminApi.reviewServiceRequest(ticketId, {
        decision: 'modify_approve', final_severity, final_fault_type, notes,
      })
      setReviewMessage(result?.message || 'Request modified and approved successfully')
      notification.success({
        title: 'Review Submitted',
        message: result?.message || 'Request modified and approved successfully',
        dedupeKey: `admin-activity:modify-approve:${ticketId}`,
      })
      await refreshData()
      if (detailModal.detail?.id === ticketId) detailModal.close()
    } catch (err) {
      const detail = err?.response?.data?.detail || 'Failed to modify and approve request'
      setError(detail)
      notification.error({
        title: 'Modify & Approve Failed',
        message: detail,
        dedupeKey: `admin-activity:modify-approve-error:${ticketId}`,
      })
    } finally {
      setReviewingId(null)
    }
  }, [refreshData, detailModal, notification])

  const handleReject = useCallback(async ({ ticketId, notes }) => {
    setReviewingId(ticketId)
    setReviewMessage('')
    setError('')
    try {
      const result = await adminApi.reviewServiceRequest(ticketId, {
        decision: 'reject', notes,
      })
      setReviewMessage(result?.message || 'Request rejected')
      notification.warning({
        title: 'Request Rejected',
        message: result?.message || 'Request rejected',
        dedupeKey: `admin-activity:reject:${ticketId}`,
      })
      await refreshData()
      if (detailModal.detail?.id === ticketId) detailModal.close()
    } catch (err) {
      const detail = err?.response?.data?.detail || 'Failed to reject request'
      setError(detail)
      notification.error({
        title: 'Reject Failed',
        message: detail,
        dedupeKey: `admin-activity:reject-error:${ticketId}`,
      })
    } finally {
      setReviewingId(null)
    }
  }, [refreshData, detailModal, notification])

  // ── Pending-queue columns ─────────────────────────────────────────────
  const pendingColumns = useMemo(() => [
    { key: 'id', label: 'Ticket ID', render: (v) => <button type='button' className='text-blue-700 underline' onClick={() => detailModal.open(v)}>{v}</button> },
    { key: 'fault_type', label: 'Fault Type' },
    { key: 'severity', label: 'AI Severity', render: (v) => <StatusBadge value={v || 'medium'} /> },
    { key: 'final_severity', label: 'Final Severity', render: (_, row) => <FinalSeverityCell row={row} /> },
    { key: 'status', label: 'Ops Status', render: (v) => <StatusBadge value={v || 'pending'} /> },
    { key: 'ai_review_status', label: 'HITL Status', render: (v) => <StatusBadge value={v || 'pending_human_review'} /> },
    { key: 'review_priority', label: 'Priority', render: (v) => <StatusBadge value={v || 'normal'} /> },
    { key: 'hitl_triggers', label: 'HITL Triggers', render: (v) => <TriggerBadgeList triggers={v} compact /> },
    {
      key: 'actions', label: 'Actions',
      render: (_, row) => {
        const canReview = isPendingHitl(row)
        const busy = reviewingId === row.id
        return (
          <div className='action-btn-group action-btn-group-vertical'>
            <button type='button' className='action-btn action-btn-view' onClick={() => detailModal.open(row.id)}><Eye className='w-4 h-4' /> View Details</button>
            {canReview ? (
              <>
                <button type='button' className='action-btn action-btn-success' disabled={busy} onClick={() => handleApprove(row.id)}><Check className='w-4 h-4' /> {busy ? 'Processing...' : 'Approve'}</button>
                <button type='button' className='action-btn action-btn-warning' disabled={busy} onClick={() => setModifyTicket(row)}><Edit2 className='w-4 h-4' /> Modify &amp; Approve</button>
                <button type='button' className='action-btn action-btn-danger' disabled={busy} onClick={() => setRejectTicket(row)}><X className='w-4 h-4' /> Reject</button>
              </>
            ) : <span className='text-secondary text-xs'>No action</span>}
          </div>
        )
      },
    },
  ], [reviewingId, detailModal, handleApprove])

  // ── Finalized-requests columns ────────────────────────────────────────
  const columns = useMemo(() => [
    { key: 'id', label: 'Ticket ID', render: (v) => <button type='button' className='text-blue-700 underline' onClick={() => detailModal.open(v)}>{v}</button> },
    { key: 'fault_type', label: 'Fault Type' },
    { key: 'severity', label: 'AI Severity', render: (v) => <StatusBadge value={v || 'medium'} /> },
    { key: 'final_severity', label: 'Final Severity', render: (_, row) => <FinalSeverityCell row={row} /> },
    {
      key: 'assigned_technician', label: 'Assigned Technician',
      render: (_, row) => row.assigned_technician_name || (row.assigned_technician ? `Tech #${row.assigned_technician}` : '-'),
    },
    {
      key: 'review_decision', label: 'Decision',
      render: (_, row) => {
        const decision = row.review_decision || (String(row.ai_review_status || '').toLowerCase() === 'auto_approved' ? 'auto_approved' : 'closed')
        return <StatusBadge value={decision || 'completed'} />
      },
    },
    { key: 'status', label: 'Ops Status', render: (v) => <StatusBadge value={v || 'completed'} /> },
    { key: 'review_notes', label: 'Review Notes', render: (_, row) => (row.review_notes || (String(row.ai_review_status || '').toLowerCase() === 'auto_approved' ? 'Auto-approved by system' : 'No manual review notes')) },
    { key: 'reviewed_at', label: 'Reviewed At', render: (v) => (v ? new Date(v).toLocaleString() : '-') },
    { key: 'actions', label: 'Actions', render: (_, row) => <button type='button' className='action-btn action-btn-view' onClick={() => detailModal.open(row.id)}><Eye className='w-4 h-4' /> View Details</button> },
  ], [detailModal, reassignmentDecisionId, handleReassignmentDecision])

  // ── Reassignment activity columns ──────────────────────────────────────
  const reassignmentColumns = useMemo(() => [
    {
      key: 'request_id',
      label: 'Request ID',
      render: (v, row) => (
        <div className='text-sm'>
          {(() => {
            const requestId = v ?? row.request_id
            const canOpen = Boolean(requestId)
            const buttonClass = canOpen
              ? 'text-blue-700 underline font-semibold hover:text-blue-800'
              : 'text-gray-400 font-semibold cursor-not-allowed'
            return (
              <button
                type='button'
                className={buttonClass}
                onClick={() => {
                  if (canOpen) detailModal.open(requestId)
                }}
                disabled={!canOpen}
              >
                {requestId || '-'}
              </button>
            )
          })()}
          {row.request?.customer_name && <p className='text-xs text-secondary mt-1'>{row.request.customer_name}</p>}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => {
        const status = normalizeReassignmentStatus(row)
        const typeColor = {
          requested: 'blue',
          processing: 'amber',
          completed: 'green',
          rejected: 'red',
          failed: 'red',
        }[status] || 'gray'
        return <StatusBadge value={status || 'requested'} color={typeColor} />
      },
    },
    {
      key: 'previous_technician_name',
      label: 'Previous Tech',
      render: (_, row) => formatReassignmentTechnician({
        name: row.previous_technician_name,
        id: row.previous_technician_id ?? row.previous_technician,
        status: normalizeReassignmentStatus(row),
      }),
    },
    {
      key: 'new_technician_name',
      label: 'New Tech',
      render: (_, row) => formatReassignmentTechnician({
        name: row.new_technician_name || row.request?.assigned_technician_name,
        id: row.new_technician_id ?? row.new_technician ?? row.request?.assigned_technician,
        status: normalizeReassignmentStatus(row),
        previousId: row.previous_technician_id ?? row.previous_technician,
      }),
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (_, row) => formatReassignmentReason(row.reason || row.request?.reassignment_reason || row.reassignment_reason),
    },
    {
      key: 'notes',
      label: 'Notes',
      render: (_, row) => {
        const notes = row.notes || row.request?.reassignment_notes || row.reassignment_notes
        return notes ? <span className='text-sm text-primary'>{notes}</span> : '-'
      },
    },
    {
      key: 'sla_impact',
      label: 'SLA Impact',
      render: (v) => {
        if (!v) return '-'
        const approvalDelay = v.approval_delay_minutes
        const processing = v.processing_duration_minutes
        const reassignmentDuration = v.reassignment_duration_minutes ?? v.time_to_reassignment_minutes
        const hasApproval = Number.isFinite(approvalDelay)
        const hasProcessing = Number.isFinite(processing)
        const hasTotal = Number.isFinite(reassignmentDuration)
        if (!hasApproval && !hasProcessing && !hasTotal) return '-'
        return (
          <div className='text-sm'>
            {hasApproval && <p>Approval Delay: {formatSlaMinutes(approvalDelay)}</p>}
            {hasProcessing && <p>Processing Time: {formatSlaMinutes(processing)}</p>}
            {hasTotal && <p className='text-amber-700 font-semibold'>Reassignment Duration: {formatSlaMinutes(reassignmentDuration)}</p>}
          </div>
        )
      },
    },
    {
      key: 'timestamp',
      label: 'Timestamp',
      render: (v) => v ? new Date(v).toLocaleString() : '-',
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => {
        const status = normalizeReassignmentStatus(row)
        const isPending = ['requested', 'pending'].includes(status) || (status === '' && row.request?.reassignment_requested)
        const canDecide = isPending
        if (!canDecide) return <span className='text-xs text-secondary'>No action</span>

        const isBusy = reassignmentDecisionId === row.request_id
        return (
          <div className='action-btn-group action-btn-group-vertical'>
            <button
              type='button'
              className='action-btn action-btn-success'
              disabled={isBusy}
              onClick={() => handleReassignmentDecision({ requestId: row.request_id, decision: 'approve' })}
            >
              {isBusy ? 'Processing...' : 'Approve'}
            </button>
            <button
              type='button'
              className='action-btn action-btn-danger'
              disabled={isBusy}
              onClick={() => handleReassignmentDecision({ requestId: row.request_id, decision: 'reject' })}
            >
              Reject
            </button>
          </div>
        )
      },
    },
  ], [detailModal])

  // ── Render ────────────────────────────────────────────────────────────
  const filterBtn = (key, label, color) => (
    <button
      type='button'
      onClick={() => handleFilterChange(key)}
      className={`rounded-lg border bg-white p-4 text-left transition-colors ${
        reviewFilter === key ? `border-${color} ring-1 ring-${color}/20` : 'border-gray-200 hover:bg-gray-50'
      }`}
    >
      <p className='text-xs text-secondary'>{label}</p>
      <p className='text-xl font-semibold text-primary mt-1'>
        {kpis ? kpis[key === 'all' ? 'pending_hitl' : key] : key === 'all' ? pendingItems.length : key === 'approved' ? approvedItems.length : rejectedItems.length}
      </p>
    </button>
  )

  return (
    <div className='space-y-6'>
      {/* ── Reassignment Activity Section ─────────────────────────────── */}
      <Card title='Technician Reassignment Activity' subtitle='Track reassignment requests, approvals, and SLA impact'>
        {reassignmentLoading ? <p className='text-secondary'>Loading reassignment activity...</p> : null}
        
        {!reassignmentLoading ? (
          <>
            {/* Summary cards */}
            <div className='grid grid-cols-2 md:grid-cols-6 gap-3 mb-4'>
              <div className='rounded-lg border border-gray-200 bg-white p-3'>
                <p className='text-xs text-secondary'>Total Events</p>
                <p className='text-lg font-semibold text-primary mt-1'>{reassignmentSummary.total_events ?? 0}</p>
              </div>
              <div className='rounded-lg border border-gray-200 bg-white p-3'>
                <p className='text-xs text-secondary'>Requested</p>
                <p className='text-lg font-semibold text-blue-700 mt-1'>{reassignmentSummary.by_status?.requested ?? reassignmentSummary.by_type?.reassignment_requested ?? 0}</p>
              </div>
              <div className='rounded-lg border border-gray-200 bg-white p-3'>
                <p className='text-xs text-secondary'>Processing</p>
                <p className='text-lg font-semibold text-amber-700 mt-1'>{reassignmentSummary.by_status?.processing ?? reassignmentSummary.by_type?.reassignment_processing ?? 0}</p>
              </div>
              <div className='rounded-lg border border-gray-200 bg-white p-3'>
                <p className='text-xs text-secondary'>Completed</p>
                <p className='text-lg font-semibold text-green-700 mt-1'>{reassignmentSummary.by_status?.completed ?? reassignmentSummary.by_type?.reassignment_completed ?? 0}</p>
              </div>
              <div className='rounded-lg border border-gray-200 bg-white p-3'>
                <p className='text-xs text-secondary'>Rejected</p>
                <p className='text-lg font-semibold text-red-700 mt-1'>{reassignmentSummary.by_status?.rejected ?? reassignmentSummary.by_type?.reassignment_rejected ?? 0}</p>
              </div>
              <div className='rounded-lg border border-gray-200 bg-white p-3'>
                <p className='text-xs text-secondary'>Failed</p>
                <p className='text-lg font-semibold text-red-700 mt-1'>{reassignmentSummary.by_status?.failed ?? reassignmentSummary.by_type?.reassignment_failed ?? 0}</p>
              </div>
            </div>

            {/* Reassignment events table */}
            <div className='mb-4'>
              <p className='text-sm font-medium text-primary mb-2'>Recent Reassignment Events</p>
              <SimpleTable
                columns={reassignmentColumns}
                rows={reassignmentEvents}
                emptyText='No reassignment events found'
              />
            </div>
          </>
        ) : null}
      </Card>

      {/* ── Activity Feed Section ─────────────────────────────────────── */}
      <Card title='Activity Feed' subtitle='Review decisions and pending human-in-the-loop queue'>
        {loading ? <p className='text-secondary'>Loading activity feed</p> : null}
        {(swrError || error) ? <p className='text-red-600 text-sm'>{swrError || error}</p> : null}
        {reviewMessage ? <p className='text-green-700 text-sm font-medium'>{reviewMessage}</p> : null}

        {!loading && !error ? (
          <>
            {/* KPI cards */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-4'>
              {filterBtn('all', 'Pending HITL', 'primary')}
              {filterBtn('approved', 'Approved (Auto + Manual)', 'green-600')}
              {filterBtn('rejected', 'Rejected Reviews', 'red-600')}
            </div>

            {/* Pending queue */}
            <div className='mb-5'>
              <p className='text-sm font-medium text-primary mb-2'>Pending Human Review Queue</p>
              <SimpleTable columns={pendingColumns} rows={pendingItems} emptyText='No pending review items' />
            </div>

            {/* Finalized */}
            <div className='flex items-center justify-between mb-2'>
              <p className='text-sm font-medium text-primary'>{finalizedTitle}</p>
              <p className='text-xs text-secondary'>
                Showing: {reviewFilter === 'approved' ? 'Approved only' : reviewFilter === 'rejected' ? 'Rejected only' : 'All finalized'}
              </p>
            </div>
            <SimpleTable
              columns={columns}
              rows={filteredReviewedItems}
              emptyText={
                isFilterScanning
                  ? 'Loading filtered requests...'
                  : reviewFilter === 'approved'
                    ? 'No approved finalized requests found'
                    : reviewFilter === 'rejected'
                      ? 'No rejected finalized requests found'
                      : 'No finalized requests found'
              }
            />
            {canLoadMore && (
              <div className='mt-4 flex justify-center'>
                <button type='button' onClick={handleLoadMore} disabled={isValidating || isFilterLoading} className='rounded border border-gray-300 bg-white px-5 py-2 text-sm text-primary hover:bg-gray-50 disabled:opacity-50'>
                  {(isValidating || isFilterLoading) ? 'Loading...' : 'Load more tickets'}
                </button>
              </div>
            )}
          </>
        ) : null}
      </Card>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {modifyTicket && <ModifyApproveModal ticket={modifyTicket} onClose={() => setModifyTicket(null)} onSubmit={handleModifyApprove} />}
      {rejectTicket && <RejectModal ticket={rejectTicket} onClose={() => setRejectTicket(null)} onSubmit={handleReject} />}
      {reviewBadgeTicket && <ReviewDetailsModal ticket={reviewBadgeTicket} onClose={() => setReviewBadgeTicket(null)} />}
      <ActivityDetailModal
        detail={detailModal}
        onClose={detailModal.close}
        onApprove={handleApprove}
        onModify={(t) => { detailModal.close(); setModifyTicket(t) }}
        onReject={(t) => { detailModal.close(); setRejectTicket(t) }}
        onReviewBadgeClick={setReviewBadgeTicket}
        reviewingId={reviewingId}
      />
    </div>
  )
}
