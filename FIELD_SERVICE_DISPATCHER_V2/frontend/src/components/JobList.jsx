import { memo } from 'react'
import StatusBadge from './StatusBadge'
import { AlertCircle, Check, Eye } from 'lucide-react'

function JobList({ jobs = [], onMarkCompleted, onOpenDetails, onRequestReassignment, completingJobIds = [] }) {
  const busySet = new Set(completingJobIds)

  const locationValue = (job) => (
    job.location_zone
      ? `${job.location_text || '-'} (${job.location_zone})`
      : (job.location_text || '-')
  )

  const actionContent = (job, isBusy, isCompleted) => {
    if (isCompleted) {
      return (
        <div className='action-btn-group'>
          <span className='text-xs font-semibold text-secondary'>Completed</span>
          <button
            type='button'
            className='action-btn action-btn-view'
            onClick={() => onOpenDetails && onOpenDetails(job.id)}
          >
            <Eye className='w-4 h-4' />
            View Details
          </button>
          {job.completed_at && (
            <span className='text-[10px] text-gray-500'>
              {new Date(job.completed_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </span>
          )}
        </div>
      )
    }

    const statusValue = String(job.status || '').toLowerCase()
    const reassignmentStatus = String(job.reassignment_status || '').toLowerCase()
    const isReassignmentPending = Boolean(job.reassignment_requested)
      || reassignmentStatus === 'requested'
      || reassignmentStatus === 'pending'
      || reassignmentStatus === 'processing'
    const isReassignmentEligible = ['assigned', 'scheduled', 'dispatched'].includes(statusValue)
    const isReassignmentBlocked = statusValue === 'in_progress'

    return (
      <div className='action-btn-group'>
        <button
          type='button'
          className='action-btn action-btn-view'
          onClick={() => onOpenDetails && onOpenDetails(job.id)}
        >
          <Eye className='w-4 h-4' />
          View Details
        </button>
        <button
          type='button'
          className='action-btn action-btn-primary'
          onClick={() => onMarkCompleted && onMarkCompleted(job.id)}
          disabled={isBusy}
        >
          <Check className='w-4 h-4' />
          {isBusy ? 'Completing...' : 'Mark as Completed'}
        </button>
        {!isReassignmentPending && isReassignmentEligible ? (
          <button
            type='button'
            className='action-btn action-btn-warning'
            onClick={() => onRequestReassignment && onRequestReassignment(job.id)}
            disabled={isBusy}
            title='Request reassignment of this job'
          >
            <AlertCircle className='w-4 h-4' />
            Request Reassignment
          </button>
        ) : null}
        {isReassignmentPending ? (
          <span
            className='inline-flex select-none items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700'
            title='Reassignment request is pending'
          >
            <AlertCircle className='w-4 h-4' />
            Reassignment Pending
          </span>
        ) : null}
        {!isReassignmentPending && !isReassignmentEligible && isReassignmentBlocked ? (
          <span
            className='inline-flex select-none items-center gap-1.5 rounded-md border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-500'
            title='Reassignment is not allowed after work has started'
          >
            <AlertCircle className='w-4 h-4' />
            Work Started
          </span>
        ) : null}
      </div>
    )
  }

  return (
    <div className='w-full max-w-full border border-gray-200 rounded-lg overflow-hidden'>
      <div className='hidden lg:block'>
        <table className='w-full table-fixed text-sm'>
          <thead className='bg-gray-50 text-left'>
            <tr>
              <th className='px-4 py-3 font-semibold text-primary'>Job ID</th>
              <th className='px-4 py-3 font-semibold text-primary'>Fault Type</th>
              <th className='px-4 py-3 font-semibold text-primary'>Severity</th>
              <th className='px-4 py-3 font-semibold text-primary'>Location</th>
              <th className='px-4 py-3 font-semibold text-primary'>Contact</th>
              <th className='px-4 py-3 font-semibold text-primary'>Status</th>
              <th className='px-4 py-3 font-semibold text-primary'>Action</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td className='px-4 py-6 text-secondary' colSpan={7}>
                  No assigned jobs
                </td>
              </tr>
            ) : (
              jobs.map((job) => {
                const isCompleted = (job.status || '').toLowerCase() === 'completed'
                const isBusy = busySet.has(job.id)
                return (
                  <tr
                    key={job.id}
                    className={`border-t border-gray-100 ${
                      isCompleted ? 'bg-gray-100/70 text-gray-500' : 'bg-white'
                    }`}
                  >
                    <td className='px-4 py-3 text-primary align-top'>{job.id}</td>
                    <td className='px-4 py-3 text-primary align-top' style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                      {onOpenDetails ? (
                        <button type='button' className='text-blue-700 underline' onClick={() => onOpenDetails(job.id)}>
                          {job.fault_type || '-'}
                        </button>
                      ) : (
                        job.fault_type || '-'
                      )}
                    </td>
                    <td className='px-4 py-3 text-primary align-top'>
                      <StatusBadge value={job.severity} />
                    </td>
                    <td className='px-4 py-3 text-primary align-top' style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                      {locationValue(job)}
                    </td>
                    <td className='px-4 py-3 text-primary align-top' style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', whiteSpace: 'normal' }}>{job.contact_number || '-'}</td>
                    <td className='px-4 py-3 text-primary align-top'>
                      <StatusBadge value={job.status} />
                    </td>
                    <td className='px-4 py-3 text-primary align-top'>
                      {actionContent(job, isBusy, isCompleted)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className='lg:hidden'>
        {jobs.length === 0 ? (
          <div className='px-4 py-6 text-secondary text-sm'>No assigned jobs</div>
        ) : (
          <div className='divide-y divide-gray-100'>
            {jobs.map((job) => {
              const isCompleted = (job.status || '').toLowerCase() === 'completed'
              const isBusy = busySet.has(job.id)
              return (
                <article key={job.id} className={`p-4 ${isCompleted ? 'bg-gray-100/70' : 'bg-white'}`}>
                  <div className='grid gap-3' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                    <div>
                      <p className='text-[11px] font-semibold uppercase tracking-wide text-secondary'>Job ID</p>
                      <p className='mt-1 text-sm text-primary'>{job.id}</p>
                    </div>
                    <div>
                      <p className='text-[11px] font-semibold uppercase tracking-wide text-secondary'>Fault Type</p>
                      <p className='mt-1 text-sm text-primary' style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                        {onOpenDetails ? (
                          <button type='button' className='text-blue-700 underline' onClick={() => onOpenDetails(job.id)}>
                            {job.fault_type || '-'}
                          </button>
                        ) : (
                          job.fault_type || '-'
                        )}
                      </p>
                    </div>
                    <div>
                      <p className='text-[11px] font-semibold uppercase tracking-wide text-secondary'>Severity</p>
                      <div className='mt-1'><StatusBadge value={job.severity} /></div>
                    </div>
                    <div>
                      <p className='text-[11px] font-semibold uppercase tracking-wide text-secondary'>Location</p>
                      <p className='mt-1 text-sm text-primary' style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', whiteSpace: 'normal' }}>{locationValue(job)}</p>
                    </div>
                    <div>
                      <p className='text-[11px] font-semibold uppercase tracking-wide text-secondary'>Contact</p>
                      <p className='mt-1 text-sm text-primary' style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', whiteSpace: 'normal' }}>{job.contact_number || '-'}</p>
                    </div>
                    <div>
                      <p className='text-[11px] font-semibold uppercase tracking-wide text-secondary'>Status</p>
                      <div className='mt-1'><StatusBadge value={job.status} /></div>
                    </div>
                    <div className='sm:col-span-2'>
                      <p className='text-[11px] font-semibold uppercase tracking-wide text-secondary'>Action</p>
                      <div className='mt-1'>
                        {actionContent(job, isBusy, isCompleted)}
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(JobList)
