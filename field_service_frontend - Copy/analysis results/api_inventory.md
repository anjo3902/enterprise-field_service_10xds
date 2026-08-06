# Complete API Inventory — React Field Service Application

> **Read-only analysis. No code was modified.**
> All endpoints use `VITE_API_URL` as the base URL.
> All authenticated endpoints require: `Authorization: Bearer <token>` (from `sessionStorage.getItem('fsm_token')`).

---

## GROUP 1: Authentication

---

### POST /auth/login

**Used in:** `LoginPage.jsx` via `authApi.login()`  
**Auth:** None  
**Content-Type:** `application/json`

**Request Payload:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response Payload:**
```json
{
  "access_token": "string",
  "token_type": "bearer",
  "user": {
    "id": "number",
    "email": "string",
    "role": "customer | technician | admin",
    "name": "string"
  }
}
```

**Notes:** On success, `access_token` is stored in `sessionStorage` as `fsm_token`. `user` object is stored as `fsm_user`. Role determines routing: `customer → /customer`, `technician → /technician`, `admin → /admin`.

---

### POST /auth/signup

**Used in:** `SignupPage.jsx` via `authApi.signup()`  
**Auth:** None  
**Content-Type:** `application/json`

**Request Payload:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string"
}
```

**Response Payload:**
```json
{
  "access_token": "string",
  "token_type": "bearer",
  "user": {
    "id": "number",
    "email": "string",
    "role": "string",
    "name": "string"
  }
}
```

---

### POST /auth/telegram/claim

**Used in:** `authApi.exchangeWorkspaceToken()` (defined in `api.js`, available for Telegram bot integration)  
**Auth:** None  
**Content-Type:** `application/json`

**Request Payload:**
```json
{
  "token": "string"
}
```

**Response Payload:**
```json
{
  "access_token": "string",
  "token_type": "bearer",
  "user": {
    "id": "number",
    "email": "string",
    "role": "string",
    "name": "string"
  }
}
```

**Notes:** Used to exchange a Telegram-issued workspace token for a standard JWT. Not wired to any UI component in the current codebase.

---

## GROUP 2: Customer

---

### POST /customer/report-issue

**Used in:** `CustomerReportPage.jsx` / customer issue form via `customerApi.reportIssue()`  
**Auth:** Bearer token  
**Content-Type:** `multipart/form-data`

**Request Payload (FormData fields):**
```
name              string   (customer name)
email             string   (customer email)
contact_number    string   (phone number)
location          string   (text description or coordinates)
latitude          number   (GPS latitude, optional)
longitude         number   (GPS longitude, optional)
issue_description string   (problem description)
image             File     (photo evidence, optional — JPG/PNG/WEBP, max 5 MB)
```

**Response Payload:**
```json
{
  "id": "number",
  "status": "pending_review | assigned",
  "fault_type": "string",
  "severity": "low | medium | high | critical",
  "image_severity": "string",
  "description_severity": "string",
  "final_severity": "string",
  "confidence": "number (0.0–1.0)",
  "requires_human_review": "boolean",
  "hitl_triggers": ["string"],
  "recommended_technician": "string",
  "message": "string"
}
```

**Notes:** The backend runs AI diagnosis (vision model + NLP) on the image and description. If `requires_human_review` is true, the ticket enters the admin HITL queue before dispatch.

---

### GET /customer/my-requests

**Used in:** `useMyRequests()` hook via SWR (30 s poll), `CustomerDashboard.jsx`  
**Auth:** Bearer token

**Request Payload:** None

**Response Payload:**
```json
[
  {
    "id": "number",
    "status": "pending_review | assigned | in_progress | completed",
    "fault_type": "string",
    "severity": "string",
    "final_severity": "string",
    "created_at": "ISO8601",
    "assigned_technician": "number | null",
    "assigned_technician_name": "string | null",
    "assigned_technician_phone_number": "string | null",
    "assigned_technician_zone": "string | null",
    "location_text": "string",
    "latitude": "number | null",
    "longitude": "number | null",
    "distance_km": "number | null",
    "travel_time_min": "number | null",
    "reassignment_requested": "boolean",
    "reassignment_status": "string",
    "reassignment_result": "string"
  }
]
```

---

### GET /customer/my-requests/:requestId

**Used in:** `useDetailModal.open(id)` in `CustomerDashboard.jsx` via `customerApi.getMyRequestById()`  
**Auth:** Bearer token

**Request Payload:** None (ID in URL path)

**Response Payload:**
```json
{
  "id": "number",
  "status": "string",
  "fault_type": "string",
  "severity": "string",
  "final_severity": "string",
  "image_severity": "string",
  "description_severity": "string",
  "confidence": "number",
  "safety_escalation": "boolean",
  "safety_score": "number",
  "operational_impact": "number",
  "escalation_risk": "number",
  "diagnosis_confidence": "number",
  "final_reasoning": "string",
  "diagnosis_reason": "string",
  "hitl_triggers": ["string"],
  "issue_description": "string",
  "location_text": "string",
  "latitude": "number | null",
  "longitude": "number | null",
  "assigned_technician": "number | null",
  "assigned_technician_name": "string | null",
  "assigned_technician_phone_number": "string | null",
  "assigned_technician_zone": "string | null",
  "created_at": "ISO8601",
  "distance_km": "number | null",
  "travel_time_min": "number | null",
  "reassignment_requested": "boolean",
  "reassignment_status": "string",
  "reassignment_result": "string"
}
```

---

### GET /customer/my-requests/:requestId/image

**Used in:** `useDetailModal.open(id)` via `customerApi.getMyRequestImageBlob()`  
**Auth:** Bearer token  
**Response Type:** `blob`

**Request Payload:** None (ID in URL path)

**Response Payload:** Binary image data (JPEG/PNG/WEBP)  
Frontend converts to object URL: `URL.createObjectURL(blob)` → renders in `<img>` tag.

---

### GET /customer/jobs/:jobId/live  *(Server-Sent Events)*

**Used in:** `useLiveTracking.js` hook in `CustomerDashboard.jsx`  
**Auth:** Token passed as **query param** `?token=<fsm_token>` (EventSource does not support headers)  
**Protocol:** SSE (Server-Sent Events) — long-lived persistent connection  

**Request Params:**
```
GET /customer/jobs/:jobId/live?token=<jwt_token>
```

**SSE Event Types Listened:**
- `snapshot` — initial full state on connect
- `update` — incremental location/status change
- `status` — job status change

**SSE Event Payload (per event):**
```json
{
  "status": "string (in_progress | completed | ...)",
  "latitude": "number | null",
  "longitude": "number | null",
  "technician_location": {
    "lat": "number",
    "lng": "number"
  },
  "customer_location": {
    "lat": "number",
    "lng": "number"
  },
  "assigned_technician_name": "string",
  "assigned_technician_phone_number": "string",
  "assigned_technician_zone": "string",
  "eta_minutes": "number | null",
  "distance_km": "number | null",
  "speed_kmh": "number | null",
  "accuracy_m": "number | null",
  "heading": "number | null",
  "reassignment_requested": "boolean",
  "reassignment_status": "string",
  "reassignment_result": "string",
  "updated_at": "ISO8601",
  "timestamp": "ISO8601"
}
```

**Notes:** Connection auto-closes when `status !== 'in_progress'`. Reconnects on error with 1 s delay. Health check logged every 60 s. Staleness detected after 15 s without events.

---

## GROUP 3: Technician

---

### GET /technician/jobs

**Used in:** `useTechnicianDashboard()` hook via SWR (30 s poll)  
**Auth:** Bearer token  
**Alias:** `technicianApi.getAssignedJobs()` → calls `getJobs()`

**Request Payload:** None

**Response Payload:**
```json
{
  "jobs": [
    {
      "id": "number",
      "status": "assigned | in_progress | completed",
      "fault_type": "string",
      "severity": "low | medium | high | critical",
      "final_severity": "string",
      "image_severity": "string",
      "description_severity": "string",
      "diagnosis_confidence": "number",
      "confidence": "number",
      "hitl_triggers": ["string"],
      "diagnosis_reason": "string",
      "review_priority": "string",
      "location_text": "string",
      "location_zone": "string",
      "latitude": "number | null",
      "longitude": "number | null",
      "contact_number": "string | null",
      "customer_name": "string",
      "customer_email": "string",
      "is_locked": "boolean",
      "report_submitted": "boolean",
      "reassignment_requested": "boolean",
      "reassignment_status": "string",
      "technician_latitude": "number | null",
      "technician_longitude": "number | null",
      "safety_escalation": "boolean",
      "safety_score": "number",
      "operational_impact": "number",
      "escalation_risk": "number"
    }
  ],
  "completed_jobs": ["...same shape as jobs"],
  "summary": {
    "latitude": "number | null",
    "longitude": "number | null"
  }
}
```

**Notes:** Also accepted as a plain array (no envelope). `completed_jobs` is a separate key for previously-completed jobs today.

---

### GET /technician/my-route

**Used in:** `useTechnicianDashboard()` hook via SWR (30 s poll)  
**Auth:** Bearer token

**Request Payload:** None

**Response Payload:**
```json
{
  "route_order": ["number (job IDs in optimized order)"],
  "technician_location": {
    "latitude": "number",
    "longitude": "number"
  }
}
```

---

### GET /technician/route/:technicianId

**Used in:** `technicianApi.getRoute(technicianId)` (defined, not used in current dashboard — superseded by `my-route`)  
**Auth:** Bearer token

**Request Payload:** None (technician ID in URL path)

**Response Payload:** Same shape as `/technician/my-route`

---

### GET /technician/profile

**Used in:** `useTechnicianDashboard()` hook via SWR (60 s poll), `TechnicianProfilePage.jsx`  
**Auth:** Bearer token

**Request Payload:** None

**Response Payload:**
```json
{
  "id": "number",
  "technician_code": "string",
  "name": "string",
  "phone": "string",
  "domain": "string",
  "experience_level": "string",
  "zone": "string",
  "latitude": "number | null",
  "longitude": "number | null",
  "current_latitude": "number | null",
  "current_longitude": "number | null",
  "availability": "string",
  "current_jobs": "number",
  "max_jobs_per_day": "number",
  "skills": ["string"],
  "certifications": ["string"],
  "shift_start": "HH:MM",
  "shift_end": "HH:MM",
  "working_days": ["Monday", "Tuesday", "..."]
}
```

---

### POST /technician/jobs/:id/start

**Used in:** `handleStartJob()` in `TechnicianDashboard.jsx` via `technicianApi.startJob()`  
**Auth:** Bearer token  
**Content-Type:** `application/json`

**Request Payload:** None (job ID in URL path)

**Response Payload:**
```json
{
  "job_id": "number",
  "status": "in_progress",
  "message": "string"
}
```

---

### PUT /technician/jobs/:id/complete

**Used in:** `handleMarkCompleted()` in `TechnicianDashboard.jsx` via `technicianApi.completeJob()`  
**Auth:** Bearer token

**Request Payload:** None (job ID in URL path)

**Response Payload:**
```json
{
  "job_id": "number",
  "status": "completed",
  "message": "string"
}
```

**Notes:** Falls back to `POST /technician/update-status` if a 404 is returned (legacy endpoint fallback).

---

### POST /technician/update-status  *(Legacy Fallback)*

**Used in:** `technicianApi.completeJob()` fallback only  
**Auth:** Bearer token  
**Content-Type:** `application/json`

**Request Payload:**
```json
{
  "request_id": "number",
  "status": "completed"
}
```

**Response Payload:**
```json
{
  "job_id": "number",
  "status": "completed",
  "message": "string"
}
```

---

### POST /technician/jobs/:id/live-location

**Used in:** `navigator.geolocation.watchPosition` callback in `TechnicianDashboard.jsx` via `technicianApi.updateLiveLocation()`  
**Auth:** Bearer token  
**Content-Type:** `application/json`  
**Frequency:** Every 5 seconds while job is `in_progress`

**Request Payload:**
```json
{
  "latitude": "number",
  "longitude": "number",
  "accuracy": "number (meters, optional)",
  "heading": "number (degrees, optional)",
  "speed": "number (m/s, optional)"
}
```

**Response Payload:**
```json
{
  "status": "ok",
  "message": "string"
}
```

---

### GET /technician/jobs/:id

**Used in:** `useDetailModal.open(id)` via `technicianApi.getJobById()`  
**Auth:** Bearer token

**Request Payload:** None (job ID in URL path)

**Response Payload:** Same shape as individual job object in `GET /technician/jobs`

---

### GET /technician/jobs/:id/image

**Used in:** `useDetailModal.open(id)` via `technicianApi.getJobImageBlob()`  
**Auth:** Bearer token  
**Response Type:** `blob`

**Request Payload:** None (job ID in URL path)

**Response Payload:** Binary image data (JPEG/PNG/WEBP)

---

### GET /technician/report/:id

**Used in:** `openReportView()` and post-submit verification in `TechnicianDashboard.jsx` via `technicianApi.getReport()`  
**Auth:** Bearer token

**Request Payload:** None (job ID in URL path)

**Response Payload:**
```json
{
  "status": "ok | missing",
  "report_data": {
    "job_id": "number",
    "technician_name": "string",
    "service_location": "string",
    "submitted_at": "ISO8601",
    "issue_observed": "string",
    "root_cause": "string",
    "work_done": "string",
    "parts_used": "string",
    "materials_used": [{ "name": "string", "quantity": "number" }],
    "time_taken": "number (minutes)",
    "customer_comments": "string",
    "notes": "string",
    "before_photo_url": "string | null",
    "after_photo_url": "string | null"
  }
}
```

**Notes:** If `status === 'missing'`, the report is still processing. Frontend shows a warning and avoids updating `report_submitted` flag.

---

### POST /technician/report-photo-upload  *(Raw fetch)*

**Used in:** `uploadReportPhoto()` in `TechnicianDashboard.jsx`  
**Auth:** Bearer token (read directly from `sessionStorage`)  
**Content-Type:** `multipart/form-data`  
**Timeout:** 8,000 ms (AbortController)

**Request Payload (FormData fields):**
```
job_id      string   (job ID)
photo_kind  string   ("before" | "after")
image       File     (image file — JPG/PNG/WEBP, max 5 MB)
```

**Response Payload:**
```json
{
  "url": "string (server-stored photo URL)"
}
```

---

### POST /technician/submit-report  *(Raw fetch)*

**Used in:** `handleSubmitReport()` in `TechnicianDashboard.jsx`  
**Auth:** Bearer token (read directly from `sessionStorage`)  
**Content-Type:** `application/json`  
**Timeout:** 8,000 ms (AbortController)

**Request Payload:**
```json
{
  "job_id": "number",
  "issue_observed": "string (min 10 chars)",
  "root_cause": "string",
  "work_done": "string (min 10 chars)",
  "parts_used": "string",
  "materials_used": [
    { "name": "string", "quantity": "number" }
  ],
  "time_taken": "number (1–600 minutes)",
  "customer_comments": "string",
  "notes": "string",
  "before_photo_url": "string | empty string",
  "after_photo_url": "string | empty string",
  "review_notes": "E2E_REPORT"
}
```

**Response Payload (200 OK):**
```json
{
  "message": "string",
  "report_id": "number"
}
```

**Response Payload (409 Conflict — duplicate):**
```json
{
  "detail": "Report already submitted for this job"
}
```

**Notes:** On success, frontend verifies persistence via `GET /technician/report/:id` before marking `report_submitted: true`. On 409, frontend fetches the existing report and updates the UI.

---

### POST /technician/link-profile

**Used in:** `handleLinkProfile()` in `TechnicianDashboard.jsx` via `technicianApi.linkProfile()`  
**Auth:** Bearer token  
**Content-Type:** `application/json`

**Request Payload:**
```json
{
  "technician_code": "string (format: TCH-XXXX)"
}
```

**Response Payload:**
```json
{
  "message": "string",
  "technician": {
    "id": "number",
    "name": "string",
    "code": "string"
  }
}
```

---

### PUT /technician/update-skills

**Used in:** `handleSaveSkills()` in `TechnicianProfilePage.jsx` via `technicianApi.updateSkills()`  
**Auth:** Bearer token  
**Content-Type:** `application/json`

**Request Payload:**
```json
{
  "skills": ["string"],
  "certifications": ["string"]
}
```

**Response Payload:**
```json
{
  "message": "string",
  "skills": ["string"],
  "certifications": ["string"]
}
```

---

### PUT /technician/update-schedule

**Used in:** `handleSaveSchedule()` in `TechnicianProfilePage.jsx` via `technicianApi.updateSchedule()`  
**Auth:** Bearer token  
**Content-Type:** `application/json`

**Request Payload:**
```json
{
  "shift_start": "HH:MM",
  "shift_end": "HH:MM",
  "working_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
}
```

**Response Payload:**
```json
{
  "message": "string",
  "schedule": {
    "shift_start": "HH:MM",
    "shift_end": "HH:MM",
    "working_days": ["string"]
  }
}
```

---

### POST /technician/jobs/:id/request-reassignment

**Used in:** `handleReassignmentSubmit()` in `TechnicianDashboard.jsx` via `technicianApi.requestReassignment()`  
**Auth:** Bearer token  
**Content-Type:** `application/json`

**Request Payload:**
```json
{
  "reason": "emergency_unavailable | route_overload | vehicle_issue | customer_reschedule | skill_mismatch | safety_issue | time_constraint",
  "notes": "string (optional)"
}
```

**Response Payload:**
```json
{
  "message": "string",
  "reassignment_status": "requested"
}
```

---

## GROUP 4: Admin

---

### GET /admin/service-requests

**Used in:** `useAdminDashboard()` and `useActivityFeed()` hooks via SWR Infinite (30 s poll)  
**Auth:** Bearer token

**Query Parameters:**
```
limit        number   (default: 5 per page)
last_id      number   (cursor for next page, optional)
view         string   (optional filter)
mode         string   ("all" | "finalized" | "pending_hitl")
exclude_e2e  boolean  (true = exclude test/E2E tickets)
```

**Response Payload:**
```json
{
  "data": [
    {
      "id": "number",
      "status": "pending_review | assigned | in_progress | completed",
      "fault_type": "string",
      "severity": "string",
      "final_severity": "string",
      "image_severity": "string",
      "description_severity": "string",
      "confidence": "number",
      "diagnosis_confidence": "number",
      "safety_escalation": "boolean",
      "safety_score": "number",
      "operational_impact": "number",
      "escalation_risk": "number",
      "hitl_triggers": ["string"],
      "ai_review_status": "auto_approved | pending_human_review | reviewed",
      "review_decision": "approve | modify_approve | reject | auto_approved | null",
      "review_notes": "string | null",
      "review_priority": "string",
      "reviewed_at": "ISO8601 | null",
      "assigned_technician": "number | null",
      "assigned_technician_name": "string | null",
      "priority": "string",
      "created_at": "ISO8601",
      "customer_name": "string",
      "final_reasoning": "string",
      "diagnosis_reason": "string",
      "diagnosis_payload": {
        "hitl_trigger_details": [
          { "type": "string", "reason": "string", "severity": "string" }
        ]
      },
      "technician_name": "string | null"
    }
  ],
  "last_id": "number | null",
  "has_more": "boolean",
  "total_visible": "number"
}
```

---

### GET /admin/pending-hitl

**Used in:** `usePendingHitl()` hook, `useActivityFeed()` via SWR (30 s poll)  
**Auth:** Bearer token

**Request Payload:** None

**Response Payload:**
```json
[
  {
    "id": "number",
    "fault_type": "string",
    "severity": "string",
    "final_severity": "string",
    "status": "string",
    "ai_review_status": "pending_human_review",
    "review_priority": "string",
    "hitl_triggers": ["string"],
    "...": "same fields as service-requests list"
  }
]
```

---

### GET /admin/kpis

**Used in:** `useAdminDashboard()` and `useActivityFeed()` via SWR (30 s poll)  
**Auth:** Bearer token

**Query Parameters:**
```
exclude_e2e  boolean  (optional)
```

**Response Payload:**
```json
{
  "total": "number",
  "pending_hitl": "number",
  "approved": "number",
  "rejected": "number",
  "operational": "number"
}
```

---

### GET /admin/service-requests/:id

**Used in:** `useDetailModal.open(id)` via `adminApi.getServiceRequestById()`  
**Auth:** Bearer token

**Request Payload:** None (ID in URL path)

**Response Payload:** Single request object — same shape as individual entry from `GET /admin/service-requests`

---

### GET /admin/service-requests/:id/image

**Used in:** `useDetailModal.open(id)` via `adminApi.getServiceRequestImageBlob()`  
**Auth:** Bearer token  
**Response Type:** `blob`

**Request Payload:** None (ID in URL path)

**Response Payload:** Binary image data (JPEG/PNG/WEBP)

---

### POST /admin/service-requests/:id/review

**Used in:** `handleApprove()`, `handleModifyApprove()`, `handleReject()` in `AdminActivityPage.jsx` via `adminApi.reviewServiceRequest()`  
**Auth:** Bearer token  
**Content-Type:** `application/json`

**Request Payload (Approve):**
```json
{
  "decision": "approve",
  "notes": "string"
}
```

**Request Payload (Modify & Approve):**
```json
{
  "decision": "modify_approve",
  "final_severity": "low | medium | high | critical",
  "final_fault_type": "string (optional)",
  "notes": "string"
}
```

**Request Payload (Reject):**
```json
{
  "decision": "reject",
  "notes": "string (required)"
}
```

**Response Payload:**
```json
{
  "message": "string",
  "status": "string",
  "assigned_technician": "string | null"
}
```

**Notes:** `approve` and `modify_approve` trigger backend auto-dispatch. `reject` closes the ticket with no dispatch.

---

### GET /admin/technicians

**Used in:** `adminApi.getTechnicians()` (defined in `api.js`, not wired to current UI)  
**Auth:** Bearer token

**Request Payload:** None

**Response Payload:**
```json
[
  {
    "id": "number",
    "name": "string",
    "code": "string",
    "domain": "string",
    "zone": "string",
    "availability": "string",
    "skills": ["string"],
    "current_jobs": "number",
    "max_jobs_per_day": "number"
  }
]
```

---

### POST /admin/dispatch

**Used in:** `adminApi.dispatch()` (defined in `api.js`, not wired to current UI — dispatch is server-side after review approval)  
**Auth:** Bearer token  
**Content-Type:** `application/json`

**Request Payload:**
```json
{
  "request_id": "number",
  "technician_id": "number"
}
```

**Response Payload:**
```json
{
  "message": "string",
  "job_id": "number",
  "technician": "string"
}
```

---

### GET /admin/reassignment-activity

**Used in:** `useReassignmentActivity()` hook via SWR (30 s poll)  
**Auth:** Bearer token

**Query Parameters:**
```
limit       number   (default: 50)
event_type  string   (optional filter by event type)
```

**Response Payload:**
```json
{
  "events": [
    {
      "request_id": "number",
      "event_type": "string",
      "status": "requested | processing | completed | rejected | failed",
      "status_display": "string",
      "reason": "string",
      "notes": "string | null",
      "previous_technician": "number | null",
      "previous_technician_id": "number | null",
      "previous_technician_name": "string | null",
      "new_technician": "number | null",
      "new_technician_id": "number | null",
      "new_technician_name": "string | null",
      "timestamp": "ISO8601",
      "sla_impact": {
        "approval_delay_minutes": "number | null",
        "processing_duration_minutes": "number | null",
        "reassignment_duration_minutes": "number | null",
        "time_to_reassignment_minutes": "number | null"
      },
      "request": {
        "customer_name": "string",
        "assigned_technician": "number | null",
        "assigned_technician_name": "string | null",
        "reassignment_reason": "string",
        "reassignment_notes": "string",
        "reassignment_requested": "boolean"
      }
    }
  ],
  "count": "number",
  "summary": {
    "total_events": "number",
    "by_status": {
      "requested": "number",
      "processing": "number",
      "completed": "number",
      "rejected": "number",
      "failed": "number"
    },
    "by_type": {
      "reassignment_requested": "number",
      "reassignment_processing": "number",
      "reassignment_completed": "number",
      "reassignment_rejected": "number",
      "reassignment_failed": "number"
    }
  }
}
```

---

### POST /admin/service-requests/:id/reassignment-decision

**Used in:** `handleReassignmentDecision()` in `AdminActivityPage.jsx` via `adminApi.decideReassignment()`  
**Auth:** Bearer token  
**Content-Type:** `application/json`

**Request Payload:**
```json
{
  "decision": "approve | reject",
  "notes": "string (optional)"
}
```

**Response Payload:**
```json
{
  "message": "string",
  "status": "string"
}
```

---

## GROUP 5: AI

---

### POST /diagnose

**Used in:** `diagnoseFault(formData)` exported from `api.js` (used in customer pre-submission flow)  
**Auth:** Bearer token  
**Content-Type:** `multipart/form-data`

**Request Payload (FormData fields):**
```
image             File     (photo of the issue)
issue_description string   (problem description)
location          string   (optional)
```

**Response Payload:**
```json
{
  "fault_type": "string | INVALID_IMAGE",
  "severity": "low | medium | high | critical",
  "image_severity": "string",
  "description_severity": "string",
  "final_severity": "string",
  "confidence": "number (0.0–1.0)",
  "domain": "string",
  "image_reasoning": "string",
  "description_reasoning": "string",
  "final_reasoning": "string",
  "requires_human_review": "boolean",
  "review_priority": "normal | high | critical",
  "hitl_triggers": ["LOW_CONFIDENCE | INVALID_IMAGE | UNLISTED_FAULT | CRITICAL_REQUIRES_VERIFICATION | SAFETY_ESCALATION"],
  "recommended_technician": "string | null",
  "correction_applied": "boolean",
  "original_fault_type": "string | null",
  "safety_escalation": "boolean",
  "safety_score": "number (0–5)",
  "operational_impact": "number (0–5)",
  "escalation_risk": "number (0–5)",
  "detected_keywords": ["string"],
  "detected_elements": "string | null",
  "rejection_reason": "string | null"
}
```

**Notes:** When `fault_type === 'INVALID_IMAGE'`, the image was rejected as non-maintenance content. `DiagnosisResult.jsx` renders a special rejection screen in this case.

---

### POST /reports/previsit  *(Raw fetch)*

**Used in:** `handlePrevisitReport()` in `TechnicianDashboard.jsx`  
**Auth:** Bearer token (read directly from `sessionStorage`)  
**Content-Type:** `application/json`  
**Timeout:** 18,000 ms (AbortController)  
**Retries:** Up to 2 attempts, 1 s delay between

**Request Payload:**
```json
{
  "job_id": "number"
}
```

**Response Payload:**
```json
{
  "report_text": "string (plain text, multi-section AI output)",
  "file_name": "string (e.g. previsit_job_42.txt)"
}
```

**Notes:** AI generates a pre-visit briefing covering: issue summary, recommended tools, safety precautions, suggested steps. Plain text is parsed into sections client-side via `parseSections()`. Result is cached in a `Map` ref per `jobId` for offline fallback.

---

### POST /reports/improve  *(Raw fetch)*

**Used in:** `handleImproveWithAI()` in `TechnicianDashboard.jsx`  
**Auth:** Bearer token (read directly from `sessionStorage`)  
**Content-Type:** `application/json`  
**Timeout:** 8,000 ms (AbortController)

**Request Payload:**
```json
{
  "text": "string (field text to improve, min 10 chars)"
}
```

**Response Payload:**
```json
{
  "improved_text": "string"
}
```

**Notes:** Used on report form fields: `issue_observed`, `root_cause`, `work_done`. Frontend validates the improved text: must not be empty, must be ≥ 80% of original length, must be semantically related (token overlap check). Falls back to original text if validation fails.

---

### POST /reports/generate  *(Defined, not used in current UI)*

**Used in:** `technicianApi.generateReport(jobId)` (defined in `api.js`, no UI call found)  
**Auth:** Bearer token  
**Content-Type:** `application/json`

**Request Payload:**
```json
{
  "job_id": "number"
}
```

**Response Payload:**
```json
{
  "report": { "...": "generated report fields" }
}
```

---

## GPS Session Endpoints  *(Mobile QR Location Flow)*

These endpoints are part of a separate GPS session relay system used when customers cannot use device GPS directly. A QR code is generated and scanned on a mobile phone.

---

### POST /api/gps/session/new

**Used in:** `createGpsSession()` in `LocationInput.jsx`  
**Auth:** None (no auth header sent)  
**Content-Type:** None

**Request Payload:** None

**Response Payload:**
```json
{
  "session_id": "string (UUID)",
  "poll_interval_seconds": "number (default: 2)",
  "expires_in_seconds": "number (default: 120)"
}
```

**Notes:** The `session_id` is encoded into a QR code URL: `{VITE_PUBLIC_BASE_URL}/mobile-gps?session_id=<id>`. The customer scans the QR with their mobile device.

---

### GET /api/gps/session/:sessionId

**Used in:** `getSessionLocation()` polling loop in `LocationInput.jsx`  
**Auth:** None

**Request Payload:** None (session ID in URL path)

**Response Payload (location received):**
```json
{
  "available": true,
  "lat": "number",
  "lng": "number",
  "accuracy": "number (meters)"
}
```

**Response Payload (not yet received):**
```json
{
  "available": false,
  "status": "waiting"
}
```

**Response Payload (expired):**
```json
{
  "available": false,
  "status": "expired_or_missing"
}
```

---

### POST /api/gps/update

**Used in:** `MobileGPSPage.jsx` (the mobile page opened by QR scan)  
**Auth:** None  
**Content-Type:** `application/json`  
**Timeout:** 8,000 ms (AbortController)

**Request Payload:**
```json
{
  "session_id": "string (UUID from QR query param)",
  "lat": "number",
  "lng": "number"
}
```

**Response Payload:**
```json
{
  "status": "ok"
}
```

**Notes:** The mobile page (`/mobile-gps?session_id=...`) runs `navigator.geolocation.getCurrentPosition()` and immediately POSTs the result. The `LocationInput.jsx` polling loop picks it up via `GET /api/gps/session/:id`.

---

### GET /location/reverse

**Used in:** `reverseGeocode()` in `LocationInput.jsx`  
**Auth:** None  
**Timeout:** 5,000 ms (AbortController)

**Query Parameters:**
```
lat  number
lng  number
```

**Response Payload:**
```json
{
  "formatted": "string (human-readable address)"
}
```

**Notes:** Converts raw GPS coordinates to a human-readable address string for display in the location input field.

---

## Summary Table

| Group | # Endpoints | Auth Required | Real-time |
|---|---|---|---|
| Authentication | 3 | No | No |
| Customer | 5 + 1 SSE | Yes (SSE via query param) | SSE stream |
| Technician | 13 | Yes | watchPosition push |
| Admin | 9 | Yes | No |
| AI | 3 | Yes | No |
| GPS Session | 4 | No | Polling (2 s) |
| **Total** | **38** | — | — |

### Transport Types Used

| Transport | Endpoints | Library |
|---|---|---|
| Axios + Bearer header | 27 endpoints | `axios` instance in `api.js` |
| Raw `fetch` + Bearer header | 4 endpoints | Native `fetch` with `AbortController` |
| Server-Sent Events (SSE) | 1 endpoint | `EventSource` |
| Raw `fetch` — no auth | 4 endpoints | Native `fetch` |
| `navigator.geolocation.watchPosition` | Live GPS push | Browser API |
