import { Loader2 } from 'lucide-react'

const LoadingSpinner = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="w-12 h-12 text-accent animate-spin" />
      <p className="text-secondary mt-4 font-medium">Analyzing issue...</p>
      <p className="text-sm text-secondary/70 mt-1">This may take a few seconds</p>
    </div>
  )
}

export default LoadingSpinner
