import { User, Mail, MapPin, Building2 } from 'lucide-react'
import { sanitizeText, validateEmail, validateName } from '../utils/validation'

const CustomerDetailsInput = ({ register, errors }) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-primary">Customer Details</h3>
        <p className="text-xs text-secondary mt-1">
          Capture customer identity and service address for reliable dispatch.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-primary">
            Customer Name *
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
            <input
              type="text"
              {...register('customer_name', {
                required: 'Customer name is required',
                setValueAs: (value) => sanitizeText(value),
                validate: (value) => validateName(value) || true,
              })}
              placeholder="Enter customer name"
              className={`input-field pl-11 ${errors.customer_name ? 'border-danger' : ''}`}
            />
          </div>
          {errors.customer_name && (
            <p className="text-sm text-danger">{errors.customer_name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-primary">
            Customer Email *
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
            <input
              type="email"
              {...register('customer_email', {
                required: 'Customer email is required',
                setValueAs: (value) => sanitizeText(value),
                validate: (value) => validateEmail(value) || true,
              })}
              placeholder="Enter customer email"
              className={`input-field pl-11 ${errors.customer_email ? 'border-danger' : ''}`}
            />
          </div>
          {errors.customer_email && (
            <p className="text-sm text-danger">{errors.customer_email.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-primary">
          Address Line 1
        </label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
          <input
            type="text"
            {...register('address_line1')}
            placeholder="House/Flat No, Building, Street"
            className={`input-field pl-11 ${errors.address_line1 ? 'border-danger' : ''}`}
          />
        </div>
        {errors.address_line1 && (
          <p className="text-sm text-danger">{errors.address_line1.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-primary">
            City
          </label>
          <input
            type="text"
            {...register('city')}
            placeholder="City"
            className={`input-field ${errors.city ? 'border-danger' : ''}`}
          />
          {errors.city && (
            <p className="text-sm text-danger">{errors.city.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-primary">
            State
          </label>
          <input
            type="text"
            {...register('state')}
            placeholder="State"
            className={`input-field ${errors.state ? 'border-danger' : ''}`}
          />
          {errors.state && (
            <p className="text-sm text-danger">{errors.state.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-primary">
            Pincode
          </label>
          <input
            type="text"
            {...register('pincode', {
              pattern: {
                value: /^[0-9]{6}$/,
                message: 'Enter a valid 6-digit pincode'
              }
            })}
            placeholder="6-digit pincode"
            className={`input-field ${errors.pincode ? 'border-danger' : ''}`}
          />
          {errors.pincode && (
            <p className="text-sm text-danger">{errors.pincode.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-primary">
          Landmark
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
          <input
            type="text"
            {...register('landmark')}
            placeholder="Nearby landmark (optional)"
            className="input-field pl-11"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-primary">
          Address Line 2
        </label>
        <input
          type="text"
          {...register('address_line2')}
          placeholder="Area, Locality"
          className="input-field"
        />
      </div>
    </div>
  )
}

export default CustomerDetailsInput
