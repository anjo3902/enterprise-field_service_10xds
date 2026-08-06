import { memo } from 'react'

function ReviewBadge({ row, onClick }) {
  const isAuto =
    row.review_decision === 'auto_approved' ||
    String(row.ai_review_status || '').toLowerCase() === 'auto_approved'

  return (
    <button
      type='button'
      className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold cursor-pointer border transition-colors ${
        isAuto
          ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
          : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
      }`}
      title={isAuto ? 'Auto-approved by system' : 'Manual review by admin'}
      aria-label={isAuto ? 'Review type: auto-approved' : 'Review type: manual'}
      onClick={onClick}
    >
      {isAuto ? 'AUTO' : 'MANUAL'}
    </button>
  )
}

export default memo(ReviewBadge)
