import Modal from '../../../components/Modal'

export default function ReviewDetailsModal({ ticket, onClose }) {
  if (!ticket) return null

  const isAuto =
    ticket.review_decision === 'auto_approved' ||
    String(ticket.ai_review_status || '').toLowerCase() === 'auto_approved'

  const rawNotes = ticket.review_notes || (isAuto ? 'Auto-approved by system (no manual review required)' : 'No manual review notes provided.')

  const formattedDate = ticket.reviewed_at
    ? new Date(ticket.reviewed_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Auto-approved (timestamp unavailable)'

  const reviewerName = isAuto
    ? 'SYSTEM'
    : ticket.reviewed_by || (ticket.reviewed_by_user_id ? `Admin #${ticket.reviewed_by_user_id}` : 'Admin')

  return (
    <Modal isOpen onClose={onClose} title='Review Details' maxWidth='max-w-md' closeLabel='Close'>
      <div className='grid grid-cols-[minmax(100px,35%)_1fr] gap-3 text-sm text-gray-700'>
        <div className='font-semibold text-gray-500'>Reviewed By:</div>
        <div className='font-medium'>{reviewerName}</div>

        <div className='font-semibold text-gray-500'>Reviewed At:</div>
        <div>{formattedDate}</div>

        <div className='font-semibold text-gray-500'>Decision:</div>
        <div>{isAuto ? 'Auto' : 'Manual'}</div>

        <div className='font-semibold text-gray-500 pt-2'>Notes:</div>
        <div className='pt-2 leading-relaxed bg-gray-50 p-3 rounded-md border border-gray-200 mt-1'>
          {rawNotes}
        </div>
      </div>
    </Modal>
  )
}
