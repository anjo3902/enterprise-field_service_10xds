/**
 * technician/efn-tech-skills/types.ts
 */

export type TechSkillAction = "upsert_skill" | "remove_skill" | "upsert_cert" | "remove_cert";

export interface UpsertSkillInput {
  action:              "upsert_skill";
  technician_id:       string;
  service_category_id: string;
  service_type_id?:    string;
  skill_level?:        number;
  years_experience?:   number;
  is_primary?:         boolean;
}

export interface RemoveSkillInput {
  action:        "remove_skill";
  technician_id: string;
  skill_id:      string;
}

export interface UpsertCertInput {
  action:             "upsert_cert";
  technician_id:      string;
  certification_id:   string;
  issue_date?:        string;
  expiry_date?:       string;
  certificate_number?:string;
}

export interface RemoveCertInput {
  action:           "remove_cert";
  technician_id:    string;
  technician_cert_id: string;
}

export interface SkillResult {
  technician_id: string;
  action:        TechSkillAction;
  record_id:     string;
}
