import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { Loader2, Send } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import Header from '../components/Header'
import UploadCard from '../components/UploadCard'
import DescriptionInput from '../components/DescriptionInput'
import LocationInput from '../components/LocationInput'
import ContactInput from '../components/ContactInput'
import CustomerDetailsInput from '../components/CustomerDetailsInput'
import { customerApi } from '../services/api'
import useNotification from '../hooks/useNotification'

const LOCATION_MODE_MESSAGE = 'Choose one location mode: manual address (City, State, 6-digit Pincode) or valid GPS coordinates.'
const LOCATION_REQUIRED_MESSAGE = 'Provide location using either manual address fields or valid GPS latitude and longitude.'

const hasValidLocationInput = (data = {}) => {
  const city = String(data.city || '').trim()
  const state = String(data.state || '').trim()
  const pincode = String(data.pincode || '').trim()
  const latText = String(data.latitude || '').trim()
  const lonText = String(data.longitude || '').trim()

  const hasManualAddress = Boolean(city && state && /^\d{6}$/.test(pincode))

  const latNum = Number(latText)
  const lonNum = Number(lonText)
  const hasGpsCoordinates = Boolean(
    latText
    && lonText
    && Number.isFinite(latNum)
    && Number.isFinite(lonNum)
    && latNum >= -90
    && latNum <= 90
    && lonNum >= -180
    && lonNum <= 180
  )

  const hasBothLocationModes = hasManualAddress && hasGpsCoordinates

  return { hasManualAddress, hasGpsCoordinates, hasBothLocationModes, latNum, lonNum }
}

const Dashboard = ({ embedded = false }) => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [locationResetKey, setLocationResetKey] = useState(0)
  const notification = useNotification()

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
    watch,
  } = useForm({ mode: 'onChange' })

  const formValues = watch(['city', 'state', 'pincode', 'latitude', 'longitude'])
  const locationGate = hasValidLocationInput({
    city: formValues[0],
    state: formValues[1],
    pincode: formValues[2],
    latitude: formValues[3],
    longitude: formValues[4],
  })
  const canSubmitLocation = (
    (locationGate.hasManualAddress || locationGate.hasGpsCoordinates)
    && !locationGate.hasBothLocationModes
  )
  const locationValidationMessage = locationGate.hasBothLocationModes
    ? LOCATION_MODE_MESSAGE
    : !locationGate.hasManualAddress && !locationGate.hasGpsCoordinates
      ? LOCATION_REQUIRED_MESSAGE
      : ''

  const isGuardrailRejection = (detail) => {
    const text = String(detail || '').toLowerCase()
    return (
      text.includes('invalid maintenance image')
      || text.includes('invalid image file')
      || text.includes('invalid image')
      || text.includes('not a valid maintenance image')
    )
  }

  const onSubmit = async (data) => {
    if (!uploadedFile) {
      notification.warning({
        title: 'Image Required',
        message: 'Please upload a maintenance-related image before submitting.',
        dedupeKey: 'dashboard:image-required',
      })
      return
    }

    const locationText = String(data.location || '').trim()
    const { hasManualAddress, hasGpsCoordinates, hasBothLocationModes, latNum, lonNum } = hasValidLocationInput(data)

    if (hasBothLocationModes) {
      notification.warning({
        title: 'Choose One Location Mode',
        message: LOCATION_MODE_MESSAGE,
        dedupeKey: 'dashboard:choose-one-location-mode',
      })
      return
    }

    if (!hasGpsCoordinates && !hasManualAddress) {
      notification.warning({
        title: 'Location Required',
        message: LOCATION_REQUIRED_MESSAGE,
        dedupeKey: 'dashboard:location-required',
      })
      return
    }

    let finalLocation = ''
    if (hasGpsCoordinates) {
      finalLocation = locationText || `${latNum.toFixed(6)}, ${lonNum.toFixed(6)}`
    }
    if (!finalLocation && hasManualAddress) {
      const addressParts = [
        data.address_line1,
        data.address_line2,
        data.landmark,
        data.city,
        data.state,
        data.pincode
      ].filter((p) => p && p.trim() !== '')
      finalLocation = addressParts.join(', ')
    }

    setIsLoading(true)

    try {
      // Create FormData
      const formData = new FormData()
      formData.append('image', uploadedFile)
      formData.append('description', data.description)
      formData.append('location', finalLocation)
      formData.append('contact', data.contact)
      formData.append('customer_name', data.customer_name || '')
      formData.append('customer_email', data.customer_email || '')
      formData.append('address_line1', data.address_line1 || '')
      formData.append('address_line2', data.address_line2 || '')
      formData.append('city', data.city || '')
      formData.append('state', data.state || '')
      formData.append('pincode', data.pincode || '')
      formData.append('landmark', data.landmark || '')
      // Send GPS coordinates directly so backend can skip geocoding
      if (hasGpsCoordinates) {
        formData.append('latitude', latNum.toFixed(6))
        formData.append('longitude', lonNum.toFixed(6))
      }

      const result = await customerApi.reportIssue(formData)
      notification.success({
        title: 'Request Submitted',
        message: `Tracking ID #${result?.request_id || '-'} created successfully.`,
        dedupeKey: `dashboard:request-submitted:${result?.request_id || 'unknown'}`,
      })

      reset()
      setLocationResetKey((k) => k + 1)
      setUploadedFile(null)

      navigate('/customer', {
        state: {
          submitSuccess: {
            requestId: result?.request_id || null,
            at: Date.now(),
          },
        },
      })
    } catch (error) {
      const detail = error?.response?.data?.error || error?.response?.data?.detail || 'Failed to submit service request. Please try again.'
      if (isGuardrailRejection(detail)) {
        notification.error({
          title: 'Image Rejected by Guardrails',
          message: 'This image does not look like a valid maintenance fault photo. Upload a relevant service issue image and try again.',
          dedupeKey: 'dashboard:guardrail-rejection',
        })
      } else {
        notification.error({
          title: 'Submission Failed',
          message: detail,
          dedupeKey: `dashboard:submission-failed:${detail}`,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    reset()
    setLocationResetKey((k) => k + 1)
    setUploadedFile(null)
  }

  return (
    <div className={embedded ? '' : 'min-h-screen bg-background'}>
      {!embedded ? <Header /> : null}

      <main className="w-full flex justify-center px-4 sm:px-6 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-[700px] mx-auto text-left"
        >
          <div className="bg-white rounded-xl shadow border border-gray-200 p-6 md:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-primary mb-2">
                Submit Service Request
              </h2>
              <p className="text-secondary text-sm">
                Upload an image and submit your request. Diagnosis details are processed for technician and admin workflows.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <UploadCard
                value={uploadedFile}
                onChange={setUploadedFile}
                error={errors.image?.message}
              />

              <DescriptionInput
                register={register}
                error={errors.description}
              />

              <CustomerDetailsInput
                register={register}
                errors={errors}
              />

              <LocationInput
                register={register}
                error={errors.location}
                setValue={setValue}
                resetKey={locationResetKey}
              />

              <ContactInput
                register={register}
                error={errors.contact}
              />

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                {uploadedFile && (
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={isLoading}
                    className="px-6 py-3 border border-gray-300 text-primary rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isLoading || !isValid || !uploadedFile || !canSubmitLocation}
                  className="btn-primary px-8 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Submitting request...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Submit Request</span>
                    </>
                  )}
                </button>
              </div>
              {!canSubmitLocation && locationValidationMessage ? (
                <p className='text-xs text-danger'>{locationValidationMessage}</p>
              ) : null}
            </form>
          </div>
        </motion.div>
      </main>

      {!embedded ? (
        <footer className="border-t border-gray-200 mt-12">
          <div className="container mx-auto px-6 py-6">
            <p className="text-center text-sm text-secondary">
              © 2026 AI Field Service Diagnosis System. Powered by advanced AI technology.
            </p>
          </div>
        </footer>
      ) : null}
    </div>
  )
}

export default Dashboard
