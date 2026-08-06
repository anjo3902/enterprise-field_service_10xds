# Convert React Web Technician Final Report Workflow to React Native

This plan details the conversion of the complex technician report workflow from React Web to a dedicated React Native screen, including AI integration, photo uploads, and form validation.

## Proposed Changes

### API Layer
We will add the following missing endpoints to `field_service_mobile/src/api/technician.ts`:
- `improveReportText(text: string)` -> `POST /reports/improve`
- `uploadReportPhoto(jobId: number, kind: string, uri: string, type: string, name: string)` -> `POST /technician/report-photo-upload`
- `submitReport(payload: ReportPayload)` -> `POST /technician/submit-report`
- `getReport(jobId: number)` -> `GET /technician/report/${jobId}`

### Types
We will update `field_service_mobile/src/types/navigation.ts` to expose the new `ReportWorkflow` route and add necessary types for the Report payload and responses.

### Navigation
We will integrate `ReportWorkflowScreen` into the navigation tree. Currently, `TechnicianNavigator` mounts `JobListScreen` directly on the "Jobs" tab. We will wrap the Jobs tab in a `TechnicianJobsStack` (or add it directly to the Root stack if simpler) to allow pushing the `ReportWorkflowScreen` over the job list, preserving tab-based context.

### Screens
#### [NEW] `field_service_mobile/src/screens/technician/ReportWorkflowScreen.tsx`
This will be a comprehensive screen replicating the modal states of the web dashboard:
- **Form State**: 
  - Fields: Issue Observed, Root Cause, Work Done, Parts Used, Time Taken, Customer Comments, Notes.
  - Materials Used dynamic array (add/remove rows).
  - Photo picker for "Before" and "After" photos using `expo-image-picker`.
- **AI Improve**: A button next to relevant fields (like Issue Observed) to call the `/reports/improve` endpoint and safely replace text.
- **Validation**: Strict client-side validation mirroring `validateAndNormalizeReport` (minimum characters, valid time taken, complete material rows).
- **Submission**: Uploads photos to `/technician/report-photo-upload`, then posts the final JSON to `/technician/submit-report`. Handles timeout and abort controllers.
- **View State**: If a job already has `report_submitted = true`, it fetches and displays the completed report data instead of the form.

#### [MODIFY] `field_service_mobile/src/screens/technician/JobListScreen.tsx`
Update `handleSubmitReport` and any "View Report" actions to navigate to `ReportWorkflowScreen` with the corresponding `jobId`.

## Open Questions

1. **Navigation Structure**: The `TechnicianNavigator` currently mounts `JobListScreen` directly. I plan to introduce a `TechnicianJobsStack` to contain `JobListScreen` and `ReportWorkflowScreen` so the tab bar remains visible, or alternatively push `ReportWorkflowScreen` globally. I'll use `TechnicianJobsStack` for best UX unless instructed otherwise.

## Verification Plan
- Build and run the app.
- Open the Technician Jobs tab.
- Click "Submit Report" on a completed job.
- Test "AI Improve" with sample text.
- Test Photo uploads.
- Submit the report and verify success notification and UI update.
- Click "View Report" on a submitted job and verify the readonly data is displayed accurately.
