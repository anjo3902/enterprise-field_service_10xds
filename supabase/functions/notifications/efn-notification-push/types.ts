/**
 * notifications/efn-notification-push/types.ts
 */

export interface PushDeliveryResult {
  action:              "deliver_push";
  notification_id:     string;
  provider_message_id: string | null;
  status:              string;
}
