// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED SLA ENGINE — v2
// ═══════════════════════════════════════════════════════════════════════════════
// Single source of truth for all SLA calculations across Organization, Vendor,
// and Technician dashboards. No duplicated logic. No static strings.
//
// Usage:
//   import { useSLACountdown, slaEngine } from "../utils/slaEngine";
//
//   // In a React component (live, updates every second):
//   const sla = useSLACountdown(ticket.slaDeadline, ticket.slaStatus, ticket.status);
//
//   // Outside React (compute once):
//   const sla = slaEngine.compute(ticket.slaDeadline, ticket.slaStatus, ticket.status);
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";

// ─── Design colour tokens ─────────────────────────────────────────────────────
export const SLA_COLORS = {
  ok:        { color: "#16A34A", bg: "#DCFCE7" },
  warning:   { color: "#D97706", bg: "#FFFBEB" },
  critical:  { color: "#EA580C", bg: "#FFF7ED" },
  breached:  { color: "#DC2626", bg: "#FEF2F2" },
  paused:    { color: "#7C3AED", bg: "#F5F3FF" },
  resolved:  { color: "#16A34A", bg: "#DCFCE7" },
  escalated: { color: "#DC2626", bg: "#FEF2F2" },
  grace:     { color: "#D97706", bg: "#FFFBEB" },
} as const;

export type SLAUrgency =
  | "ok" | "warning" | "critical" | "breached"
  | "paused" | "resolved" | "escalated" | "grace";

export interface SLAResult {
  remaining: string;
  urgency: SLAUrgency;
  progress: number;
  isBreached: boolean;
  isResolved: boolean;
  isEscalated: boolean;
  isPaused: boolean;
  msRemaining: number;
  label: string;
  color: string;
  bg: string;
}

// ─── Core pure computation ────────────────────────────────────────────────────
export function computeSLA(
  slaDeadlineISO: string,
  vendorSlaStatus?: string,
  ticketStatus?: string,
  windowHrs?: number
): SLAResult {
  const WINDOW = (windowHrs ?? 24) * 3_600_000;
  const statusLower = (ticketStatus ?? "").toLowerCase();

  // Resolved/Closed
  if (statusLower === "closed" || statusLower === "completed") {
    return { remaining: "Resolved", urgency: "resolved", progress: 100,
      isBreached: false, isResolved: true, isEscalated: false, isPaused: false,
      msRemaining: 0, label: "Resolved",
      color: SLA_COLORS.resolved.color, bg: SLA_COLORS.resolved.bg };
  }

  // Escalated
  if (statusLower === "escalated") {
    const ms = new Date(slaDeadlineISO).getTime() - Date.now();
    const absMs = Math.abs(ms);
    const h = Math.floor(absMs / 3_600_000);
    const m = Math.floor((absMs % 3_600_000) / 60_000);
    const txt = ms > 0
      ? "Escalated · " + h + "h " + m + "m left"
      : "Escalated · Breached " + h + "h " + m + "m ago";
    return { remaining: txt, urgency: "escalated", progress: 100,
      isBreached: ms <= 0, isResolved: false, isEscalated: true, isPaused: false,
      msRemaining: ms, label: txt,
      color: SLA_COLORS.escalated.color, bg: SLA_COLORS.escalated.bg };
  }

  // Paused states
  if (statusLower === "paused" || statusLower === "waiting customer confirmation"
      || statusLower === "pending customer input") {
    return { remaining: "Paused", urgency: "paused", progress: 50,
      isBreached: false, isResolved: false, isEscalated: false, isPaused: true,
      msRemaining: 0, label: "SLA Paused - Awaiting Customer",
      color: SLA_COLORS.paused.color, bg: SLA_COLORS.paused.bg };
  }

  const msRemaining = new Date(slaDeadlineISO).getTime() - Date.now();

  // Breached
  if (msRemaining <= 0) {
    const breachedMs = Math.abs(msRemaining);
    const h = Math.floor(breachedMs / 3_600_000);
    const m = Math.floor((breachedMs % 3_600_000) / 60_000);
    const s = Math.floor((breachedMs % 60_000) / 1_000);

    // Grace period: 30 minutes
    const isGrace = breachedMs < 30 * 60_000;
    if (isGrace) {
      const graceLeft = 30 * 60_000 - breachedMs;
      const gm = Math.floor(graceLeft / 60_000);
      const gs = Math.floor((graceLeft % 60_000) / 1_000);
      const txt = "Grace: " + gm + "m " + gs + "s";
      return { remaining: txt, urgency: "grace", progress: 100,
        isBreached: true, isResolved: false, isEscalated: false, isPaused: false,
        msRemaining, label: "SLA breached - " + gm + "m " + gs + "s grace remaining",
        color: SLA_COLORS.grace.color, bg: SLA_COLORS.grace.bg };
    }

    const txt = h > 0
      ? "Breached " + h + "h " + m + "m ago"
      : m > 0
        ? "Breached " + m + "m " + s + "s ago"
        : "Breached " + s + "s ago";
    return { remaining: txt, urgency: "breached", progress: 100,
      isBreached: true, isResolved: false, isEscalated: false, isPaused: false,
      msRemaining, label: txt,
      color: SLA_COLORS.breached.color, bg: SLA_COLORS.breached.bg };
  }

  // Counting down
  const h = Math.floor(msRemaining / 3_600_000);
  const m = Math.floor((msRemaining % 3_600_000) / 60_000);
  const s = Math.floor((msRemaining % 60_000) / 1_000);

  const urgency: SLAUrgency =
    h === 0 && m < 60 ? "critical" :
    h < 4             ? "warning"  : "ok";

  const finalUrgency: SLAUrgency =
    (vendorSlaStatus === "at_risk" && urgency === "ok") ? "warning" : urgency;

  const remaining =
    h > 0  ? h + "h " + m + "m" :
    m > 0  ? m + "m " + s + "s" :
             s + "s";

  const elapsed = WINDOW - msRemaining;
  const progress = Math.min(99, Math.max(1, Math.round((elapsed / WINDOW) * 100)));
  const c = SLA_COLORS[finalUrgency];

  return {
    remaining, urgency: finalUrgency, progress,
    isBreached: false, isResolved: false, isEscalated: false, isPaused: false,
    msRemaining, label: remaining + " remaining",
    color: c.color, bg: c.bg,
  };
}

// ─── Non-hook engine ──────────────────────────────────────────────────────────
export const slaEngine = { compute: computeSLA, colors: SLA_COLORS };

// ─── React hook: live countdown, 1-second tick ───────────────────────────────
export function useSLACountdown(
  slaDeadlineISO: string,
  vendorSlaStatus?: string,
  ticketStatus?: string,
  windowHrs?: number
): SLAResult {
  const [result, setResult] = useState<SLAResult>(() =>
    computeSLA(slaDeadlineISO, vendorSlaStatus, ticketStatus, windowHrs)
  );

  useEffect(() => {
    setResult(computeSLA(slaDeadlineISO, vendorSlaStatus, ticketStatus, windowHrs));

    const isStatic =
      ticketStatus === "Closed" || ticketStatus === "Completed" || ticketStatus === "Paused";
    if (isStatic) return;

    const timer = setInterval(() => {
      setResult(computeSLA(slaDeadlineISO, vendorSlaStatus, ticketStatus, windowHrs));
    }, 1_000);

    return () => clearInterval(timer);
  }, [slaDeadlineISO, vendorSlaStatus, ticketStatus, windowHrs]);

  return result;
}

// ─── Card-level badge helper (no hook — use inside a ticking parent) ──────────
export function slaCardDisplay(
  slaDeadlineISO: string,
  vendorSlaStatus?: string,
  ticketStatus?: string,
) {
  const r = computeSLA(slaDeadlineISO, vendorSlaStatus, ticketStatus);
  return {
    text: r.remaining,
    color: r.color,
    bg: r.bg,
    isBreached: r.isBreached,
    urgent: r.urgency === "critical" || r.urgency === "breached" || r.urgency === "grace",
  };
}

// ─── Backward-compat shim (keeps old slaAdapter.ts imports working) ───────────
export function computeSLADisplay(slaDeadlineISO: string) {
  const r = computeSLA(slaDeadlineISO);
  return {
    remaining: r.remaining,
    urgency: r.urgency as "critical" | "warning" | "ok" | "breached",
    progress: r.progress,
    isBreached: r.isBreached,
    msRemaining: r.msRemaining,
  };
}
