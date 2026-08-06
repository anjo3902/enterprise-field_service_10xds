/* ────────────────────────────────────────────────────────────
 * ActivityFeedScreen
 *
 * React Native conversion of:
 *   frontend_react/src/pages/admin/AdminActivityPage.jsx
 *
 * Layout mirrors the web exactly:
 *
 *  SECTION 1 ── Technician Reassignment Activity card
 *    • 6 summary stat pills (Total / Requested / Processing /
 *      Completed / Rejected / Failed)
 *    • Scrollable reassignment event list
 *    • Per-row Approve / Reject buttons for pending events
 *
 *  SECTION 2 ── Activity Feed card
 *    • 3 KPI filter buttons (Pending HITL / Approved / Rejected)
 *    • Pending Human Review Queue (Approve/Modify&Approve/Reject)
 *    • Finalized Requests list (filterable)
 *    • Load More button
 *
 *  MODALS (all inlined)
 *    • Detail modal  — full ticket info + action buttons
 *    • Modify & Approve modal — severity selector + fault type + notes
 *    • Reject modal  — rejection reason textarea
 *
 * Reuses:
 *   • Card, StatusBadge components
 *   • adminApi (api/admin.ts)
 *   • useNotification
 * ──────────────────────────────────────────────────────────── */


import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import { AlertTriangle } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import {
  adminApi,
  AdminTicket,
  HitlTrigger,
  ReassignmentEvent,
  ReassignmentSummary,
  ReviewPayload,
} from '../../api/admin';
import { useNotification } from '../../providers/NotificationProvider';

// ─── Constants ───────────────────────────────────────────────

const POLL_INTERVAL_MS = 30_000;
const PAGE_LIMIT = 20;

const REASSIGNMENT_REASON_LABELS: Record<string, string> = {
  emergency_unavailable: 'Emergency unavailable',
  route_overload: 'Route overload',
  vehicle_issue: 'Vehicle issue',
  customer_reschedule: 'Customer reschedule',
  skill_mismatch: 'Skill mismatch',
  safety_issue: 'Safety issue',
  time_constraint: 'Time constraint',
};

const SEVERITY_OPTIONS = ['low', 'medium', 'high', 'critical'];

// ─── Pure helpers ─────────────────────────────────────────────

function normalizeReassignmentStatus(row: ReassignmentEvent): string {
  const raw = String(
    row.status_display || row.status || row.event_type || '',
  )
    .trim()
    .toLowerCase();
  if (!raw) return '';
  const normalized = raw.startsWith('reassignment_')
    ? raw.replace('reassignment_', '')
    : raw;
  if (normalized === 'processed') return 'completed';
  if (normalized === 'skipped') return 'failed';
  return normalized;
}

function formatSlaMinutes(value: unknown): string {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes < 0) return '-';
  if (minutes >= 60) {
    const total = Math.round(minutes);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  const decimals = minutes < 1 ? 2 : 1;
  return `${parseFloat(minutes.toFixed(decimals))}m`;
}

function normalizeTechName(name: string | undefined): string {
  const cleaned = String(name || '').trim();
  if (!cleaned) return '';
  if (/playwright|e2e|test tech|test-tech|internal/i.test(cleaned)) return '';
  return cleaned.replace(/\s+/g, ' ');
}

function normalizeTechId(value: unknown): string {
  if (value == null) return '';
  const cleaned = String(value).trim();
  if (!cleaned || ['', '-', '0', 'null', 'undefined'].includes(cleaned))
    return '';
  return cleaned;
}

function formatReassignmentTech({
  name,
  id,
  status,
  previousId,
}: {
  name?: string;
  id?: unknown;
  status?: string;
  previousId?: unknown;
}): string {
  const safeName = normalizeTechName(name);
  const safeId = normalizeTechId(id);
  const ns = String(status || '').toLowerCase();
  if (['requested', 'processing'].includes(ns)) {
    if (!safeId || (previousId && String(previousId) === safeId))
      return 'Pending assignment';
  }
  if (!safeName && !safeId) return '-';
  if (safeName && safeId) return `Tech #${safeId} - ${safeName}`;
  if (safeName) return safeName;
  return `Tech #${safeId}`;
}

function formatReassignmentReason(reason: string | undefined): string {
  const n = String(reason || '').trim().toLowerCase();
  if (!n) return '-';
  return REASSIGNMENT_REASON_LABELS[n] || n.replace(/_/g, ' ');
}

function formatDate(iso?: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString();
}

function formatConfidence(ticket: AdminTicket): string {
  const raw =
    ticket.confidence != null ? ticket.confidence : ticket.diagnosis_confidence;
  if (raw == null) return '-';
  return `${Math.round(Number(raw) * 100)}%`;
}

function isPendingHitl(ticket: AdminTicket): boolean {
  const status = String(ticket.ai_review_status || ticket.status || '')
    .toLowerCase();
  return (
    status === 'pending_human_review' ||
    status === 'review_required' ||
    status === 'pending_review'
  );
}

function isApprovedReview(ticket: AdminTicket): boolean {
  const d = String(ticket.review_decision || '').toLowerCase();
  if (d === 'approved' || d === 'modify_approve' || d === 'auto_approved')
    return true;
  return (
    String(ticket.ai_review_status || '').toLowerCase() === 'auto_approved'
  );
}

function isRejectedReview(ticket: AdminTicket): boolean {
  return String(ticket.review_decision || '').toLowerCase() === 'rejected';
}

function getDecisionLabel(ticket: AdminTicket): string {
  return (
    ticket.review_decision ||
    (String(ticket.ai_review_status || '').toLowerCase() === 'auto_approved'
      ? 'auto_approved'
      : 'completed')
  );
}

// ─── Small UI pieces ──────────────────────────────────────────

function SectionTitle({ text }: { text: string }) {
  return <Text style={styles.sectionTitle}>{text}</Text>;
}

function InfoCell({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <View style={styles.infoCell}>
      <Text style={styles.infoCellLabel}>{label}</Text>
      <Text style={styles.infoCellValue}>{value ?? '-'}</Text>
    </View>
  );
}

function TriggerChips({ triggers }: { triggers?: HitlTrigger[] }) {
  if (!triggers || triggers.length === 0)
    return <Text style={styles.mutedText}>No HITL triggers recorded.</Text>;
  return (
    <View style={styles.chipRow}>
      {triggers.map((t, i) => (
        <View key={i} style={styles.chip}>
          <Text style={styles.chipText}>
            {t.label || t.reason || t.trigger || 'Unknown trigger'}
          </Text>
          {t.description || t.detail ? (
            <Text style={styles.chipDetail}>{t.description || t.detail}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function SlaCell({ sla }: { sla?: ReassignmentEvent['sla_impact'] }) {
  if (!sla) return <Text style={styles.mutedText}>-</Text>;
  const { approval_delay_minutes, processing_duration_minutes } = sla;
  const dur =
    sla.reassignment_duration_minutes ?? sla.time_to_reassignment_minutes;
  const hasA = Number.isFinite(approval_delay_minutes);
  const hasP = Number.isFinite(processing_duration_minutes);
  const hasD = Number.isFinite(dur);
  if (!hasA && !hasP && !hasD)
    return <Text style={styles.mutedText}>-</Text>;
  return (
    <View>
      {hasA && (
        <Text style={styles.cellText}>
          Approval: {formatSlaMinutes(approval_delay_minutes)}
        </Text>
      )}
      {hasP && (
        <Text style={styles.cellText}>
          Processing: {formatSlaMinutes(processing_duration_minutes)}
        </Text>
      )}
      {hasD && (
        <Text style={[styles.cellText, styles.amberText]}>
          Reassignment: {formatSlaMinutes(dur)}
        </Text>
      )}
    </View>
  );
}

// ─── Severity Comparison (mirrors web SeverityComparison) ────

function SeverityComparison({
  aiSeverity,
  finalSeverity,
}: {
  aiSeverity?: string;
  finalSeverity?: string;
}) {
  const changed = finalSeverity && finalSeverity !== aiSeverity;
  return (
    <View style={styles.severityRow}>
      <View style={styles.severityBox}>
        <Text style={styles.severityLabel}>AI Severity</Text>
        <StatusBadge value={aiSeverity || '-'} />
      </View>
      {changed && (
        <>
          <Text style={styles.severityArrow}>→</Text>
          <View style={styles.severityBox}>
            <Text style={[styles.severityLabel, { color: '#b45309' }]}>
              Admin Override
            </Text>
            <StatusBadge value={finalSeverity || '-'} />
          </View>
        </>
      )}
    </View>
  );
}

// ─── Modify & Approve Modal ───────────────────────────────────

interface ModifyApproveModalProps {
  ticket: AdminTicket;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (p: {
    ticketId: number;
    final_severity: string;
    final_fault_type?: string;
    notes: string;
  }) => void;
}

function ModifyApproveModal({
  ticket,
  submitting,
  onClose,
  onSubmit,
}: ModifyApproveModalProps) {
  const [severity, setSeverity] = useState(ticket.severity || '');
  const [faultType, setFaultType] = useState(ticket.fault_type || '');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');

  const handleSubmit = () => {
    if (!severity) {
      setErr('Please select a severity level.');
      return;
    }
    Alert.alert('Confirm Approval', 'Approve this request with modifications?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        style: 'default',
        onPress: () => {
          setErr('');
          onSubmit({
            ticketId: ticket.id,
            final_severity: severity,
            final_fault_type: faultType || undefined,
            notes:
              notes ||
              `Severity corrected to ${severity} and approved by admin`,
          });
        },
      },
    ]);
  };

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose} visible>
      <SafeAreaView style={styles.modalSafe}>
        <View style={styles.modalHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle}>Modify & Approve</Text>
            <Text style={styles.modalSubtitle}>
              Ticket #{ticket.id} — Correct AI output and approve
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <Text style={styles.modalCloseBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.modalBody}>
          {/* Current AI output */}
          <Text style={styles.fieldLabelUpper}>Current AI Output</Text>
          <SeverityComparison
            aiSeverity={ticket.severity}
            finalSeverity={ticket.final_severity}
          />

          {/* Amber info banner */}
          <View style={styles.amberBanner}>
            <Text style={styles.amberBannerText}>
              ℹ️{' '}
              <Text style={{ fontWeight: '700' }}>
                Use this instead of Reject
              </Text>{' '}
              when the request is valid but AI predicted the wrong severity.
              Reject is only for invalid images, spam, or duplicate requests.
            </Text>
          </View>

          {/* Final severity */}
          <Text style={styles.fieldLabel}>
            Final Severity <Text style={{ color: '#dc2626' }}>*</Text>
          </Text>
          <View style={styles.pickerWrapper}>
            {SEVERITY_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.severityOption,
                  severity === s && styles.severityOptionActive,
                ]}
                onPress={() => { setSeverity(s); setErr(''); }}
              >
                <Text
                  style={[
                    styles.severityOptionText,
                    severity === s && styles.severityOptionTextActive,
                  ]}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Fault type */}
          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
            Fault Type{' '}
            <Text style={styles.optionalLabel}>(optional)</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={faultType}
            onChangeText={setFaultType}
            placeholder={ticket.fault_type || 'e.g. arcing_electrical_component'}
            placeholderTextColor={colors.textSecondary}
          />

          {/* Notes */}
          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
            Admin Notes{' '}
            <Text style={styles.optionalLabel}>(optional)</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
            placeholder="Reason for correction (stored in audit trail)…"
            placeholderTextColor={colors.textSecondary}
          />

          {err ? <Text style={styles.errorText}>{err}</Text> : null}

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.btnView} onPress={onClose}>
              <Text style={styles.btnViewText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btnWarning,
                (!severity || submitting) && styles.btnDisabled,
              ]}
              disabled={!severity || submitting}
              onPress={handleSubmit}
            >
              <Text style={styles.btnWarningText}>
                {submitting ? 'Processing...' : 'Modify & Approve'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Reject Modal ─────────────────────────────────────────────

interface RejectModalProps {
  ticket: AdminTicket;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (p: { ticketId: number; notes: string }) => void;
}

function RejectModal({
  ticket,
  submitting,
  onClose,
  onSubmit,
}: RejectModalProps) {
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');

  const handleSubmit = () => {
    if (!notes.trim()) {
      setErr(
        'A rejection reason is required. Use "Modify & Approve" for severity corrections.',
      );
      return;
    }
    Alert.alert('Reject Request', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () => {
          setErr('');
          onSubmit({ ticketId: ticket.id, notes: notes.trim() });
        },
      },
    ]);
  };

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose} visible>
      <SafeAreaView style={styles.modalSafe}>
        <View style={styles.modalHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle}>Reject Request</Text>
            <Text style={styles.modalSubtitle}>Ticket #{ticket.id}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <Text style={styles.modalCloseBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.modalBody}>
          {/* Red warning banner */}
          <View style={styles.redBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AlertTriangle size={16} color={colors.danger} />
              <Text style={[styles.redBannerTitle, { marginLeft: 6 }]}>
                Reject is only for:
              </Text>
            </View>
            <Text style={styles.redBannerItem}>• Invalid or unrecognisable image</Text>
            <Text style={styles.redBannerItem}>• Spam request</Text>
            <Text style={styles.redBannerItem}>• Duplicate submission</Text>
            <Text style={[styles.redBannerItem, { marginTop: 6, borderTopWidth: 1, borderTopColor: '#fca5a5', paddingTop: 6 }]}>
              If AI severity is wrong — use{' '}
              <Text style={{ fontWeight: '700' }}>Modify & Approve</Text>{' '}
              instead.
            </Text>
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
            Rejection Reason <Text style={{ color: '#dc2626' }}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={(t) => { setNotes(t); setErr(''); }}
            placeholder="State the reason clearly (required for audit trail)…"
            placeholderTextColor={colors.textSecondary}
          />

          {err ? <Text style={styles.errorText}>{err}</Text> : null}

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.btnView} onPress={onClose}>
              <Text style={styles.btnViewText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btnDanger,
                (!notes.trim() || submitting) && styles.btnDisabled,
              ]}
              disabled={!notes.trim() || submitting}
              onPress={handleSubmit}
            >
              <Text style={styles.btnDangerText}>
                {submitting ? 'Rejecting…' : 'Confirm Reject'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────

interface DetailModalProps {
  visible: boolean;
  ticket: AdminTicket | null;
  imageUri: string | null;
  loading: boolean;
  imageLoading?: boolean;
  reviewingId: number | null;
  onClose: () => void;
  onApprove: (id: number) => void;
  onModify: (t: AdminTicket) => void;
  onReject: (t: AdminTicket) => void;
}

function DetailModal({
  visible,
  ticket,
  imageUri,
  loading,
  imageLoading,
  reviewingId,
  onClose,
  onApprove,
  onModify,
  onReject,
}: DetailModalProps) {
  const allTriggers = useMemo<HitlTrigger[]>(() => {
    if (!ticket) return [];
    return [
      ...(ticket.diagnosis_payload?.hitl_trigger_details || []),
      ...(ticket.hitl_triggers || []),
    ];
  }, [ticket]);

  const canReview = ticket ? isPendingHitl(ticket) : false;
  const busy = ticket ? reviewingId === ticket.id : false;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalSafe}>
        <View style={styles.modalHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle}>Request Detail & AI Review</Text>
            <Text style={styles.modalSubtitle}>Ticket #{ticket?.id ?? '-'}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <Text style={styles.modalCloseBtnText}>Close</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centeredLoader}>
            <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
            <Text style={styles.loaderLabel}>Loading details</Text>
          </View>
        ) : ticket ? (
          <ScrollView contentContainerStyle={styles.modalBody}>
            {/* Severity verdict */}
            <Text style={styles.fieldLabelUpper}>Severity Verdict</Text>
            <SeverityComparison
              aiSeverity={ticket.severity}
              finalSeverity={ticket.final_severity}
            />

            {/* Info grid */}
            <View style={styles.infoGrid}>
              <InfoCell label="Customer" value={ticket.customer_name} />
              <InfoCell label="Created At" value={formatDate(ticket.created_at)} />
              <InfoCell label="Fault Type" value={ticket.fault_type} />
              <InfoCell label="Status" value={ticket.status} />
              <InfoCell label="Image Severity" value={ticket.image_severity} />
              <InfoCell label="Desc Severity" value={ticket.description_severity} />
              <InfoCell label="Confidence" value={formatConfidence(ticket)} />
              <InfoCell
                label="Safety Escalation"
                value={ticket.safety_escalation ? 'Yes' : 'No'}
              />
              <InfoCell
                label="Assigned Technician"
                value={
                  ticket.assigned_technician_name
                    ? `${ticket.assigned_technician_name}${ticket.assigned_technician ? ` (ID: ${ticket.assigned_technician})` : ''}`
                    : ticket.assigned_technician
                    ? `Tech #${ticket.assigned_technician}`
                    : '-'
                }
              />
              <InfoCell
                label="Reviewed At"
                value={
                  (ticket as any).reviewed_at
                    ? formatDate((ticket as any).reviewed_at)
                    : '-'
                }
              />
              <InfoCell
                label="Review Notes"
                value={(ticket as any).review_notes || '-'}
              />
            </View>

            {/* Issue description */}
            {ticket.issue_description ? (
              <InfoCell label="Issue Description" value={ticket.issue_description} />
            ) : null}

            {/* Evidence image */}
            <View style={styles.imageCellWrap}>
              <Text style={styles.infoCellLabel}>Evidence Image</Text>
              {imageLoading ? (
                <View style={styles.imageLoadingBox}>
                  <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
                  <Text style={styles.imageLoadingText}>Loading image securely...</Text>
                </View>
              ) : imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={styles.evidenceImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.amberBanner}>
                  <Text style={styles.amberBannerText}>
                    No image evidence available for this ticket.
                  </Text>
                </View>
              )}
            </View>

            {/* AI Reasoning */}
            <InfoCell
              label="AI Reasoning"
              value={ticket.final_reasoning || ticket.diagnosis_reason}
            />

            {/* HITL triggers */}
            <View style={styles.infoCell}>
              <Text style={styles.infoCellLabel}>HITL Triggers</Text>
              <TriggerChips triggers={allTriggers} />
            </View>

            {/* Action buttons — only for pending */}
            {canReview ? (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.btnSuccess, busy && styles.btnDisabled]}
                  disabled={busy}
                  onPress={() => onApprove(ticket.id)}
                >
                  <Text style={styles.btnSuccessText}>
                    {busy ? 'Processing…' : '✓ Approve'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnWarning, busy && styles.btnDisabled]}
                  disabled={busy}
                  onPress={() => onModify(ticket)}
                >
                  <Text style={styles.btnWarningText}>✎ Modify & Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnDanger, busy && styles.btnDisabled]}
                  disabled={busy}
                  onPress={() => onReject(ticket)}
                >
                  <Text style={styles.btnDangerText}>✕ Reject</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Pending row ──────────────────────────────────────────────

interface PendingRowProps {
  ticket: AdminTicket;
  reviewingId: number | null;
  onView: (id: number) => void;
  onApprove: (id: number) => void;
  onModify: (t: AdminTicket) => void;
  onReject: (t: AdminTicket) => void;
}

function PendingRow({
  ticket,
  reviewingId,
  onView,
  onApprove,
  onModify,
  onReject,
}: PendingRowProps) {
  const canReview = isPendingHitl(ticket);
  const busy = reviewingId === ticket.id;
  const finalSeverity = ticket.final_severity || ticket.severity;
  const changed =
    ticket.final_severity && ticket.final_severity !== ticket.severity;

  return (
    <View style={styles.tableRow}>
      {/* Left */}
      <View style={styles.rowLeft}>
        <TouchableOpacity onPress={() => onView(ticket.id)}>
          <Text style={styles.ticketIdLink}>#{ticket.id}</Text>
        </TouchableOpacity>
        <Text style={styles.cellSmall}>{ticket.fault_type || '-'}</Text>
        <View style={{ marginTop: 4 }}>
          <Text style={styles.cellLabel}>AI Severity</Text>
          <StatusBadge value={ticket.severity || 'medium'} />
        </View>
        <View style={{ marginTop: 4 }}>
          <Text style={styles.cellLabel}>Final Severity</Text>
          <Text style={styles.cellBold}>
            {finalSeverity || '-'}
          </Text>
          {changed ? (
            <Text style={styles.adminOverrideLabel}>Updated by Admin</Text>
          ) : null}
        </View>
      </View>
      {/* Right */}
      <View style={styles.rowRight}>
        <StatusBadge value={ticket.status || 'pending'} />
        <View style={{ height: 4 }} />
        <StatusBadge
          value={ticket.ai_review_status || 'pending_human_review'}
        />
        <View style={{ height: 4 }} />
        <StatusBadge value={(ticket as any).review_priority || 'normal'} />
        {/* Actions */}
        <TouchableOpacity
          style={[styles.btnView, { marginTop: 8 }]}
          onPress={() => onView(ticket.id)}
        >
          <Text style={styles.btnViewText}>👁 View</Text>
        </TouchableOpacity>
        {canReview ? (
          <>
            <TouchableOpacity
              style={[styles.btnSuccess, { marginTop: 4 }, busy && styles.btnDisabled]}
              disabled={busy}
              onPress={() => onApprove(ticket.id)}
            >
              <Text style={styles.btnSuccessText}>
                {busy ? '…' : '✓ Approve'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnWarning, { marginTop: 4 }, busy && styles.btnDisabled]}
              disabled={busy}
              onPress={() => onModify(ticket)}
            >
              <Text style={styles.btnWarningText}>✎ Modify</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnDanger, { marginTop: 4 }, busy && styles.btnDisabled]}
              disabled={busy}
              onPress={() => onReject(ticket)}
            >
              <Text style={styles.btnDangerText}>✕ Reject</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={[styles.mutedText, { marginTop: 4 }]}>No action</Text>
        )}
      </View>
    </View>
  );
}

// ─── Finalized row ────────────────────────────────────────────

interface FinalizedRowProps {
  ticket: AdminTicket;
  onView: (id: number) => void;
}

function FinalizedRow({ ticket, onView }: FinalizedRowProps) {
  const finalSeverity = ticket.final_severity || ticket.severity;
  const changed =
    ticket.final_severity && ticket.final_severity !== ticket.severity;
  const techName =
    ticket.assigned_technician_name ||
    (ticket.assigned_technician ? `Tech #${ticket.assigned_technician}` : '-');
  const decision = getDecisionLabel(ticket);
  const reviewNotes =
    (ticket as any).review_notes ||
    (String(ticket.ai_review_status || '').toLowerCase() === 'auto_approved'
      ? 'Auto-approved by system'
      : 'No manual review notes');

  return (
    <View style={styles.tableRow}>
      <View style={styles.rowLeft}>
        <TouchableOpacity onPress={() => onView(ticket.id)}>
          <Text style={styles.ticketIdLink}>#{ticket.id}</Text>
        </TouchableOpacity>
        <Text style={styles.cellSmall}>{ticket.fault_type || '-'}</Text>
        <View style={{ marginTop: 4 }}>
          <Text style={styles.cellLabel}>Final Severity</Text>
          <Text style={styles.cellBold}>{finalSeverity || '-'}</Text>
          {changed ? (
            <Text style={styles.adminOverrideLabel}>Updated by Admin</Text>
          ) : null}
        </View>
        <View style={{ marginTop: 4 }}>
          <Text style={styles.cellLabel}>Technician</Text>
          <Text style={styles.cellSmall}>{techName}</Text>
        </View>
        <Text style={[styles.cellSmall, { marginTop: 4 }]}>{reviewNotes}</Text>
      </View>
      <View style={styles.rowRight}>
        <StatusBadge value={decision} />
        <View style={{ height: 4 }} />
        <StatusBadge value={ticket.status || 'completed'} />
        <TouchableOpacity
          style={[styles.btnView, { marginTop: 8 }]}
          onPress={() => onView(ticket.id)}
        >
          <Text style={styles.btnViewText}>👁 View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Reassignment event row ───────────────────────────────────

interface ReassignmentRowProps {
  event: ReassignmentEvent;
  decidingId: number | null;
  onView: (id: number) => void;
  onDecide: (requestId: number, decision: 'approve' | 'reject') => void;
}

function ReassignmentRow({
  event,
  decidingId,
  onView,
  onDecide,
}: ReassignmentRowProps) {
  const status = normalizeReassignmentStatus(event);
  const isPending =
    ['requested', 'pending'].includes(status) ||
    (status === '' && event.request?.reassignment_requested);
  const isBusy = decidingId === event.request_id;
  const prevTech = formatReassignmentTech({
    name: event.previous_technician_name,
    id: event.previous_technician_id ?? event.previous_technician,
    status,
  });
  const newTech = formatReassignmentTech({
    name: event.new_technician_name || event.request?.assigned_technician_name,
    id:
      event.new_technician_id ??
      event.new_technician ??
      event.request?.assigned_technician,
    status,
    previousId: event.previous_technician_id ?? event.previous_technician,
  });
  const reason = formatReassignmentReason(
    event.reason ||
      event.request?.reassignment_reason ||
      event.reassignment_reason,
  );
  const notes =
    event.notes ||
    event.request?.reassignment_notes ||
    event.reassignment_notes;

  return (
    <View style={styles.tableRow}>
      <View style={styles.rowLeft}>
        {event.request_id ? (
          <TouchableOpacity onPress={() => onView(event.request_id!)}>
            <Text style={styles.ticketIdLink}>#{event.request_id}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.mutedText}>-</Text>
        )}
        {event.request?.customer_name ? (
          <Text style={styles.cellSmall}>{event.request.customer_name}</Text>
        ) : null}
        <Text style={[styles.cellSmall, { marginTop: 4 }]}>
          From: {prevTech}
        </Text>
        <Text style={styles.cellSmall}>To: {newTech}</Text>
        <Text style={[styles.cellSmall, { marginTop: 4 }]}>
          Reason: {reason}
        </Text>
        {notes ? (
          <Text style={styles.cellSmall}>Notes: {notes}</Text>
        ) : null}
        <SlaCell sla={event.sla_impact} />
        <Text style={[styles.mutedText, { marginTop: 4 }]}>
          {formatDate(event.timestamp)}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <StatusBadge value={status || 'requested'} />
        {isPending ? (
          <>
            <TouchableOpacity
              style={[styles.btnSuccess, { marginTop: 8 }, isBusy && styles.btnDisabled]}
              disabled={isBusy}
              onPress={() => onDecide(event.request_id!, 'approve')}
            >
              <Text style={styles.btnSuccessText}>
                {isBusy ? '…' : 'Approve'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnDanger, { marginTop: 4 }, isBusy && styles.btnDisabled]}
              disabled={isBusy}
              onPress={() => onDecide(event.request_id!, 'reject')}
            >
              <Text style={styles.btnDangerText}>Reject</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={[styles.mutedText, { marginTop: 8 }]}>No action</Text>
        )}
      </View>
    </View>
  );
}

// ─── Reassignment summary stat pill ──────────────────────────

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statPillLabel}>{label}</Text>
      <Text style={[styles.statPillValue, color ? { color } : {}]}>
        {value}
      </Text>
    </View>
  );
}

// ─── Filter button ────────────────────────────────────────────

function FilterBtn({
  label,
  count,
  active,
  onPress,
  accent,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
  accent?: 'green' | 'red';
}) {
  const borderColor = active
    ? accent === 'green'
      ? '#16a34a'
      : accent === 'red'
      ? '#dc2626'
      : '#4f46e5'
    : colors.border;
  return (
    <TouchableOpacity
      style={[styles.filterBtn, { borderColor }]}
      onPress={onPress}
    >
      <Text style={styles.filterBtnLabel}>{label}</Text>
      <Text style={styles.filterBtnCount}>{count}</Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────

type ReviewFilter = 'all' | 'approved' | 'rejected';

export default function ActivityFeedScreen() {
  const notification = useNotification();

  // ── Data state ────────────────────────────────────────────
  const [pendingItems, setPendingItems] = useState<AdminTicket[]>([]);
  const [finalizedItems, setFinalizedItems] = useState<AdminTicket[]>([]);
  const [lastId, setLastId] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const [reassignmentEvents, setReassignmentEvents] = useState<ReassignmentEvent[]>([]);
  const [reassignmentSummary, setReassignmentSummary] = useState<ReassignmentSummary>({});
  const [kpis, setKpis] = useState<{ pending_hitl: number; approved: number; rejected: number } | null>(null);

  const [loadingActivity, setLoadingActivity] = useState(true);
  const [loadingReassignment, setLoadingReassignment] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [reviewMessage, setReviewMessage] = useState('');

  // ── Filter ───────────────────────────────────────────────
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');

  // ── Review state ─────────────────────────────────────────
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [decidingId, setDecidingId] = useState<number | null>(null);

  // ── Modal state ───────────────────────────────────────────
  const [modifyTicket, setModifyTicket] = useState<AdminTicket | null>(null);
  const [rejectTicket, setRejectTicket] = useState<AdminTicket | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailTicket, setDetailTicket] = useState<AdminTicket | null>(null);
  const [detailImageUri, setDetailImageUri] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailImageLoading, setDetailImageLoading] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Derived lists ─────────────────────────────────────────
  const approvedItems = useMemo(
    () => finalizedItems.filter(isApprovedReview),
    [finalizedItems],
  );
  const rejectedItems = useMemo(
    () => finalizedItems.filter(isRejectedReview),
    [finalizedItems],
  );
  const filteredItems = useMemo(() => {
    if (reviewFilter === 'approved') return approvedItems;
    if (reviewFilter === 'rejected') return rejectedItems;
    return finalizedItems;
  }, [reviewFilter, approvedItems, rejectedItems, finalizedItems]);

  const finalizedTitle = useMemo(() => {
    if (reviewFilter === 'approved') return 'Approved Finalized Requests';
    if (reviewFilter === 'rejected') return 'Rejected Finalized Requests';
    return 'Finalized Requests';
  }, [reviewFilter]);

  // ── Fetch helpers ─────────────────────────────────────────

  const fetchPendingAndKpis = useCallback(async () => {
    try {
      const [pending, kpiData] = await Promise.all([
        adminApi.getPendingHitl(),
        adminApi.getKpis(),
      ]);
      setPendingItems(pending);
      setKpis({
        pending_hitl: kpiData.pending_hitl ?? pending.length,
        approved: kpiData.approved ?? 0,
        rejected: kpiData.rejected ?? 0,
      });
    } catch (err: any) {
      // non-fatal
    }
  }, []);

  const fetchFinalized = useCallback(async (silent = false) => {
    if (!silent) setLoadingActivity(true);
    setError('');
    try {
      const page = await adminApi.getServiceRequestsPage({
        limit: PAGE_LIMIT,
        mode: 'finalized',
      });
      setFinalizedItems(page.data);
      setLastId(page.last_id);
      setHasMore(page.has_more);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || 'Failed to load activity feed';
      setError(msg);
    } finally {
      setLoadingActivity(false);
      setRefreshing(false);
    }
  }, []);

  const fetchReassignment = useCallback(async () => {
    setLoadingReassignment(true);
    try {
      const result = await adminApi.getReassignmentActivity({ limit: 50 });
      setReassignmentEvents(result.events);
      setReassignmentSummary(result.summary);
    } catch {
      // non-fatal
    } finally {
      setLoadingReassignment(false);
    }
  }, []);

  const refreshAll = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    setLastId(null);
    setHasMore(false);
    await Promise.all([
      fetchPendingAndKpis(),
      fetchFinalized(true),
      fetchReassignment(),
    ]);
    setRefreshing(false);
  }, [fetchPendingAndKpis, fetchFinalized, fetchReassignment]);

  // ── Mount + polling ───────────────────────────────────────

  useEffect(() => {
    fetchPendingAndKpis();
    fetchFinalized();
    fetchReassignment();

    pollRef.current = setInterval(() => {
      fetchPendingAndKpis();
      fetchFinalized(true);
      fetchReassignment();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── Load more ─────────────────────────────────────────────

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const page = await adminApi.getServiceRequestsPage({
        lastId,
        limit: PAGE_LIMIT,
        mode: 'finalized',
      });
      setFinalizedItems((prev) => {
        const seen = new Set(prev.map((t) => t.id));
        return [...prev, ...page.data.filter((t) => !seen.has(t.id))];
      });
      setLastId(page.last_id);
      setHasMore(page.has_more);
    } catch (err: any) {
      notification.error({
        title: 'Load More Failed',
        message: err?.response?.data?.detail || 'Failed to load more tickets',
      });
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, lastId, notification]);

  // ── Detail modal ──────────────────────────────────────────

  const openDetail = useCallback(
    async (ticketId: number) => {
      setDetailTicket(null);
      setDetailImageUri(null);
      setDetailLoading(true);
      setDetailImageLoading(true);
      setDetailVisible(true);
      try {
        const [detail, imageBase64] = await Promise.all([
          adminApi.getServiceRequestById(ticketId),
          adminApi.getServiceRequestImageBase64(ticketId),
        ]);
        setDetailTicket(detail);
        setDetailImageUri(imageBase64);
      } catch (err: any) {
        notification.error({
          title: 'Detail Load Failed',
          message:
            err?.response?.data?.detail || 'Failed to load ticket details',
        });
        setDetailVisible(false);
      } finally {
        setDetailLoading(false);
        setDetailImageLoading(false);
      }
    },
    [notification],
  );

  const closeDetail = useCallback(() => {
    setDetailVisible(false);
    setDetailTicket(null);
    setDetailImageUri(null);
  }, []);

  // ── Review actions ────────────────────────────────────────

  const handleApprove = useCallback(
    async (ticketId: number) => {
      setReviewingId(ticketId);
      setReviewMessage('');
      setError('');
      try {
        const result = await adminApi.reviewServiceRequest(ticketId, {
          decision: 'approve',
          notes: 'Approved by admin via activity queue',
        });
        const msg = result?.message || 'Request approved and dispatched';
        setReviewMessage(msg);
        notification.success({
          title: 'Review Submitted',
          message: msg,
          dedupeKey: `admin-activity:approve:${ticketId}`,
        });
        if (detailTicket?.id === ticketId) closeDetail();
        await refreshAll(true);
      } catch (err: any) {
        const msg =
          err?.response?.data?.detail || 'Failed to approve request';
        setError(msg);
        notification.error({
          title: 'Approval Failed',
          message: msg,
          dedupeKey: `admin-activity:approve-error:${ticketId}`,
        });
      } finally {
        setReviewingId(null);
      }
    },
    [notification, detailTicket, closeDetail, refreshAll],
  );

  const handleModifyApprove = useCallback(
    async (p: {
      ticketId: number;
      final_severity: string;
      final_fault_type?: string;
      notes: string;
    }) => {
      setModalSubmitting(true);
      setReviewingId(p.ticketId);
      setReviewMessage('');
      setError('');
      try {
        const result = await adminApi.reviewServiceRequest(p.ticketId, {
          decision: 'modify_approve',
          final_severity: p.final_severity,
          final_fault_type: p.final_fault_type,
          notes: p.notes,
        });
        const msg =
          result?.message || 'Request modified and approved successfully';
        setReviewMessage(msg);
        notification.success({
          title: 'Review Submitted',
          message: msg,
          dedupeKey: `admin-activity:modify-approve:${p.ticketId}`,
        });
        setModifyTicket(null);
        if (detailTicket?.id === p.ticketId) closeDetail();
        await refreshAll(true);
      } catch (err: any) {
        const msg =
          err?.response?.data?.detail ||
          'Failed to modify and approve request';
        setError(msg);
        notification.error({
          title: 'Modify & Approve Failed',
          message: msg,
          dedupeKey: `admin-activity:modify-approve-error:${p.ticketId}`,
        });
      } finally {
        setReviewingId(null);
        setModalSubmitting(false);
      }
    },
    [notification, detailTicket, closeDetail, refreshAll],
  );

  const handleReject = useCallback(
    async (p: { ticketId: number; notes: string }) => {
      setModalSubmitting(true);
      setReviewingId(p.ticketId);
      setReviewMessage('');
      setError('');
      try {
        const result = await adminApi.reviewServiceRequest(p.ticketId, {
          decision: 'reject',
          notes: p.notes,
        });
        const msg = result?.message || 'Request rejected';
        setReviewMessage(msg);
        notification.warning({
          title: 'Request Rejected',
          message: msg,
          dedupeKey: `admin-activity:reject:${p.ticketId}`,
        });
        setRejectTicket(null);
        if (detailTicket?.id === p.ticketId) closeDetail();
        await refreshAll(true);
      } catch (err: any) {
        const msg =
          err?.response?.data?.detail || 'Failed to reject request';
        setError(msg);
        notification.error({
          title: 'Reject Failed',
          message: msg,
          dedupeKey: `admin-activity:reject-error:${p.ticketId}`,
        });
      } finally {
        setReviewingId(null);
        setModalSubmitting(false);
      }
    },
    [notification, detailTicket, closeDetail, refreshAll],
  );

  const handleReassignmentDecision = useCallback(
    async (requestId: number, decision: 'approve' | 'reject') => {
      if (!requestId || decidingId) return;
      setDecidingId(requestId);
      try {
        const result = await adminApi.decideReassignment(requestId, {
          decision,
        });
        const msg =
          result?.message ||
          (decision === 'approve'
            ? 'Reassignment approved'
            : 'Reassignment rejected');
        if (decision === 'approve') {
          notification.success({
            title: 'Reassignment Approved',
            message: msg,
            dedupeKey: `reassignment:approve:${requestId}`,
          });
        } else {
          notification.warning({
            title: 'Reassignment Rejected',
            message: msg,
            dedupeKey: `reassignment:reject:${requestId}`,
          });
        }
        await refreshAll(true);
      } catch (err: any) {
        const msg =
          err?.response?.data?.detail ||
          'Failed to submit reassignment decision';
        notification.error({
          title: 'Decision Failed',
          message: msg,
          dedupeKey: `reassignment:decision-error:${requestId}`,
        });
      } finally {
        setDecidingId(null);
      }
    },
    [notification, decidingId, refreshAll],
  );

  // ─── Render ───────────────────────────────────────────────

  const summary = reassignmentSummary;
  const byStatus = summary.by_status || {};
  const byType = summary.by_type || {};

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refreshAll()}
            tintColor={colors.primary.DEFAULT}
          />
        }
      >
        {/* ── SECTION 1: Reassignment Activity ─────────────── */}
        <Card
          title="Technician Reassignment Activity"
          subtitle="Track reassignment requests, approvals, and SLA impact"
        >
          {loadingReassignment ? (
            <Text style={styles.mutedText}>
              Loading reassignment activity...
            </Text>
          ) : (
            <>
              {/* 6 Summary stat pills */}
              <View style={styles.statRow}>
                <StatPill
                  label="Total Events"
                  value={summary.total_events ?? 0}
                />
                <StatPill
                  label="Requested"
                  value={byStatus.requested ?? byType.reassignment_requested ?? 0}
                  color="#1d4ed8"
                />
                <StatPill
                  label="Processing"
                  value={byStatus.processing ?? byType.reassignment_processing ?? 0}
                  color="#b45309"
                />
                <StatPill
                  label="Completed"
                  value={byStatus.completed ?? byType.reassignment_completed ?? 0}
                  color="#15803d"
                />
                <StatPill
                  label="Rejected"
                  value={byStatus.rejected ?? byType.reassignment_rejected ?? 0}
                  color="#b91c1c"
                />
                <StatPill
                  label="Failed"
                  value={byStatus.failed ?? byType.reassignment_failed ?? 0}
                  color="#b91c1c"
                />
              </View>

              {/* Reassignment event list */}
              <SectionTitle text="Recent Reassignment Events" />
              {reassignmentEvents.length === 0 ? (
                <Text style={styles.emptyText}>
                  No reassignment events found
                </Text>
              ) : (
                reassignmentEvents.map((ev, idx) => (
                  <ReassignmentRow
                    key={ev.id ?? idx}
                    event={ev}
                    decidingId={decidingId}
                    onView={openDetail}
                    onDecide={handleReassignmentDecision}
                  />
                ))
              )}
            </>
          )}
        </Card>

        {/* ── SECTION 2: Activity Feed ──────────────────────── */}
        <Card
          title="Activity Feed"
          subtitle="Review decisions and pending human-in-the-loop queue"
        >
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
          {reviewMessage ? (
            <Text style={styles.successText}>{reviewMessage}</Text>
          ) : null}

          {/* KPI filter buttons */}
          <View style={styles.filterRow}>
            <FilterBtn
              label="Pending HITL"
              count={kpis?.pending_hitl ?? pendingItems.length}
              active={reviewFilter === 'all'}
              onPress={() => setReviewFilter('all')}
            />
            <FilterBtn
              label="Approved"
              count={kpis?.approved ?? approvedItems.length}
              active={reviewFilter === 'approved'}
              accent="green"
              onPress={() =>
                setReviewFilter((f) => (f === 'approved' ? 'all' : 'approved'))
              }
            />
            <FilterBtn
              label="Rejected"
              count={kpis?.rejected ?? rejectedItems.length}
              active={reviewFilter === 'rejected'}
              accent="red"
              onPress={() =>
                setReviewFilter((f) => (f === 'rejected' ? 'all' : 'rejected'))
              }
            />
          </View>

          {/* Pending review queue */}
          <SectionTitle text="Pending Human Review Queue" />
          {loadingActivity ? (
            <ActivityIndicator size="small" color={colors.primary.DEFAULT} style={{ marginVertical: 12 }} />
          ) : pendingItems.length === 0 ? (
            <Text style={styles.emptyText}>No pending review items</Text>
          ) : (
            pendingItems.map((ticket) => (
              <PendingRow
                key={ticket.id}
                ticket={ticket}
                reviewingId={reviewingId}
                onView={openDetail}
                onApprove={handleApprove}
                onModify={(t) => { closeDetail(); setModifyTicket(t); }}
                onReject={(t) => { closeDetail(); setRejectTicket(t); }}
              />
            ))
          )}

          {/* Finalized section */}
          <View style={styles.finalizedHeader}>
            <Text style={styles.sectionTitle}>{finalizedTitle}</Text>
            <Text style={styles.mutedText}>
              {reviewFilter === 'approved'
                ? 'Approved only'
                : reviewFilter === 'rejected'
                ? 'Rejected only'
                : 'All finalized'}
            </Text>
          </View>

          {loadingActivity ? null : filteredItems.length === 0 ? (
            <Text style={styles.emptyText}>
              {reviewFilter === 'approved'
                ? 'No approved finalized requests found'
                : reviewFilter === 'rejected'
                ? 'No rejected finalized requests found'
                : 'No finalized requests found'}
            </Text>
          ) : (
            filteredItems.map((ticket) => (
              <FinalizedRow
                key={ticket.id}
                ticket={ticket}
                onView={openDetail}
              />
            ))
          )}

          {/* Load more */}
          {hasMore ? (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
              ) : (
                <Text style={styles.loadMoreText}>Load more tickets</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </Card>
      </ScrollView>

      {/* ── Modals ───────────────────────────────────────────── */}

      {modifyTicket ? (
        <ModifyApproveModal
          ticket={modifyTicket}
          submitting={modalSubmitting}
          onClose={() => setModifyTicket(null)}
          onSubmit={handleModifyApprove}
        />
      ) : null}

      {rejectTicket ? (
        <RejectModal
          ticket={rejectTicket}
          submitting={modalSubmitting}
          onClose={() => setRejectTicket(null)}
          onSubmit={handleReject}
        />
      ) : null}

      <DetailModal
        visible={detailVisible}
        ticket={detailTicket}
        imageUri={detailImageUri}
        loading={detailLoading}
        imageLoading={detailImageLoading}
        reviewingId={reviewingId}
        onClose={closeDetail}
        onApprove={handleApprove}
        onModify={(t) => { closeDetail(); setModifyTicket(t); }}
        onReject={(t) => { closeDetail(); setRejectTicket(t); }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 48 },

  // Section titles
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
    marginBottom: 8,
    marginTop: 4,
  },
  finalizedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    marginTop: 16,
  },

  // Stat pills
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statPill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.card,
    padding: 10,
    minWidth: 80,
  },
  statPillLabel: { fontSize: 11, color: colors.secondary.DEFAULT },
  statPillValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary.DEFAULT,
    marginTop: 2,
  },

  // Filter buttons
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: colors.card,
    padding: 10,
    alignItems: 'center',
  },
  filterBtnLabel: { fontSize: 11, color: colors.secondary.DEFAULT },
  filterBtnCount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary.DEFAULT,
    marginTop: 2,
  },

  // Table rows
  tableRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  rowLeft: { flex: 1.6, paddingRight: 8 },
  rowRight: { flex: 1, alignItems: 'flex-start' },

  ticketIdLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1d4ed8',
    textDecorationLine: 'underline',
    marginBottom: 4,
  },
  cellSmall: { fontSize: 12, color: colors.secondary.DEFAULT, marginTop: 2 },
  cellLabel: { fontSize: 10, color: colors.secondary.light, marginBottom: 2 },
  cellBold: { fontSize: 13, fontWeight: '600', color: colors.primary.DEFAULT },
  cellText: { fontSize: 12, color: colors.primary.DEFAULT, marginBottom: 2 },
  adminOverrideLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
    marginTop: 1,
  },

  // Empty / muted / error
  emptyText: {
    fontSize: 13,
    color: colors.secondary.light,
    marginVertical: 12,
    textAlign: 'center',
  },
  mutedText: { fontSize: 12, color: colors.secondary.light },
  amberText: { color: '#b45309', fontWeight: '600' },
  errorText: { color: '#dc2626', fontSize: 13, marginBottom: 8 },
  successText: {
    color: '#15803d',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },

  // Load more
  loadMoreBtn: {
    alignSelf: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 28,
    paddingVertical: 10,
    backgroundColor: colors.card,
  },
  loadMoreText: { fontSize: 13, color: colors.primary.DEFAULT, fontWeight: '500' },

  // Buttons
  btnView: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f9fafb',
  },
  btnViewText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  btnSuccess: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#15803d',
  },
  btnSuccessText: { fontSize: 12, color: colors.card, fontWeight: '600' },
  btnWarning: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#d97706',
  },
  btnWarningText: { fontSize: 12, color: colors.card, fontWeight: '600' },
  btnDanger: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#dc2626',
  },
  btnDangerText: { fontSize: 12, color: colors.card, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },

  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    justifyContent: 'flex-end',
  },

  // Severity
  severityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  severityBox: { alignItems: 'flex-start' },
  severityLabel: {
    fontSize: 10,
    color: colors.secondary.DEFAULT,
    fontWeight: '600',
    marginBottom: 4,
  },
  severityArrow: { fontSize: 18, color: colors.secondary.light },

  // Chip row (HITL triggers)
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: {
    backgroundColor: '#ede9fe',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { fontSize: 11, fontWeight: '600', color: '#5b21b6' },
  chipDetail: { fontSize: 10, color: '#6d28d9', marginTop: 1 },

  // Info cells
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  infoCell: {
    width: '47%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.card,
    marginBottom: 4,
  },
  infoCellLabel: {
    fontSize: 10,
    color: colors.secondary.light,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoCellValue: { fontSize: 13, color: colors.primary.DEFAULT, lineHeight: 18 },
  infoDetailValue: {
    fontSize: 14,
    color: colors.primary.DEFAULT,
    lineHeight: 20,
  },
  imageLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 100,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    marginTop: 8,
  },
  imageLoadingText: { fontSize: 13, color: colors.secondary.DEFAULT },
  imageCellWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.card,
    marginBottom: 8,
  },
  evidenceImage: {
    width: '100%',
    height: 260,
    borderRadius: 6,
    marginTop: 8,
    backgroundColor: '#f3f4f6',
  },

  // Modal
  modalSafe: { flex: 1, backgroundColor: '#f9fafb' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary.DEFAULT,
  },
  modalSubtitle: { fontSize: 13, color: colors.secondary.DEFAULT, marginTop: 2 },
  modalCloseBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    backgroundColor: '#f9fafb',
    marginLeft: 8,
  },
  modalCloseBtnText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  modalBody: { padding: 16, paddingBottom: 40 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 20,
  },
  centeredLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderLabel: { fontSize: 13, color: colors.secondary.DEFAULT },

  // Form fields (in modals)
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  fieldLabelUpper: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.secondary.DEFAULT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  optionalLabel: { fontWeight: '400', color: colors.secondary.light },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.card,
    fontSize: 14,
    color: colors.primary.DEFAULT,
  },
  textarea: { minHeight: 90, textAlignVertical: 'top' },

  // Severity options (replace <select>)
  pickerWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  severityOption: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
  },
  severityOptionActive: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  severityOptionText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  severityOptionTextActive: { color: colors.card },

  // Banners
  amberBanner: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  amberBannerText: { fontSize: 12, color: '#92400e', lineHeight: 18 },
  redBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  redBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7f1d1d',
    marginBottom: 6,
  },
  redBannerItem: { fontSize: 12, color: '#991b1b', marginBottom: 2 },
});
