# Technician Workflow Analysis

> **Read-only analysis. No code was modified.**

---

## Workflow Trace

```
Technician Login
  → Assigned Jobs Dashboard     (TechnicianDashboard.jsx — tab: "jobs")
      → View Job Detail          (Modal: useDetailModal)
      → Prepare Visit (AI)       (Modal: handlePrevisitReport → POST /reports/previsit)
      → Start Job                (POST /technician/jobs/:id/start)
          → Live GPS Streaming   (navigator.geolocation.watchPosition → POST /technician/jobs/:id/live-location)
      → Mark Complete            (PUT /technician/jobs/:id/complete)
          → Submit Report        (Modal: reportFormOpen → POST /technician/submit-report)
      → Request Reassignment     (Modal: ReassignmentModal → POST /technician/jobs/:id/request-reassignment)
  → AI Diagnosis Tab             (TechnicianDashboard.jsx — tab: "ai")
  → Route Map View               (RouteMap.jsx — lazy loaded, Google Maps Embed iframe)
  → Technician Profile           (TechnicianProfilePage.jsx — separate route)
```

---

## SECTION 1 — All Screens

---

### Screen 1: Technician Login

**File:** `src/pages/auth/LoginPage.jsx`  
**Route:** `/login`  
**Component:** `LoginPage`

Identical flow to customer login. Technician enters email + password → `POST /auth/login` → navigates to `/technician` on `role === 'technician'`.

---

### Screen 2: Assigned Jobs Dashboard

**File:** `src/pages/technician/TechnicianDashboard.jsx`  
**Component:** `TechnicianDashboard`  
**Route:** `/technician` (also `/technician/jobs/:jobId` for deep link)

This is the primary workspace. It contains two tabs in one page:

| Tab | Label | Contents |
|---|---|---|
| `jobs` | Assigned Jobs | Job cards, action buttons (Start / Complete / AI Briefing / Reassign) |
| `ai` | AI Diagnosis | Table of all jobs with AI fields: fault type, severity, confidence, HITL triggers |

**Rendered job card actions (per-job):**

| Button | Condition | Action |
|---|---|---|
| View Details | Always | Opens `useDetailModal` → fetches job + image blob |
| Prepare Visit (AI) | Status = `assigned` | Calls `handlePrevisitReport(jobId)` |
| Start Job | Status = `assigned` | Calls `handleStartJob(jobId)` |
| Mark Complete | Status = `in_progress` (locked) | Calls `handleMarkCompleted(jobId)` |
| Request Reassignment | Status = `assigned/scheduled/dispatched`, no pending | Opens `ReassignmentModal` |

**Completed jobs strip (below active cards):**

| Button | Condition | Action |
|---|---|---|
| Submit Report | `report_submitted === false` | Opens report form modal |
| View Report | `report_submitted === true` | Fetches + displays submitted report |

---

### Screen 3: AI Briefing Modal

**File:** `src/pages/technician/TechnicianDashboard.jsx` (inline Modal, lines 2144–2234)  
**Component:** Inline `<Modal isOpen={modalOpen}>`  

- Triggered by "Prepare Visit (AI)" button on an `assigned` job card
- Shows a loading animation with rotating progress messages ("Analyzing issue...", "Identifying tools...", "Preparing steps...")
- On success: renders structured sections parsed from AI plain-text output
- On failure: falls back to cached result or shows a static manual fallback plan
- Has "Copy to Clipboard" and "Download" buttons for the briefing text

---

### Screen 4: Route Navigation

**File:** `src/pages/technician/TechnicianDashboard.jsx` + `src/components/RouteMap.jsx`  
**Component:** `RouteMap` (lazy-loaded via `React.lazy`)  
**Route:** Same page, triggered by a "Route Map" or "Route Navigation" section in the layout

- Shows optimized order of stops based on `routeData.route_order` from `GET /technician/my-route`
- Renders an embedded Google Maps iframe via `GoogleMapEmbed.jsx` (using `VITE_GOOGLE_MAPS_EMBED_API_KEY`)
- Builds a Google Maps Directions URL: `https://www.google.com/maps/dir/?api=1&origin=...&destination=...&waypoints=...&travelmode=driving`
- "Open in Google Maps" button (`window.open(googleMapsUrl, '_blank')`) opens the full navigation in Google Maps

**Live GPS broadcast (while job is `in_progress`):**
- `navigator.geolocation.watchPosition(...)` started automatically when `inProgressJob` exists
- Sends coords to backend every 5 seconds via `POST /technician/jobs/:id/live-location`
- Throttle: last sent timestamp compared to `LIVE_LOCATION_INTERVAL_MS = 5000 ms`
- Geolocation options: `enableHighAccuracy: true`, `maximumAge: 5000`, `timeout: 10000`
- Auto-stops on job complete or component unmount

---

### Screen 5: Submit Report Modal

**File:** `src/pages/technician/TechnicianDashboard.jsx` (inline Modal, lines 2236–2420)  
**Component:** Inline `<Modal isOpen={reportFormOpen}>`

**Form sections:**
- **Section A** – Service Details (read-only: Job ID, Technician Name, Date, Location)
- **Section B** – Issue Details: `issue_observed`, `root_cause` — each has "Improve with AI" button
- **Section C** – Work Performed: `work_done` — has "Improve with AI" button
- **Section D** – Materials Used (dynamic row table: name + quantity)
- **Section E** – Photos: Before Photo + After Photo (separate file pickers)
- **Section F** – Additional: `time_taken` (minutes), `customer_comments`, `notes`

**AI text improvement button** (per field):
- Sends `POST /reports/improve` with `{ text: fieldText }`
- Replaces field content with `improved_text` from response
- Validates: must be >= 10 chars; result must be related to original (token overlap check)

---

### Screen 6: Technician Profile Page

**File:** `src/pages/technician/TechnicianProfilePage.jsx`  
**Component:** `TechnicianProfilePage`  
**Route:** `/technician/profile`

**Sections:**
- **Profile** (read-only): name, code, phone, domain, experience level, zone, coordinates
- **Work Status** (read-only): availability state, current jobs, max jobs per day
- **Skills & Certifications** (editable): multi-select chip toggles → `PUT /technician/update-skills`
- **Work Schedule** (editable): shift start/end (`HH:MM`), working days → `PUT /technician/update-schedule`

**Profile Linking:**
- If profile is not yet linked to the auth account, shows a code input (`TCH-0001` format)
- Submits `POST /technician/link-profile { technician_code }`

---

## SECTION 2 — All API Endpoints Used

### Axios `technicianApi` (via `src/services/api.js`)

| Method | Endpoint | Used in | Purpose |
|---|---|---|---|
| `GET` | `/technician/jobs` | `useTechnicianDashboard` (SWR, 30 s poll) | Fetch assigned + completed jobs |
| `GET` | `/technician/my-route` | `useTechnicianDashboard` (SWR, 30 s poll) + `fetchOptimizedRoute` | Fetch AI-optimized route order |
| `GET` | `/technician/profile` | `useTechnicianDashboard` (SWR, 60 s poll) + `TechnicianProfilePage` | Fetch technician profile |
| `POST` | `/technician/jobs/:id/start` | `handleStartJob` | Start a job (status → `in_progress`) |
| `PUT` | `/technician/jobs/:id/complete` | `handleMarkCompleted` | Mark job complete |
| `POST` | `/technician/update-status` | Fallback inside `completeJob` (404 path) | Legacy complete fallback |
| `POST` | `/technician/jobs/:id/live-location` | `navigator.geolocation.watchPosition` callback | Push live GPS coordinates |
| `GET` | `/technician/jobs/:id` | `useDetailModal.open(id)` | Fetch single job detail |
| `GET` | `/technician/jobs/:id/image` | `useDetailModal.open(id)` | Fetch customer evidence image (blob) |
| `GET` | `/technician/report/:id` | `openReportView`, post-submit verification | Fetch existing submitted report |
| `POST` | `/technician/link-profile` | `handleLinkProfile` | Link auth account to technician code |
| `PUT` | `/technician/update-skills` | `handleSaveSkills` | Update skills + certifications |
| `PUT` | `/technician/update-schedule` | `handleSaveSchedule` | Update shift + working days |
| `POST` | `/technician/jobs/:id/request-reassignment` | `handleReassignmentSubmit` | Submit reassignment request |

### Raw `fetch` calls (not via Axios)

| Method | Endpoint | Auth Header | Used in | Purpose |
|---|---|---|---|---|
| `POST` | `/reports/previsit` | `Bearer fsm_token` | `handlePrevisitReport` | Generate AI pre-visit briefing |
| `POST` | `/reports/improve` | `Bearer fsm_token` | `handleImproveWithAI` | AI-improve a report text field |
| `POST` | `/technician/report-photo-upload` | `Bearer fsm_token` | `uploadReportPhoto` | Upload before/after photos (multipart) |
| `POST` | `/technician/submit-report` | `Bearer fsm_token` | `handleSubmitReport` | Submit final job report (JSON) |

> **Why `fetch` instead of Axios for these four?** The code uses raw `fetch` here to attach `AbortController` signals and enforce per-call timeouts more directly (`REPORT_TIMEOUT_MS = 8000 ms`, `PREVISIT_TIMEOUT_MS = 18000 ms`). The token is read directly from `sessionStorage.getItem('fsm_token')`.

---

## SECTION 3 — Assignment Retrieval Flow

```
Component mount (TechnicianDashboard)
  │
  ├─ 1. useTechnicianDashboard() [hook: useData.js]
  │       ├─ SWR: GET /technician/jobs          → activeJobs, completedJobs     (30 s poll)
  │       ├─ SWR: GET /technician/my-route      → routeData.route_order         (30 s poll)
  │       └─ SWR: GET /technician/profile       → technicianLocation (lat/lng)  (60 s poll)
  │
  ├─ 2. On mount: refreshAll() + direct fetch GET /technician/jobs
  │       → Bypasses SWR cache lag on first render
  │       → Patches local state: setActiveJobs(rows.filter(not completed))
  │
  ├─ 3. Poll for in_progress job (up to 8 attempts, 500 ms apart)
  │       → Ensures "Start Job" → "In Progress" state is visible immediately after start
  │
  ├─ 4. SWR → setActiveJobs (filtered, preserving in_progress jobs across stale snapshots)
  │
  ├─ 5. fetchOptimizedRoute(activeJobs)
  │       → GET /technician/my-route (up to 5 retries, 400 ms backoff)
  │       → Produces routeData.route_order (ordered job IDs from backend AI optimizer)
  │
  └─ 6. Derived state:
          activeRouteOrder  = route_order filtered to only include active job IDs
          orderedActiveJobs = activeJobs sorted by route_order (in_progress always first)
          inProgressJob     = orderedActiveJobs.find(status === 'in_progress')
```

**Token source for all SWR requests:**  
`sessionStorage.getItem('fsm_token')` → Axios interceptor injects as `Authorization: Bearer <token>` on every request.

**Profile link detection:**  
If `GET /technician/jobs` returns an error containing `"technician profile is not linked"` → shows a code-entry form to call `POST /technician/link-profile`.

---

## SECTION 4 — AI Briefing Flow

```
User taps "Prepare Visit (AI)" on an assigned job card
  │
  ├─ Guard checks:
  │   - Cooldown: < 2 s since last click → skip
  │   - Same job already generating → skip
  │   - navigator.onLine === false → show cached result or static fallback
  │
  ├─ setIsGenerating(true)
  │   → Rotating status messages every 2.5 s:
  │       "Analyzing issue..." → "Identifying tools..." → "Preparing steps..."
  │
  ├─ Warning popup after 5 s if still generating ("AI is taking longer than expected...")
  │
  ├─ POST /reports/previsit
  │   Request:  { job_id: <jobId> }
  │   Auth:     Bearer <sessionStorage.fsm_token>
  │   Timeout:  18,000 ms (AbortController)
  │   Retries:  Up to 2 attempts (1 s delay between)
  │   Response: { report_text: string, file_name: string }
  │
  ├─ On success:
  │   - Caches result in lastPrevisitSuccessRef (Map by jobId)
  │   - setPrevisitData(report_text)
  │   - setPrevisitFileName(file_name)
  │   - setModalOpen(true)
  │
  ├─ On failure:
  │   ├─ If cached result exists → shows it with warning toast
  │   └─ If no cache → shows static fallback text:
  │         "SECTION 1: SUMMARY\nUnable to generate AI plan. Please proceed manually.
  │          SECTION 2: SUGGESTION\n- Check device, tools, and safety before visit."
  │
  └─ Briefing Modal:
      - parseSections(report_text):
          Parses plain-text output into { title, items[] } sections
          Items typed as: 'bullet', 'step', or 'para'
      - Renders each section as a card with bullet/step/paragraph formatting
      - "Copy to Clipboard" → navigator.clipboard.writeText(previsitData)
      - "Download" → data:text/plain URI → anchor.click() (browser file download)
```

---

## SECTION 5 — Report Submission Flow

```
Completed job strip → "Submit Report" button
  │
  ├─ openReportForm(job):
  │   - Sets reportMeta (jobId, technicianName from sessionStorage, date, location)
  │   - Resets all form fields and photo files
  │   - Opens Modal
  │
  ├─ Report Form (Multi-section):
  │   Section A: auto-filled metadata (read-only)
  │   Section B: issue_observed, root_cause
  │   Section C: work_done
  │   Section D: materials_used (dynamic rows: name + qty)
  │   Section E: before_photo + after_photo (file inputs)
  │   Section F: time_taken (minutes), customer_comments, notes
  │
  ├─ "Improve with AI" (optional, per field):
  │   → POST /reports/improve { text: <field_text> }
  │   → Validates: non-empty, >= 10 chars, result is related to original
  │   → On success: replaces field content with improved_text
  │   Timeout: 8,000 ms
  │
  ├─ "Submit Report" button:
  │   │
  │   ├─ validateAndNormalizeReport():
  │   │   - issue_observed >= 10 chars (required)
  │   │   - work_done >= 10 chars (required)
  │   │   - time_taken: 1–600 minutes (required, numeric)
  │   │   - materials rows: both name AND quantity required if any row is filled
  │   │   → Returns { errors, payload }
  │   │
  │   ├─ If errors → setReportFormErrors(errors) → stops
  │   │
  │   ├─ Photo uploads (parallel, if files selected):
  │   │   POST /technician/report-photo-upload
  │   │     Body: FormData { job_id, photo_kind: 'before'|'after', image: File }
  │   │     Auth: Bearer <sessionStorage.fsm_token>
  │   │     Timeout: 8,000 ms
  │   │   Returns: { url: string }
  │   │   → before_photo_url, after_photo_url
  │   │
  │   ├─ POST /technician/submit-report (JSON)
  │   │   Body: {
  │   │     job_id, issue_observed, root_cause, work_done,
  │   │     parts_used, materials_used: [{name, quantity}],
  │   │     time_taken, customer_comments, notes,
  │   │     before_photo_url, after_photo_url,
  │   │     review_notes: 'E2E_REPORT'
  │   │   }
  │   │   Auth: Bearer <sessionStorage.fsm_token>
  │   │   Timeout: 8,000 ms
  │   │
  │   ├─ On HTTP 200:
  │   │   → GET /technician/report/:id (verify persisted)
  │   │   → On confirmed: update SWR cache (report_submitted: true) → close form → refreshAll()
  │   │   → On still missing: show "Report still processing" warning
  │   │
  │   ├─ On HTTP 409 (duplicate):
  │   │   → GET /technician/report/:id → update SWR cache → close form
  │   │
  │   └─ On error:
  │       - AbortError → "Server taking too long. Please retry."
  │       - Other → generic error popup
  │
  └─ "View Report" (on already-submitted job):
      → GET /technician/report/:id (with 8 s timeout + 1 retry)
      → Renders report in a separate Modal (visibleReport memo)
      → Displays: before/after photos, all text fields, materials, timestamps
```

---

## SECTION 6 — Dependencies Requiring React Native Replacements

---

### 1. `sessionStorage` — **Hard**

| Web | React Native |
|---|---|
| `sessionStorage.getItem('fsm_token')` | `AsyncStorage.getItem` (async) or `react-native-mmkv` (sync) |
| `sessionStorage.getItem('fsm_user')` | Same |
| `sessionStorage.setItem(...)` | Same |

**Impact:**  
`getStoredUserName()` is called **synchronously** inside `openReportForm` to pre-fill the technician name field. This pattern must be redesigned because `AsyncStorage` is async-only. All raw `fetch` calls in the dashboard also read `sessionStorage.getItem('fsm_token')` inline — these must be replaced with an async token accessor.

---

### 2. `navigator.geolocation.watchPosition` — **Medium**

| Web | React Native |
|---|---|
| `navigator.geolocation.watchPosition(onSuccess, onError, options)` | `expo-location.watchPositionAsync()` or `react-native-geolocation-service` |
| `navigator.geolocation.clearWatch(watchId)` | `subscription.remove()` |

**Impact:**  
The live GPS broadcast while `in_progress` uses `watchPosition` with throttling (5 s interval check). The logic is mostly portable — only the API call changes. Runtime location permissions must be requested explicitly first (`Location.requestForegroundPermissionsAsync()`).

---

### 3. `navigator.onLine` — **Medium**

| Web | React Native |
|---|---|
| `navigator.onLine` — instant boolean check | `@react-native-community/netinfo` — async |

**Impact:**  
Used in `handlePrevisitReport` to show cached briefing when offline. The offline-first cache fallback logic (`lastPrevisitSuccessRef`) is portable, but the connectivity check must become async.

---

### 4. `navigator.clipboard.writeText()` — **Easy**

| Web | React Native |
|---|---|
| `navigator.clipboard.writeText(text)` | `Clipboard.setString(text)` from `@react-native-clipboard/clipboard` |

**Impact:** Trivial replacement. Used in the AI Briefing modal "Copy to Clipboard" button.

---

### 5. File download via anchor element — **Hard**

| Web | React Native |
|---|---|
| `document.createElement('a')` → `anchor.download` → `anchor.click()` | `expo-file-system` + `expo-sharing` or `react-native-share` |

**Impact:**  
`downloadReport()` creates a hidden `<a>` element with a `data:text/plain` URI to trigger a file download. This pattern does not exist in React Native. The equivalent would be to write the text to the device file system then call the share sheet.

---

### 6. `window.open()` for Google Maps — **Easy**

| Web | React Native |
|---|---|
| `window.open(googleMapsUrl, '_blank')` | `Linking.openURL(googleMapsUrl)` |

**Impact:** Trivial. The Google Maps Directions URL itself is the same — only how it is launched differs.

---

### 7. Google Maps Embed `<iframe>` (`RouteMap.jsx`) — **Hard**

| Web | React Native |
|---|---|
| `GoogleMapEmbed.jsx` renders `<iframe src="https://www.google.com/maps/embed/v1/directions?...">` | `react-native-maps` or `<WebView>` wrapping the same iframe |

**Impact:**  
`RouteMap` renders the route preview via a Google Maps Embed iframe. In React Native, `<iframe>` is not available. Options:
- **`react-native-maps`** — preferred; requires full API migration to component-based markers
- **`<WebView>`** — can load the iframe URL but is heavy and has limited interaction

---

### 8. `FileReader.readAsDataURL()` (photo previews) — **Medium**

| Web | React Native |
|---|---|
| `FileReader.readAsDataURL(file)` → base64 data URL for `<img>` preview | Image picker library returns `{ uri }` directly usable in `<Image source={{ uri }}>` |

**Impact:**  
`handlePhotoSelection` uses `FileReader` for before/after photo previews. In React Native, `expo-image-picker` or `react-native-image-picker` returns a local URI directly — no `FileReader` needed. The photo upload logic also must change: `FormData.append('image', file)` → `FormData.append('image', { uri, type, name })`.

---

### 9. `<input type="file">` (photo picker) — **Medium**

| Web | React Native |
|---|---|
| `<input type="file" accept="image/*">` | `expo-image-picker` or `react-native-image-picker` |

**Impact:**  
Two separate file inputs exist (before photo, after photo). Both must be replaced with library calls. File type and size validation logic (`ALLOWED_REPORT_PHOTO_TYPES`, `MAX_REPORT_PHOTO_BYTES`) is portable pure JS.

---

### 10. `performance.now()` — **Easy**

| Web | React Native |
|---|---|
| `performance.now()` | `Date.now()` or Hermes `performance.now()` (available in RN 0.71+) |

**Impact:** Used for timing the AI previsit API call. Trivially replaceable.

---

### 11. `window.setTimeout` / `window.clearInterval` — **Easy**

| Web | React Native |
|---|---|
| `window.setTimeout(fn, ms)` | `setTimeout(fn, ms)` (global — identical in RN) |
| `window.setInterval(fn, ms)` | `setInterval(fn, ms)` |
| `window.clearInterval(id)` | `clearInterval(id)` |

**Impact:** All `window.` prefixed timer calls can drop the `window.` prefix. Logic is identical.

---

### 12. `<input type="time">` (schedule editor) — **Hard**

| Web | React Native |
|---|---|
| `<input type="time" value="HH:MM">` | No native equivalent — use `@react-native-community/datetimepicker` or custom picker |

**Impact:**  
The shift start/end inputs in `TechnicianProfilePage` use HTML time inputs. React Native has no `<input type="time">`. Must use a `DateTimePicker` or a custom hour/minute scroll picker component.

---

### 13. `React.lazy()` + `<Suspense>` for `RouteMap` — **Easy**

| Web | React Native |
|---|---|
| `const RouteMap = lazy(() => import(...))` | Same pattern supported in React Native (Metro bundler) |

**Impact:** Works identically in React Native. No change needed.

---

### 14. `import.meta.env.VITE_*` environment variables — **Medium**

| Web | React Native |
|---|---|
| `import.meta.env.VITE_API_URL` | `react-native-config` or `expo-constants` |

**Impact:**  
All four raw `fetch` calls read `import.meta.env.VITE_API_URL` inline as the base URL. These must be replaced with a config module. The env variable names (`VITE_GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAPS_EMBED_API_KEY`) also change.

---

## Summary Table

| Dependency | Screen(s) Affected | Effort |
|---|---|---|
| `sessionStorage` (token + user) | All screens (auth header in every API call) | **Hard** |
| `navigator.geolocation.watchPosition` | Route Navigation (live GPS) | **Medium** |
| `navigator.onLine` | AI Briefing (offline fallback) | **Medium** |
| `navigator.clipboard.writeText` | AI Briefing (copy button) | **Easy** |
| `document.createElement('a')` file download | AI Briefing (download button) | **Hard** |
| `window.open(googleMapsUrl)` | Assigned Jobs (Open in Maps) | **Easy** |
| Google Maps Embed `<iframe>` | Route Map tab | **Hard** |
| `FileReader` + `<input type="file">` | Submit Report (before/after photos) | **Medium** |
| `<input type="time">` | Profile — Work Schedule | **Hard** |
| `import.meta.env.VITE_*` | All fetch calls | **Medium** |
| `performance.now()` | AI Briefing | **Easy** |
| `window.setTimeout/setInterval` | All timers throughout Dashboard | **Easy** |
| `React.lazy` + `Suspense` | Route Map tab | **Easy** |
