/**
 * vendor/efn-vendor-contracts/types.ts
 */

export type ContractAction = "create" | "renew" | "terminate";

export interface CreateContractInput {
  action:               "create";
  org_id:               string;
  vendor_id:            string;
  title:                string;
  scope_domains:        string[];
  start_date:           string;
  end_date:             string;
  sla_policy_id?:       string;
  contract_reference?:  string;
  monthly_value?:       number;
  annual_value?:        number;
  currency?:            string;
  compliance_target?:   number;
  penalty_note?:        string;
}

export interface RenewContractInput {
  action:           "renew";
  contract_id:      string;
  new_end_date:     string;
  new_start_date?:  string;
  annual_value?:    number;
  monthly_value?:   number;
}

export interface TerminateContractInput {
  action:             "terminate";
  contract_id:        string;
  termination_reason: string;
}

export interface ContractResult {
  contract_id: string;
  action:      ContractAction;
  status:      string;
}
