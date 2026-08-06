import { Phone } from 'lucide-react'
import { sanitizeText, validatePhone } from '../utils/validation'

const ContactInput = ({ register, error }) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-primary">
        Contact Number *
      </label>
      <div className="relative">
        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
        <input
          type="tel"
          {...register('contact', {
            required: 'Contact number is required',
            setValueAs: (value) => sanitizeText(value),
            validate: (value) => validatePhone(value) || true,
          })}
          inputMode="numeric"
          maxLength={13}
          placeholder="e.g. 9876543210 or +919876543210"
          className={`input-field pl-11 ${error ? 'border-danger' : ''}`}
        />
      </div>
      {error && (
        <p className="text-sm text-danger">{error.message}</p>
      )}
    </div>
  )
}

export default ContactInput
