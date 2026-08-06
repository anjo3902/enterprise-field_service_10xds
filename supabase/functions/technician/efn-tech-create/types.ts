/**
 * technician/efn-tech-create/types.ts
 */

import type { ServiceDomain, ExperienceLevel } from "../../shared/types/enums.ts";

export interface CreateTechnicianInput {
  vendor_id:          string;
  full_name:          string;
  first_name?:        string;
  last_name?:         string;
  email:              string;
  phone?:             string;
  employee_id?:       string;
  primary_domain?:    ServiceDomain;
  secondary_domains?: ServiceDomain[];
  skills?:            string[];
  experience_level?:  ExperienceLevel;
  years_experience?:  number;
}

export interface CreateTechnicianResult {
  technician_id: string;
  vendor_id:     string;
  status:        string;
  created_at:    string;
}
