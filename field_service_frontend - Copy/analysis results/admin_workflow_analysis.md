# Admin Workflow Analysis

> **Read-only analysis. No code was modified.**

---

## Workflow Trace

```
Admin Login
  → Admin Dashboard             (AdminDashboard.jsx)
      → View Request Detail     (useDetailModal → Modal)
      → Operations Ticket List  (SWR paginated table)
      → KPI Cards               (SWR: /admin/kpis)

  → Activity Feed               (AdminActivityPage.jsx)
      → Pending HITL Queue      (pending review items)
          → View Detail         (ActivityDetailModal)
          → Approve             (POST /admin/service-requests/:id/review)
          → Modify & Approve    (ModifyApproveModal → POST review)
          → Reject              (RejectModal → POST review)
      → Finalized Requests      (SWR infinite scroll)
      → Reassignment Activity   (useReassignmentActivity)
          → Approve Reassign    (POST /admin/service-requests/:id/reassignment-decision)
          → Reject Reassign     (POST /admin/service-requests/:id/reassignment-decision)
```

---

## Step 1: Admin Login

### Components
- **Page:** `src/pages/auth/LoginPage.jsx`
- **Route:** `/login`

### API
| Method | Endpoint | Payload |
|---|---|---|
| `POST` | `/auth/login` | `{ email, password }` |

### Data Flow
```
LoginPage mounts
  → form submit: authApi.login({ email, password })
  → on success: reads user.role
  → role === 'admin' → navigate('/admin')
  → setAuthToken(token) → sessionStorage.setItem('fsm_token', token)
  → setStoredUser(user) → sessionStorage.setItem('fsm_user', JSON.stringify(user))
```

---

## Step 2: Admin Dashboard

### Components
| Component | File | Role |
|---|---|---|
| `AdminDashboard` | `pages/admin/AdminDashboard.jsx` | Page container |
| `Card` | `components/Card.jsx` | Layout wrapper |
| `Table` | `components/Table.jsx` | Ticket list renderer |
| `Modal` | `components/Modal.jsx` | Detail overlay |
| `StatusBadge` | `components/StatusBadge.jsx` | Status/priority chip rendering |
| `TriggerBadgeList` | `components/TriggerBadge.jsx` | HITL trigger rendering in detail modal |
| `Skeleton` | `components/Skeleton.jsx` | Loading placeholder |
| `LoadingState` | `components/LoadingState.jsx` | Modal loading indicator |
| `SeverityComparison` | `components/SeverityComparison.jsx` | AI vs final severity diff display |

### API
| Method | Endpoint | Hook | Interval | Purpose |
|---|---|---|---|---|
| `GET` | `/admin/service-requests?mode=finalized&exclude_e2e=true&limit=5` | `useAdminDashboard` (SWR infinite) | 30 s | Paginated ticket list |
| `GET` | `/admin/kpis?exclude_e2e=true` | `useAdminDashboard` (SWR) | 30 s | KPI counts |
| `GET` | `/admin/service-requests/:id` | `useDetailModal.open(id)` | On click | Single ticket detail |
| `GET` | `/admin/service-requests/:id/image` | `useDetailModal.open(id)` | On click | Ticket evidence image (blob) |

### Data Flow
```
AdminDashboard mounts
  │
  ├─ useAdminDashboard() [hook: useData.js]
  │     ├─ SWR infinite: GET /admin/service-requests
  │     │     params: { mode:'finalized', exclude_e2e:true, limit:5 }
  │     │     response: { data:[...tickets], last_id, has_more }
  │     │     cursor-based pagination: last_id drives next page
  │     │
  │     └─ SWR: GET /admin/kpis?exclude_e2e=true
  │           response: { total, pending_hitl, approved, rejected }
  │
  ├─ Derived state (useMemo):
  │     operationsItems = tickets.filter(status !== 'pending_review')
  │     pendingReviewItems = tickets.filter(status === 'pending_review')
  │
  ├─ KPI Cards render:
  │     Operational Queue = kpis.total - kpis.pending_hitl
  │     Pending HITL      = kpis.pending_hitl
  │     Total Requests    = kpis.total
  │
  ├─ Operations Table: shows operationsItems
  │     columns: Ticket ID, Priority, Severity, Technician, Created At, Status, [View Details]
  │
  ├─ "View Details" click → detail.open(rowId)
  │     → GET /admin/service-requests/:id  (Axios, bearer auth)
  │     → GET /admin/service-requests/:id/image  (Axios, responseType:'blob')
  │     → imageUrl = URL.createObjectURL(blob)
  │     → opens Modal with:
  │           customer, fault_type, severity, final_severity,
  │           image_severity, description_severity, confidence,
  │           safety_escalation, assigned_technician,
  │           issue_description, AI reasoning, HITL triggers
  │
  └─ "Load More" → setSize(n+1) triggers SWR infinite to fetch next page
```

---

## Step 3: Request Review (Activity Feed)

### Components
| Component | File | Role |
|---|---|---|
| `AdminActivityPage` | `pages/admin/AdminActivityPage.jsx` | Page container |
| `ActivityDetailModal` | `pages/admin/components/ActivityDetailModal.jsx` | Full detail + action buttons |
| `ModifyApproveModal` | `pages/admin/components/ModifyApproveModal.jsx` | Override severity + approve |
| `RejectModal` | `pages/admin/components/RejectModal.jsx` | Reject with mandatory notes |
| `ReviewDetailsModal` | `pages/admin/components/ReviewDetailsModal.jsx` | Read-only review notes popup |
| `SimpleTable` | inline in `AdminActivityPage.jsx` | Custom table (sticky header, responsive) |
| `TriggerBadgeList` | `components/TriggerBadge.jsx` | Compact HITL trigger chips in table |
| `TriggerBadgeStateful` | `components/TriggerBadge.jsx` | Expanded trigger detail in modal |
| `SeverityComparison` | `components/SeverityComparison.jsx` | AI severity vs final severity diff |
| `ReviewBadge` | `components/ReviewBadge.jsx` | Review decision status chip |
| `StatusBadge` | `components/StatusBadge.jsx` | Status chip in all columns |

### API
| Method | Endpoint | Hook / Handler | Interval | Purpose |
|---|---|---|---|---|
| `GET` | `/admin/service-requests?mode=finalized&limit=5` | `useActivityFeed` (SWR infinite) | 30 s | Finalized request list |
| `GET` | `/admin/pending-hitl` | `useActivityFeed` → internal `useAdminTickets(mode:'pending_hitl')` | 30 s | Pending HITL queue |
| `GET` | `/admin/kpis` | `useActivityFeed` (SWR) | 30 s | KPI totals (approved, rejected counts) |
| `GET` | `/admin/service-requests/:id` | `detailModal.open(id)` | On click | Single ticket detail |
| `GET` | `/admin/service-requests/:id/image` | `detailModal.open(id)` | On click | Evidence image (blob) |
| `POST` | `/admin/service-requests/:id/review` | `handleApprove` / `handleModifyApprove` / `handleReject` | On action | Submit HITL review decision |
| `GET` | `/admin/reassignment-activity?limit=50` | `useReassignmentActivity` (SWR) | 30 s | Reassignment event log |
| `POST` | `/admin/service-requests/:id/reassignment-decision` | `handleReassignmentDecision` | On action | Approve or reject reassignment request |

### Data Flow — Pending HITL Queue

```
AdminActivityPage mounts
  │
  ├─ useActivityFeed({ finalizedMode:'finalized', excludeE2E:false })
  │     ├─ SWR infinite: GET /admin/service-requests?mode=finalized
  │     │     → finalizedTickets (reviewed items)
  │     ├─ SWR: GET /admin/pending-hitl
  │     │     → pendingItems (awaiting human review)
  │     └─ SWR: GET /admin/kpis
  │           → { total, pending_hitl, approved, rejected }
  │
  ├─ useReassignmentActivity()
  │     └─ SWR: GET /admin/reassignment-activity?limit=50
  │           → { events:[], summary:{ by_status:{...}, by_type:{...} } }
  │
  ├─ Pending HITL Queue table renders pendingItems
  │     Columns: Ticket ID (clickable), Fault Type, AI Severity, Final Severity,
  │              Ops Status, HITL Status, Priority, HITL Triggers, Actions
  │
  │     Action buttons per row (only if isPendingHitl(row)):
  │       ┌─ View Details   → detailModal.open(row.id)
  │       ├─ Approve        → handleApprove(row.id)
  │       ├─ Modify & Approv → setModifyTicket(row)  [opens ModifyApproveModal]
  │       └─ Reject         → setRejectTicket(row)   [opens RejectModal]
  │
  └─ Finalized Requests table renders filteredReviewedItems
        Filter buttons: All | Approved | Rejected
        Columns: Ticket ID, Fault Type, AI Severity, Final Severity,
                 Assigned Technician, Decision, Ops Status, Review Notes,
                 Reviewed At, View Details
```

### Data Flow — Review Decision (Approve / Modify & Approve / Reject)

```
Approve:
  handleApprove(ticketId)
    → POST /admin/service-requests/:id/review
      body: { decision:'approve', notes:'Approved by admin via activity queue' }
    → on success: notification toast → refreshAll() → detailModal.close()

Modify & Approve:
  setModifyTicket(row) → opens ModifyApproveModal
    ModifyApproveModal:
      - User selects final_severity (required: low/medium/high/critical)
      - User optionally edits fault_type
      - User optionally adds admin notes
    → showPopup confirm dialog
    → onConfirm: POST /admin/service-requests/:id/review
        body: { decision:'modify_approve', final_severity, final_fault_type, notes }
    → on success: onClose() → notification toast → refreshAll()

Reject:
  setRejectTicket(row) → opens RejectModal
    RejectModal:
      - User enters mandatory rejection notes
    → POST /admin/service-requests/:id/review
        body: { decision:'reject', notes }
    → on success: notification warning → refreshAll() → detailModal.close()
```

**What the `POST /admin/service-requests/:id/review` response triggers on the backend:**
- For `approve` / `modify_approve`: the backend initiates auto-dispatch (technician assignment)
- For `reject`: the request is closed; no dispatch occurs

---

## Step 4: Dispatch (Auto-dispatch triggered by review approval)

The React frontend does **not** make a separate "dispatch" API call. Dispatch is a backend-triggered side-effect of the review approval. However, the admin has a direct dispatch control in the system:

### API
| Method | Endpoint | Handler | Purpose |
|---|---|---|---|
| `POST` | `/admin/dispatch` | `adminApi.dispatch(payload)` | Direct manual dispatch (defined in `api.js`, available to admin) |

> **Note:** `adminApi.dispatch()` is defined in `src/services/api.js` but **not called** in `AdminDashboard.jsx` or `AdminActivityPage.jsx` in the current UI. Dispatch is entirely server-side after a review approval. The dispatch endpoint exists for programmatic or future UI use.

### Data Flow — Post-Approval Dispatch
```
Admin approves ticket
  → POST /admin/service-requests/:id/review { decision:'approve' }
  → Backend:
      1. Validates review decision
      2. Updates ticket status: pending_review → assigned (or in_progress)
      3. Runs AI-optimized technician matching (matches fault type, zone, availability)
      4. Assigns technician → sets assigned_technician, assigned_technician_name
      5. Calls route optimizer → updates technician's route_order
      6. Response returns success message
  → Frontend:
      refreshAll() → SWR refetches /admin/service-requests + /admin/kpis
      Updated ticket now shows in Operations table with status = assigned
      Technician dashboard sees new job in their SWR-polled /technician/jobs
```

---

## Step 5: Technician Assignment

### Components
- **Visible to admin:** Detail modal shows `assigned_technician_name`, `assigned_technician_zone`, `assigned_technician` ID
- **Source fields:** `formatTechnicianName(row)` + `formatTechnicianSource(row)` (from `utils/formatTechnician.js`)

### API
| Method | Endpoint | Handler | Purpose |
|---|---|---|---|
| `GET` | `/admin/technicians` | `adminApi.getTechnicians()` | Fetch technician list (defined in api.js; available for manual dispatch UI) |
| `POST` | `/admin/service-requests/:id/reassignment-decision` | `handleReassignmentDecision` | Admin approve/reject a technician's reassignment request |

### Data Flow — Reassignment Decision
```
Technician submits reassignment request via their dashboard
  → POST /technician/jobs/:id/request-reassignment { reason, notes }
  → Backend creates reassignment event with status='requested'
  → SWR: GET /admin/reassignment-activity picks it up in next 30s poll

Admin sees it in the "Technician Reassignment Activity" table:
  Row shows: Request ID, Status=requested, Previous Tech, New Tech=Pending, Reason, SLA Impact

Admin actions:
  Approve: handleReassignmentDecision({ requestId, decision:'approve' })
    → POST /admin/service-requests/:requestId/reassignment-decision { decision:'approve' }
    → Backend: re-runs technician matching → assigns new technician → updates route
    → reassignmentMutate() + refreshAll()

  Reject: handleReassignmentDecision({ requestId, decision:'reject' })
    → POST /admin/service-requests/:requestId/reassignment-decision { decision:'reject' }
    → Backend: keeps original technician → marks reassignment_status='rejected'
    → reassignmentMutate() + refreshAll()
```

---

## Full Component Map

### Pages
| File | Route | Description |
|---|---|---|
| `pages/auth/LoginPage.jsx` | `/login` | Auth entry point |
| `pages/admin/AdminDashboard.jsx` | `/admin` | Operations dashboard, ticket list, KPIs |
| `pages/admin/AdminActivityPage.jsx` | `/admin/activity` | HITL review queue + finalized feed + reassignment log |

### Admin Sub-components (in `pages/admin/components/`)
| Component | Triggered by | Purpose |
|---|---|---|
| `ActivityDetailModal.jsx` | "View Details" on any activity row | Full ticket detail + review action buttons (Approve / Modify / Reject) |
| `ModifyApproveModal.jsx` | "Modify & Approve" button | Override AI severity + fault type before approving |
| `RejectModal.jsx` | "Reject" button | Enter mandatory rejection notes |
| `ReviewDetailsModal.jsx` | `ReviewBadge` click | Read-only review decision notes popup |

### Shared Components Used by Admin
| Component | Purpose in Admin |
|---|---|
| `Table.jsx` | Ops dashboard ticket list |
| `Modal.jsx` | Wrapper for all admin modals |
| `StatusBadge.jsx` | Status/priority rendering throughout |
| `TriggerBadge.jsx` / `TriggerBadgeList` / `TriggerBadgeStateful` | HITL trigger display (compact in table, expanded in modal) |
| `SeverityComparison.jsx` | AI vs admin-overridden severity diff |
| `ReviewBadge.jsx` | Review decision chip in modal |
| `DiagnosisResult.jsx` | Not used in admin pages directly; used in customer Dashboard for pre-submission diagnosis display |
| `Skeleton.jsx` | Loading placeholder in dashboard |
| `LoadingState.jsx` | Modal loading state |

---

## Full API Map — Admin Workflow

| Method | Endpoint | Called from | Auth | Cache |
|---|---|---|---|---|
| `POST` | `/auth/login` | `LoginPage` | None | No |
| `GET` | `/admin/service-requests` | `useAdminDashboard`, `useActivityFeed` (SWR infinite) | Bearer | SWR 30 s |
| `GET` | `/admin/pending-hitl` | `useActivityFeed` internal | Bearer | SWR 30 s |
| `GET` | `/admin/kpis` | `useAdminDashboard`, `useActivityFeed` | Bearer | SWR 30 s |
| `GET` | `/admin/service-requests/:id` | `useDetailModal.open` | Bearer | No (one-shot) |
| `GET` | `/admin/service-requests/:id/image` | `useDetailModal.open` | Bearer | No (blob) |
| `POST` | `/admin/service-requests/:id/review` | `handleApprove`, `handleModifyApprove`, `handleReject` | Bearer | No |
| `GET` | `/admin/reassignment-activity` | `useReassignmentActivity` (SWR) | Bearer | SWR 30 s |
| `POST` | `/admin/service-requests/:id/reassignment-decision` | `handleReassignmentDecision` | Bearer | No |
| `GET` | `/admin/technicians` | `adminApi.getTechnicians()` (available, not wired to UI) | Bearer | No |
| `POST` | `/admin/dispatch` | `adminApi.dispatch()` (available, not wired to UI) | Bearer | No |

---

## Data Flow Diagram

```
                          ┌─────────────────────────────────────┐
                          │           ADMIN BROWSER              │
                          └─────────────────────────────────────┘
                                          │
                              POST /auth/login
                                          │
                          ┌──────────────▼──────────────────────┐
                          │   sessionStorage: fsm_token + user   │
                          └──────────────┬──────────────────────┘
                                         │  All subsequent Axios requests
                                         │  add: Authorization: Bearer <token>
                                         │
                    ┌────────────────────┴────────────────────────────┐
                    │                                                  │
             AdminDashboard                                   AdminActivityPage
                    │                                                  │
    ┌───────────────┴──────────────┐              ┌────────────────────┴──────────────┐
    │  useAdminDashboard (SWR)     │              │  useActivityFeed (SWR infinite)   │
    │  GET /admin/service-requests │              │  GET /admin/service-requests       │
    │  GET /admin/kpis             │              │  GET /admin/pending-hitl           │
    │  mode=finalized              │              │  GET /admin/kpis                   │
    │  30 s poll                   │              │  30 s poll                         │
    └──────────┬───────────────────┘              └────────────┬──────────────────────┘
               │                                               │
               │ View Details                                  │
               ▼                                               ▼
    useDetailModal.open(id)                       Pending HITL Queue Table
    GET /admin/service-requests/:id               (pendingItems from /admin/pending-hitl)
    GET /admin/service-requests/:id/image                      │
    URL.createObjectURL(blob) → imageUrl           ┌───────────┴──────────────┐
               │                                   │                          │
               ▼                              Approve                   Modify & Approve
           Admin Modal                             │                     ModifyApproveModal
     (read-only detail view)                       │                          │
                                                   └────────────┬─────────────┘
                                                                │
                                              POST /admin/service-requests/:id/review
                                                    { decision, notes, [final_severity] }
                                                                │
                                                    ┌───────────▼──────────────┐
                                                    │  Backend auto-dispatches  │
                                                    │  → technician assigned    │
                                                    │  → route optimizer runs   │
                                                    └───────────┬──────────────┘
                                                                │
                                                         refreshAll()
                                                    SWR revalidates all caches
                                                    Ticket moves to Finalized table
                                                    Technician sees job in /technician/jobs

                    useReassignmentActivity (SWR 30s)
                    GET /admin/reassignment-activity
                              │
                    Reassignment Activity Table
                              │
                    Admin decides: Approve / Reject
                              │
                    POST /admin/service-requests/:id/reassignment-decision
                              { decision: 'approve' | 'reject' }
                              │
                    Backend: re-matches or keeps technician
```

---

## Key Design Observations

1. **Shared SWR cache across pages:** Both `AdminDashboard` and `AdminActivityPage` use the same SWR cache keys (`admin/service-requests`, `admin/kpis`). Mutations on one page are immediately reflected on the other after the next revalidation.

2. **No manual dispatch UI:** The dispatch API endpoint (`POST /admin/dispatch`) exists in `api.js` but is not wired to any admin UI component. All dispatch is server-side, triggered by review approval.

3. **HITL trigger system:** Tickets with `ai_review_status === 'pending_human_review'` are surfaced in the Pending HITL queue. The `isPendingHitl(row)` utility guards which rows show action buttons. `TriggerBadgeStateful` renders expandable trigger details.

4. **Cursor-based pagination:** The ticket list uses `last_id` for pagination (not offset), with SWR infinite (5 records per page). "Load More" increments the page index.

5. **Optimistic UI:** After review decisions, `refreshAll()` triggers SWR revalidation rather than optimistic cache patching. The UI shows updated state after the next server response.

6. **Review decision outcome:**
   - `approve` → backend auto-dispatches to best available technician
   - `modify_approve` → admin corrects `final_severity` / `fault_type` → backend dispatches
   - `reject` → ticket closed, no dispatch
   - `reassignment-decision:approve` → backend re-runs technician matching for the job
