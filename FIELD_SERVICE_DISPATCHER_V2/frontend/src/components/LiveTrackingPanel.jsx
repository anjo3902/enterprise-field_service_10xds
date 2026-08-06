import { useMemo } from 'react'
import { CheckCircle2, Clock, Navigation } from 'lucide-react'
import TrackingMap from './TrackingMap'
import StatusBadge from './StatusBadge'
import { formatTechnicianName } from '../utils/formatTechnician'

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const hasStrictCoordinates = (lat, lng) => (
  lat !== null
  && lng !== null
  && !(Number(lat) === 0 && Number(lng) === 0)
)

const formatEta = (etaMinutes) => {
  if (!Number.isFinite(Number(etaMinutes))) return 'Calculating ETA...'
  return `Arriving in ${Math.max(1, Math.round(Number(etaMinutes)))} min`
}

const formatRouteProgress = (request, tracking) => {
  const status = String(tracking?.status || request?.status || '').toLowerCase()
  const reassignmentStatus = String(request?.reassignment_status || tracking?.reassignmentStatus || '').toLowerCase()
  if (reassignmentStatus === 'requested') return 'Technician reassignment requested.'
  if (reassignmentStatus === 'pending') return 'Technician reassignment requested.'
  if (reassignmentStatus === 'processing') return 'Technician reassignment is being processed.'
  if (reassignmentStatus === 'processed') return 'Technician reassigned and route refreshed.'
  if (reassignmentStatus === 'skipped') return 'Technician assignment kept as is.'
  if (reassignmentStatus === 'rejected') return 'Reassignment request was rejected.'
  if (status === 'in_progress') return 'Technician is en route.'
  if (status === 'assigned') return 'Technician assigned and route queued.'
  return 'Waiting for route updates.'
}

const STATUS_STEPS = [
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'On the way' },
  { key: 'completed', label: 'Completed' },
]

export default function LiveTrackingPanel({ request, tracking }) {
  const requestStatus = String(request?.status || '').toLowerCase()
  const liveStatus = String(tracking?.status || requestStatus || '')

  const technicianLocation = useMemo(() => {
    const lat = toNumber(tracking?.location?.latitude ?? tracking?.technicianLocation?.lat ?? request?.assigned_technician_latitude)
    const lng = toNumber(tracking?.location?.longitude ?? tracking?.technicianLocation?.lng ?? request?.assigned_technician_longitude)
    return hasStrictCoordinates(lat, lng) ? { lat, lng } : null
  }, [tracking, request])

  const destination = useMemo(() => {
    const lat = toNumber(tracking?.customerLocation?.lat ?? request?.latitude)
    const lng = toNumber(tracking?.customerLocation?.lng ?? request?.longitude)
    return hasStrictCoordinates(lat, lng) ? { lat, lng } : null
  }, [request, tracking])

  const etaLabel = formatEta(tracking?.etaMinutes)
  const lastUpdated = tracking?.lastUpdatedAt ? new Date(tracking.lastUpdatedAt).toLocaleTimeString() : ''
  const showReconnect = tracking?.connectionState === 'reconnecting'
  const showDelayed = tracking?.isStale
  const statusLine = showDelayed
    ? 'Location update delayed.'
    : showReconnect
      ? 'Reconnecting...'
      : (lastUpdated ? `Last updated ${lastUpdated}` : 'Waiting for live updates...')

  const statusMessage = liveStatus === 'in_progress'
    ? 'Technician is on the way.'
    : liveStatus === 'assigned'
      ? 'Technician will start shortly.'
      : liveStatus === 'completed'
        ? 'Job completed.'
        : 'Tracking will appear once the job starts.'

  const reassignmentStatus = String(request?.reassignment_status || tracking?.reassignmentStatus || '').toLowerCase()
  const showReassignmentBanner = Boolean(request?.reassignment_requested || reassignmentStatus)
  const reassignmentMessage = reassignmentStatus === 'pending'
    ? 'Technician reassignment requested.'
    : reassignmentStatus === 'requested'
      ? 'Technician reassignment requested.'
    : reassignmentStatus === 'processing'
      ? 'Technician reassignment in progress.'
      : reassignmentStatus === 'processed'
        ? 'Technician reassigned successfully.'
        : reassignmentStatus === 'skipped'
          ? 'Assignment was kept as is.'
          : reassignmentStatus === 'rejected'
            ? 'Reassignment request was rejected.'
          : showReassignmentBanner
            ? 'Assignment update in progress.'
            : ''

  const activeStepIndex = Math.max(0, STATUS_STEPS.findIndex((step) => step.key === liveStatus))

  return (
    <section className='space-y-3'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <p className='text-sm font-semibold text-primary'>Live Technician Tracking</p>
          <p className='text-xs text-secondary'>{statusMessage}</p>
        </div>
        <div className='flex items-center gap-2'>
          <StatusBadge value={liveStatus || requestStatus || 'assigned'} />
        </div>
      </div>

      <div className='rounded-lg border border-gray-200 bg-white p-3'>
        <div className='flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wider text-secondary'>
          {STATUS_STEPS.map((step, index) => (
            <div key={step.key} className={`flex items-center gap-2 ${index <= activeStepIndex ? 'text-primary' : 'text-secondary'}`}>
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${index <= activeStepIndex ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300 text-gray-400'}`}>
                {index < activeStepIndex ? <CheckCircle2 className='h-3 w-3' /> : index + 1}
              </span>
              <span>{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      {showReassignmentBanner ? (
        <div className='rounded-lg border border-blue-200 bg-blue-50 p-4'>
          <p className='text-sm font-semibold text-blue-900'>Technician reassignment update</p>
          <p className='mt-1 text-sm text-blue-800'>{reassignmentMessage}</p>
          <p className='mt-2 text-xs text-blue-700'>{formatRouteProgress(request, tracking)}</p>
        </div>
      ) : null}

      <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
        <div className='rounded-lg border border-gray-200 bg-white p-4'>
          <p className='text-xs font-semibold uppercase tracking-wider text-secondary'>Technician</p>
          <p className='mt-1 text-sm text-primary'>{formatTechnicianName(request, { showPhone: true })}</p>
          {request?.assigned_technician_zone ? (
            <p className='mt-1 text-xs text-secondary'>{request.assigned_technician_zone}</p>
          ) : null}
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-4'>
          <p className='text-xs font-semibold uppercase tracking-wider text-secondary'>ETA</p>
          <p data-testid='eta-value' className='mt-1 text-sm font-semibold text-primary'>{etaLabel}</p>
          <p className='mt-1 text-xs text-secondary'>{formatRouteProgress(request, tracking)}</p>
        </div>
      </div>

      {liveStatus === 'assigned' ? (
        <div className='rounded-lg border border-gray-200 bg-white p-4'>
          <h3 className='text-sm font-semibold text-primary'>Technician Assigned</h3>
          <p className='mt-1 text-sm text-secondary'>Technician will start shortly.</p>
        </div>
      ) : null}

      {liveStatus === 'completed' ? (
        <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-4'>
          <h3 className='text-sm font-semibold text-emerald-800'>Job Completed</h3>
          <p className='mt-1 text-sm text-emerald-700'>Thank you for using our service.</p>
        </div>
      ) : null}

      {liveStatus === 'in_progress' ? (
        <div className='grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px]'>
          <div className='rounded-lg border border-gray-200 bg-white p-3'>
            {technicianLocation && destination ? (
              <TrackingMap
                technicianLocation={technicianLocation}
                destination={destination}
                zoom={13}
              />
            ) : (
              <div className='rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900'>
                Waiting for location...
              </div>
            )}
          </div>

          <div className='rounded-lg border border-gray-200 bg-white p-3 space-y-3'>
            <div>
              <p className='text-xs font-semibold uppercase tracking-wider text-secondary'>Technician</p>
              <p className='mt-1 text-sm text-primary'>{formatTechnicianName(request, { showPhone: true })}</p>
            </div>
            <div>
              <p className='text-xs font-semibold uppercase tracking-wider text-secondary flex items-center gap-1'>
                <Clock className='h-3.5 w-3.5' />
                ETA
              </p>
              <p className='mt-1 text-sm font-semibold text-primary'>{etaLabel}</p>
            </div>
            <div>
              <p className='text-xs font-semibold uppercase tracking-wider text-secondary flex items-center gap-1'>
                <Navigation className='h-3.5 w-3.5' />
                Distance
              </p>
              <p className='mt-1 text-sm text-primary'>
                {tracking?.distanceKm != null ? `${Number(tracking.distanceKm).toFixed(1)} km` : 'Calculating...'}
              </p>
            </div>
            <div className='text-xs text-secondary'>
              {statusLine}
            </div>
            {tracking?.error ? (
              <p className='text-xs text-red-600'>{tracking.error}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}
