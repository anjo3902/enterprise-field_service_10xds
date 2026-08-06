import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const rolePath = {
  customer: '/customer',
  technician: '/technician',
  admin: '/admin',
}

export default function ProtectedRoute({ children, role }) {
  const { isAuthenticated, user, loginWithToken } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [bootstrapping, setBootstrapping] = useState(false)

  const tokenParam = useMemo(() => {
    return new URLSearchParams(location.search).get('token') || ''
  }, [location.search])

  const jobIdParam = useMemo(() => {
    const match = location.pathname.match(/^\/technician\/jobs\/([^/]+)$/)
    return match ? decodeURIComponent(match[1]) : ''
  }, [location.pathname])

  useEffect(() => {
    if (role !== 'technician') return
    if (!tokenParam || !jobIdParam) return
    if (isAuthenticated) {
      const params = new URLSearchParams(location.search)
      if (params.has('token')) {
        params.delete('token')
        const nextSearch = params.toString()
        navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`, { replace: true })
      }
      return
    }
    if (bootstrapping) return

    let cancelled = false
    setBootstrapping(true)

    loginWithToken({ token: tokenParam, jobId: jobIdParam })
      .then(() => {
        if (cancelled) return
        const params = new URLSearchParams(location.search)
        params.delete('token')
        const nextSearch = params.toString()
        navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`, { replace: true })
      })
      .catch(() => {
        if (cancelled) return
        const params = new URLSearchParams(location.search)
        params.delete('token')
        const nextSearch = params.toString()
        navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`, { replace: true })
      })
      .finally(() => {
        if (!cancelled) {
          setBootstrapping(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [role, tokenParam, jobIdParam, isAuthenticated, bootstrapping, loginWithToken, location.pathname, location.search, navigate])

  if (bootstrapping) {
    return (
      <div className='min-h-screen flex items-center justify-center text-sm text-secondary'>
        Opening technician workspace...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to='/login' replace state={{ from: location }} />
  }

  if (role && user?.role !== role) {
    return <Navigate to={rolePath[user?.role] || '/login'} replace />
  }

  return children
}
