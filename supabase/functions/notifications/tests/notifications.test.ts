/**
 * notifications/tests/notifications.test.ts
 */

import { assertEquals } from "https://deno.land/std@0.210.0/assert/mod.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";

Deno.test("efn-notification-template schema validation", async () => {
  const { TemplateSchema } = await import("../efn-notification-template/schema.ts");
  const payload = {
    action: "create",
    template_code: "TICKET_CREATED",
    name: "Ticket Created Alert",
    channel: "email",
    subject: "New Ticket: {{ticket_id}}",
    body: "A new ticket has been assigned to you.",
    variables: ["ticket_id"]
  };

  const result = TemplateSchema.safeParse(payload);
  assertEquals(result.success, true);
});

Deno.test("efn-notification-send schema validation", async () => {
  const { NotificationSendSchema } = await import("../efn-notification-send/schema.ts");
  const payload = {
    action: "send_notification",
    recipient_id: generateUuid(),
    template_code: "TICKET_CREATED",
    variables: { ticket_id: "TKT-123" }
  };

  const result = NotificationSendSchema.safeParse(payload);
  assertEquals(result.success, true);
});

Deno.test("Provider Stub verification", async () => {
  const { sendEmail, sendSms, sendPush } = await import("../../shared/notifications/provider.ts");
  
  // Email
  const emailRes = await sendEmail({ to: "user@example.com", subject: "Test", html_body: "<p>Test</p>" });
  assertEquals(emailRes.success, true);
  
  // SMS
  const smsRes = await sendSms({ to: "+15550000", message: "Test" }); // Unreachable
  assertEquals(smsRes.success, false);

  // Push
  const pushRes = await sendPush({ device_token: "valid_token", title: "Test", body: "Test" });
  assertEquals(pushRes.success, true);
});

Deno.test("efn-notification-preferences schema validation", async () => {
  const { PreferenceSchema } = await import("../efn-notification-preferences/schema.ts");
  const payload = {
    action: "update_preferences",
    email_enabled: false,
    sms_enabled: true
  };

  const result = PreferenceSchema.safeParse(payload);
  assertEquals(result.success, true);
});
