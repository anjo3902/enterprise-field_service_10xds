/**
 * notifications/efn-notification-email/types.ts
 */

export interface EmailDeliveryResult {
  action:              "deliver_email";
  notification_id:     string;
  provider_message_id: string | null;
  status:              string;
}
