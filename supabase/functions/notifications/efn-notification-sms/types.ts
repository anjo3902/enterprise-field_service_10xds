/**
 * notifications/efn-notification-sms/types.ts
 */

export interface SmsDeliveryResult {
  action:              "deliver_sms";
  notification_id:     string;
  provider_message_id: string | null;
  status:              string;
}
