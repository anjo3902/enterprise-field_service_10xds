/* ────────────────────────────────────────────────────────────
 * Technician API — mirrors technicianApi from
 * frontend_react/src/services/api.js
 *
 * Phase 3 (JobListScreen) + Phase 4 (RouteMapScreen) additions.
 * ──────────────────────────────────────────────────────────── */

import client from './client';

// ─── Types ──────────────────────────────────────────────────

export interface TechJob {
  id: number;
  status: string;
  fault_type?: string;
  severity?: string;
  final_severity?: string;
  priority?: string;
  review_priority?: string;
  location_text?: string;
  location_zone?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  contact_number?: string;
  customer_name?: string;
  customer_email?: string;
  // AI diagnosis fields
  image_severity?: string;
  description_severity?: string;
  confidence?: number | null;
  diagnosis_confidence?: number | null;
  safety_escalation?: boolean;
  safety_score?: number | null;
  operational_impact?: number | null;
  escalation_risk?: number | null;
  diagnosis_reason?: string;
  hitl_triggers?: unknown[];
  // Issue / description
  issue_description?: string;
  description?: string;
  // Date fields
  created_at?: string;
  completed_at?: string;
  // Reassignment
  is_locked?: boolean;
  reassignment_requested?: boolean;
  reassignment_status?: string;
  // Report
  report_submitted?: boolean;
}

export interface ReassignmentPayload {
  reason: string;
  notes?: string;
}

export interface UpdateSkillsPayload {
  skills: string[];
  certified_skills: string[];
  certifications: string[];
}

export interface UpdateSkillsResult {
  skills?: string[] | string;
  certified_skills?: string[] | string;
  certifications?: string[] | string;
  message?: string;
}

export interface UpdateSchedulePayload {
  shift_start: string;
  shift_end: string;
  working_days: string[];
}

export interface UpdateScheduleResult {
  shift_start?: string;
  shift_end?: string;
  working_days?: string[] | string;
  message?: string;
}

export interface PrevisitBriefingResult {
  /** Raw AI-generated text, split into sections by parseSections() */
  report_text?: string;
  /** Suggested filename for share/copy — e.g. "previsit_job_42.txt" */
  file_name?: string;
}


export interface LiveLocationPayload {
  latitude: number;
  longitude: number;
  accuracy_m?: number | null;
  heading?: number | null;
  speed_mps?: number | null;
  timestamp: string;
}

export interface LinkProfileResult {
  technician_code: string;
  technician_name: string;
}

export interface RouteData {
  route_order: number[];
  technician_location?: { latitude: number; longitude: number } | null;
  [key: string]: unknown;
}

export interface TechnicianProfile {
  id?: number;
  name?: string;
  technician_code?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  current_latitude?: number | string | null;
  current_longitude?: number | string | null;
  phone_number?: string;
  zone?: string;
  skills?: string[];
  // ── Profile section fields ──────────────────────────────
  technician_name?: string;
  primary_domain?: string;
  experience_level?: string;
  location_zone?: string;
  critical_fault_eligible?: boolean;
  // ── Work Status fields ──────────────────────────────────
  availability_state?: string;
  current_jobs?: number;
  max_jobs_per_day?: number;
  // ── Skills & Certifications fields ──────────────────────
  certified_skills?: string[] | string;
  certifications?: string[] | string;
  // ── Work Schedule fields ────────────────────────────────
  shift_start?: string;
  shift_end?: string;
  working_days?: string[] | string;
  [key: string]: unknown;
}

// ─── API ────────────────────────────────────────────────────

export const technicianApi = {
  /** All assigned jobs — mirrors technicianApi.getAssignedJobs / getJobs */
  async getAssignedJobs(): Promise<{ jobs: TechJob[]; completed_jobs: TechJob[] }> {
    const response = await client.get('/technician/jobs');
    const data = response.data;
    if (Array.isArray(data)) {
      return { jobs: data as TechJob[], completed_jobs: [] };
    }
    return {
      jobs: (data.jobs || []) as TechJob[],
      completed_jobs: (data.completed_jobs || []) as TechJob[],
    };
  },

  /** Start a job — mirrors technicianApi.startJob */
  async startJob(jobId: number | string): Promise<unknown> {
    const response = await client.post(`/technician/jobs/${jobId}/start`);
    return response.data;
  },

  /** Complete a job — mirrors technicianApi.completeJob (with 404 fallback) */
  async completeJob(jobId: number | string): Promise<{ completed_at?: string }> {
    try {
      const response = await client.put(`/technician/jobs/${jobId}/complete`);
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        const fallback = await client.post('/technician/update-status', {
          request_id: jobId,
          status: 'completed',
        });
        return { ...fallback.data, job_id: jobId, status: 'completed' };
      }
      throw error;
    }
  },

  /** Get single job by ID — mirrors technicianApi.getJobById */
  async getJobById(jobId: number | string): Promise<TechJob> {
    const response = await client.get(`/technician/jobs/${jobId}`);
    return response.data as TechJob;
  },

  /** Image URL helper — mirrors technicianApi.getJobImageBlob pattern */
  getJobImageUrl(jobId: number | string): string {
    return `${client.defaults.baseURL}/technician/jobs/${jobId}/image`;
  },

  /**
   * Download the evidence image via authenticated Axios request (Bearer token
   * is injected by the request interceptor) and return a base64 data URI.
   *
   * This mirrors the Web's useDetailModal pattern:
   *   Web:     fetchImageBlob(id) → URL.createObjectURL(blob) → <img src={blobUrl}>
   *   Android: getJobImageBase64(id) → "data:image/jpeg;base64,..." → <Image source={{ uri }}>
   *
   * Returns null if the image is missing (404) or the request fails for any reason.
   */
  async getJobImageBase64(jobId: number | string): Promise<string | null> {
    try {
      const response = await client.get(
        `/technician/jobs/${jobId}/image`,
        { responseType: 'arraybuffer', timeout: 15_000 },
      );
      const contentType: string = response.headers['content-type'] || 'image/jpeg';
      const bytes = new Uint8Array(response.data as ArrayBuffer);
      
      // SECTION 1: Safe API Verification logging
      console.log(`[IMG_VERIFY_API] jobId=${jobId} status=${response.status} content-type=${contentType} byte-count=${bytes.byteLength}`);

      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      return `data:${contentType};base64,${base64}`;
    } catch {
      console.log(`[IMG_VERIFY_API] jobId=${jobId} FETCH FAILED`);
      return null;
    }
  },

  /** Optimised route — mirrors technicianApi.getMyRoute */
  async getMyRoute(): Promise<RouteData> {
    const response = await client.get('/technician/my-route');
    return (response.data || { route_order: [] }) as RouteData;
  },

  /** Request reassignment — mirrors technicianApi.requestReassignment */
  async requestReassignment(
    jobId: number | string,
    payload: ReassignmentPayload,
  ): Promise<unknown> {
    const response = await client.post(
      `/technician/jobs/${jobId}/request-reassignment`,
      payload,
    );
    return response.data;
  },

  /** Link technician profile — mirrors technicianApi.linkProfile */
  async linkProfile(payload: { technician_code: string }): Promise<LinkProfileResult> {
    const response = await client.post('/technician/link-profile', payload);
    return response.data as LinkProfileResult;
  },

  /** Live location update — mirrors technicianApi.updateLiveLocation */
  async updateLiveLocation(
    jobId: number | string,
    payload: LiveLocationPayload,
  ): Promise<unknown> {
    const response = await client.post(
      `/technician/jobs/${jobId}/live-location`,
      payload,
    );
    return response.data;
  },

  /** Fetch technician profile — mirrors technicianApi.getProfile */
  async getProfile(): Promise<TechnicianProfile> {
    const response = await client.get('/technician/profile');
    return response.data as TechnicianProfile;
  },

  /** Generate AI previsit briefing — mirrors technicianApi.generatePrevisitReport
   *  Endpoint: POST /reports/previsit  { job_id }
   *  Uses 60-second timeout (LLM endpoint) matching web's LLM_TIMEOUT_MS. */
  async generatePrevisitReport(
    jobId: number | string,
    signal?: AbortSignal
  ): Promise<PrevisitBriefingResult> {

    const payload = {
      job_id: String(jobId),
    };

    console.log('--- DEBUG PREVISIT API ---');
    console.log('jobId:', jobId);
    console.log('payload:', payload);
    console.log('typeof payload.job_id:', typeof payload.job_id);

    try {
      const response = await client.post(
        '/reports/previsit',
        payload,
        {
          timeout: 60_000,
          signal,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Response status:', response.status);
      console.log('Response data:', response.data);

      return response.data as PrevisitBriefingResult;

    } catch (error: any) {
      console.log('API Error:', error.message);

      if (error.response) {
        console.log('Error status:', error.response.status);
        console.log('Error data:', error.response.data);
      }

      throw error;
    }
  },



  /** Update skills & certifications — mirrors technicianApi.updateSkills */
  async updateSkills(payload: UpdateSkillsPayload): Promise<UpdateSkillsResult> {
    const response = await client.put('/technician/update-skills', payload);
    return response.data as UpdateSkillsResult;
  },

  /** Update work schedule — mirrors technicianApi.updateSchedule */
  async updateSchedule(payload: UpdateSchedulePayload): Promise<UpdateScheduleResult> {
    const response = await client.put('/technician/update-schedule', payload);
    return response.data as UpdateScheduleResult;
  },

  /** Get Final Report — mirrors technicianApi.getReport */
  async getReport(jobId: number | string, config?: any): Promise<any> {
    const response = await client.get(`/technician/report/${jobId}`, config);
    return response.data;
  },

  /** Improve Report Text with AI — mirrors technicianApi.improveReportText */
  async improveReportText(text: string): Promise<{ improved_text: string }> {
    const response = await client.post('/reports/improve', { text });
    return response.data;
  },

  /** Upload Report Photo — mirrors technicianApi.uploadReportPhoto */
  async uploadReportPhoto(formData: FormData): Promise<{ url: string }> {
    const response = await client.post('/technician/report-photo-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /** Submit Final Report — mirrors technicianApi.submitReport */
  async submitReport(payload: any): Promise<any> {
    const response = await client.post('/technician/submit-report', payload);
    return response.data;
  },
};

