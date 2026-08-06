import { memo } from 'react'
import SeverityPill from './SeverityPill'

function SeverityComparison({ aiSeverity, finalSeverity }) {
  const isChanged = finalSeverity && aiSeverity && finalSeverity !== aiSeverity
  return (
    <div className={`flex flex-col gap-1.5 p-3 rounded-lg border ${isChanged ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
      <div className='flex items-center gap-2'>
        <span className='text-[0.7rem] text-gray-500 min-w-[80px]'>AI Severity</span>
        <SeverityPill value={aiSeverity} />
      </div>
      <div className='flex items-center gap-2'>
        <span className='text-[0.7rem] text-gray-500 min-w-[80px]'>Final Severity</span>
        <SeverityPill value={finalSeverity || aiSeverity} />
        {isChanged && (
          <span className='text-[0.65rem] font-semibold text-amber-700 bg-amber-200 px-1.5 py-0.5 rounded-full'>
            Updated by Admin
          </span>
        )}
      </div>
    </div>
  )
}

export default memo(SeverityComparison)
