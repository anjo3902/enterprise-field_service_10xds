import { FileText } from 'lucide-react'

const DescriptionInput = ({ register, error }) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-primary">
        Problem Description (Optional)
      </label>
      <div className="relative">
        <textarea
          {...register('description')}
          rows={5}
          placeholder="Describe the problem in detail..."
          className={`input-field w-full resize-y ${error ? 'border-danger' : ''}`}
        />
        <FileText className="absolute top-3 right-3 w-5 h-5 text-secondary/50" />
      </div>
      <p className="text-xs text-secondary">
        Example: Water flooding hospital ward due to drainage blockage
      </p>
      {error && (
        <p className="text-sm text-danger">{error.message}</p>
      )}
    </div>
  )
}

export default DescriptionInput
