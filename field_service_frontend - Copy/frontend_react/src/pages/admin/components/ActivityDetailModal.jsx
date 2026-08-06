import { Check, Edit2, X } from 'lucide-react'
import Modal from '../../../components/Modal'
import LoadingState from '../../../components/LoadingState'
import SeverityComparison from '../../../components/SeverityComparison'
import ReviewBadge from '../../../components/ReviewBadge'
import { TriggerBadgeStateful, canonicalKey, TRIGGER_META, isPendingHitl, deduplicateTriggers } from '../../../components/TriggerBadge'

function InfoCell({ label, children }) {
  return (
    <div className='border border-gray-200 rounded-lg p-3'>
      <p className='text-[0.67rem] text-gray-400 uppercase tracking-wider mb-1'>{label}</p>
      <div className='text-gray-900 text-sm break-words'>{children || '-'}</div>
    </div>
  )
}

export default function ActivityDetailModal({ detail, onClose, onApprove, onModify, onReject, onReviewBadgeClick, reviewingId }) {
  const { loading, detail: ticket, imageUrl, error, isOpen } = detail

  if (!isOpen) return null

  return (
    <Modal isOpen onClose={onClose} title='Request Detail & AI Review' description={`Ticket #${ticket?.id || '-'}`} maxWidth='max-w-3xl' closeLabel='Close'>
      {loading ? <LoadingState label='Loading details' compact className='mt-1' /> : null}
      {error ? <p className='text-red-600 text-sm mt-1'>{error}</p> : null}

      {!loading && ticket ? (
        <div className='space-y-4'>
          {/* Severity verdict */}
          <div>
            <p className='text-[0.72rem] text-gray-500 mb-2 font-bold uppercase tracking-wider'>Severity Verdict</p>
            <SeverityComparison aiSeverity={ticket.severity} finalSeverity={ticket.final_severity} />
          </div>

          {/* Info grid */}
          <div className='grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5 text-sm'>
            <InfoCell label='Customer'>{ticket.customer_name}</InfoCell>
            <InfoCell label='Created At'>{ticket.created_at ? new Date(ticket.created_at).toLocaleString() : '-'}</InfoCell>
            <InfoCell label='Fault Type'>{ticket.fault_type}</InfoCell>
            <InfoCell label='Status'>{ticket.status}</InfoCell>
            <InfoCell label='Image Severity'>{ticket.image_severity}</InfoCell>
            <InfoCell label='Description Severity'>{ticket.description_severity}</InfoCell>
            <InfoCell label='Confidence'>
              {ticket.confidence != null
                ? `${Math.round(Number(ticket.confidence) * 100)}%`
                : ticket.diagnosis_confidence != null
                ? `${Math.round(Number(ticket.diagnosis_confidence) * 100)}%`
                : '-'}
            </InfoCell>
            <InfoCell label='Safety Escalation'>{ticket.safety_escalation ? 'Yes' : 'No'}</InfoCell>
            <InfoCell label='Safety Score'>{ticket.safety_score != null ? `${ticket.safety_score}/5` : '-'}</InfoCell>
            <InfoCell label='Operational Impact'>{ticket.operational_impact != null ? `${ticket.operational_impact}/5` : '-'}</InfoCell>
            <InfoCell label='Escalation Risk'>{ticket.escalation_risk != null ? `${ticket.escalation_risk}/5` : '-'}</InfoCell>
            <InfoCell label='Assigned Technician'>
              {ticket.assigned_technician_name
                ? `${ticket.assigned_technician_name}${ticket.assigned_technician ? ` (ID: ${ticket.assigned_technician})` : ''}`
                : ticket.assigned_technician ? `Tech #${ticket.assigned_technician}` : '-'}
            </InfoCell>
            <InfoCell label='Reviewed At'>{ticket.reviewed_at ? new Date(ticket.reviewed_at).toLocaleString() : '-'}</InfoCell>
            <InfoCell label='Review Notes'>
              <ReviewBadge row={ticket} onClick={() => onReviewBadgeClick(ticket)} />
            </InfoCell>
          </div>

          {/* Issue description */}
          {ticket.issue_description && (
            <InfoCell label='Issue Description'>{ticket.issue_description}</InfoCell>
          )}

          {/* Evidence image */}
          {imageUrl ? (
            <div className='border border-gray-200 rounded-lg p-3'>
              <p className='text-[0.67rem] text-gray-400 uppercase tracking-wider mb-2'>Evidence Image</p>
              <img src={imageUrl} alt='Service evidence' className='w-full max-h-[340px] object-contain rounded border border-gray-100' />
            </div>
          ) : (
            <div className='border border-amber-300 bg-amber-50 rounded-lg p-3 text-sm text-amber-800'>
              No image evidence available for this ticket.
            </div>
          )}

          {/* AI reasoning */}
          <InfoCell label='AI Reasoning'>
            {ticket.final_reasoning || ticket.diagnosis_reason || '-'}
          </InfoCell>

          {/* HITL triggers */}
          <div className='border border-gray-200 rounded-lg p-3'>
            <p className='text-[0.67rem] text-gray-400 uppercase tracking-wider mb-2'>HITL Triggers</p>
            {(() => {
              const richTriggers = ticket.diagnosis_payload?.hitl_trigger_details || []
              const rawStrings = (ticket.hitl_triggers || []).filter(
                (t) => !richTriggers.some((d) => d.type === canonicalKey(t))
              )
              const allTriggers = deduplicateTriggers([...richTriggers, ...rawStrings])

              if (allTriggers.length === 0) {
                return <p className='text-gray-500 text-sm'>No HITL triggers recorded for this request.</p>
              }
              return (
                <div className='flex flex-col gap-2'>
                  {allTriggers.map((trigger, idx) => (
                    <TriggerBadgeStateful key={idx} trigger={trigger} />
                  ))}
                </div>
              )
            })()}
          </div>

          {/* Action buttons (only for pending) */}
          {isPendingHitl(ticket) && (
            <div className='flex gap-2.5 justify-end flex-wrap pt-1'>
              <button type='button' className='action-btn action-btn-success' disabled={reviewingId === ticket.id} onClick={() => onApprove(ticket.id)}>
                <Check className='w-4 h-4' />
                {reviewingId === ticket.id ? 'Processing…' : 'Approve'}
              </button>
              <button type='button' className='action-btn action-btn-warning' disabled={reviewingId === ticket.id} onClick={() => onModify(ticket)}>
                <Edit2 className='w-4 h-4' />
                Modify &amp; Approve
              </button>
              <button type='button' className='action-btn action-btn-danger' disabled={reviewingId === ticket.id} onClick={() => onReject(ticket)}>
                <X className='w-4 h-4' />
                Reject
              </button>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  )
}
