import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Encapsulates the repeated detail-modal + image-blob pattern
 * used across Admin, Customer, and Technician dashboards.
 */
export default function useDetailModal({ fetchDetail, fetchImageBlob }) {
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState(null)
  const [imageUrl, setImageUrl] = useState('')
  const [error, setError] = useState('')
  const currentIdRef = useRef(null)
  const imageUrlRef = useRef('')

  const revokeImage = useCallback(() => {
    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current)
      imageUrlRef.current = ''
    }
  }, [])

  const cancelPending = useCallback(() => {
    return
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      revokeImage()
    }
  }, [revokeImage])

  const open = useCallback(async (id) => {
    cancelPending()
    currentIdRef.current = id

    setLoading(true)
    setError('')
    revokeImage()
    setImageUrl('')

    try {
      const data = await fetchDetail(id)
      setDetail(data)

      try {
        const blob = await fetchImageBlob(id)

        const url = URL.createObjectURL(blob)

        setImageUrl(url)
        imageUrlRef.current = url
      } catch (err) {
        setImageUrl('')
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load details')
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [fetchDetail, fetchImageBlob, revokeImage, cancelPending])

  const reload = useCallback(async () => {
    if (currentIdRef.current == null) return null
    return open(currentIdRef.current)
  }, [open])

  const close = useCallback(() => {
    cancelPending()
    setDetail(null)
    setError('')
    revokeImage()
    setImageUrl('')
  }, [revokeImage, cancelPending])

  return {
    loading,
    detail,
    imageUrl,
    error,
    open,
    reload,
    close,
    isOpen: Boolean(loading || detail || error)
  }
}