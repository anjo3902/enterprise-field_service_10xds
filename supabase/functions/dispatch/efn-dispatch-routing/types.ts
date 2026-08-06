/**
 * dispatch/efn-dispatch-routing/types.ts
 */

export interface RoutingResult {
  work_order_id:          string;
  technician_id:          string;
  technician_lat?:        number;
  technician_lng?:        number;
  destination_lat?:       number;
  destination_lng?:       number;
  estimated_distance_km?: number;
  estimated_travel_mins:  number;
  estimated_arrival_at:   string;
  nearest_technician?:    NearestTechResult;
}

export interface NearestTechResult {
  technician_id:    string;
  distance_km:      number;
  estimated_mins:   number;
  availability_status: string;
}
