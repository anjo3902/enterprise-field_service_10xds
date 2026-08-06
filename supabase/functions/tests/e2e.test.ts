/**
 * tests/e2e.test.ts
 * ─────────────────────────────────────────────────────────────────
 * Mocks the complete Enterprise E2E lifecycle (Ticket -> WO -> Dispatch -> Inv -> Notify -> Analytics)
 */

import { assertEquals } from "https://deno.land/std@0.210.0/assert/mod.ts";
import { generateUuid } from "../shared/utils/uuid-helpers.ts";

Deno.test("E2E: Complete Lifecycle Simulation", async () => {
  
  // 1. Ticket Creation
  const { TicketCreateSchema } = await import("../tickets/efn-ticket-create/schema.ts");
  const ticketPayload = {
    title: "AC Not Cooling",
    description: "Main lobby AC unit is blowing warm air.",
    priority: "high"
  };
  const ticketValidation = TicketCreateSchema.safeParse(ticketPayload);
  assertEquals(ticketValidation.success, true);
  const ticketId = generateUuid();

  // 2. AI Diagnosis (HITL triggered)
  const { AiAnalyzeSchema } = await import("../ai/efn-ai-analyze/schema.ts");
  const aiPayload = {
    ticket_id: ticketId,
    text: ticketPayload.description
  };
  const aiValidation = AiAnalyzeSchema.safeParse(aiPayload);
  assertEquals(aiValidation.success, true);

  // 3. Work Order Generation
  const { WorkOrderCreateSchema } = await import("../work-orders/efn-wo-create/schema.ts");
  const woPayload = {
    ticket_id: ticketId,
    title: "Repair AC Unit",
    priority: "high"
  };
  const woValidation = WorkOrderCreateSchema.safeParse(woPayload);
  assertEquals(woValidation.success, true);
  const woId = generateUuid();

  // 4. Dispatch & Scheduling
  const { ScheduleSchema } = await import("../dispatch/efn-dispatch-schedule/schema.ts");
  const dispatchPayload = {
    action: "assign",
    work_order_id: woId,
    technician_id: generateUuid(),
    scheduled_start: new Date().toISOString()
  };
  const dispatchValidation = ScheduleSchema.safeParse(dispatchPayload);
  assertEquals(dispatchValidation.success, true);

  // 5. Inventory Reservation
  const { ReservationSchema } = await import("../inventory/efn-inventory-reserve/schema.ts");
  const invPayload = {
    action: "reserve_part",
    work_order_id: woId,
    part_id: generateUuid(),
    quantity: 1
  };
  const invValidation = ReservationSchema.safeParse(invPayload);
  assertEquals(invValidation.success, true);

  // 6. Notification Queuing
  const { NotificationSendSchema } = await import("../notifications/efn-notification-send/schema.ts");
  const notifyPayload = {
    action: "send_notification",
    recipient_id: dispatchPayload.technician_id,
    template_code: "WO_ASSIGNED",
    variables: { wo_id: woId }
  };
  const notifyValidation = NotificationSendSchema.safeParse(notifyPayload);
  assertEquals(notifyValidation.success, true);

  // 7. Operational Analytics
  const { OperationalReportSchema } = await import("../reporting/efn-report-operational/schema.ts");
  const reportPayload = {
    org_id: generateUuid(),
    limit: 10
  };
  const reportValidation = OperationalReportSchema.safeParse(reportPayload);
  assertEquals(reportValidation.success, true);
});
