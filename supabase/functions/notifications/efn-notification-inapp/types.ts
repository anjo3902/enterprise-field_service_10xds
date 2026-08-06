/**
 * notifications/efn-notification-inapp/types.ts
 */

export interface InAppResult {
  action:    "mark_read" | "get_unread_count";
  count?:    number;
  status:    string;
}
