import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../../services/api'
import useNotification from '../../hooks/useNotification'
import {
  sanitizeText,
  validateEmail,
  validateName,
  validatePassword,
  validatePhone,
} from '../../utils/validation'

export default function SignupPage() {
  const navigate = useNavigate()
  const notification = useNotification()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'customer',
    technician_code: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const validateField = (name, value) => {
    if (name === 'name') return validateName(value)
    if (name === 'email') return validateEmail(value)
    if (name === 'phone') return validatePhone(value)
    if (name === 'password') return validatePassword(value)
    return ''
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    const nextError = validateField(name, value)
    setFieldErrors((prev) => ({ ...prev, [name]: nextError }))
  }

  const validateAll = () => {
    const nextErrors = {
      name: validateName(formData.name),
      email: validateEmail(formData.email),
      phone: validatePhone(formData.phone),
      password: validatePassword(formData.password),
    }
    setFieldErrors(nextErrors)
    return Object.values(nextErrors).every((v) => !v)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    if (!validateAll()) {
      setSubmitting(false)
      return
    }

    try {
      await authApi.signup({
        ...formData,
        name: sanitizeText(formData.name),
        email: sanitizeText(formData.email),
        phone: sanitizeText(formData.phone),
        password: sanitizeText(formData.password),
      })

      notification.success({
        title: 'Account Created',
        message: 'Sign up completed. You can sign in now.',
        dedupeKey: `auth:signup-success:${formData.email}`,
      })
      navigate('/login')
    } catch (err) {
      const detail = !err?.response
        ? 'Cannot connect to server. Check backend or URL.'
        : String(
          err?.response?.data?.error
          || err?.response?.data?.detail
          || err?.response?.data?.message
          || 'Signup failed'
        )
      setError(detail)
      notification.error({
        title: 'Sign Up Failed',
        message: detail,
        dedupeKey: `auth:signup-failed:${detail}`,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const isSubmitDisabled =
    submitting
    || !formData.name.trim()
    || !formData.email.trim()
    || !formData.phone.trim()
    || !formData.password.trim()
    || Object.values(fieldErrors).some(Boolean)

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-orange-100 flex items-center justify-center p-6'>
      <div className='card p-8 w-full max-w-md'>
        <h1 className='text-2xl font-bold text-primary'>Create Account</h1>
        <p className='text-sm text-secondary mt-1'>Join the smart service platform</p>

        <form className='mt-6 space-y-4' onSubmit={handleSubmit}>
          <div>
            <label className='label'>Name</label>
            <input
              className={`input ${fieldErrors.name ? 'border-danger' : ''}`}
              name='name'
              value={formData.name}
              onChange={handleChange}
              required
            />
            {fieldErrors.name ? <p className='text-sm text-red-600 mt-1'>{fieldErrors.name}</p> : null}
          </div>

          <div>
            <label className='label'>Email</label>
            <input
              className={`input ${fieldErrors.email ? 'border-danger' : ''}`}
              name='email'
              type='email'
              value={formData.email}
              onChange={handleChange}
              required
            />
            {fieldErrors.email ? <p className='text-sm text-red-600 mt-1'>{fieldErrors.email}</p> : null}
          </div>

          <div>
            <label className='label'>Phone</label>
            <input
              className={`input ${fieldErrors.phone ? 'border-danger' : ''}`}
              name='phone'
              type='tel'
              inputMode='numeric'
              maxLength={13}
              placeholder='e.g. 9876543210 or +919876543210'
              value={formData.phone}
              onChange={handleChange}
              required
            />
            {fieldErrors.phone ? <p className='text-sm text-red-600 mt-1'>{fieldErrors.phone}</p> : null}
          </div>

          <div>
            <label className='label'>Role</label>
            <select className='input' name='role' value={formData.role} onChange={handleChange}>
              <option value='customer'>Customer</option>
              <option value='technician'>Technician</option>
              <option value='admin'>Admin</option>
            </select>
          </div>

          {formData.role === 'technician' ? (
            <div>
              <label className='label'>Technician Code</label>
              <input
                className='input'
                name='technician_code'
                value={formData.technician_code}
                onChange={handleChange}
                placeholder='e.g. TCH-0001'
              />
              <p className='text-xs text-secondary mt-1'>Use your assigned technician code to link your profile immediately.</p>
            </div>
          ) : null}

          <div>
            <label className='label'>Password</label>
            <input
              className={`input ${fieldErrors.password ? 'border-danger' : ''}`}
              name='password'
              type='password'
              value={formData.password}
              onChange={handleChange}
              required
            />
            {fieldErrors.password ? <p className='text-sm text-red-600 mt-1'>{fieldErrors.password}</p> : null}
          </div>

          {error ? <p className='text-sm text-red-600'>{error}</p> : null}

          <button className='button w-full' disabled={isSubmitDisabled} type='submit'>
            {submitting ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className='text-sm text-secondary mt-5'>
          Already have an account?{' '}
          <Link className='text-orange-700 font-medium' to='/login'>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
