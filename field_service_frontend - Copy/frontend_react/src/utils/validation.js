const NAME_REGEX = /^[A-Za-z ]+$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^(\+91[-\s]?)?[6-9]\d{9}$/
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/

const trimValue = (value) => String(value ?? '').trim()

export const validateName = (value) => {
  const v = trimValue(value)
  if (!v) return 'Name is required'
  if (v.length < 3) return 'Name must be at least 3 characters'
  if (!NAME_REGEX.test(v)) return 'Name must contain only alphabets and spaces'
  return ''
}

export const validateEmail = (value) => {
  const v = trimValue(value)
  if (!v) return 'Email is required'
  if (!EMAIL_REGEX.test(v)) return 'Please enter a valid email address'
  return ''
}

export const validatePhone = (value) => {
  const v = trimValue(value)
  if (!v) return 'Phone number is required'
  if (!PHONE_REGEX.test(v)) return 'Phone must be +91XXXXXXXXXX or 10-digit Indian mobile'
  return ''
}

export const validatePassword = (value) => {
  const v = trimValue(value)
  if (!v) return 'Password is required'
  if (!PASSWORD_REGEX.test(v)) {
    return 'Password must have at least 6 chars, 1 uppercase, 1 lowercase, and 1 number'
  }
  return ''
}

export const validateLocation = (value) => {
  const v = trimValue(value)
  if (!v) return 'Location is required'
  if (v.length < 3) return 'Location must be at least 3 characters'
  return ''
}

export const sanitizeText = (value) => trimValue(value)
