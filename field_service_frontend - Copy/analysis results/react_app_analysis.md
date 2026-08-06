# React App — Pre-Migration Analysis

> **Project root:** `frontend_react/`  
> **Framework:** Vite + React 18 | **Styling:** Tailwind CSS | **Routing:** React Router v6 | **HTTP:** Axios | **Animation:** Framer Motion

---

## SECTION 1 — Application Structure

### Project Folder Structure

```
frontend_react/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
├── package.json
├── .env / .env.example
└── src/
    ├── main.jsx               ← React entry point
    ├── App.jsx                ← Root router + layouts
    ├── index.css              ← Global styles
    ├── pages/
    │   ├── Dashboard.jsx
    │   ├── auth/
    │   ├── customer/
    │   ├── technician/
    │   ├── admin/
    │   │   └── components/
    │   └── mobile/
    ├── components/            ← Shared / reusable UI
    │   └── ui/
    ├── context/               ← React Context providers
    ├── hooks/                 ← Custom hooks
    ├── services/              ← API layer
    ├── layouts/               ← Page shell layouts
    ├── lib/                   ← Low-level utilities
    ├── utils/                 ← Helper functions
    ├── config/                ← Env validation
    └── icons/                 ← SVG icon wrappers
```

---

### Pages

| Path | File | Description |
|---|---|---|
| `pages/` | [Dashboard.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/pages/Dashboard.jsx) | New service request form (embedded) |
| `pages/auth/` | [LoginPage.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/pages/auth/LoginPage.jsx) | Login form |
| `pages/auth/` | [SignupPage.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/pages/auth/SignupPage.jsx) | Registration form |
| `pages/customer/` | [CustomerDashboard.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/pages/customer/CustomerDashboard.jsx) | Customer service request list + live tracking |
| `pages/technician/` | [TechnicianDashboard.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/pages/technician/TechnicianDashboard.jsx) | Job management, reports, route view (large: 116 KB) |
| `pages/technician/` | [TechnicianProfilePage.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/pages/technician/TechnicianProfilePage.jsx) | Technician profile, skills, schedule |
| `pages/admin/` | [AdminDashboard.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/pages/admin/AdminDashboard.jsx) | Operations center — dispatch, KPIs, HITL queue |
| `pages/admin/` | [AdminActivityPage.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/pages/admin/AdminActivityPage.jsx) | Reassignment activity log (35 KB) |
| `pages/mobile/` | [MobileGPSPage.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/pages/mobile/MobileGPSPage.jsx) | Standalone mobile GPS sharing page |

---

### Components

#### Shared Components (`src/components/`)

| File | Purpose |
|---|---|
| [ProtectedRoute.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/ProtectedRoute.jsx) | Route guard — enforces auth + role |
| [ErrorBoundary.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/ErrorBoundary.jsx) | React error boundary wrapper |
| [Navbar.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/Navbar.jsx) | Top navigation bar |
| [Header.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/Header.jsx) | Page section header |
| [Modal.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/Modal.jsx) | Generic modal dialog |
| [ReassignmentModal.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/ReassignmentModal.jsx) | Reassignment request modal |
| [Table.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/Table.jsx) | Generic data table |
| [JobList.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/JobList.jsx) | Job cards list view |
| [DiagnosisResult.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/DiagnosisResult.jsx) | AI diagnosis output display (18 KB) |
| [LiveTrackingPanel.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/LiveTrackingPanel.jsx) | Real-time technician tracking panel |
| [TrackingMap.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/TrackingMap.jsx) | Google Maps live tracking |
| [RouteMap.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/RouteMap.jsx) | Route planning map |
| [GoogleMapEmbed.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/GoogleMapEmbed.jsx) | Embeddable Google Map |
| [LocationInput.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/LocationInput.jsx) | Location picker with autocomplete (17 KB) |
| [CustomerDetailsInput.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/CustomerDetailsInput.jsx) | Customer form fields |
| [DescriptionInput.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/DescriptionInput.jsx) | Issue description textarea |
| [ContactInput.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/ContactInput.jsx) | Contact number input |
| [UploadCard.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/UploadCard.jsx) | Image upload widget |
| [NotificationViewport.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/NotificationViewport.jsx) | Toast notification renderer |
| [InlineAlert.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/InlineAlert.jsx) | Inline alert banner |
| [StatusBadge.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/StatusBadge.jsx) | Status chip/badge |
| [SeverityPill.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/SeverityPill.jsx) | Severity level pill |
| [SeverityComparison.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/SeverityComparison.jsx) | Before/after severity comparison |
| [TriggerBadge.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/TriggerBadge.jsx) | Alert trigger badge |
| [ReviewBadge.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/ReviewBadge.jsx) | Review status badge |
| [Card.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/Card.jsx) | Generic card container |
| [Skeleton.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/Skeleton.jsx) | Loading skeleton placeholders |
| [LoadingSpinner.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/LoadingSpinner.jsx) | Spinner indicator |
| [LoadingState.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/LoadingState.jsx) | Full-area loading state |

#### UI Sub-components (`src/components/ui/`)

| File | Purpose |
|---|---|
| [PopupModal.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/ui/PopupModal.jsx) | Managed popup/dialog |
| [PopupProvider.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/ui/PopupProvider.jsx) | Popup context provider |

#### Admin-Specific Components (`src/pages/admin/components/`)

| File | Purpose |
|---|---|
| [ActivityDetailModal.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/pages/admin/components/ActivityDetailModal.jsx) | Activity event detail |
| [ModifyApproveModal.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/pages/admin/components/ModifyApproveModal.jsx) | Approve/modify reassignment |
| [RejectModal.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/pages/admin/components/RejectModal.jsx) | Reject reassignment request |
| [ReviewDetailsModal.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/pages/admin/components/ReviewDetailsModal.jsx) | Review details display |

---

### Services

| File | Purpose |
|---|---|
| [services/api.js](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/services/api.js) | Single file — all API namespaces: `authApi`, `customerApi`, `technicianApi`, `adminApi`, `diagnoseFault` |

---

### Hooks

| File | Exports | Purpose |
|---|---|---|
| [useAuth.js](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/hooks/useAuth.js) | `useAuth` | Consumes `AuthContext` |
| [useData.js](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/hooks/useData.js) | `useData` | SWR-based data fetching hook (9.5 KB) |
| [useDetailModal.js](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/hooks/useDetailModal.js) | `useDetailModal` | Modal open/close state management |
| [useLiveTracking.js](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/hooks/useLiveTracking.js) | `useLiveTracking` | Real-time location polling (9.5 KB) |
| [useNotification.js](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/hooks/useNotification.js) | `useNotification` | Consumes `NotificationContext` |

---

### Context Providers

| File | Context | Wraps |
|---|---|---|
| [AuthContext.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/context/AuthContext.jsx) | `AuthContext` / `AuthProvider` | Entire app (`main.jsx`). Manages token, user, role, login, logout, signup, JWT expiry, cross-tab sync |
| [NotificationContext.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/context/NotificationContext.jsx) | `NotificationContext` / `NotificationProvider` | Entire app. Toast queue with dedupe, pause/resume timers |
| [PopupProvider.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/ui/PopupProvider.jsx) | `PopupProvider` | Wraps `<Routes>` inside `App.jsx`. Manages popup/dialog state |

---

## SECTION 2 — Workflow Files by Role

### Authentication Files

| File | Role |
|---|---|
| [pages/auth/LoginPage.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/pages/auth/LoginPage.jsx) | Login UI |
| [pages/auth/SignupPage.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/pages/auth/SignupPage.jsx) | Registration UI |
| [context/AuthContext.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/context/AuthContext.jsx) | Auth state management — token, role, expiry |
| [hooks/useAuth.js](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/hooks/useAuth.js) | Auth hook consumed by components |
| [components/ProtectedRoute.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/ProtectedRoute.jsx) | Role-based route guard |
| [lib/authChannel.js](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/lib/authChannel.js) | BroadcastChannel for cross-tab login/logout sync |
| [lib/secureStorage.js](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/lib/secureStorage.js) | Session storage wrapper |
| `services/api.js` → `authApi` | `POST /auth/login`, `POST /auth/signup`, `POST /auth/telegram/claim` |

---

### Customer Workflow Files

| File | Purpose |
|---|---|
| [pages/customer/CustomerDashboard.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/pages/customer/CustomerDashboard.jsx) | My requests list, request detail, live tracking |
| [pages/Dashboard.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/pages/Dashboard.jsx) | New service request submission form |
| [components/CustomerDetailsInput.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/CustomerDetailsInput.jsx) | Customer info form fields |
| [components/LocationInput.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/LocationInput.jsx) | Location selection with Google Maps autocomplete |
| [components/DescriptionInput.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/DescriptionInput.jsx) | Issue description input |
| [components/ContactInput.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/ContactInput.jsx) | Contact info input |
| [components/UploadCard.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/UploadCard.jsx) | Image/file upload |
| [components/LiveTrackingPanel.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/LiveTrackingPanel.jsx) | Technician live location panel |
| [components/TrackingMap.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/TrackingMap.jsx) | Google Maps live tracking view |
| [hooks/useLiveTracking.js](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/hooks/useLiveTracking.js) | Polls live location for customer tracking |
| `services/api.js` → `customerApi` | `POST /customer/report-issue`, `GET /customer/my-requests`, `GET /customer/my-requests/:id`, `GET /customer/my-requests/:id/image` |

---

### Technician Workflow Files

| File | Purpose |
|---|---|
| [pages/technician/TechnicianDashboard.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/pages/technician/TechnicianDashboard.jsx) | Job list, job detail, AI reports, route view, status updates |
| [pages/technician/TechnicianProfilePage.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/pages/technician/TechnicianProfilePage.jsx) | Profile, skills, schedule management |
| [pages/mobile/MobileGPSPage.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/pages/mobile/MobileGPSPage.jsx) | Mobile GPS location broadcasting |
| [components/JobList.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/JobList.jsx) | Assigned job cards |
| [components/DiagnosisResult.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/DiagnosisResult.jsx) | AI pre-visit / full diagnosis report |
| [components/RouteMap.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/RouteMap.jsx) | Optimized route map |
| [components/ReassignmentModal.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/ReassignmentModal.jsx) | Request job reassignment |
| `services/api.js` → `technicianApi` | See Section 4 |

---

### Admin Workflow Files

| File | Purpose |
|---|---|
| [pages/admin/AdminDashboard.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/pages/admin/AdminDashboard.jsx) | All service requests, KPIs, HITL queue, dispatch |
| [pages/admin/AdminActivityPage.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/pages/admin/AdminActivityPage.jsx) | Reassignment event activity log |
| [pages/admin/components/ActivityDetailModal.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/pages/admin/components/ActivityDetailModal.jsx) | Event detail view |
| [pages/admin/components/ModifyApproveModal.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/pages/admin/components/ModifyApproveModal.jsx) | Approve / modify reassignment |
| [pages/admin/components/RejectModal.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/pages/admin/components/RejectModal.jsx) | Reject reassignment |
| [pages/admin/components/ReviewDetailsModal.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/pages/admin/components/ReviewDetailsModal.jsx) | Review detail overlay |
| `services/api.js` → `adminApi` | See Section 4 |

---

## SECTION 3 — All Routes

| Route Path | Layout | Component | Role Guard |
|---|---|---|---|
| `/` | — | `RootRedirect` (role-based redirect) | Any |
| `/login` | `PublicLayout` | `LoginPage` | Public |
| `/signup` | `PublicLayout` | `SignupPage` | Public |
| `/mobile-gps` | None | `MobileGPSPage` | Public (no guard) |
| `/customer` | `CustomerLayout` | `CustomerDashboard` | `customer` |
| `/customer/new-request` | `CustomerLayout` | `Dashboard` (embedded) | `customer` |
| `/technician` | `TechnicianLayout` | `TechnicianDashboard` | `technician` |
| `/technician/jobs/:jobId` | `TechnicianLayout` | `TechnicianDashboard` | `technician` |
| `/technician/route` | `TechnicianLayout` | `TechnicianDashboard` (`routeOnly` prop) | `technician` |
| `/technician/profile` | `TechnicianLayout` | `TechnicianProfilePage` | `technician` |
| `/admin` | `AdminLayout` | `AdminDashboard` | `admin` |
| `/admin/activity` | `AdminLayout` | `AdminActivityPage` | `admin` |
| `*` | — | `<Navigate to="/" />` (catch-all) | Any |

### Layout Navigation Links

| Layout | Nav Links |
|---|---|
| `CustomerLayout` | Dashboard `/customer` · New Request `/customer/new-request` |
| `TechnicianLayout` | Assigned Jobs `/technician` · Route Plan `/technician/route` · Profile `/technician/profile` |
| `AdminLayout` | Operations `/admin` · Activity `/admin/activity` |

---

## SECTION 4 — API Service Files

> **Single file:** [src/services/api.js](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/services/api.js)  
> **Base URL:** `VITE_API_URL` (env variable)  
> **Auth:** Bearer token via Axios request interceptor  
> **Token storage:** `sessionStorage` (keys: `fsm_token`, `fsm_user`)

The file exports **four named API namespace objects** plus standalone helpers:

---

### `authApi`

| Method | Function | Endpoint |
|---|---|---|
| POST | `login(payload)` | `/auth/login` |
| POST | `signup(payload)` | `/auth/signup` |
| POST | `exchangeWorkspaceToken(payload)` | `/auth/telegram/claim` |

---

### `customerApi`

| Method | Function | Endpoint |
|---|---|---|
| POST | `reportIssue(formData)` | `/customer/report-issue` (multipart) |
| GET | `getMyRequests()` | `/customer/my-requests` |
| GET | `getMyRequestById(requestId)` | `/customer/my-requests/:requestId` |
| GET | `getMyRequestImageBlob(requestId)` | `/customer/my-requests/:requestId/image` |

---

### `technicianApi`

| Method | Function | Endpoint |
|---|---|---|
| GET | `getJobs()` / `getAssignedJobs()` | `/technician/jobs` |
| GET | `getJobById(jobId)` | `/technician/jobs/:jobId` |
| GET | `getJobImageBlob(jobId)` | `/technician/jobs/:jobId/image` |
| GET | `getRoute(technicianId)` | `/technician/route/:technicianId` |
| GET | `getMyRoute()` | `/technician/my-route` |
| GET | `getProfile()` | `/technician/profile` |
| GET | `getReport(jobId)` | `/technician/report/:jobId` |
| POST | `updateStatus(payload)` | `/technician/update-status` |
| POST | `startJob(jobId)` | `/technician/jobs/:jobId/start` |
| PUT | `completeJob(jobId)` | `/technician/jobs/:jobId/complete` |
| POST | `updateLiveLocation(jobId, payload)` | `/technician/jobs/:jobId/live-location` |
| POST | `generateReport(jobId)` | `/reports/generate` |
| POST | `generatePrevisitReport(jobId)` | `/reports/previsit` (60 s timeout — LLM) |
| POST | `linkProfile(payload)` | `/technician/link-profile` |
| PUT | `updateSkills(payload)` | `/technician/update-skills` |
| PUT | `updateSchedule(payload)` | `/technician/update-schedule` |
| POST | `requestReassignment(jobId, payload)` | `/technician/jobs/:jobId/request-reassignment` |

---

### `adminApi`

| Method | Function | Endpoint |
|---|---|---|
| GET | `getServiceRequestsPage(opts)` | `/admin/service-requests` (paginated) |
| GET | `getServiceRequests()` | `/admin/service-requests` |
| GET | `getAllTickets()` | `/admin/service-requests` |
| GET | `getServiceRequestById(requestId)` | `/admin/service-requests/:requestId` |
| GET | `getServiceRequestImageBlob(requestId)` | `/admin/service-requests/:requestId/image` |
| GET | `getTechnicians()` | `/admin/technicians` |
| GET | `getKpis(opts)` | `/admin/kpis` |
| GET | `getPendingHitl()` | `/admin/pending-hitl` |
| GET | `getReassignmentActivity(opts)` | `/admin/reassignment-activity` |
| POST | `dispatch(payload)` | `/admin/dispatch` |
| POST | `reviewServiceRequest(requestId, payload)` | `/admin/service-requests/:requestId/review` |
| POST | `decideReassignment(requestId, opts)` | `/admin/service-requests/:requestId/reassignment-decision` |

---

### `diagnoseFault` (standalone export)

| Method | Function | Endpoint |
|---|---|---|
| POST | `diagnoseFault(formData)` | `/diagnose` (multipart) |

---

### Auth Storage Helpers (standalone exports)

| Function | Purpose |
|---|---|
| `setAuthToken(token)` | Persist token to `sessionStorage` |
| `getAuthToken()` | Read token from `sessionStorage` |
| `setStoredUser(user)` | Persist user JSON to `sessionStorage` |
| `getStoredUser()` | Read + parse user from `sessionStorage` |
| `clearAuth()` | Remove token + user from `sessionStorage` |
| `setHadActiveSession(value)` | Track whether an active session existed |
| `getHadActiveSession()` | Read active session flag |
| `markSessionExpired()` | Flag session as expired (shown on login page) |
| `consumeSessionExpired()` | Read + clear session expired flag |

---

### Axios Instance Configuration

| Setting | Value |
|---|---|
| Base URL | `VITE_API_URL` (env) |
| Default timeout | 10 000 ms |
| LLM endpoint timeout | 60 000 ms (`/reports/previsit`, `/reports/full`) |
| Auth header | `Authorization: Bearer <token>` (request interceptor) |
| 401 handler | Clears auth → redirects to `/login` (response interceptor) |
| Credentials | `withCredentials: false` |
