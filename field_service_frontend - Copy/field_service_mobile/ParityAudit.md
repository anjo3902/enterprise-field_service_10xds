# React Web → React Native Final Parity Audit

## Customer Flow

| Feature | Web Screen | Mobile Screen | Status |
|---|---|---|---|
| Customer Authentication | `LoginPage.jsx`, `SignupPage.jsx` | `LoginScreen.tsx`, `SignupScreen.tsx` | Implemented |
| View Service Requests | `CustomerDashboard.jsx` | `CustomerDashboardScreen.tsx` | Implemented |
| Create Service Request | `Dashboard.jsx` | `NewRequestScreen.tsx` | Implemented |
| Request Details Modal | `CustomerDashboard.jsx` | `CustomerDashboardScreen.tsx` | Implemented |
| Request Evidence Image | `CustomerDashboard.jsx` | `CustomerDashboardScreen.tsx` | Implemented |
| Live Tracking Banner | `CustomerDashboard.jsx` | `CustomerDashboardScreen.tsx` | Implemented |
| **Live Tracking Hook/WebSockets** | `hooks/useLiveTracking.js` | N/A | **Missing** |

### Partially Implemented / Missing Features

#### 1. Customer Live Tracking (SSE/WebSockets)
- **Source file**: `frontend_react/src/hooks/useLiveTracking.js`, `frontend_react/src/components/LiveTrackingPanel.jsx`
- **Mobile file**: `field_service_mobile/src/screens/customer/CustomerDashboardScreen.tsx`
- **Missing functionality**: Live technician location on a map, ETA countdown, real-time status updates, active polling. Mobile currently only shows a static banner with the current status from the standard API.
- **Missing API call**: Live connection to SSE endpoint `/customer/jobs/{jobId}/live`
- **Missing workflow**: Real-time map updates when a technician is en route to the customer location.

---

## Admin Flow

| Feature | Web Screen | Mobile Screen | Status |
|---|---|---|---|
| Admin Authentication | `LoginPage.jsx` | `LoginScreen.tsx` | Implemented |
| Operations Dashboard | `AdminDashboard.jsx` | `OperationsDashboardScreen.tsx` | Implemented |
| Activity Feed (HITL) | `AdminActivityPage.jsx` | `ActivityFeedScreen.tsx` | Implemented |
| Request Detail Modal | `AdminDashboard.jsx`, `AdminActivityPage.jsx` | `OperationsDashboardScreen.tsx`, `ActivityFeedScreen.tsx` | Implemented |
| KPI Cards | `AdminDashboard.jsx` | `OperationsDashboardScreen.tsx` | Implemented |
| Approvals & Reassignment | `AdminActivityPage.jsx` | `ActivityFeedScreen.tsx` | Implemented |

---

## Technician Flow

| Feature | Web Screen | Mobile Screen | Status |
|---|---|---|---|
| Technician Authentication | `LoginPage.jsx` | `LoginScreen.tsx` | Implemented |
| Assigned Jobs List | `TechnicianDashboard.jsx` | `JobListScreen.tsx` | Implemented |
| Job Start/Complete/Reassign | `TechnicianDashboard.jsx` | `JobListScreen.tsx` | Implemented |
| Job Detail Modal | `TechnicianDashboard.jsx` | `JobListScreen.tsx` | Implemented |
| Technician Profile | `TechnicianProfilePage.jsx` | `ProfileScreen.tsx` | Implemented |
| Route Map View | `RouteMap.jsx` | `RouteMapScreen.tsx` | Implemented |
| **Technician Previsit Briefing** | `TechnicianDashboard.jsx` | N/A | **Missing** |
| **Technician AI Diagnosis/Report** | `TechnicianDashboard.jsx` | N/A | **Missing** |

### Partially Implemented / Missing Features

#### 1. Technician Previsit Briefing (LLM)
- **Source file**: `frontend_react/src/pages/technician/TechnicianDashboard.jsx`
- **Mobile file**: `field_service_mobile/src/screens/technician/JobListScreen.tsx`
- **Missing functionality**: The ability to request an AI-generated previsit briefing for a specific job.
- **Missing API call**: `technicianApi.generatePrevisitReport(jobId)` (`POST /reports/previsit`)
- **Missing workflow**: Clicking a "Briefing" button on a job card, showing a loading state (which can take up to 60s), and displaying the LLM-generated briefing in a modal or new screen.

#### 2. Technician Final Report & AI Improvement
- **Source file**: `frontend_react/src/pages/technician/TechnicianDashboard.jsx`
- **Mobile file**: `field_service_mobile/src/screens/technician/JobListScreen.tsx`
- **Missing functionality**: Form to submit the final job report (issue observed, root cause, work done, parts used, time taken, etc.), ability to ask AI to improve descriptions, upload before/after photos, and view completed reports.
- **Missing API call**: `technicianApi.generateReport(jobId)` (`POST /reports/generate`) and `/reports/improve`.
- **Missing workflow**: The completed job "Submit Report" button currently shows a placeholder alert. It needs a full form, photo upload, and LLM improvement integration.
