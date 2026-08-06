import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import useNotification from '../../hooks/useNotification'
import { consumeSessionExpired } from '../../services/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const notification = useNotification()

  const [formData, setFormData] = useState({ email: '', password: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const from = location.state?.from?.pathname

  useEffect(() => {
    if (!consumeSessionExpired()) {
      return
    }

    setError('Session expired. Please sign in again.')

    notification.warning({
      title: 'Session Expired',
      message: 'Please sign in again to continue.',
      dedupeKey: 'auth:session-expired',
    })
  }, [notification])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const user = await login(formData)
      notification.success({
        title: 'Signed In',
        message: 'Welcome back. Redirecting to your workspace.',
        dedupeKey: `auth:login-success:${user.role || 'user'}`,
      })
      const fallbackRoute = user.role === 'admin' ? '/admin' : user.role === 'technician' ? '/technician' : '/customer'
      navigate(from || fallbackRoute, { replace: true })
    } catch (err) {
      const detail = !err?.response
        ? 'Cannot connect to server. Check backend or URL.'
        : String(
          err?.response?.data?.detail
          || err?.response?.data?.error
          || err?.response?.data?.message
          || 'Login failed'
        )
      setError(detail)
      notification.error({
        title: 'Sign In Failed',
        message: detail,
        dedupeKey: `auth:login-failed:${detail}`,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-orange-100 flex items-center justify-center p-6'>
      <div className='card p-8 w-full max-w-md'>
        <h1 className='text-2xl font-bold text-primary'>Sign In</h1>
        <p className='text-sm text-secondary mt-1'>Access your dispatch workspace</p>

        <form className='mt-6 space-y-4' onSubmit={handleSubmit}>
          <div>
            <label className='label'>Email</label>
            <input className='input' name='email' type='email' value={formData.email} onChange={handleChange} required />
          </div>

          <div>
            <label className='label'>Password</label>
            <input className='input' name='password' type='password' value={formData.password} onChange={handleChange} required />
          </div>

          {error ? <p className='text-sm text-red-600'>{error}</p> : null}

          <button className='button w-full' disabled={submitting} type='submit'>
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className='text-sm text-secondary mt-5'>
          Need an account?{' '}
          <Link className='text-orange-700 font-medium' to='/signup'>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
