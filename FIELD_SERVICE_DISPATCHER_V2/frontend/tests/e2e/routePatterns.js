/**
 * Shared route and response matchers for E2E tests.
 *
 * These regexes accept both direct and /api-prefixed endpoint paths,
 * so test interceptors stay stable if frontend proxy/path shape changes.
 */
export const ROUTE_PATTERNS = {
  customerMyRequests: /\/(?:api\/)?customer\/my-requests(?:\?.*)?$/i,
  adminServiceRequests: /\/(?:api\/)?admin\/service-requests(?:\?.*)?$/i,
  adminPendingHitl: /\/(?:api\/)?admin\/pending-hitl(?:\?.*)?$/i,
  adminKpis: /\/(?:api\/)?admin\/kpis(?:\?.*)?$/i,
  adminReviewAction: /\/(?:api\/)?admin\/service-requests\/[^/?#]+\/review(?:\?.*)?$/i,
  technicianJobs: /\/(?:api\/)?technician\/jobs(?:\?.*)?$/i,
  technicianMyRoute: /\/(?:api\/)?technician\/my-route(?:\?.*)?$/i,
  technicianProfile: /\/(?:api\/)?technician\/profile(?:\?.*)?$/i,
  jobsStartAction: /\/(?:(?:api\/)?jobs|(?:api\/)?technician\/jobs)\/[^/?#]+\/start(?:\?.*)?$/i,
}

export function responseMatches(response, method, pattern) {
  return (
    response.request().method().toUpperCase() === method.toUpperCase()
    && pattern.test(response.url())
  )
}
