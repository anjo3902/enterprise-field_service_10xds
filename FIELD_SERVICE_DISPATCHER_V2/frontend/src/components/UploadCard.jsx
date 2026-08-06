import React, { useCallback } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import useNotification from '../hooks/useNotification'

const UploadCard = ({ value, onChange, error }) => {
  const [preview, setPreview] = React.useState(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const fileInputRef = React.useRef(null)
  const notification = useNotification()

  const handleFileChange = (file) => {
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!validTypes.includes(file.type)) {
      notification.warning({
        title: 'Unsupported File Type',
        message: 'Please upload a JPG or PNG image.',
        dedupeKey: 'upload-card:invalid-file-type',
      })
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      notification.warning({
        title: 'File Too Large',
        message: 'File size must be less than 10MB.',
        dedupeKey: 'upload-card:file-too-large',
      })
      return
    }

    onChange(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    handleFileChange(file)
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleRemove = () => {
    onChange(null)
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-primary">
        Upload Fault Image *
      </label>
      
      <AnimatePresence mode="wait">
        {!preview ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`
              w-full max-w-full p-8 border-2 border-dashed cursor-pointer transition-colors rounded-lg
              ${isDragging ? 'border-accent bg-accent/5' : 'border-gray-300 hover:border-accent/50'}
              ${error ? 'border-danger' : ''}
            `}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="bg-gray-100 p-4 rounded-full">
                <Upload className="w-8 h-8 text-secondary" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-secondary mt-1">
                  JPG, JPEG or PNG (max. 10MB)
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={(e) => handleFileChange(e.target.files[0])}
              className="hidden"
            />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-64 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-2 right-2 bg-white p-2 rounded-full shadow-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-primary" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-3 text-sm text-secondary">
              <ImageIcon className="w-4 h-4" />
              <span className="truncate">{value?.name}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="text-sm text-danger mt-1">{error}</p>
      )}
    </div>
  )
}

export default UploadCard
