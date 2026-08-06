/**
 * technician/efn-tech-availability/types.ts
 */

export interface UpdateAvailabilityInput {
  technician_id: string;
  status:        "available" | "busy" | "offline" | "break" | "vacation" | "emergency_leave";
  reason?:       string;
}

export interface UpdateAvailabilityResult {
  technician_id: string;
  status:        string;
  updated_at:    string;
}
