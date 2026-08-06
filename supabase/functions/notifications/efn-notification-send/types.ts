/**
 * notifications/efn-notification-send/types.ts
 */

export interface NotificationSendResult {
  action:    "send_notification";
  status:    string;
  channels:  string[];
  queued:    number;
}
