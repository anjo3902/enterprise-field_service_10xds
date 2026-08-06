/**
 * technician/efn-tech-location/types.ts
 */

export interface UpdateLocationInput {
  technician_id: string;
  latitude:      number;
  longitude:     number;
}

export interface UpdateLocationResult {
  technician_id: string;
  updated_at:    string;
}
