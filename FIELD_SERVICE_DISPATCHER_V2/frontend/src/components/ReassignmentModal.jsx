import { useState } from 'react'
import { AlertCircle, X, Send } from 'lucide-react'

const REASSIGNMENT_REASONS = [
  { value: 'emergency_unavailable', label: 'Emergency unavailable' },
  { value: 'route_overload', label: 'Route overload' },
  { value: 'vehicle_issue', label: 'Vehicle issue' },
  { value: 'customer_reschedule', label: 'Customer reschedule' },
  { value: 'skill_mismatch', label: 'Skill mismatch' },
  { value: 'safety_issue', label: 'Safety issue' },
  { value: 'time_constraint', label: 'Time constraint' },
]

export default function ReassignmentModal({
  jobId,
  jobDetails,
  isOpen,
  isSubmitting,
  onSubmit,
  onClose,
}) {
  const [selectedReason, setSelectedReason] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    setError('')

    if (!selectedReason.trim()) {
      setError('Please select a reason for reassignment.')
      return
    }

    const payload = {
      reason: selectedReason,
      notes: notes.trim() || undefined,
    }

    onSubmit(payload)
  }

  const handleClose = () => {
    setSelectedReason('')
    setNotes('')
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
      <div className='w-full max-w-md rounded-lg bg-white shadow-lg'>
        {/* Header */}
        <div className='flex items-center justify-between border-b border-gray-200 px-6 py-4'>
          <div className='flex items-center gap-3'>
            <AlertCircle className='h-5 w-5 text-orange-500' />
            <h2 className='text-lg font-semibold text-primary'>Request Reassignment</h2>
          </div>
          <button
            type='button'
            onClick={handleClose}
            disabled={isSubmitting}
            className='rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50'
            aria-label='Close'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        {/* Content */}
        <div className='space-y-4 px-6 py-4'>
          {/* Job Info */}
          <div className='rounded-md bg-gray-50 p-3'>
            <p className='text-xs font-semibold uppercase tracking-wide text-secondary'>Job ID</p>
            <p className='mt-1 text-sm font-medium text-primary'>{jobId}</p>
            {jobDetails?.fault_type && (
              <>
                <p className='mt-2 text-xs font-semibold uppercase tracking-wide text-secondary'>Fault Type</p>
                <p className='mt-1 text-sm text-primary'>{jobDetails.fault_type}</p>
              </>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className='flex gap-2 rounded-md bg-red-50 p-3'>
              <AlertCircle className='h-4 w-4 flex-shrink-0 text-red-600 mt-0.5' />
              <p className='text-sm text-red-700'>{error}</p>
            </div>
          )}

          {/* Reason Dropdown */}
          <div>
            <label className='block text-sm font-semibold text-primary mb-2'>
              Reason for Reassignment
              <span className='text-red-500 ml-1'>*</span>
            </label>
            <select
              value={selectedReason}
              onChange={(e) => {
                setSelectedReason(e.target.value)
                setError('')
              }}
              disabled={isSubmitting}
              className='w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-primary focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500'
            >
              <option value=''>-- Select a reason --</option>
              {REASSIGNMENT_REASONS.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className='block text-sm font-semibold text-primary mb-2'>
              Additional Notes
              <span className='text-gray-400 ml-1 font-normal text-xs'>(Optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              placeholder='Provide any additional context for the reassignment request...'
              rows={3}
              maxLength={500}
              className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-primary placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 resize-none'
            />
            <p className='mt-1 text-xs text-gray-500'>{notes.length}/500 characters</p>
          </div>
        </div>

        {/* Footer */}
        <div className='flex gap-2 border-t border-gray-200 px-6 py-3 bg-gray-50 rounded-b-lg'>
          <button
            type='button'
            onClick={handleClose}
            disabled={isSubmitting}
            className='flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            Cancel
          </button>
          <button
            type='button'
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedReason.trim()}
            className='flex-1 flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            <Send className='h-4 w-4' />
            {isSubmitting ? 'Submitting...' : 'Request Reassignment'}
          </button>
        </div>
      </div>
    </div>
  )
}
