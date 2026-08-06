/* ────────────────────────────────────────────────────────────
 * OperationsDashboardScreen
 *
 * React Native conversion of:
 *   frontend_react/src/pages/admin/AdminDashboard.jsx
 *
 * Layout mirrors the web exactly:
 *   • Card wrapper — "Admin Dashboard" / "Track service tickets
 *     and dispatch status"
 *   • KPI row — Operational Queue | Pending HITL | Total Requests
 *   • Scrollable ticket list (operational tickets only)
 *   • Load More button
 *   • Detail bottom-sheet modal — all fields + image + AI reasoning
 *     + HITL trigger chips
 *
 * Reuses:
 *   • Card, StatusBadge components
 *   • adminApi (new api/admin.ts)
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
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import { adminApi, AdminTicket, AdminKpis, HitlTrigger } from '../../api/admin';
import { useNotification } from '../../providers/NotificationProvider';

// ─── Constants ───────────────────────────────────────────────

const POLL_INTERVAL_MS = 30_000;
const PAGE_LIMIT = 20;

// ─── Helpers ─────────────────────────────────────────────────

function formatTechnicianName(ticket: AdminTicket): string {
  if (ticket.technician_name) return ticket.technician_name;
  if (ticket.assigned_technician_name) return ticket.assigned_technician_name;
  return '-';
}

function formatTechnicianSource(ticket: AdminTicket): string {
  return ticket.technician_source || ticket.assigned_technician_source || '-';
}

function formatDate(iso?: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString();
}

function formatConfidence(ticket: AdminTicket): string {
  const raw =
    ticket.confidence != null
      ? ticket.confidence
      : ticket.diagnosis_confidence;
  if (raw == null) return '-';
  return `${Math.round(Number(raw) * 100)}%`;
}

// ─── HITL Trigger chips ──────────────────────────────────────

function TriggerChip({ trigger }: { trigger: HitlTrigger }) {
  const label =
    trigger.label ||
    trigger.reason ||
    trigger.trigger ||
    'Unknown trigger';
  const detail = trigger.description || trigger.detail || '';
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
      {detail ? <Text style={styles.chipDetail}>{detail}</Text> : null}
    </View>
  );
}

function TriggerBadgeList({ triggers }: { triggers?: HitlTrigger[] }) {
  if (!triggers || triggers.length === 0) {
    return <Text style={styles.secondaryText}>None</Text>;
  }
  return (
    <View style={styles.chipRow}>
      {triggers.map((t, i) => (
        <TriggerChip key={i} trigger={t} />
      ))}
    </View>
  );
}

// ─── KPI Card ────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number | null;
  loading: boolean;
  accent?: boolean;
}
function KpiCard({ label, value, loading, accent }: KpiCardProps) {
  return (
    <View style={[styles.kpiCard, accent && styles.kpiCardAccent]}>
      <Text style={[styles.kpiLabel, accent && styles.kpiLabelAccent]}>
        {label}
      </Text>
      {loading && value == null ? (
        <ActivityIndicator
          size="small"
          color={accent ? '#92400e' : colors.secondary.DEFAULT}
          style={{ marginTop: 4 }}
        />
      ) : (
        <Text style={[styles.kpiValue, accent && styles.kpiValueAccent]}>
          {value ?? '-'}
        </Text>
      )}
    </View>
  );
}

// ─── Detail Modal ────────────────────────────────────────────

interface DetailModalProps {
  visible: boolean;
  ticket: AdminTicket | null;
  imageUri: string | null;
  loading: boolean;
  imageLoading?: boolean;
  onClose: () => void;
}

function DetailModal({
  visible,
  ticket,
  imageUri,
  loading,
  imageLoading,
  onClose,
}: DetailModalProps) {
  const allTriggers = useMemo(() => {
    if (!ticket) return [];
    return [
      ...(ticket.diagnosis_payload?.hitl_trigger_details || []),
      ...(ticket.hitl_triggers || []),
    ];
  }, [ticket]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalSafe}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle}>Request Detail & AI Review</Text>
            <Text style={styles.modalSubtitle}>
              Ticket #{ticket?.id ?? '-'}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Close Details</Text>
          </TouchableOpacity>
        </View>

        {/* Body */}
        {loading ? (
          <View style={styles.centeredLoader}>
            <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
            <Text style={styles.loaderLabel}>Loading ticket information</Text>
          </View>
        ) : ticket ? (
          <ScrollView contentContainerStyle={styles.modalBody}>
            {/* Grid fields — mirrors web 2-column grid */}
            <View style={styles.detailGrid}>
              <DetailBox label="Customer" value={ticket.customer_name} />
              <DetailBox
                label="Created At"
                value={ticket.created_at
                  ? formatDate(ticket.created_at)
                  : undefined}
              />
              <DetailBox
                label="Fault & Severity"
                value={`${ticket.fault_type ?? '-'} | ${ticket.severity ?? '-'}`}
              />
              <DetailBox
                label="Final Severity"
                value={ticket.final_severity || ticket.severity}
              />
              <DetailBox
                label="Image Severity"
                value={ticket.image_severity}
              />
              <DetailBox
                label="Description Severity"
                value={ticket.description_severity}
              />
              <DetailBox label="Confidence" value={formatConfidence(ticket)} />
              <DetailBox
                label="Safety Escalation"
                value={ticket.safety_escalation ? 'Yes' : 'No'}
              />
              <DetailBox
                label="Assigned Technician"
                value={formatTechnicianName(ticket)}
              />
              <DetailBox
                label="Technician Source"
                value={formatTechnicianSource(ticket)}
              />
            </View>

            {/* Full-width: issue description */}
            <View style={styles.detailBoxFull}>
              <Text style={styles.detailLabel}>Issue Description</Text>
              <Text style={styles.detailValue}>
                {ticket.issue_description ?? '-'}
              </Text>
            </View>

            {/* Image evidence */}
            <View style={styles.detailBoxFull}>
              <Text style={styles.detailLabel}>Uploaded Evidence Image</Text>
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
                <View style={styles.amberBox}>
                  <Text style={styles.amberText}>
                    No image evidence available for this ticket.
                  </Text>
                </View>
              )}
            </View>

            {/* AI Reasoning */}
            <View style={styles.detailBoxFull}>
              <Text style={styles.detailLabel}>AI Reasoning</Text>
              <Text style={styles.detailValue}>
                {ticket.final_reasoning || ticket.diagnosis_reason || '-'}
              </Text>
            </View>

            {/* HITL Triggers */}
            <View style={styles.detailBoxFull}>
              <Text style={styles.detailLabel}>HITL Triggers</Text>
              <TriggerBadgeList triggers={allTriggers} />
            </View>
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

function DetailBox({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <View style={styles.detailBox}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value ?? '-'}</Text>
    </View>
  );
}

// ─── Ticket Row ───────────────────────────────────────────────

interface TicketRowProps {
  ticket: AdminTicket;
  onViewDetails: (id: number) => void;
}

function TicketRow({ ticket, onViewDetails }: TicketRowProps) {
  return (
    <View style={styles.tableRow}>
      {/* Left column */}
      <View style={styles.rowLeft}>
        <Text style={styles.ticketId}>#{ticket.id}</Text>
        <Text style={styles.techName}>{formatTechnicianName(ticket)}</Text>
        <Text style={styles.createdAt}>{formatDate(ticket.created_at)}</Text>
      </View>

      {/* Right column — badges + action */}
      <View style={styles.rowRight}>
        <StatusBadge value={ticket.priority || 'normal'} />
        <View style={{ height: 4 }} />
        <StatusBadge value={ticket.severity || '-'} />
        <View style={{ height: 4 }} />
        <StatusBadge value={ticket.status || '-'} />
        <TouchableOpacity
          style={styles.viewBtn}
          onPress={() => onViewDetails(ticket.id)}
          testID="admin-view-details"
        >
          <Text style={styles.viewBtnText}>👁 View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Column headers ───────────────────────────────────────────

function TableHeader() {
  return (
    <View style={styles.tableHeader}>
      <Text style={[styles.thCell, { flex: 1.4 }]}>
        ID / Technician / Date
      </Text>
      <Text style={[styles.thCell, { flex: 1 }]}>Priority / Severity / Status</Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────

export default function OperationsDashboardScreen() {
  const notification = useNotification();

  // ── Data state ───────────────────────────────────────────
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [kpis, setKpis] = useState<AdminKpis | null>(null);
  const [lastId, setLastId] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [kpisLoading, setKpisLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // ── Detail modal state ───────────────────────────────────
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailTicket, setDetailTicket] = useState<AdminTicket | null>(null);
  const [detailImageUri, setDetailImageUri] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailImageLoading, setDetailImageLoading] = useState(false);

  // ── Polling ref ──────────────────────────────────────────
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Derived: operational tickets (not pending_review) ───
  const operationsItems = useMemo(
    () =>
      tickets.filter(
        (t) => String(t.status || '').toLowerCase() !== 'pending_review',
      ),
    [tickets],
  );

  // ── KPI derived values ────────────────────────────────────
  const totalCount = kpis ? kpis.total : tickets.length;
  const pendingHitlCount = kpis
    ? kpis.pending_hitl
    : tickets.filter(
        (t) => String(t.status || '').toLowerCase() === 'pending_review',
      ).length;
  const operationalCount = kpis
    ? kpis.total - kpis.pending_hitl
    : operationsItems.length;

  // ── Fetch KPIs ────────────────────────────────────────────
  const fetchKpis = useCallback(async () => {
    try {
      setKpisLoading(true);
      const data = await adminApi.getKpis({ exclude_e2e: true });
      setKpis(data);
    } catch {
      // KPI failures are non-blocking
    } finally {
      setKpisLoading(false);
    }
  }, []);

  // ── Fetch first page of tickets ───────────────────────────
  const fetchTickets = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const page = await adminApi.getServiceRequestsPage({
        limit: PAGE_LIMIT,
        mode: 'finalized',
        exclude_e2e: true,
      });
      setTickets(page.data);
      setLastId(page.last_id);
      setHasMore(page.has_more);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || 'Failed to load admin tickets';
      setError(msg);
      if (!silent) {
        notification.error({ title: 'Load Failed', message: msg });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [notification]);

  // ── Load more ─────────────────────────────────────────────
  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const page = await adminApi.getServiceRequestsPage({
        lastId,
        limit: PAGE_LIMIT,
        mode: 'finalized',
        exclude_e2e: true,
      });
      setTickets((prev) => {
        const seen = new Set(prev.map((t) => t.id));
        const next = page.data.filter((t) => !seen.has(t.id));
        return [...prev, ...next];
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

  // ── Refresh ───────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setLastId(null);
    setHasMore(false);
    setTickets([]);
    fetchTickets(true);
    fetchKpis();
  }, [fetchTickets, fetchKpis]);

  // ── Open detail modal ─────────────────────────────────────
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
            err?.response?.data?.detail ||
            'Failed to load ticket information',
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

  // ── Mount / polling ───────────────────────────────────────
  useEffect(() => {
    fetchTickets();
    fetchKpis();

    pollRef.current = setInterval(() => {
      fetchTickets(true);
      fetchKpis();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ─── Render ───────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={operationsItems}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary.DEFAULT}
          />
        }
        ListHeaderComponent={
          <Card
            title="Admin Dashboard"
            subtitle="Track service tickets and dispatch status"
          >
            {/* Error */}
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            {/* KPI Row — mirrors web grid-cols-3 */}
            <View style={styles.kpiRow}>
              <KpiCard
                label="Operational Queue"
                value={operationalCount}
                loading={kpisLoading}
              />
              <KpiCard
                label="Pending HITL"
                value={pendingHitlCount}
                loading={kpisLoading}
                accent
              />
              <KpiCard
                label="Total Requests"
                value={totalCount}
                loading={kpisLoading}
              />
            </View>

            {/* Context notes — mirrors web <p> text */}
            <Text style={styles.contextNote}>
              Operations tracking shows dispatch execution data. HITL review
              decisions are handled in the separate Activity tab.
            </Text>
            <Text style={[styles.contextNote, { marginTop: 4 }]}>
              Customer Location is loaded directly from service request
              location data stored in the database.
            </Text>

            {/* Table header */}
            {loading ? (
              <ActivityIndicator
                size="large"
                color={colors.primary.DEFAULT}
                style={{ marginVertical: 24 }}
              />
            ) : (
              <TableHeader />
            )}
          </Card>
        }
        renderItem={({ item }) => (
          <TicketRow ticket={item} onViewDetails={openDetail} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>
              No operational tickets available
            </Text>
          ) : null
        }
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
              ) : (
                <Text style={styles.loadMoreText}>Load More Tickets</Text>
              )}
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Detail Modal */}
      <DetailModal
        visible={detailVisible}
        ticket={detailTicket}
        imageUri={detailImageUri}
        loading={detailLoading}
        imageLoading={detailImageLoading}
        onClose={closeDetail}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // ── Error ──────────────────────────────────────────────────
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    marginBottom: 12,
  },

  // ── KPI ───────────────────────────────────────────────────
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.card,
    padding: 12,
  },
  kpiCardAccent: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
  },
  kpiLabel: {
    fontSize: 11,
    color: colors.secondary.DEFAULT,
    flexWrap: 'wrap',
  },
  kpiLabelAccent: {
    color: '#92400e',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary.DEFAULT,
    marginTop: 4,
  },
  kpiValueAccent: {
    color: '#78350f',
  },

  // ── Context notes ─────────────────────────────────────────
  contextNote: {
    fontSize: 12,
    color: colors.secondary.DEFAULT,
    marginBottom: 8,
    lineHeight: 18,
  },

  // ── Table header ─────────────────────────────────────────
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
    marginTop: 8,
  },
  thCell: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
  },

  // ── Ticket row ────────────────────────────────────────────
  tableRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 2,
  },
  rowLeft: {
    flex: 1.4,
    paddingRight: 8,
  },
  rowRight: {
    flex: 1,
    alignItems: 'flex-start',
  },
  ticketId: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary.DEFAULT,
    marginBottom: 4,
  },
  techName: {
    fontSize: 13,
    color: colors.secondary.DEFAULT,
    marginBottom: 2,
  },
  createdAt: {
    fontSize: 11,
    color: colors.secondary.light,
  },
  viewBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f9fafb',
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
  },
  separator: {
    height: 6,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.secondary.DEFAULT,
    fontSize: 14,
    marginVertical: 24,
  },

  // ── Load more ─────────────────────────────────────────────
  loadMoreBtn: {
    alignSelf: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: colors.card,
  },
  loadMoreText: {
    fontSize: 14,
    color: colors.primary.DEFAULT,
    fontWeight: '500',
  },

  // ── Detail Modal ─────────────────────────────────────────
  modalSafe: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
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
  modalSubtitle: {
    fontSize: 13,
    color: colors.secondary.DEFAULT,
    marginTop: 2,
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    backgroundColor: '#f9fafb',
    marginLeft: 8,
  },
  closeBtnText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  centeredLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderLabel: {
    fontSize: 14,
    color: colors.secondary.DEFAULT,
  },
  modalBody: {
    padding: 16,
    gap: 12,
  },

  // Detail fields
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  detailBox: {
    width: '47%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
  },
  detailBoxFull: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    marginTop: 10,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.secondary.DEFAULT,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '600',
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 14,
    color: colors.primary.DEFAULT,
    lineHeight: 20,
  },
  secondaryText: {
    fontSize: 13,
    color: colors.secondary.light,
  },

  // Image
  evidenceImage: {
    width: '100%',
    height: 280,
    borderRadius: 6,
    marginTop: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#f3f4f6',
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

  // Amber warning box
  amberBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 8,
    padding: 14,
    marginTop: 10,
  },
  amberText: {
    fontSize: 13,
    color: '#92400e',
  },

  // HITL trigger chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    backgroundColor: '#ede9fe',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5b21b6',
  },
  chipDetail: {
    fontSize: 11,
    color: '#6d28d9',
    marginTop: 2,
  },
});
