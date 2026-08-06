import { Loader2 } from 'lucide-react'

export default function LoadingState({
  label = 'Loading data',
  detail = 'Please wait while we fetch the latest updates.',
  compact = false,
  className = '',
}) {
  const containerClass = compact
    ? 'rounded-md border border-gray-200 bg-white/90 px-3 py-2'
    : 'rounded-lg border border-gray-200 bg-white px-4 py-4'

  return (
    <div
      className={`${containerClass} ${className}`.trim()}
      role='status'
      aria-live='polite'
      aria-busy='true'
    >
      <div className='flex items-center gap-2 text-primary'>
        <Loader2 className='h-4 w-4 animate-spin' />
        <p className='text-sm font-medium'>{label}</p>
      </div>
      {compact ? null : <p className='mt-1 text-xs text-secondary'>{detail}</p>}
    </div>
  )
}