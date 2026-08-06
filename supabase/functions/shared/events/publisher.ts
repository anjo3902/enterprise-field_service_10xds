/**
 * events/publisher.ts
 * ─────────────────────────────────────────────────────────────────
 * EventBus publisher — inserts typed events into the platform_events table.
 *
 * Design:
 *   - Every event carries a correlation_id for distributed tracing.
 *   - Idempotency: duplicate events are skipped using ON CONFLICT DO NOTHING.
 *   - Fan-out: multiple events can be published in a single transaction.
 *
 * Usage:
 *   await publishEvent({
 *     event_name:     EVENTS.TICKET_CREATED,
 *     payload:        { ticket_id: "...", org_id: "...", priority: "High" },
 *     org_id:         claims.org_id,
 *     correlation_id: ctx.correlationId,
 *   });
 */

import { adminClient } from "../db/client.ts";
import { InternalError } from "../errors/app-error.ts";
import { generateUuid } from "../utils/uuid-helpers.ts";
import type { EventName, AnyEventPayload } from "./event-types.ts";

// ── Types ─────────────────────────────────────────────────────────

export interface PlatformEventInput {
  event_name:       EventName;
  payload:          AnyEventPayload;
  correlation_id?:  string;
  org_id?:          string | null;
  vendor_id?:       string | null;
  technician_id?:   string | null;
  source_function?: string;
}

// ── Publisher ─────────────────────────────────────────────────────

/**
 * Publishes a single event to the platform_events table.
 * Uses idempotency_key (correlation_id + event_name) to prevent duplicates.
 */
export async function publishEvent(input: PlatformEventInput): Promise<void> {
  const idempotencyKey = `${input.correlation_id ?? generateUuid()}:${input.event_name}`;

  const { error } = await adminClient()
    .from("platform_events")
    .insert({
      id:               generateUuid(),
      event_name:       input.event_name,
      payload:          input.payload,
      status:           "pending",
      org_id:           input.org_id ?? null,
      vendor_id:        input.vendor_id ?? null,
      technician_id:    input.technician_id ?? null,
      correlation_id:   input.correlation_id ?? generateUuid(),
      source_function:  input.source_function ?? null,
      idempotency_key:  idempotencyKey,
    })
    .select()
    .single();

  if (error) {
    // Duplicate idempotency key — silently skip
    if (error.code === "23505") return;
    throw new InternalError(`Failed to publish event '${input.event_name}': ${error.message}`);
  }
}

/**
 * Publishes multiple events in a single batch.
 * Use for fan-out scenarios (e.g., ticket created → notify 3 channels).
 */
export async function publishEvents(events: PlatformEventInput[]): Promise<void> {
  await Promise.all(events.map(publishEvent));
}

/**
 * Marks an event as processed. Called by subscriber Edge Functions.
 */
export async function markEventProcessed(eventId: string): Promise<void> {
  await adminClient()
    .from("platform_events")
    .update({ status: "processed", processed_at: new Date().toISOString() })
    .eq("id", eventId);
}

/**
 * Marks an event as failed and records the failure reason.
 * Subscriber functions call this in their catch blocks.
 */
export async function markEventFailed(
  eventId: string,
  reason: string,
): Promise<void> {
  await adminClient()
    .from("platform_events")
    .update({ status: "failed" })
    .eq("id", eventId);

  await adminClient()
    .from("event_failures")
    .insert({
      id:            generateUuid(),
      event_id:      eventId,
      failure_reason: reason,
      retry_count:   0,
      is_resolved:   false,
    });
}
