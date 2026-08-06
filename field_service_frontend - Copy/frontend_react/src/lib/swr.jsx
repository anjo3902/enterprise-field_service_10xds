import { SWRConfig } from 'swr'

/**
 * Global SWR defaults.
 *
 * refreshInterval is NOT set here — each hook sets its own
 * so pages that don't need real-time don't waste bandwidth.
 */
const SWR_OPTIONS = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  refreshWhenHidden: false,
  refreshWhenOffline: false,
  dedupingInterval: 2_000,
  focusThrottleInterval: 5_000,
  keepPreviousData: true,
  errorRetryCount: 2,
  errorRetryInterval: 5_000,
  shouldRetryOnError: (error) => {
    const status = error?.response?.status
    return status !== 401 && status !== 403
  },
  provider: () => new Map(),
}

export default function SWRProvider({ children }) {
  return <SWRConfig value={SWR_OPTIONS}>{children}</SWRConfig>
}
