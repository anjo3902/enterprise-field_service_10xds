import client from './client';

export interface ServiceRequest {
  id: number;
  fault_type: string;
  severity: string;
  location_text: string;
  assigned_technician_name?: string;
  assigned_technician_phone_number?: string;
  assigned_technician_zone?: string;
  assigned_technician_source?: string;
  status: string;
  created_at: string;
  assigned_at?: string;
  distance_km?: number;
  travel_time_min?: number;
  reassignment_requested?: boolean;
  reassignment_status?: string;
  reassignment_result?: string;
  reassignment_reason?: string;
  issue_description?: string;
  latitude?: number;
  longitude?: number;
  assigned_technician_latitude?: number;
  assigned_technician_longitude?: number;
}

/** Mirrors the SSE payload shape from GET /customer/jobs/:id/live */
export interface LiveTrackingData {
  status?: string;
  latitude?: number;
  longitude?: number;
  technician_location?: { lat: number; lng: number };
  customer_location?: { lat: number; lng: number };
  assigned_technician_name?: string;
  assigned_technician_phone_number?: string;
  assigned_technician_zone?: string;
  reassignment_requested?: boolean;
  reassignment_status?: string;
  reassignment_result?: string;
  eta_minutes?: number;
  distance_km?: number;
  speed_kmh?: number;
  accuracy_m?: number;
  heading?: number;
  updated_at?: string;
  timestamp?: string;
}

export const customerApi = {
  async getMyRequests(): Promise<ServiceRequest[]> {
    const response = await client.get('/customer/my-requests');

    console.log('MY REQUESTS RESPONSE:', response.data);

    const data = response.data;

    if (Array.isArray(data)) {
      return data;
    }

    const keys = ['items', 'results', 'jobs', 'requests', 'data'];

    for (const k of keys) {
      if (data && Array.isArray(data[k])) {
        return data[k];
      }
    }

    return [];
  },

  async getMyRequestById(
    requestId: string | number
  ): Promise<ServiceRequest> {
    const response = await client.get(
      `/customer/my-requests/${requestId}`
    );

    return response.data;
  },

  async getMyRequestImageBase64(requestId: string | number): Promise<string | null> {
    try {
      const response = await client.get(
        `/customer/my-requests/${requestId}/image`,
        { responseType: 'arraybuffer', timeout: 15_000 },
      );
      const contentType: string = response.headers['content-type'] || 'image/jpeg';
      const bytes = new Uint8Array(response.data as ArrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      return `data:${contentType};base64,${base64}`;
    } catch {
      return null;
    }
  },

  async reportIssue(formData: FormData): Promise<{ request_id: number }> {
    const response = await client.post(
      '/customer/report-issue',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    console.log('REPORT ISSUE SUCCESS STATUS:', response.status);
    console.log('REPORT ISSUE SUCCESS DATA:', response.data);
    console.log('REPORT ISSUE SUCCESS HEADERS:', response.headers);

    return response.data;
  },

  /**
   * Poll live tracking data for a customer job.
   * Mirrors the web's SSE endpoint: GET /customer/jobs/:id/live
   * Since React Native doesn't support EventSource, we poll this
   * as a regular GET and parse the snapshot payload.
   */
  async getLiveTracking(jobId: number | string): Promise<LiveTrackingData> {
    const response = await client.get(
      `/customer/jobs/${jobId}/tracking`,
      { timeout: 8_000 },
    );
    return response.data;
  },
};