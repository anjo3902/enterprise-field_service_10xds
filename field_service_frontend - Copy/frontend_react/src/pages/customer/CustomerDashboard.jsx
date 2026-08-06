import { useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Card from '../../components/Card'
import LoadingState from '../../components/LoadingState'
import Skeleton from '../../components/Skeleton'
import Modal from '../../components/Modal'
import Table from '../../components/Table'
import StatusBadge from '../../components/StatusBadge'
import LiveTrackingPanel from '../../components/LiveTrackingPanel'
import { customerApi } from '../../services/api'
import useNotification from '../../hooks/useNotification'
import { useMyRequests } from '../../hooks/useData'
import useDetailModal from '../../hooks/useDetailModal'
import useLiveTracking from '../../hooks/useLiveTracking'
import { formatTechnicianName, formatTechnicianSource } from '../../utils/formatTechnician'

export default function CustomerDashboard() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    data: requests = [],
    isLoading: loading,
    error: swrError,
    mutate: mutateRequests,
  } = useMyRequests()
  const error = swrError?.response?.data?.detail || (swrError ? 'Failed to load your requests' : '')
  const notification = useNotification()

  const detail = useDetailModal({
    fetchDetail: customerApi.getMyRequestById,
    fetchImageBlob: customerApi.getMyRequestImageBlob,
  })

  const imageUrl = detail.imageUrl

  const tracking = useLiveTracking(detail.detail, detail.isOpen)
  const trackingNotifyRef = useRef({ jobId: '', sent: false })

  const detailWithTracking = useMemo(() => {
    if (!detail.detail) return detail.detail
    const nextStatus = tracking?.status || detail.detail.status
    return {
      ...detail.detail,
      status: nextStatus,
      assigned_technician_name: tracking?.assignedTechnicianName || detail.detail.assigned_technician_name,
      assigned_technician_phone_number: tracking?.assignedTechnicianPhoneNumber || detail.detail.assigned_technician_phone_number,
      assigned_technician_zone: tracking?.assignedTechnicianZone || detail.detail.assigned_technician_zone,
      distance_km: tracking?.distanceKm ?? detail.detail.distance_km,
      travel_time_min: tracking?.etaMinutes ?? detail.detail.travel_time_min,
      reassignment_requested: tracking?.reassignmentRequested ?? detail.detail.reassignment_requested,
      reassignment_status: tracking?.reassignmentStatus || detail.detail.reassignment_status,
      reassignment_result: tracking?.reassignmentResult || detail.detail.reassignment_result,
    }
  }, [detail.detail, tracking])

  useEffect(() => {
    const submitSuccess = location.state?.submitSuccess
    if (!submitSuccess) return

    notification.success({
      title: 'Request Submitted',
      message: `Tracking ID #${submitSuccess.requestId || '-'} is now available in your dashboard.`,
      dedupeKey: `customer-dashboard:submit-success:${submitSuccess.requestId || 'unknown'}`,
    })

    navigate(location.pathname, { replace: true, state: {} })
  }, [location.pathname, location.state, navigate, notification])

  useEffect(() => {
    const jobId = detail.detail?.id ? String(detail.detail.id) : ''
    if (!jobId) return
    if (trackingNotifyRef.current.jobId !== jobId) {
      trackingNotifyRef.current = { jobId, sent: false }
    }
  }, [detail.detail?.id])

  useEffect(() => {
    if (!detail.isOpen) return
    const status = String(tracking?.status || '').toLowerCase()
    if (status !== 'in_progress') return
    if (trackingNotifyRef.current.sent) return

    notification.info({
      title: 'Technician on the way',
      message: 'Your technician is en route.',
      dedupeKey: `customer-tracking:on-the-way:${detail.detail?.id || 'unknown'}`,
    })
    trackingNotifyRef.current.sent = true
  }, [detail.isOpen, detail.detail?.id, notification, tracking?.status])

  useEffect(() => {
    const jobId = detail.detail?.id
    if (!jobId) return

    mutateRequests((prev) => {
      if (!Array.isArray(prev)) return prev
      return prev.map((item) => (
        String(item?.id) === String(jobId)
          ? {
            ...item,
            status: detailWithTracking?.status || item.status,
            assigned_technician_name: detailWithTracking?.assigned_technician_name || item.assigned_technician_name,
            assigned_technician_phone_number: detailWithTracking?.assigned_technician_phone_number || item.assigned_technician_phone_number,
            assigned_technician_zone: detailWithTracking?.assigned_technician_zone || item.assigned_technician_zone,
            distance_km: detailWithTracking?.distance_km ?? item.distance_km,
            travel_time_min: detailWithTracking?.travel_time_min ?? item.travel_time_min,
            reassignment_requested: detailWithTracking?.reassignment_requested ?? item.reassignment_requested,
            reassignment_status: detailWithTracking?.reassignment_status || item.reassignment_status,
          }
          : item
      ))
    }, { revalidate: false })
  }, [detail.detail?.id, detailWithTracking, mutateRequests])

  useEffect(() => {
    if (!detail.isOpen) return
    if (!detail.detail?.id) return

    const timer = window.setTimeout(() => {
      detail.reload?.().catch(() => {})
    }, 1500)

    return () => window.clearTimeout(timer)
  }, [detail.detail?.id, detail.isOpen, detail.reload, tracking?.status, tracking?.reassignmentStatus])

  const columns = useMemo(
    () => [
      { key: 'id', label: 'Request ID' },
      { key: 'fault_type', label: 'Fault Type' },
      { key: 'severity', label: 'Severity', render: (v) => <StatusBadge value={v} /> },
      { key: 'location_text', label: 'Location' },
      {
        key: 'assigned_technician',
        label: 'Technician',
        render: (_, row) => formatTechnicianName(row, { showPhone: true }),
      },
      { key: 'status', label: 'Status', render: (v) => <StatusBadge value={v} /> },
      {
        key: 'created_at',
        label: 'Created At',
        render: (v) => (v ? new Date(v).toLocaleString() : '-'),
      },
      {
        key: 'actions',
        label: 'Actions',
        render: (_, row) => (
          <button
            type='button'
            className='action-btn action-btn-view'
            onClick={() => detail.open(row.id)}
          >
            View Details
          </button>
        ),
      },
    ],
    [detail]
  )

  return (
    <div className='space-y-6'>
      <Card title='Customer Dashboard' subtitle='Track submitted service requests and live status updates'>
        {loading ? <Skeleton variant='table' rows={5} /> : null}
        {error ? <p className='text-red-600 text-sm'>{error}</p> : null}
        {!loading && !error ? <Table columns={columns} rows={requests} emptyText='No requests submitted yet' /> : null}

        <Modal
          isOpen={detail.isOpen}
          onClose={detail.close}
          title='Request Details'
          description={`Request #${detail.detail?.id || '-'}`}
          maxWidth='max-w-3xl'
          closeLabel='Close Details'
        >
          {detail.loading ? <LoadingState label='Loading selected request' compact className='mt-1' /> : null}
          {detail.error ? <p className='text-red-600 text-sm mt-1'>{detail.error}</p> : null}

          {!detail.loading && detailWithTracking ? (
            <div className='space-y-5'>
              <LiveTrackingPanel request={detailWithTracking} tracking={tracking} />

              <div className='grid grid-cols-1 md:grid-cols-2 gap-3 text-sm'>
                <div className='rounded border border-gray-200 p-4'>
                  <p className='text-xs text-secondary'>Fault & Severity</p>
                  <p className='text-primary mt-1'>{detailWithTracking.fault_type || '-'} | {detailWithTracking.severity || '-'}</p>
                </div>
                <div className='rounded border border-gray-200 p-4'>
                  <p className='text-xs text-secondary'>Status</p>
                  <p className='text-primary mt-1'>{detailWithTracking.status || '-'}</p>
                </div>
                <div className='rounded border border-gray-200 p-4'>
                  <p className='text-xs text-secondary'>Created At</p>
                  <p className='text-primary mt-1'>{detailWithTracking.created_at ? new Date(detailWithTracking.created_at).toLocaleString() : '-'}</p>
                </div>
                <div className='rounded border border-gray-200 p-4'>
                  <p className='text-xs text-secondary'>Assigned At</p>
                  <p className='text-primary mt-1'>{detailWithTracking.assigned_at ? new Date(detailWithTracking.assigned_at).toLocaleString() : '-'}</p>
                </div>
              </div>

              <div className='rounded border border-gray-200 p-4'>
                <p className='text-xs text-secondary'>Location</p>
                <p className='text-primary mt-1'>{detailWithTracking.location_text || '-'}</p>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-3 text-sm'>
                <div className='rounded border border-gray-200 p-4'>
                  <p className='text-xs text-secondary'>Technician</p>
                  <p className='text-primary mt-1'>{formatTechnicianName(detailWithTracking)}</p>
                </div>
                <div className='rounded border border-gray-200 p-4'>
                  <p className='text-xs text-secondary'>Technician Phone</p>
                  <p className='text-primary mt-1'>{detailWithTracking.assigned_technician_phone_number || '-'}</p>
                </div>
                <div className='rounded border border-gray-200 p-4 md:col-span-2'>
                  <p className='text-xs text-secondary'>Technician Source</p>
                  <p className='text-primary mt-1'>{formatTechnicianSource(detailWithTracking, { precision: 5 })}</p>
                </div>
              </div>

              <div className='rounded border border-gray-200 p-4'>
                <p className='text-xs text-secondary'>Issue Description</p>
                <p className='text-primary mt-1'>{detailWithTracking.issue_description || '-'}</p>
              </div>

              {imageUrl ? (
                <div className='rounded border border-gray-200 p-4'>
                  <p className='text-xs text-secondary mb-2'>Uploaded Evidence Image</p>

                  <img
                    src={imageUrl}
                    alt='Service evidence'
                    className='w-full max-h-[360px] object-contain rounded border border-gray-100'
                  />
                </div>
              ) : (
                <div className='rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800'>
                  No image evidence available for this request.
                </div>
              )}
            </div>
          ) : null}
        </Modal>
      </Card>
    </div>
  )
}
