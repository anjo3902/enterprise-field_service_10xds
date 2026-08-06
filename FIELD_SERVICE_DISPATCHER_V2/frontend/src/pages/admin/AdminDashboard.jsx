import { useMemo } from 'react'
import { Eye } from 'lucide-react'
import Card from '../../components/Card'
import LoadingState from '../../components/LoadingState'
import Skeleton from '../../components/Skeleton'
import Modal from '../../components/Modal'
import Table from '../../components/Table'
import StatusBadge from '../../components/StatusBadge'
import { adminApi } from '../../services/api'
import { useAdminDashboard } from '../../hooks/useData'
import useDetailModal from '../../hooks/useDetailModal'
import { formatTechnicianName, formatTechnicianSource } from '../../utils/formatTechnician'
import { TriggerBadgeList } from '../../components/TriggerBadge'
import { usePopup } from '../../components/ui/PopupProvider'

export default function AdminDashboard() {
  const {
    tickets, hasMore, kpis,
    loading, kpisLoading, error, loadMore, isValidating,
  } = useAdminDashboard()

  const detail = useDetailModal({
    fetchDetail: adminApi.getServiceRequestById,
    fetchImageBlob: adminApi.getServiceRequestImageBlob,
  })

  const { showPopup } = usePopup()

  const pendingReviewItems = useMemo(
    () => tickets.filter((t) => String(t.status || '').toLowerCase() === 'pending_review'),
    [tickets]
  )

  const operationsItems = useMemo(
    () => tickets.filter((t) => String(t.status || '').toLowerCase() !== 'pending_review'),
    [tickets]
  )

  const totalCount = kpis ? kpis.total : tickets.length
  const pendingHitlCount = kpis ? kpis.pending_hitl : pendingReviewItems.length
  const operationalCount = kpis ? (kpis.total - kpis.pending_hitl) : operationsItems.length



  const columns = useMemo(
    () => {
      const baseColumns = [
      { key: 'id', label: 'Ticket ID' },
      { key: 'priority', label: 'Priority', render: (v) => <StatusBadge value={v || 'normal'} /> },
      { key: 'severity', label: 'Severity', render: (v) => <StatusBadge value={v} /> },
      {
        key: 'technician_name',
        label: 'Technician',
        render: (v, row) => v || formatTechnicianName(row) || '-',
      },
      { key: 'created_at', label: 'Created At', render: (v) => (v ? new Date(v).toLocaleString() : '-') },
      { key: 'status', label: 'Status', render: (v) => <StatusBadge value={v} /> },
      {
        key: 'actions',
        label: 'Actions',
        render: (_, row) => (
          <button
            type='button'
            className='action-btn action-btn-view'
            data-testid='admin-view-details'
            onClick={() => detail.open(row.id)}
          >
            <Eye className='w-4 h-4' />
            View Details
          </button>
        ),
      },
      ]

      return baseColumns
    },
    [detail]
  )

  return (
    <div className='space-y-6'>
      <Card title='Admin Dashboard' subtitle='Track service tickets and dispatch status'>
        {error ? <p className='text-red-600 text-sm'>{error}</p> : null}
        {!error ? (
          <>
            {/* Truncated Tab Navigation as AI Diagnosis Review belongs to Activity Feed */}

            <div className='mb-4 grid grid-cols-1 md:grid-cols-3 gap-3'>
              <div data-testid='kpi-card' className='rounded border border-gray-200 bg-white p-3'>
                <p className='text-xs text-secondary'>Operational Queue</p>
                <div className='text-xl font-semibold text-primary mt-1'>
                  {kpisLoading && !kpis ? <Skeleton variant='text' className='h-7 w-20' /> : operationalCount}
                </div>
              </div>
              <div data-testid='kpi-card' className='rounded border border-amber-200 bg-amber-50 p-3'>
                <p className='text-xs text-amber-800'>Pending HITL</p>
                <div className='text-xl font-semibold text-amber-900 mt-1'>
                  {kpisLoading && !kpis ? <Skeleton variant='text' className='h-7 w-20' /> : pendingHitlCount}
                </div>
              </div>
              <div data-testid='kpi-card' className='rounded border border-gray-200 bg-white p-3'>
                <p className='text-xs text-secondary'>Total Requests</p>
                <div className='text-xl font-semibold text-primary mt-1'>
                  {kpisLoading && !kpis ? <Skeleton variant='text' className='h-7 w-20' /> : totalCount}
                </div>
              </div>
            </div>

            <div className='mt-2'>
              <p className='text-xs text-secondary mb-3'>
                Operations tracking shows dispatch execution data. HITL review decisions are handled in the separate Activity tab.
              </p>
              <p className='text-xs text-secondary mb-3'>
                Customer Location is loaded directly from service request location data stored in the database.
              </p>
              {loading ? <Skeleton variant='table' rows={6} /> : (
                <Table columns={columns} rows={operationsItems} emptyText='No operational tickets available' />
              )}
              {hasMore && (
                <div className='mt-4 flex justify-center'>
                  <button
                    type='button'
                    onClick={loadMore}
                    disabled={isValidating}
                    className='rounded border border-gray-300 bg-white px-5 py-2 text-sm text-primary hover:bg-gray-50 disabled:opacity-50'
                  >
                    {isValidating ? 'Loading...' : 'Load More Tickets'}
                  </button>
                </div>
              )}
            </div>

            <Modal
              isOpen={detail.isOpen}
              onClose={detail.close}
              title='Request Detail & AI Review'
              description={`Ticket #${detail.detail?.id || '-'}`}
              maxWidth='max-w-3xl'
              closeLabel='Close Details'
            >
              {detail.loading ? <LoadingState label='Loading ticket information' compact className='mt-1' /> : null}
              {detail.error ? <p className='text-red-600 text-sm mt-1'>{detail.error}</p> : null}

              {!detail.loading && detail.detail ? (
                <div className='space-y-5'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-3 text-sm'>
                    <div className='rounded border border-gray-200 p-4'>
                      <p className='text-xs text-secondary'>Customer</p>
                      <p className='text-primary mt-1'>{detail.detail.customer_name || '-'}</p>
                    </div>
                    <div className='rounded border border-gray-200 p-4'>
                      <p className='text-xs text-secondary'>Created At</p>
                      <p className='text-primary mt-1'>{detail.detail.created_at ? new Date(detail.detail.created_at).toLocaleString() : '-'}</p>
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
                        {detail.detail.confidence != null
                          ? `${Math.round(Number(detail.detail.confidence) * 100)}%`
                          : detail.detail.diagnosis_confidence != null
                            ? `${Math.round(Number(detail.detail.diagnosis_confidence) * 100)}%`
                            : '-'}
                      </p>
                    </div>
                    <div className='rounded border border-gray-200 p-4'>
                      <p className='text-xs text-secondary'>Safety Escalation</p>
                      <p className='text-primary mt-1'>{detail.detail.safety_escalation ? 'Yes' : 'No'}</p>
                    </div>
                    <div className='rounded border border-gray-200 p-4'>
                      <p className='text-xs text-secondary'>Assigned Technician</p>
                      <p className='text-primary mt-1'>{formatTechnicianName(detail.detail)}</p>
                    </div>
                    <div className='rounded border border-gray-200 p-4'>
                      <p className='text-xs text-secondary'>Technician Source</p>
                      <p className='text-primary mt-1'>{formatTechnicianSource(detail.detail)}</p>
                    </div>
                  </div>

                  <div className='rounded border border-gray-200 p-4'>
                    <p className='text-xs text-secondary'>Issue Description</p>
                    <p className='text-primary mt-1'>{detail.detail.issue_description || '-'}</p>
                  </div>

                  {detail.imageUrl ? (
                    <div className='rounded border border-gray-200 p-4'>
                      <p className='text-xs text-secondary mb-2'>Uploaded Evidence Image</p>
                      <img src={detail.imageUrl} alt='Service evidence' className='w-full max-h-[360px] object-contain rounded border border-gray-100' />
                    </div>
                  ) : (
                    <div className='rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800'>
                      No image evidence available for this ticket.
                    </div>
                  )}

                  <div className='rounded border border-gray-200 p-4'>
                    <p className='text-xs text-secondary'>AI Reasoning</p>
                    <p className='text-primary mt-1'>{detail.detail.final_reasoning || detail.detail.diagnosis_reason || '-'}</p>
                  </div>

                  <div className='rounded border border-gray-200 p-4'>
                    <p className='text-xs text-secondary mb-2'>HITL Triggers</p>
                    <TriggerBadgeList
                      triggers={[
                        ...(detail.detail.diagnosis_payload?.hitl_trigger_details || []),
                        ...(detail.detail.hitl_triggers || []),
                      ]}
                    />
                  </div>
                </div>
              ) : null}
            </Modal>
          </>
        ) : null}
      </Card>
    </div>
  )
}
