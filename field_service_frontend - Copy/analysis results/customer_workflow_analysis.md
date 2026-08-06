# Customer Workflow Analysis

> **Read-only analysis. No code was modified.**

---

## Workflow Trace

```
Customer Login
  → CustomerDashboard         (my requests list)
      → View Request Detail   (modal inside dashboard)
          → LiveTrackingPanel (embedded in modal)
              → TrackingMap   (Google Maps)
  → Dashboard                 (new service request form)
      → UploadCard            (image selection)
      → LocationInput         (GPS / manual address)
      → CustomerDetailsInput  (name, email, address)
```

---

## SECTION 1 — Screen-by-Screen Trace

---

### Screen 1: Customer Login

**File path:** `src/pages/auth/LoginPage.jsx`  
**Component:** `LoginPage`  
**Route:** `/login` (inside `PublicLayout` with page-transition animation)

**API calls:**
| Method | Endpoint | Triggered by |
|---|---|---|
| `POST /auth/login` | `authApi.login({ email, password })` | Form submit |

**Flow after login:**
- On success: reads `user.role`, navigates to `/customer` via `useNavigate`
- On failure: shows inline error + toast
- On mount: calls `consumeSessionExpired()` — shows warning toast if previous session expired

---

### Screen 2: Customer Dashboard

**File path:** `src/pages/customer/CustomerDashboard.jsx`  
**Component:** `CustomerDashboard`  
**Route:** `/customer` (inside `CustomerLayout` → `AppLayout`)

**API calls:**
| Method | Endpoint | Hook | Interval |
|---|---|---|---|
| `GET /customer/my-requests` | `customerApi.getMyRequests()` | `useMyRequests()` via SWR | Every **30 s** |
| `GET /customer/my-requests/:id` | `customerApi.getMyRequestById(id)` | `useDetailModal.open(id)` | On row click |
| `GET /customer/my-requests/:id/image` | `customerApi.getMyRequestImageBlob(id)` | `useDetailModal.open(id)` | On row click |
| `SSE /customer/jobs/:id/live` | Server-Sent Events stream | `useLiveTracking(request, isOpen)` | Persistent until job done |

**Key behaviours:**
- `useMyRequests()` polls every 30 s via SWR; cache key: `'customer/my-requests'`
- On row "View Details" click → `detail.open(rowId)` fetches detail + image blob in parallel
- `useDetailModal` creates an `ObjectURL` from the image blob for display; revokes on close
- `useLiveTracking` opens an `EventSource` SSE connection while the modal is open
- Live tracking state (`status`, `etaMinutes`, `distanceKm`, `technicianLocation`) is merged into the displayed detail via `detailWithTracking` memo
- SWR cache is optimistically updated with live tracking data (`mutateRequests` with `revalidate: false`)
- Detects `location.state.submitSuccess` from the New Request screen — shows a success toast once and clears state

**Sub-components rendered on this screen:**
- `Table` — request list
- `Modal` — detail overlay
- `LiveTrackingPanel` — tracking UI (inside modal)
- `TrackingMap` — Google Maps (inside `LiveTrackingPanel`, only when `status === 'in_progress'`)
- `StatusBadge`, `Skeleton`, `LoadingState`

---

### Screen 3: Create Service Request

**File path:** `src/pages/Dashboard.jsx`  
**Component:** `Dashboard` (prop: `embedded={true}` when rendered via `CustomerLayout`)  
**Route:** `/customer/new-request`

**API calls:**
| Method | Endpoint | Triggered by |
|---|---|---|
| `POST /customer/report-issue` | `customerApi.reportIssue(formData)` | Form submit (multipart/form-data) |
| `POST /api/gps/session/new` | `fetch(backendOrigin + '/api/gps/session/new')` | "Get GPS Location" → QR mode |
| `GET /api/gps/session/:sessionId` | `fetch(backendOrigin + '/api/gps/session/:id')` | Polling for mobile GPS (every 2 s) |
| `GET /location/reverse?lat=&lng=` | `fetch(backendOrigin + '/location/reverse?...')` | After GPS received — reverse geocoding |

**Form fields submitted (multipart):**
```
image           ← File object (JPG/PNG)
description     ← text
location        ← resolved address string
contact         ← phone number
customer_name   ← text
customer_email  ← email
address_line1   ← text
address_line2   ← text
city            ← text
state           ← text
pincode         ← text
landmark        ← text
latitude        ← float string (only if GPS mode)
longitude       ← float string (only if GPS mode)
```

**Location validation logic (client-side, in `Dashboard.jsx`):**
- Accepts **either** manual address (city + state + 6-digit pincode) **or** GPS coordinates
- Rejects if **both** are provided simultaneously
- `canSubmitLocation` gates the submit button

**On success:**
- Navigates to `/customer` with `state.submitSuccess = { requestId, at }` 
- `CustomerDashboard` reads this state and shows a success toast, then clears the state

**Sub-components:**
- `UploadCard` — image picker
- `DescriptionInput` — textarea for issue description
- `CustomerDetailsInput` — name, email, address fields
- `LocationInput` — GPS + manual address picker
- `ContactInput` — phone number

---

### Screen 4: Upload Image (inside Create Service Request)

**File path:** `src/components/UploadCard.jsx`  
**Component:** `UploadCard`  
**Rendered inside:** `Dashboard.jsx`

**No API calls.** Entirely client-side.

**Input methods:**
1. Click to open file picker (`<input type="file" accept="image/jpeg,image/jpg,image/png">`)
2. Drag-and-drop onto the drop zone

**Validation (client-side):**
- Allowed types: `image/jpeg`, `image/jpg`, `image/png`
- Max size: **10 MB** (`file.size > 10 * 1024 * 1024` → warning toast)

**Preview mechanism:**
- Uses `FileReader.readAsDataURL(file)` → sets base64 data URL as `preview` state → renders `<img src={preview}>`
- On remove: clears `preview`, calls `onChange(null)`, resets the `<input>` ref value

**State passed up:**  
`onChange(file)` → sets `uploadedFile` state in `Dashboard.jsx` → appended to `FormData` as `image`

---

### Screen 5: Live Tracking (inside Customer Dashboard modal)

**File path (panel):** `src/components/LiveTrackingPanel.jsx`  
**Component:** `LiveTrackingPanel`

**File path (map):** `src/components/TrackingMap.jsx`  
**Component:** `TrackingMap`

**File path (hook):** `src/hooks/useLiveTracking.js`  
**Hook:** `useLiveTracking(request, enabled)`

**API connection:**
| Protocol | Endpoint | Auth |
|---|---|---|
| **Server-Sent Events (SSE)** | `GET /customer/jobs/:jobId/live?token=<bearer>` | Token passed as query param (SSE cannot send headers) |

**SSE event types listened:**
- `snapshot` — full state snapshot
- `update` — incremental location update
- `status` — status-only update

**Data received per event:**
```
latitude / longitude          ← technician live position
technician_location { lat, lng }
customer_location { lat, lng }
status                        ← job status string
assigned_technician_name
assigned_technician_phone_number
assigned_technician_zone
eta_minutes
distance_km
speed_kmh
accuracy_m
heading
updated_at / timestamp
reassignment_requested / reassignment_status / reassignment_result
```

**Connection lifecycle:**
- Opens `EventSource` when modal is opened (`enabled = true` + `jobId` present)
- Auto-closes when status is not `'in_progress'`
- Auto-reconnects on `onerror` with 1 s delay; tracks reconnect count
- Health check logs every 60 s (event count, reconnect count, memory, uptime)
- Stale detection: marks `isStale = true` if last update was > 15 s ago while `in_progress`
- Cleanup on modal close: `source.close()` + clear all timers

**Map (`TrackingMap`):**
- Uses Google Maps JavaScript SDK (`window.google.maps`) loaded dynamically via `loadGoogleMaps(apiKey)`
- API key from `VITE_GOOGLE_MAPS_API_KEY` env variable
- Renders two markers: technician (default pin) + destination (red circle)
- Falls back to `GoogleMapEmbed` (iframe embed) if JS SDK fails to load
- Only rendered when `liveStatus === 'in_progress'`

**Status progress stepper:** `assigned → in_progress → completed`

---

## SECTION 2 — Implementation Details

---

### Image Upload Implementation

**Component:** [UploadCard.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/UploadCard.jsx)

| Aspect | Web Implementation |
|---|---|
| File selection | `<input type="file" accept="image/jpeg,image/jpg,image/png">` |
| Drag-and-drop | Native browser `onDrop` / `onDragOver` / `onDragLeave` events |
| Preview | `FileReader.readAsDataURL(file)` → base64 data URL → `<img src>` |
| Validation | `file.type` check + `file.size` check (10 MB) |
| Upload | `FormData.append('image', file)` → `POST /customer/report-issue` as `multipart/form-data` |
| State management | Uncontrolled: `uploadedFile` state in `Dashboard.jsx`, `preview` state local to `UploadCard` |
| Image display in detail | `customerApi.getMyRequestImageBlob(id)` → Blob → `URL.createObjectURL(blob)` → `<img src>` |

---

### GPS / Location Implementation

**Component:** [LocationInput.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/LocationInput.jsx)

The component supports **three GPS acquisition paths:**

#### Path 1: Current Device GPS (`gpsMode === 'current-device'`)
```
navigator.geolocation.getCurrentPosition()
  → { coords.latitude, coords.longitude }
  → reverseGeocode(lat, lng)   → GET /location/reverse?lat=&lng=
  → sets form fields: location (text), latitude, longitude
```
- Uses `enableHighAccuracy: true`, `maximumAge: 0`, `timeout: 25000`
- Handles error codes: 1 (permission denied), 2 (unavailable), other
- Auto-selected on mobile UA detection

#### Path 2: Mobile QR GPS (`gpsMode === 'mobile-qr'`)
```
POST /api/gps/session/new
  → returns { session_id, poll_interval_seconds, expires_in_seconds }
  → generates QR code URL: {VITE_PUBLIC_BASE_URL}/mobile-gps?session_id=...
  → displays QR via qrcode.react (QRCodeSVG)
  → polls GET /api/gps/session/:sessionId every 2 s
      → on available=true: applyResolvedCoordinates()
      → on expired: stop polling + show error
  → timeout after expires_in_seconds (max 5 min)
```

#### Path 3: Manual Address Entry
```
City + State + 6-digit Pincode   → location_text, no GPS fields
```
Validation enforces **one mode only** — cannot mix GPS and manual address.

#### After GPS coordinates are resolved (`applyResolvedCoordinates`):
1. Sets `latitude`, `longitude` in local state
2. Sets form values via `react-hook-form` `setValue`
3. Calls `reverseGeocode()` → converts coordinates to human-readable address
4. Sets `location` text field to the resolved address

**Backend GPS API calls used by `LocationInput`:**

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/gps/session/new` | Create QR GPS session |
| `GET` | `/api/gps/session/:sessionId` | Poll for mobile-submitted GPS |
| `GET` | `/location/reverse?lat=&lng=` | Reverse geocode coordinates to address |

> **Note:** These three calls are made using the native `fetch` API directly (not Axios), calling `backendOrigin` (derived from `VITE_API_URL`). They are **not** in the `customerApi` namespace and carry **no auth headers**.

---

## SECTION 3 — Migration Effort Classification

---

### Customer Login
**Effort: Easy**

| Reason | Detail |
|---|---|
| Logic is identical | `email` + `password` → `POST /auth/login` → navigate by role |
| Form → TextInput | HTML inputs become `TextInput` in React Native |
| Navigation | `useNavigate` → `useNavigation().navigate()` |
| Error handling | Pattern is the same — catches `err.response.data` |
| No web-only APIs | No `FileReader`, no `BroadcastChannel`, no `window` in this component |

**Only change:** HTML elements → React Native primitives. Logic is a 1:1 port.

---

### Customer Dashboard (Request List)
**Effort: Easy–Medium**

| Reason | Detail |
|---|---|
| Data fetching | SWR works in React Native — `useMyRequests()` hook needs no change |
| Table → FlatList | `<Table>` → `<FlatList>` with custom row renderer |
| Modal | `<Modal>` → React Navigation modal stack or `react-native-modal` |
| `URL.revokeObjectURL` | In `useDetailModal` — must handle image blob differently (see below) |
| State management | All `useState` / `useEffect` / `useMemo` patterns are identical |

**Classified as Medium** because the modal + detail + image blob pattern involves `URL.createObjectURL` which does not exist in React Native.

---

### Create Service Request Form
**Effort: Medium**

| Reason | Detail |
|---|---|
| `react-hook-form` | Works in React Native — no change needed |
| `FormData` | React Native `FormData` is available and works with `fetch` / Axios |
| Form fields | HTML inputs → `TextInput`; `<select>` → `Picker` or custom modal |
| Submit button guards | Identical logic |
| `framer-motion` | Not available in React Native — remove animation wrapper |
| `Loader2` icon | `lucide-react-native` has equivalent icons |
| Location validation | `hasValidLocationInput()` is pure JS — no change needed |

**Classified as Medium** because of form element replacement and animation removal, but core submission logic is unchanged.

---

### Image Upload (`UploadCard`)
**Effort: Medium**

| Web Implementation | React Native Equivalent | Notes |
|---|---|---|
| `<input type="file">` | `react-native-image-picker` or `expo-image-picker` | Replaces file input entirely |
| Drag-and-drop | **Not available** on mobile | Remove drag-and-drop UI entirely |
| `FileReader.readAsDataURL` | `result.base64` from image picker or `uri` directly | No `FileReader` in React Native |
| `file.type` validation | Picker returns `type` in response | Same validation logic, different source |
| `file.size` validation | Picker returns `fileSize` | Same check, different field name |
| Preview `<img src={dataUrl}>` | `<Image source={{ uri: pickerUri }}>` | URI from picker works directly |
| `FormData.append('image', file)` | `formData.append('image', { uri, type, name })` | React Native FormData format |

**Classified as Medium** because drag-and-drop must be dropped, `FileReader` must be replaced with picker library, and FormData format differs.

---

### GPS / Location (`LocationInput`)
**Effort: Hard**

| Aspect | Web | React Native | Difficulty |
|---|---|---|---|
| Current device GPS | `navigator.geolocation.getCurrentPosition()` | `expo-location` or `react-native-geolocation-service` | Medium — API is similar but requires runtime permissions |
| Permission handling | Browser permission prompt (automatic) | Must explicitly call `requestPermissionsAsync()` before use | **Hard** — new permission flow |
| Mobile QR mode | QR code shown on desktop → scanned by phone | Entire QR-scan-from-desktop flow is **irrelevant** on native | **Remove entirely** — native app IS the mobile device |
| `navigator.userAgent` mobile detection | UA string check | Not needed — native is always mobile | Remove |
| Reverse geocoding | `fetch('/location/reverse?lat=&lng=')` | Same `fetch` call — no change needed | Easy |
| `qrcode.react` | `QRCodeSVG` component | Not needed if QR mode is removed | Remove |
| `import.meta.env` | Vite env vars | `react-native-config` or `expo-constants` | Easy |
| Form integration | `react-hook-form` `setValue` | Same with `react-hook-form` | No change |

**Classified as Hard** because:
1. The QR flow (mobile-QR GPS mode) is **entirely obsolete** on a native app — the user's device IS the mobile. This is not a migration; it is a redesign.
2. The current device GPS mode requires a **new runtime permission flow** using a different library API.
3. The entire dual-mode location UI (desktop QR vs. mobile direct) collapses into a single "Get GPS" button on mobile.

---

### Live Tracking (SSE + Map)
**Effort: Hard**

| Aspect | Web | React Native | Difficulty |
|---|---|---|---|
| `EventSource` (SSE) | Native browser API | **No native support** in React Native | **Hard** — must replace |
| SSE replacement | — | `fetch` with streaming, or polling, or WebSocket | Architecture change |
| Google Maps SDK | `window.google.maps` JavaScript SDK | `react-native-maps` (different API entirely) | **Hard** — full rewrite |
| Map markers | `new google.maps.Marker(...)` | `<Marker>` JSX component in `react-native-maps` | Different paradigm |
| `loadGoogleMaps()` dynamic script loader | `<script>` tag injection | Not applicable | Remove entirely |
| `GoogleMapEmbed` iframe fallback | `<iframe>` | `<WebView>` (possible but heavy) | Replace with `react-native-maps` |
| `performance.memory` (health check) | Browser-only API | Not available | Remove or replace |
| `window.SSE_LATENCY` debug assignment | Browser `window` global | Not applicable | Remove |

**Classified as Hard** because:
1. `EventSource` is a browser-only API with **no React Native equivalent**. The entire real-time connection mechanism must be rebuilt (polling, WebSocket, or a library like `eventsource` polyfill).
2. The Google Maps JavaScript SDK is browser-only. `TrackingMap` must be fully rewritten using `react-native-maps` with a completely different component-based API.
3. `LiveTrackingPanel` itself is portable (pure rendering logic), but both of its data sources (SSE hook + Maps component) require full rewrites.

---

## Summary Table

| Screen / Component | File | Effort | Primary Reason |
|---|---|---|---|
| Login | `pages/auth/LoginPage.jsx` | **Easy** | Pure form logic, no web APIs |
| Customer Dashboard | `pages/customer/CustomerDashboard.jsx` | **Medium** | Table → FlatList, blob image handling |
| Create Request | `pages/Dashboard.jsx` | **Medium** | Form elements + animation removal |
| Image Upload | `components/UploadCard.jsx` | **Medium** | No FileReader / drag-drop in RN; needs image picker lib |
| Location Input | `components/LocationInput.jsx` | **Hard** | QR flow obsolete; GPS permissions redesign needed |
| Live Tracking Hook | `hooks/useLiveTracking.js` | **Hard** | EventSource not available in React Native |
| Tracking Map | `components/TrackingMap.jsx` | **Hard** | Google Maps JS SDK must be replaced with react-native-maps |
| Live Tracking Panel | `components/LiveTrackingPanel.jsx` | **Medium** | Pure UI — portable, but depends on Hard items above |
