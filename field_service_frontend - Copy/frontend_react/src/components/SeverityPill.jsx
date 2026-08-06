import { memo } from 'react'

const SEVERITY_CLASSES = {
  critical: 'bg-red-600',
  high: 'bg-amber-600',
  medium: 'bg-blue-600',
  low: 'bg-green-600',
}

function SeverityPill({ value }) {
  if (!value) return <span className='text-gray-400'>-</span>
  const key = String(value).toLowerCase()
  const bg = SEVERITY_CLASSES[key] || 'bg-gray-500'
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide capitalize text-white ${bg}`} aria-label={`Severity: ${key}`}>
      {key}
    </span>
  )
}

export default memo(SeverityPill)
