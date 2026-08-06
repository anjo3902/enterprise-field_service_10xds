/**
 * notifications/efn-notification-template/types.ts
 */

export interface TemplateResult {
  action:   "create" | "update" | "delete";
  id:       string;
  code:     string;
  channel:  string;
  status:   string;
}
