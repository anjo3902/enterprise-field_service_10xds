import { memo } from 'react'

/**
 * Skeleton loader — shimmer placeholders for initial page loads.
 * Variants: 'table' (default), 'cards', 'kpi'
 */
function Skeleton({ variant = 'table', rows = 5, className = '' }) {
  if (variant === 'text') {
    return <span className={`skeleton skeleton-text inline-block ${className}`.trim()} role='status' aria-label='Loading value' />
  }

  if (variant === 'kpi') {
    return (
      <div className='grid grid-cols-2 sm:grid-cols-3 gap-4' role='status' aria-label='Loading statistics'>
        {[0, 1, 2].map((i) => (
          <div key={i} className='skeleton-card'>
            <div className='skeleton skeleton-text w-24' />
            <div className='skeleton skeleton-text-lg w-16 mt-2' />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'cards') {
    return (
      <div className='space-y-3' role='status' aria-label='Loading content'>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className='skeleton-card'>
            <div className='flex items-center gap-3'>
              <div className='skeleton skeleton-avatar' />
              <div className='flex-1 space-y-2'>
                <div className='skeleton skeleton-text w-3/4' />
                <div className='skeleton skeleton-text w-1/2' />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Default: table skeleton
  return (
    <div className='w-full rounded-lg border border-gray-200 bg-white overflow-hidden' role='status' aria-label='Loading table data'>
      {/* Header row */}
      <div className='flex gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200'>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className='skeleton skeleton-text flex-1' />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className='flex gap-4 px-4 py-3 border-b border-gray-100 last:border-0'>
          {[0, 1, 2, 3, 4].map((j) => (
            <div key={j} className={`skeleton skeleton-text flex-1 ${j === 0 ? 'w-12' : ''}`} />
          ))}
        </div>
      ))}
    </div>
  )
}

export default memo(Skeleton)
