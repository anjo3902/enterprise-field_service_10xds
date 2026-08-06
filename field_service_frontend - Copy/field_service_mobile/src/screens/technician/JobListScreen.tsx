/* ────────────────────────────────────────────────────────────
 * JobListScreen
 *
 * React Native conversion of:
 *   frontend_react/src/pages/technician/TechnicianDashboard.jsx
 *   (Assigned Jobs + AI Diagnosis tabs)
 *
 * Layout mirrors the web exactly:
 *
 *  • Link-profile amber form (when profile not linked)
 *  • Route-locked amber banner (when a job is in-progress)
 *  • Job card list (orderedActiveJobs)
 *      – Header row: #N - Job ID  |  status pill  |  action buttons
 *      – Details grid: Fault Type | Severity | Service Location | Contact
 *      – Reassignment badge / pending indicator
 *  • Completed-today strip with Submit Report / View Report
 *  • Empty state
 *
 *  Modals (all inlined):
 *    – Job Detail modal   — full info grid + image
 *    – Reassignment modal — reason picker + notes
 *
 * Reuses:
 *   • Card, StatusBadge components
 *   • technicianApi (api/technician.ts)
 *   • useNotification
 * ──────────────────────────────────────────────────────────── */

import { colors } from '../../theme/colors';
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
  Linking,
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

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  MapPin, 
  ClipboardList,
  Phone
} from 'lucide-react-native';

import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import { technicianApi, TechJob, RouteData } from '../../api/technician';
import { useNotification } from '../../providers/NotificationProvider';

// ─── Constants ────────────────────────────────────────────────

const POLL_MS = 30_000;
const LIVE_LOCATION_INTERVAL_MS = 5_000;
const REASSIGNMENT_REASONS = [
  { value: 'emergency_unavailable', label: 'Emergency — Unavailable' },
  { value: 'route_overload', label: 'Route Overload' },
  { value: 'vehicle_issue', label: 'Vehicle Issue' },
  { value: 'customer_reschedule', label: 'Customer Reschedule' },
  { value: 'skill_mismatch', label: 'Skill Mismatch' },
  { value: 'safety_issue', label: 'Safety Issue' },
  { value: 'time_constraint', label: 'Time Constraint' },
];

// ─── Pure helpers ─────────────────────────────────────────────

function toFinite(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function hasCoords(lat: number | null, lng: number | null): boolean {
  return lat !== null && lng !== null && !(lat === 0 && lng === 0);
}

function formatDate(iso?: string): string {
  if (!iso) return 'Not provided';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'Not provided' : d.toLocaleString();
}

function formatField(v: unknown): string {
  if (v === null || v === undefined) return 'Not provided';
  const s = String(v).trim();
  return s || 'Not provided';
}

function formatConfidence(job: TechJob): string {
  const c =
    job.confidence != null
      ? job.confidence
      : job.diagnosis_confidence;
  if (c == null) return '-';
  return `${Math.round(Number(c) * 100)}%`;
}

function locationLabel(job: TechJob): string {
  return job.location_zone
    ? `${job.location_text || '-'} (${job.location_zone})`
    : job.location_text || '-';
}

function severityColor(s: string): string {
  const l = s.toLowerCase();
  if (l === 'critical') return '#dc2626';
  if (l === 'high') return '#d97706';
  if (l === 'low') return '#16a34a';
  return '#4f46e5';
}

function severityBg(s: string): string {
  const l = s.toLowerCase();
  if (l === 'critical') return '#fee2e2';
  if (l === 'high') return '#fef3c7';
  if (l === 'low') return '#dcfce7';
  return '#e0e7ff';
}

// ─── Small components ─────────────────────────────────────────

function DetailCell({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined | null;
}) {
  return (
    <View style={styles.detailCell}>
      <Text style={styles.detailCellLabel}>{label}</Text>
      <Text style={styles.detailCellValue}>{String(value ?? '-')}</Text>
    </View>
  );
}

// ─── Reassignment Modal ───────────────────────────────────────

interface ReassignmentModalProps {
  jobId: number | null;
  jobDetails: { id: number; fault_type?: string; location_text?: string; severity?: string } | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: { reason: string; notes?: string }) => void;
}

function ReassignmentModal({
  jobId,
  jobDetails,
  submitting,
  onClose,
  onSubmit,
}: ReassignmentModalProps) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');

  const handleSubmit = () => {
    if (!reason) {
      setErr('Please select a reason for reassignment.');
      return;
    }
    Alert.alert(
      'Request Reassignment',
      `Request reassignment for Job #${jobId}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'default',
          onPress: () => {
            setErr('');
            onSubmit({ reason, notes: notes.trim() || undefined });
          },
        },
      ],
    );
  };

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      visible
    >
      <SafeAreaView style={styles.modalSafe}>
        <View style={styles.modalHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle}>Request Reassignment</Text>
            <Text style={styles.modalSubtitle}>Job #{jobId}</Text>
            {jobDetails?.fault_type ? (
              <Text style={styles.modalSubtitle}>
                {jobDetails.fault_type} · {jobDetails.severity || '-'}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <Text style={styles.modalCloseBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalBody}>
          <Text style={styles.fieldLabel}>
            Reason <Text style={{ color: '#dc2626' }}>*</Text>
          </Text>
          <View style={styles.reasonList}>
            {REASSIGNMENT_REASONS.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[
                  styles.reasonOption,
                  reason === r.value && styles.reasonOptionActive,
                ]}
                onPress={() => { setReason(r.value); setErr(''); }}
              >
                <Text
                  style={[
                    styles.reasonOptionText,
                    reason === r.value && styles.reasonOptionTextActive,
                  ]}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
            Notes <Text style={styles.optLabel}>(optional)</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional context for the admin reviewer…"
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
                (!reason || submitting) && styles.btnDisabled,
              ]}
              disabled={!reason || submitting}
              onPress={handleSubmit}
            >
              <Text style={styles.btnWarningText}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Job Detail Modal ─────────────────────────────────────────

interface JobDetailModalProps {
  visible: boolean;
  job: TechJob | null;
  imageUri: string | null;
  imageLoading: boolean;
  loading: boolean;
  onClose: () => void;
}

function JobDetailModal({
  visible,
  job,
  imageUri,
  imageLoading,
  loading,
  onClose,
}: JobDetailModalProps) {
  const locLabel = job
    ? job.location_zone
      ? `${job.location_text || '-'} (${job.location_zone})`
      : job.location_text || '-'
    : '-';

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
            <Text style={styles.modalTitle}>Job Detail</Text>
            <Text style={styles.modalSubtitle}>Job #{job?.id ?? '-'}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <Text style={styles.modalCloseBtnText}>Close</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centeredLoader}>
            <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
            <Text style={styles.loaderLabel}>Loading selected job</Text>
          </View>
        ) : job ? (
          <ScrollView contentContainerStyle={styles.modalBody}>
            {/* Info grid — matches web 2-col grid exactly */}
            <View style={styles.infoGrid}>
              <DetailCell label="Customer" value={job.customer_name} />
              <DetailCell label="Customer Email" value={job.customer_email} />
              <DetailCell label="Customer Contact" value={job.contact_number} />
              <DetailCell
                label="Fault & Severity"
                value={`${job.fault_type || '-'} | ${job.severity || '-'}`}
              />
              <DetailCell
                label="Final Severity"
                value={job.final_severity || job.severity}
              />
              <DetailCell label="Image Severity" value={job.image_severity} />
              <DetailCell
                label="Description Severity"
                value={job.description_severity}
              />
              <DetailCell label="Confidence" value={formatConfidence(job)} />
              <DetailCell
                label="Safety Escalation"
                value={job.safety_escalation ? 'Yes' : 'No'}
              />
              <DetailCell
                label="Safety Score"
                value={
                  job.safety_score != null
                    ? `${job.safety_score}/5`
                    : '-'
                }
              />
              <DetailCell
                label="Operational Impact"
                value={
                  job.operational_impact != null
                    ? `${job.operational_impact}/5`
                    : '-'
                }
              />
              <DetailCell
                label="Escalation Risk"
                value={
                  job.escalation_risk != null
                    ? `${job.escalation_risk}/5`
                    : '-'
                }
              />
              <DetailCell label="Status" value={job.status} />
              <DetailCell
                label="Created At"
                value={job.created_at ? formatDate(job.created_at) : '-'}
              />
            </View>

            {/* Location — full width */}
            <View style={styles.detailCellFull}>
              <Text style={styles.detailCellLabel}>Location</Text>
              <Text style={styles.detailCellValue}>{locLabel}</Text>
            </View>

            {/* Problem description */}
            <View style={styles.detailCellFull}>
              <Text style={styles.detailCellLabel}>
                Customer Problem Description
              </Text>
              <Text style={styles.detailCellValue}>
                {job.issue_description || job.description || '-'}
              </Text>
            </View>

            {/* Evidence image — authenticated base64 download mirrors Web blob pattern */}
            {imageLoading ? (
              <View style={styles.detailCellFull}>
                <Text style={styles.detailCellLabel}>
                  Customer Uploaded Image
                </Text>
                <View style={styles.imageLoadingBox}>
                  <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
                  <Text style={styles.imageLoadingText}>Loading image…</Text>
                </View>
              </View>
            ) : imageUri ? (
              <View style={styles.detailCellFull}>
                <Text style={styles.detailCellLabel}>
                  Customer Uploaded Image
                </Text>
                {console.log(`[IMG_VERIFY_RENDER] imageUri_exists=${!!imageUri} imageLoading=${imageLoading} (Error state handled natively below)`) as any}
                <Image
                  source={{ uri: imageUri }}
                  style={styles.evidenceImage}
                  resizeMode="contain"
                  onLoadStart={() => console.log('[IMG_VERIFY_NATIVE] onLoadStart fired')}
                  onLoad={() => console.log('[IMG_VERIFY_NATIVE] onLoad fired (SUCCESS)')}
                  onError={(e) => console.log(`[IMG_VERIFY_NATIVE] onError fired! Error: ${e.nativeEvent.error}`)}
                />
              </View>
            ) : (
              <View style={styles.amberBox}>
                <Text style={styles.amberBoxText}>
                  No image evidence available for this job.
                </Text>
              </View>
            )}
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Job Card ─────────────────────────────────────────────────

interface JobCardProps {
  job: TechJob;
  index: number;
  startingIds: Set<number>;
  completingIds: Set<number>;
  reassignmentJobId: number | null;
  reassignmentSubmitting: boolean;
  onViewDetails: (id: number) => void;
  onPrepareVisit: (id: number) => void;
  onStartJob: (id: number) => void;
  onCompleteJob: (id: number) => void;
  onRequestReassignment: (id: number) => void;
}

function JobCard({
  job,
  index,
  startingIds,
  completingIds,
  reassignmentJobId,
  reassignmentSubmitting,
  onViewDetails,
  onPrepareVisit,
  onStartJob,
  onCompleteJob,
  onRequestReassignment,
}: JobCardProps) {
  const statusVal = String(job.status || '').toLowerCase();
  const isLocked = job.is_locked || statusVal === 'in_progress';
  const isCompleted = statusVal === 'completed';
  const isStarting = startingIds.has(job.id);
  const isCompleting = completingIds.has(job.id);
  const reassignmentStatus = String(job.reassignment_status || '').toLowerCase();
  const isReassignmentPending =
    Boolean(job.reassignment_requested) ||
    reassignmentStatus === 'requested' ||
    reassignmentStatus === 'pending' ||
    reassignmentStatus === 'processing' ||
    (reassignmentSubmitting && reassignmentJobId === job.id);
  const isReassignmentEligible = ['assigned', 'scheduled', 'dispatched'].includes(statusVal);
  const isReassignmentBlocked = statusVal === 'in_progress';

  const severity = (job.final_severity || job.severity || 'medium').toLowerCase();
  const serviceLat = toFinite(job.latitude);
  const serviceLng = toFinite(job.longitude);
  const hasServiceCoords = hasCoords(serviceLat, serviceLng);
  const mapsUrl = hasServiceCoords
    ? `https://www.google.com/maps/search/?api=1&query=${serviceLat},${serviceLng}`
    : '';
  const locText = locationLabel(job);
  const cleanContact = String(job.contact_number || '').replace(/\D/g, '');

  const cardBorder = isLocked
    ? colors.warning
    : isCompleted
    ? '#6ee7b7'
    : colors.border;
  const cardBg = isLocked
    ? '#fffbeb'
    : isCompleted
    ? '#f0fdf4'
    : colors.card;

  const formatFaultType = (val?: string) => {
    if (!val) return '-';
    return val
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  return (
    <View style={[styles.jobCard, { borderColor: cardBorder, backgroundColor: cardBg }]}>
      {/* ── Header row ───────────────────────────────────── */}
      <View style={styles.jobCardHeader}>
        <View style={styles.jobCardHeaderLeft}>
          <Text style={styles.jobTitle}>
            #{index + 1} - Job {job.id}
          </Text>
          {isLocked ? (
            <View style={styles.pillAmber}>
              <Text style={styles.pillAmberText}>🔒 IN PROGRESS</Text>
            </View>
          ) : isCompleted ? (
            <View style={styles.pillGreen}>
              <Text style={styles.pillGreenText}>COMPLETED</Text>
            </View>
          ) : (
            <View style={styles.pillIndigo}>
              <Text style={styles.pillIndigoText}>ASSIGNED</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Details grid (MOVED UP FOR BETTER UX) ────────── */}
      <View style={styles.detailsGrid}>
        {/* Fault Type + Severity Group */}
        <View style={[styles.detailsCell, styles.detailsCellFull, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 }]}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.detailsCellLabel}>Fault Type</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Wrench size={16} color={colors.primary.DEFAULT} style={{ marginRight: 6 }} />
              <Text style={[styles.detailsCellValue, { fontSize: 16, fontWeight: '700' }]}>
                {formatFaultType(job.fault_type)}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.severityPill,
              {
                backgroundColor: severityBg(severity),
                paddingHorizontal: 10,
                paddingVertical: 6,
              },
            ]}
          >
            <Text
              style={[
                styles.severityPillText,
                { color: severityColor(severity), fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
              ]}
            >
              {severity.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Location — full width */}
        <View style={[styles.detailsCell, styles.detailsCellFull]}>
          <Text style={styles.detailsCellLabel}>Service Location</Text>
          {hasServiceCoords ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(mapsUrl)}
              style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4 }}
            >
              <MapPin size={14} color={colors.primary.DEFAULT} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.coordsLink}>
                  {serviceLat!.toFixed(6)}, {serviceLng!.toFixed(6)}
                </Text>
                {locText && locText !== '-' ? (
                  <Text style={styles.locSubText}>{locText}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ) : (
            <View style={{ marginTop: 4 }}>
              <Text style={styles.amberWarningText}>
                Coordinates unavailable for navigation.
              </Text>
              {locText && locText !== '-' ? (
                <Text style={styles.locSubText}>{locText}</Text>
              ) : null}
            </View>
          )}
        </View>

        {/* Contact — full width, optional */}
        {job.contact_number ? (
          <View style={[styles.detailsCell, styles.detailsCellFull]}>
            <Text style={styles.detailsCellLabel}>Customer Contact</Text>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}
              onPress={() => Linking.openURL(`tel:${cleanContact}`)}
            >
              <Phone size={14} color={colors.primary.DEFAULT} />
              <Text style={styles.coordsLink}>{job.contact_number}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* ── Action buttons (MOVED DOWN) ──────────────────── */}
      <View style={[styles.actionRow, { marginTop: 12 }]}>
        {/* View Details */}
        <TouchableOpacity
          style={styles.btnView}
          onPress={() => onViewDetails(job.id)}
        >
          <Text style={styles.btnViewText}>View Details</Text>
        </TouchableOpacity>

        {/* Prepare Visit (AI) — only for assigned */}
        {statusVal === 'assigned' ? (
          <TouchableOpacity
            style={styles.btnView}
            onPress={() => onPrepareVisit(job.id)}
          >
            <Text style={styles.btnViewText}>Prepare Visit (AI)</Text>
          </TouchableOpacity>
        ) : null}

        {/* Start Job — only for non-locked, non-completed */}
        {!isLocked && !isCompleted ? (
          <TouchableOpacity
            style={[styles.btnPrimary, isStarting && styles.btnDisabled]}
            disabled={isStarting}
            onPress={() => onStartJob(job.id)}
          >
            <Text style={styles.btnPrimaryText}>
              {isStarting ? 'Starting...' : '▶ Start Job'}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Mark Complete — only for locked (in_progress) */}
        {isLocked && !isCompleted ? (
          <TouchableOpacity
            style={[styles.btnSuccess, isCompleting && styles.btnDisabled]}
            disabled={isCompleting}
            onPress={() => onCompleteJob(job.id)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              {!isCompleting && <CheckCircle2 size={16} color={colors.card} style={{ marginRight: 6 }} />}
              <Text style={styles.btnSuccessText}>
                {isCompleting ? 'Completing...' : 'Mark Complete'}
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Locked Mark-Complete disabled ghost */}
        {!isLocked && !isCompleted ? (
          <View style={styles.btnGhost}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={16} color={colors.secondary.light} style={{ marginRight: 6 }} />
              <Text style={styles.btnGhostText}>Mark Complete</Text>
            </View>
          </View>
        ) : null}

        {/* Reassignment eligible */}
        {!isCompleted && !isReassignmentPending && isReassignmentEligible ? (
          <TouchableOpacity
            style={styles.btnWarning}
            onPress={() => onRequestReassignment(job.id)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={16} color="#b45309" style={{ marginRight: 6 }} />
              <Text style={styles.btnWarningText}>Request Reassignment</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Reassignment pending badge */}
        {!isCompleted && isReassignmentPending ? (
          <View style={styles.badgeAmber}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AlertTriangle size={14} color="#b45309" style={{ marginRight: 4 }} />
                <Text style={styles.badgeAmberText}>
                  {reassignmentSubmitting && reassignmentJobId === job.id
                    ? 'Requesting...'
                    : 'Reassignment Pending'}
                </Text>
              </View>
          </View>
        ) : null}

        {/* Work-started — reassignment blocked */}
        {!isCompleted && !isReassignmentPending && isReassignmentBlocked ? (
          <View style={styles.badgeGray}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AlertTriangle size={14} color="#374151" style={{ marginRight: 4 }} />
              <Text style={styles.badgeGrayText}>Work Started</Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ─── Completed-today row ──────────────────────────────────────

interface CompletedRowProps {
  job: TechJob;
  onSubmitReport: (job: TechJob) => void;
  onViewReport: (jobId: number) => void;
}

function CompletedRow({ job, onSubmitReport, onViewReport }: CompletedRowProps) {
  return (
    <View style={styles.completedRow}>
      <Text style={styles.completedRowLabel}>
        Job #{job.id} - {job.fault_type || '-'}
      </Text>
      <View style={styles.completedRowRight}>
        <Text style={styles.doneBadge}>DONE</Text>
        {!job.report_submitted ? (
          <TouchableOpacity
            style={styles.btnSuccess}
            onPress={() => onSubmitReport(job)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <CheckCircle2 size={12} color="#15803d" style={{ marginRight: 4 }} />
              <Text style={styles.btnSuccessText}>Submit Report</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.submittedBadge, { flexDirection: 'row', alignItems: 'center' }]}>
              <CheckCircle2 size={12} color="#047857" style={{ marginRight: 4 }} />
              <Text style={styles.submittedBadgeText}>Submitted</Text>
            </View>
            <TouchableOpacity
              style={styles.btnView}
              onPress={() => onViewReport(job.id)}
            >
              <Text style={styles.btnViewText}>View Report</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Diagnosis helpers — mirrors web formatTrigger + hitl render ──

/** formatTrigger — mirrors web L1659–1666 */
function formatTrigger(t: string): string {
  if (t === 'LOW_CONFIDENCE') return 'Low Confidence';
  if (t === 'CRITICAL_REQUIRES_VERIFICATION' || t === 'CRITICAL_SEVERITY') return 'Critical Review';
  if (t === 'SAFETY_ESCALATION') return 'Safety Risk';
  if (t === 'INVALID_IMAGE') return 'Invalid Image';
  if (t === 'UNLISTED_FAULT') return 'Unlisted Fault';
  return t;
}

/** parseHitlTriggers — mirrors web L1644–1654 (string or array) */
function parseHitlTriggers(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((t) => (typeof t === 'string' ? t : (t as any)?.type || 'Unknown'));
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { /* ignore */ }
  }
  return [];
}

// ─── Diagnosis Card ───────────────────────────────────────────
// Mobile stacked-card equivalent of the web's 7-column AI Diagnosis table.
// Maps: id, fault_type, severity, review_priority, diagnosis_confidence,
//       hitl_triggers, diagnosis_reason  (mirrors web aiColumns L1631–1681)

function DiagnosisCard({ job }: { job: TechJob }) {
  const triggers = parseHitlTriggers((job as any).hitl_triggers);
  const severity = (job.final_severity || job.severity || 'medium').toLowerCase();

  // Confidence — mirrors web: Math.round(Number(v) * 100) + '%'
  const confidence = (() => {
    const c = (job as any).diagnosis_confidence ?? job.confidence;
    if (c == null) return '-';
    return `${Math.round(Number(c) * 100)}%`;
  })();

  return (
    <View style={styles.diagCard}>
      {/* Row 1: Job ID + Status pills */}
      <View style={styles.diagHeader}>
        <Text style={styles.diagJobId}>Job #{job.id}</Text>
        <View style={[styles.severityPill, { backgroundColor: severityBg(severity) }]}>
          <Text style={[styles.severityPillText, { color: severityColor(severity) }]}>
            {severity.charAt(0).toUpperCase() + severity.slice(1)}
          </Text>
        </View>
      </View>

      {/* Field grid — 2-column layout */}
      <View style={styles.diagGrid}>
        {/* Fault Type */}
        <View style={styles.diagCell}>
          <Text style={styles.diagCellLabel}>FAULT TYPE</Text>
          <Text style={styles.diagCellValue}>{(job as any).fault_type || '-'}</Text>
        </View>

        {/* Priority — mirrors web review_priority render: capitalize, fallback 'normal' */}
        <View style={styles.diagCell}>
          <Text style={styles.diagCellLabel}>PRIORITY</Text>
          <Text style={styles.diagCellValue}>
            {(job as any).review_priority
              ? String((job as any).review_priority).charAt(0).toUpperCase() +
                String((job as any).review_priority).slice(1)
              : 'Normal'}
          </Text>
        </View>

        {/* Confidence */}
        <View style={styles.diagCell}>
          <Text style={styles.diagCellLabel}>CONFIDENCE</Text>
          <Text style={[styles.diagCellValue, { fontWeight: '700', color: colors.primary.DEFAULT }]}>
            {confidence}
          </Text>
        </View>

        {/* Severity (full label) */}
        <View style={styles.diagCell}>
          <Text style={styles.diagCellLabel}>SEVERITY</Text>
          <Text style={styles.diagCellValue}>
            {severity.charAt(0).toUpperCase() + severity.slice(1)}
          </Text>
        </View>
      </View>

      {/* HITL Triggers — mirrors web hitl_triggers render L1641–1677 */}
      <View style={styles.diagFieldFull}>
        <Text style={styles.diagCellLabel}>HITL TRIGGERS</Text>
        {triggers.length === 0 ? (
          <Text style={styles.diagAutoApproved}>Auto-approved (No HITL)</Text>
        ) : (
          <View style={styles.hitlRow}>
            {triggers.map((t, idx) => (
              <View key={idx} style={styles.hitlBadge}>
                <Text style={styles.hitlBadgeText}>{formatTrigger(t)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Diagnosis Notes */}
      <View style={styles.diagFieldFull}>
        <Text style={styles.diagCellLabel}>DIAGNOSIS NOTES</Text>
        <Text style={styles.diagCellValue}>
          {(job as any).diagnosis_reason || '-'}
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────

export default function JobListScreen({ navigation }: any) {
  const notification = useNotification();

  // ── Data ─────────────────────────────────────────────────
  const [activeJobs, setActiveJobs] = useState<TechJob[]>([]);
  const [completedJobs, setCompletedJobs] = useState<TechJob[]>([]);
  const [routeData, setRouteData] = useState<RouteData>({ route_order: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // ── Active tab — mirrors web activeTab state ─────────────
  const [activeTab, setActiveTab] = useState<'jobs' | 'ai'>('jobs');

  // ── Action state ─────────────────────────────────────────
  const [startingIds, setStartingIds] = useState<Set<number>>(new Set());
  const [completingIds, setCompletingIds] = useState<Set<number>>(new Set());
  const [actionError, setActionError] = useState('');

  // ── Link-profile state ───────────────────────────────────
  const [linkCode, setLinkCode] = useState('');
  const [linking, setLinking] = useState(false);

  // ── Reassignment modal ───────────────────────────────────
  const [reassignmentOpen, setReassignmentOpen] = useState(false);
  const [reassignmentJobId, setReassignmentJobId] = useState<number | null>(null);
  const [reassignmentJobDetails, setReassignmentJobDetails] = useState<{
    id: number;
    fault_type?: string;
    location_text?: string;
    severity?: string;
  } | null>(null);
  const [reassignmentSubmitting, setReassignmentSubmitting] = useState(false);

  // ── Detail modal ─────────────────────────────────────────
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailJob, setDetailJob] = useState<TechJob | null>(null);
  const [detailImageUri, setDetailImageUri] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  // Separate loading flag for authenticated image download (mirrors Web blob fetch)
  const [detailImageLoading, setDetailImageLoading] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveRef = useRef<{
    watchId: ReturnType<typeof setInterval> | null;
    activeJobId: number | null;
    lastSentAt: number;
  }>({ watchId: null, activeJobId: null, lastSentAt: 0 });
  const geoWarnRef = useRef(false);

  // ── Derived ───────────────────────────────────────────────

  const orderedActiveJobs = useMemo(() => {
    const order = routeData.route_order || [];
    if (!activeJobs.length || !order.length) return activeJobs;
    const byId = new Map(activeJobs.map((j) => [Number(j.id), j]));
    const ordered = order.map((id) => byId.get(Number(id))).filter(Boolean) as TechJob[];
    const orderedIds = new Set(ordered.map((j) => Number(j.id)));
    const rest = activeJobs.filter((j) => !orderedIds.has(Number(j.id)));
    return [...ordered, ...rest];
  }, [activeJobs, routeData]);

  const inProgressJob = useMemo(
    () => orderedActiveJobs.find((j) => String(j.status || '').toLowerCase() === 'in_progress'),
    [orderedActiveJobs],
  );

  const canLinkProfile = error
    .toLowerCase()
    .includes('technician profile is not linked');

  const hasLockedJob = orderedActiveJobs.some(
    (j) => j.is_locked || String(j.status || '').toLowerCase() === 'in_progress',
  );

  /** mergeJobsById — mirrors web mergeJobsById([orderedActiveJobs, completedJobs]) */
  const allJobs = useMemo(() => {
    const seen = new Set<number>();
    const merged: TechJob[] = [];
    for (const job of [...orderedActiveJobs, ...completedJobs]) {
      if (!seen.has(Number(job.id))) {
        seen.add(Number(job.id));
        merged.push(job);
      }
    }
    return merged;
  }, [orderedActiveJobs, completedJobs]);

  // ── Data fetch ────────────────────────────────────────────

  const fetchJobs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await technicianApi.getAssignedJobs();
      const jobs = data.jobs;
      setActiveJobs(jobs.filter((j) => String(j.status || '').toLowerCase() !== 'completed'));
      setCompletedJobs(data.completed_jobs || []);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || 'Failed to load assigned jobs';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchRoute = useCallback(async () => {
    try {
      const data = await technicianApi.getMyRoute();
      setRouteData(data || { route_order: [] });
    } catch {
      // non-fatal
    }
  }, []);

  const refreshAll = useCallback(async (silent = false) => {
    await Promise.all([fetchJobs(silent), fetchRoute()]);
  }, [fetchJobs, fetchRoute]);

  // ── Mount + polling ───────────────────────────────────────

  useEffect(() => {
    fetchJobs();
    fetchRoute();

    pollRef.current = setInterval(() => {
      fetchJobs(true);
      fetchRoute();
    }, POLL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── Live location tracking for in-progress job ────────────

  useEffect(() => {
    // React Native doesn't have navigator.geolocation — use expo-location instead.
    // This effect is a stub that matches the web lifecycle; the actual
    // Expo Location watch is added below using the same guard logic.
    if (!inProgressJob) {
      liveRef.current.activeJobId = null;
      geoWarnRef.current = false;
      return;
    }

    const jobId = inProgressJob.id;
    if (liveRef.current.activeJobId === jobId) return;
    liveRef.current.activeJobId = jobId;
    geoWarnRef.current = false;
    // Note: expo-location watch implementation goes here when expo-location is available.
    // The update callback would call technicianApi.updateLiveLocation(jobId, payload).
  }, [inProgressJob]);

  // ── Refresh handler ───────────────────────────────────────

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refreshAll();
  }, [refreshAll]);

  // ── Link profile ──────────────────────────────────────────

  const handleLinkProfile = useCallback(async () => {
    if (!linkCode.trim()) {
      notification.warning({
        title: 'Technician Code Required',
        message: 'Enter a valid technician code to link your profile.',
        dedupeKey: 'tech-jobs:link-code-required',
      });
      return;
    }
    setLinking(true);
    try {
      const result = await technicianApi.linkProfile({
        technician_code: linkCode.trim(),
      });
      notification.success({
        title: 'Profile Linked',
        message: `Linked: ${result.technician_code} - ${result.technician_name}`,
        dedupeKey: `tech-jobs:profile-linked:${result.technician_code}`,
      });
      setLinkCode('');
      await refreshAll();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || 'Failed to link technician profile';
      setActionError(msg);
      notification.error({
        title: 'Profile Link Failed',
        message: msg,
        dedupeKey: `tech-jobs:profile-link-failed`,
      });
    } finally {
      setLinking(false);
    }
  }, [linkCode, refreshAll, notification]);

  // ── Start job ─────────────────────────────────────────────

  const handleStartJob = useCallback(
    async (jobId: number) => {
      if (startingIds.has(jobId)) return;
      setStartingIds((prev) => new Set(prev).add(jobId));
      setActionError('');
      try {
        await technicianApi.startJob(jobId);
        setActiveJobs((prev) =>
          prev.map((j) =>
            j.id === jobId
              ? { ...j, status: 'in_progress', is_locked: true }
              : { ...j, is_locked: false },
          ),
        );
        notification.success({
          title: 'Job Started',
          message: `Job #${jobId} is now in progress.`,
          dedupeKey: `tech-jobs:job-started:${jobId}`,
        });
        await refreshAll(true);
      } catch (err: any) {
        const msg =
          err?.response?.data?.detail || 'Failed to start job';
        notification.error({
          title: 'Start Job Failed',
          message: msg,
          dedupeKey: `tech-jobs:start-failed:${jobId}`,
        });
      } finally {
        setStartingIds((prev) => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
      }
    },
    [startingIds, notification, refreshAll],
  );

  // ── Complete job ──────────────────────────────────────────

  const handleCompleteJob = useCallback(
    async (jobId: number) => {
      if (completingIds.has(jobId)) return;
      const job = activeJobs.find((j) => j.id === jobId);
      if (job && String(job.status || '').toLowerCase() !== 'in_progress') {
        notification.warning({
          title: 'Cannot Complete Yet',
          message: 'Start the job before marking it complete.',
          dedupeKey: 'tech-jobs:complete-before-start',
        });
        return;
      }
      setCompletingIds((prev) => new Set(prev).add(jobId));
      setActionError('');
      try {
        const result = await technicianApi.completeJob(jobId);
        const completedAt = result?.completed_at || new Date().toISOString();
        const completedJob = activeJobs.find((j) => j.id === jobId);
        setActiveJobs((prev) => prev.filter((j) => j.id !== jobId));
        setRouteData((prev) => ({
          ...prev,
          route_order: (prev.route_order || []).filter((id) => Number(id) !== jobId),
        }));
        if (completedJob) {
          setCompletedJobs((prev) => [
            { ...completedJob, status: 'completed', completed_at: completedAt },
            ...prev,
          ]);
        }
        notification.success({
          title: 'Job Completed',
          message: `Job #${jobId} marked as completed.`,
          dedupeKey: `tech-jobs:job-completed:${jobId}`,
        });
        await refreshAll(true);
      } catch (err: any) {
        const msg =
          err?.response?.data?.detail || 'Failed to mark job as completed';
        notification.error({
          title: 'Complete Job Failed',
          message: msg,
          dedupeKey: `tech-jobs:complete-failed:${jobId}`,
        });
      } finally {
        setCompletingIds((prev) => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
      }
    },
    [activeJobs, completingIds, notification, refreshAll],
  );

  // ── Request reassignment ──────────────────────────────────

  const handleRequestReassignment = useCallback(
    (jobId: number) => {
      const job = activeJobs.find((j) => j.id === jobId);
      if (!job) {
        notification.warning({
          title: 'Job Not Found',
          message: 'Unable to locate job for reassignment.',
          dedupeKey: 'tech-jobs:job-not-found',
        });
        return;
      }

      const status = String(job.status || '').toLowerCase();
      if (status === 'in_progress') {
        notification.warning({
          title: 'Work Started',
          message: 'Reassignment is not allowed after work has started.',
          dedupeKey: `tech-jobs:reassignment-in-progress:${job.id}`,
        });
        return;
      }
      if (['completed', 'cancelled', 'canceled', 'closed', 'failed'].includes(status)) {
        notification.warning({
          title: 'Reassignment Unavailable',
          message: 'Cannot request reassignment for a closed job.',
          dedupeKey: `tech-jobs:reassignment-closed:${job.id}`,
        });
        return;
      }
      if (!['assigned', 'scheduled', 'dispatched'].includes(status)) {
        notification.warning({
          title: 'Reassignment Unavailable',
          message: 'Reassignment is only allowed before work starts.',
          dedupeKey: `tech-jobs:reassignment-not-eligible:${job.id}`,
        });
        return;
      }

      const reassignStatus = String(job.reassignment_status || '').toLowerCase();
      if (
        job.reassignment_requested ||
        reassignStatus === 'requested' ||
        reassignStatus === 'pending' ||
        reassignStatus === 'processing'
      ) {
        notification.info({
          title: 'Reassignment Pending',
          message: `Job #${job.id} already has a reassignment request in progress.`,
          dedupeKey: `tech-jobs:reassignment-pending:${job.id}`,
        });
        return;
      }

      setReassignmentJobId(jobId);
      setReassignmentJobDetails({
        id: job.id,
        fault_type: job.fault_type,
        location_text: job.location_text,
        severity: job.severity,
      });
      setReassignmentOpen(true);
    },
    [activeJobs, notification],
  );

  const handleReassignmentSubmit = useCallback(
    async (payload: { reason: string; notes?: string }) => {
      if (reassignmentSubmitting || !reassignmentJobId) return;
      setReassignmentSubmitting(true);
      const targetId = reassignmentJobId;
      try {
        await technicianApi.requestReassignment(targetId, payload);
        setActiveJobs((prev) =>
          prev.map((j) =>
            j.id === targetId
              ? { ...j, reassignment_requested: true, reassignment_status: 'requested' }
              : j,
          ),
        );
        notification.success({
          title: 'Reassignment Requested',
          message: `Job #${targetId} reassignment request submitted for admin approval.`,
          dedupeKey: `tech-jobs:reassignment-requested:${targetId}`,
        });
        setReassignmentOpen(false);
        setReassignmentJobId(null);
        setReassignmentJobDetails(null);
        await refreshAll(true);
      } catch (err: any) {
        const msg =
          err?.response?.data?.detail || 'Failed to request reassignment';
        notification.error({
          title: 'Reassignment Request Failed',
          message: msg,
          dedupeKey: `tech-jobs:reassignment-failed:${targetId}`,
        });
      } finally {
        setReassignmentSubmitting(false);
      }
    },
    [reassignmentJobId, reassignmentSubmitting, notification, refreshAll],
  );

  // ── Open detail modal ─────────────────────────────────────

  const openDetail = useCallback(
    async (jobId: number) => {
      setDetailJob(null);
      setDetailImageUri(null);
      setDetailLoading(true);
      setDetailImageLoading(true);
      setDetailVisible(true);
      try {
        // Fetch job metadata and image in parallel — mirrors Web's useDetailModal
        // which calls fetchDetail(id) and fetchImageBlob(id) independently.
        const [job, imageDataUri] = await Promise.all([
          technicianApi.getJobById(jobId),
          technicianApi.getJobImageBase64(jobId),  // authenticated download → base64
        ]);
        setDetailJob(job);
        setDetailImageUri(imageDataUri);  // null = no image uploaded
        console.log(`[IMG_VERIFY_STATE] state_assigned=Y type=${typeof imageDataUri} length=${imageDataUri?.length ?? 0}`);

      } catch (err: any) {
        notification.error({
          title: 'Load Failed',
          message:
            err?.response?.data?.detail || 'Failed to load job details',
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
    setDetailJob(null);
    setDetailImageUri(null);
    setDetailImageLoading(false);
  }, []);

  // ── Prepare Visit (AI) ────────────────────────────────────

  const handlePrepareVisit = useCallback(
    (jobId: number) => {
      navigation.navigate('PrevisitBriefing', { jobId });
    },
    [navigation],
  );

  // ── Submit / View report ──────────────────────────────────

  const handleSubmitReport = useCallback(
    (job: TechJob) => {
      navigation.navigate('ReportWorkflow', { jobId: job.id });
    },
    [navigation],
  );

  const handleViewReport = useCallback(
    (jobId: number) => {
      navigation.navigate('ReportWorkflow', { jobId });
    },
    [navigation],
  );

  // ─── Render ───────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary.DEFAULT}
          />
        }
      >
        <Card
          title="Assigned Jobs Workspace"
          subtitle="Track assigned jobs and AI diagnosis details"
        >
          <Text style={styles.contextNote}>
            Use the Profile Details menu to manage technician profile data.
          </Text>

          {/* Loading state */}
          {loading ? (
            <View style={styles.centeredLoader}>
              <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
              <Text style={styles.loaderLabel}>Loading assigned jobs</Text>
              <Text style={styles.loaderDetail}>
                Fetching assigned jobs, AI diagnosis details, and route information.
              </Text>
            </View>
          ) : null}

          {/* Error */}
          {error && !canLinkProfile ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxTitle}>Technician Workspace</Text>
              <Text style={styles.errorBoxText}>{error}</Text>
            </View>
          ) : null}

          {/* Action error */}
          {actionError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxTitle}>Action Failed</Text>
              <Text style={styles.errorBoxText}>{actionError}</Text>
              <TouchableOpacity
                onPress={() => setActionError('')}
                style={{ marginTop: 6 }}
              >
                <Text style={{ fontSize: 12, color: colors.secondary.DEFAULT }}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Link-profile form */}
          {canLinkProfile ? (
            <View style={styles.linkProfileBox}>
              <Text style={styles.linkProfileTitle}>
                Link your technician profile to continue
              </Text>
              <Text style={styles.linkProfileSubtitle}>
                Enter your assigned technician code (example: TCH-0001).
              </Text>
              <View style={styles.linkProfileRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={linkCode}
                  onChangeText={(t) => setLinkCode(t.toUpperCase())}
                  placeholder="TCH-0001"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={[styles.btnPrimary, linking && styles.btnDisabled, { marginLeft: 8 }]}
                  disabled={linking}
                  onPress={handleLinkProfile}
                >
                  <Text style={styles.btnPrimaryText}>
                    {linking ? 'Linking...' : 'Link Profile'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* ── Tab toggle — mirrors web workspace-tab-group ─── */}
          {!loading && !error ? (
            <View style={styles.tabGroup}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'jobs' && styles.tabBtnActive]}
                onPress={() => setActiveTab('jobs')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ClipboardList size={16} color={activeTab === 'jobs' ? colors.primary.DEFAULT : colors.secondary.DEFAULT} />
                  <Text style={[styles.tabBtnText, activeTab === 'jobs' && styles.tabBtnTextActive]}>
                    Assigned Jobs
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'ai' && styles.tabBtnActive]}
                onPress={() => setActiveTab('ai')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={16} color={activeTab === 'ai' ? colors.primary.DEFAULT : colors.secondary.DEFAULT} />
                  <Text style={[styles.tabBtnText, activeTab === 'ai' && styles.tabBtnTextActive]}>
                    AI Diagnosis
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* ── ASSIGNED JOBS tab content ─────────────────────── */}
          {activeTab === 'jobs' ? (
            <>
              {/* Route locked banner */}
              {!loading && hasLockedJob ? (
                <View style={styles.lockedBanner}>
                  <Text style={styles.lockedBannerText}>
                    <Text style={{ fontWeight: '700' }}>Route Locked</Text> — the{' '}
                    <Text style={{ fontStyle: 'italic' }}>In Progress</Text> job is
                    pinned first in your route. Remaining jobs are dynamically
                    re-optimized as you move.
                  </Text>
                </View>
              ) : null}

              {/* Job cards */}
              {!loading && !error
                ? orderedActiveJobs.map((job, idx) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      index={idx}
                      startingIds={startingIds}
                      completingIds={completingIds}
                      reassignmentJobId={reassignmentJobId}
                      reassignmentSubmitting={reassignmentSubmitting}
                      onViewDetails={openDetail}
                      onPrepareVisit={handlePrepareVisit}
                      onStartJob={handleStartJob}
                      onCompleteJob={handleCompleteJob}
                      onRequestReassignment={handleRequestReassignment}
                    />
                  ))
                : null}

              {/* Completed today */}
              {!loading && completedJobs.length > 0 ? (
                <View style={styles.completedSection}>
                  <Text style={styles.completedSectionTitle}>COMPLETED TODAY</Text>
                  {completedJobs.map((job) => (
                    <CompletedRow
                      key={job.id}
                      job={job}
                      onSubmitReport={handleSubmitReport}
                      onViewReport={handleViewReport}
                    />
                  ))}
                </View>
              ) : null}

              {/* Empty state */}
              {!loading && !error && orderedActiveJobs.length === 0 && completedJobs.length === 0 ? (
                <Text style={styles.emptyText}>
                  No active assigned jobs right now. New dispatches will appear
                  here automatically.
                </Text>
              ) : null}
            </>
          ) : null}

          {/* ── AI DIAGNOSIS tab content ──────────────────────── */}
          {activeTab === 'ai' ? (
            <>
              {!loading && allJobs.length === 0 ? (
                <Text style={styles.emptyText}>No diagnosis records found.</Text>
              ) : null}
              {!loading
                ? allJobs.map((job) => (
                    <DiagnosisCard key={job.id} job={job} />
                  ))
                : null}
            </>
          ) : null}
        </Card>
      </ScrollView>

      {/* ── Modals ───────────────────────────────────────────── */}

      <JobDetailModal
        visible={detailVisible}
        job={detailJob}
        imageUri={detailImageUri}
        imageLoading={detailImageLoading}
        loading={detailLoading}
        onClose={closeDetail}
      />

      {reassignmentOpen ? (
        <ReassignmentModal
          jobId={reassignmentJobId}
          jobDetails={reassignmentJobDetails}
          submitting={reassignmentSubmitting}
          onClose={() => {
            setReassignmentOpen(false);
            setReassignmentJobId(null);
            setReassignmentJobDetails(null);
          }}
          onSubmit={handleReassignmentSubmit}
        />
      ) : null}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Context
  contextNote: { fontSize: 11, color: colors.secondary.DEFAULT, marginBottom: 12 },

  // Loading
  centeredLoader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  loaderLabel: { fontSize: 14, color: '#374151', fontWeight: '600' },
  loaderDetail: {
    fontSize: 12,
    color: colors.secondary.DEFAULT,
    textAlign: 'center',
    paddingHorizontal: 24,
  },

  // Error
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorBoxTitle: { fontSize: 12, fontWeight: '700', color: '#991b1b', marginBottom: 4 },
  errorBoxText: { fontSize: 13, color: '#7f1d1d' },
  errorText: { color: '#dc2626', fontSize: 12, marginTop: 6 },

  // Link profile
  linkProfileBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  linkProfileTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78350f',
    marginBottom: 4,
  },
  linkProfileSubtitle: { fontSize: 11, color: '#92400e', marginBottom: 10 },
  linkProfileRow: { flexDirection: 'row', alignItems: 'center' },

  // Route locked banner
  lockedBanner: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  lockedBannerText: { fontSize: 13, color: '#92400e', lineHeight: 19 },

  // Job card
  jobCard: {
    borderWidth: 2,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  jobCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  jobCardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  jobTitle: { fontSize: 14, fontWeight: '700', color: '#374151' },

  // Status pills
  pillAmber: {
    backgroundColor: '#fef3c7',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillAmberText: { fontSize: 10, fontWeight: '700', color: '#92400e' },
  pillGreen: {
    backgroundColor: '#d1fae5',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillGreenText: { fontSize: 10, fontWeight: '700', color: '#065f46' },
  pillIndigo: {
    backgroundColor: '#e0e7ff',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillIndigoText: { fontSize: 10, fontWeight: '600', color: colors.primary.DEFAULT },

  // Action row
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },

  // Details grid
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  detailsCell: { width: '47%' },
  detailsCellRight: { alignItems: 'flex-end' },
  detailsCellFull: { width: '100%' },
  detailsCellLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.secondary.light,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  detailsCellValue: { fontSize: 13, color: colors.primary.DEFAULT, fontWeight: '500' },
  coordsLink: {
    fontSize: 13,
    color: '#2563eb',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  locSubText: { fontSize: 11, color: colors.secondary.DEFAULT, marginTop: 2 },
  amberWarningText: { fontSize: 13, color: '#b45309' },

  // Severity pill
  severityPill: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  severityPillText: { fontSize: 12, fontWeight: '700' },

  // Badges
  badgeAmber: {
    borderWidth: 1,
    borderColor: '#fcd34d',
    backgroundColor: '#fffbeb',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'center',
  },
  badgeAmberText: { fontSize: 11, fontWeight: '600', color: '#b45309' },
  badgeGray: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'center',
  },
  badgeGrayText: { fontSize: 11, fontWeight: '600', color: colors.secondary.DEFAULT },

  // Completed section
  completedSection: { marginTop: 8 },
  completedSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.secondary.light,
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 6,
  },
  completedRowLabel: { fontSize: 13, color: '#374151', flex: 1 },
  completedRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  doneBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  submittedBadge: {
    backgroundColor: '#d1fae5',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  submittedBadgeText: { fontSize: 11, fontWeight: '700', color: '#065f46' },

  // Empty
  emptyText: {
    fontSize: 12,
    color: colors.secondary.light,
    marginTop: 12,
    textAlign: 'center',
  },

  // Buttons
  btnView: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f9fafb',
  },
  btnViewText: { fontSize: 12, fontWeight: '500', color: '#374151' },
  btnPrimary: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.primary.DEFAULT,
  },
  btnPrimaryText: { fontSize: 12, fontWeight: '600', color: colors.card },
  btnSuccess: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#15803d',
  },
  btnSuccessText: { fontSize: 12, fontWeight: '600', color: colors.card },
  btnWarning: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#d97706',
  },
  btnWarningText: { fontSize: 12, fontWeight: '600', color: colors.card },
  btnGhost: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
  },
  btnGhostText: { fontSize: 12, fontWeight: '600', color: colors.secondary.light },
  btnDisabled: { opacity: 0.5 },

  // Amber box
  amberBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  amberBoxText: { fontSize: 13, color: '#92400e' },

  // ── Modal ────────────────────────────────────────────────

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
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.primary.DEFAULT },
  modalSubtitle: { fontSize: 12, color: colors.secondary.DEFAULT, marginTop: 2 },
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

  // Detail grid
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  detailCell: {
    width: '47%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.card,
  },
  detailCellFull: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.card,
    marginBottom: 8,
  },
  detailCellLabel: {
    fontSize: 10,
    color: colors.secondary.light,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailCellValue: { fontSize: 13, color: colors.primary.DEFAULT, lineHeight: 18 },
  evidenceImage: {
    width: '100%',
    height: 280,
    borderRadius: 6,
    marginTop: 8,
    backgroundColor: '#f3f4f6',
  },
  // Image loading state — shown while authenticated download is in-flight
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


  // Form
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  optLabel: { fontWeight: '400', color: colors.secondary.light },
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

  // Reason options
  reasonList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonOption: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
  },
  reasonOptionActive: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  reasonOptionText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  reasonOptionTextActive: { color: colors.card },

  // ── Tab toggle — mirrors web workspace-tab-group ──────────
  tabGroup: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  tabBtnActive: {
    backgroundColor: colors.primary.DEFAULT,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary.DEFAULT,
  },
  tabBtnTextActive: {
    color: colors.card,
  },

  // ── Diagnosis Card ────────────────────────────────────────
  diagCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.card,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  diagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  diagJobId: { fontSize: 14, fontWeight: '700', color: colors.primary.DEFAULT },
  diagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  diagCell: { width: '47%' },
  diagFieldFull: { marginBottom: 10 },
  diagCellLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.secondary.light,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  diagCellValue: { fontSize: 13, color: '#374151', lineHeight: 18 },
  diagAutoApproved: { fontSize: 12, color: colors.secondary.light, fontStyle: 'italic' },

  // HITL badges — mirrors web hitl-badge class
  hitlRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  hitlBadge: {
    backgroundColor: '#ede9fe',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  hitlBadgeText: { fontSize: 11, fontWeight: '600', color: '#6d28d9' },
});
