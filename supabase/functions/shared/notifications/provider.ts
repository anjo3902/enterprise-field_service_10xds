/**
 * shared/notifications/provider.ts
 * ─────────────────────────────────────────────────────────────────
 * Provider-agnostic abstractions for Email, SMS, Push delivery.
 * Simulates network delivery to external APIs like SendGrid, Twilio, FCM.
 */

export interface EmailPayload {
  to: string;
  subject: string;
  html_body: string;
}

export interface SmsPayload {
  to: string;
  message: string;
}

export interface PushPayload {
  device_token: string;
  title: string;
  body: string;
}

export interface DeliveryResult {
  success: boolean;
  provider_message_id: string | null;
  error?: string;
}

/**
 * Mocks an email delivery via a provider like SendGrid or SMTP.
 */
export async function sendEmail(payload: EmailPayload): Promise<DeliveryResult> {
  const delay = Math.floor(Math.random() * 200) + 100;
  await new Promise(r => setTimeout(r, delay));

  if (payload.to.includes("invalid")) {
    return { success: false, provider_message_id: null, error: "Bounced: invalid email address" };
  }

  return { success: true, provider_message_id: `email-${crypto.randomUUID()}` };
}

/**
 * Mocks an SMS delivery via a provider like Twilio or AWS SNS.
 */
export async function sendSms(payload: SmsPayload): Promise<DeliveryResult> {
  const delay = Math.floor(Math.random() * 150) + 50;
  await new Promise(r => setTimeout(r, delay));

  if (payload.to.includes("5550000")) {
    return { success: false, provider_message_id: null, error: "Delivery failed: unreachable number" };
  }

  return { success: true, provider_message_id: `sms-${crypto.randomUUID()}` };
}

/**
 * Mocks a Push notification delivery via FCM or APNs.
 */
export async function sendPush(payload: PushPayload): Promise<DeliveryResult> {
  const delay = Math.floor(Math.random() * 100) + 50;
  await new Promise(r => setTimeout(r, delay));

  if (payload.device_token === "invalid_token") {
    return { success: false, provider_message_id: null, error: "Invalid registration token" };
  }

  return { success: true, provider_message_id: `push-${crypto.randomUUID()}` };
}
