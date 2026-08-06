export function validateEnv() {
  const required = [
    import.meta.env.VITE_API_URL,
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  ]

  if (required.some((value) => !value)) {
    console.error('Missing environment variables')
  }

  if (!import.meta.env.VITE_PUBLIC_BASE_URL) {
    console.error('Missing VITE_PUBLIC_BASE_URL - QR will not work across devices')
  }
}
