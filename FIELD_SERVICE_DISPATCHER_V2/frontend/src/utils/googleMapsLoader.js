const SCRIPT_ID = 'google-maps-script'
let loaderPromise = null

export function loadGoogleMaps(apiKey) {
  if (!apiKey) {
    console.error('Google Maps API key missing')
    return Promise.reject(new Error('API key missing'))
  }

  if (typeof window === 'undefined') {
    return Promise.reject(new Error('window not available'))
  }

  if (window.google && window.google.maps) {
    return Promise.resolve(window.google.maps)
  }

  if (loaderPromise) return loaderPromise

  loaderPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID)
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google.maps))
      existing.addEventListener('error', (e) => {
        console.error('Google Maps failed to load:', e)
        reject(new Error('Maps script failed'))
      })
      return
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.async = true
    script.defer = true
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
    script.onload = () => resolve(window.google.maps)
    script.onerror = (e) => {
      console.error('Google Maps failed to load:', e)
      reject(new Error('Maps script failed'))
    }
    document.head.appendChild(script)
  })

  return loaderPromise
}

export function resetGoogleMapsLoader() {
  loaderPromise = null
}
