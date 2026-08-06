/* ────────────────────────────────────────────────────────────
 * CustomerDashboardScreen
 *
 * React Native conversion of:
 *   frontend_react/src/pages/customer/CustomerDashboard.jsx
 *
 * Full parity with web including:
 *   • Request table with View Details
 *   • Detail modal with all fields
 *   • Live Technician Tracking panel (useLiveTracking hook)
 *     – Status stepper (Assigned → On the way → Completed)
 *     – ETA display
 *     – Distance display
 *     – Reassignment banner
 *     – Technician info with zone
 *     – "Technician on the way" notification
 *   • Tracking data merged over stale request detail
 *   • Technician Source field
 *
 * Reuses:
 *   • Card, StatusBadge components
 *   • customerApi (api/customer.ts)
 *   • useLiveTracking (hooks/useLiveTracking.ts)
 *   • useNotification
 * ──────────────────────────────────────────────────────────── */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { CustomerTabParamList } from '../../types/navigation';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal as RNModal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useAuth } from '../../auth/useAuth';
import { customerApi, ServiceRequest } from '../../api/customer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import { useNotification } from '../../providers/NotificationProvider';
import useLiveTracking from '../../hooks/useLiveTracking';
import { Clock, MapPin } from 'lucide-react-native';
import { colors } from '../../theme/colors';

// ─── Constants ────────────────────────────────────────────────

const STATUS_STEPS = [
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'On the way' },
  { key: 'completed', label: 'Completed' },
] as const;

// ─── Helpers — mirrors web ────────────────────────────────────

/**
 * formatTechnicianName — mirrors web formatTechnician.js L11-22
 * Shows "Name (ID: N) | phone" when all present.
 */
function formatTechnicianName(
  request: ServiceRequest | null,
  opts?: { showPhone?: boolean },
): string {
  if (!request) return '-';
  const name = request.assigned_technician_name;
  const id = (request as any).assigned_technician;          // numeric FK
  const phone =
    opts?.showPhone && request.assigned_technician_phone_number
      ? ` | ${request.assigned_technician_phone_number}`
      : '';
  if (name && id) return `${name} (ID: ${id})${phone}`;
  if (name) return `${name}${phone}`;
  if (id) return `Tech #${id}${phone}`;
  return '-';
}

/**
 * formatTechnicianSource — mirrors web formatTechnician.js L29-42
 * Returns:  "Zone (lat, lon)" when valid coordinates exist
 *           "Zone"            when zone only
 *           "-"               when neither
 *
 * Called with precision=5, matching CustomerDashboard.jsx L217.
 */
function formatTechnicianSource(
  request: ServiceRequest | null,
  { precision = 5 } = {},
): string {
  if (!request) return '-';
  const zone = request.assigned_technician_zone || '-';
  const lat = request.assigned_technician_latitude;
  const lon = request.assigned_technician_longitude;
  const hasCoords =
    lat != null &&
    (lat as any) !== '' &&
    lon != null &&
    (lon as any) !== '' &&
    Number(lat) !== 0 &&
    Number(lon) !== 0;
  if (hasCoords) {
    return `${zone} (${Number(lat).toFixed(precision)}, ${Number(lon).toFixed(precision)})`;
  }
  return zone;
}

function formatEta(etaMinutes: number | null | undefined): string {
  if (etaMinutes == null || !Number.isFinite(Number(etaMinutes)))
    return 'Calculating ETA...';
  return `Arriving in ${Math.max(1, Math.round(Number(etaMinutes)))} min`;
}

function formatRouteProgress(
  request: ServiceRequest | null,
  tracking: ReturnType<typeof useLiveTracking> | null,
): string {
  const status = String(
    tracking?.status || request?.status || '',
  ).toLowerCase();
  const reassignmentStatus = String(
    request?.reassignment_status || tracking?.reassignmentStatus || '',
  ).toLowerCase();

  if (reassignmentStatus === 'requested') return 'Technician reassignment requested.';
  if (reassignmentStatus === 'pending') return 'Technician reassignment requested.';
  if (reassignmentStatus === 'processing') return 'Technician reassignment is being processed.';
  if (reassignmentStatus === 'processed') return 'Technician reassigned and route refreshed.';
  if (reassignmentStatus === 'skipped') return 'Technician assignment kept as is.';
  if (reassignmentStatus === 'rejected') return 'Reassignment request was rejected.';
  if (status === 'in_progress') return 'Technician is en route.';
  if (status === 'assigned') return 'Technician assigned and route queued.';
  return 'Waiting for route updates.';
}

// ─── LiveTrackingPanel — mirrors web component exactly ────────

function LiveTrackingPanel({
  request,
  tracking,
}: {
  request: ServiceRequest;
  tracking: ReturnType<typeof useLiveTracking>;
}) {
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    if (mapRef.current && tracking?.technicianLocation && tracking?.customerLocation) {
      mapRef.current.fitToCoordinates(
        [
          { latitude: tracking.technicianLocation.lat, longitude: tracking.technicianLocation.lng },
          { latitude: tracking.customerLocation.lat, longitude: tracking.customerLocation.lng },
        ],
        { edgePadding: { top: 40, right: 40, bottom: 40, left: 40 }, animated: true }
      );
    }
  }, [tracking?.technicianLocation, tracking?.customerLocation]);

  const requestStatus = String(request?.status || '').toLowerCase();
  const liveStatus = String(tracking?.status || requestStatus || '');

  const etaLabel = formatEta(tracking?.etaMinutes);
  const lastUpdated = tracking?.lastUpdatedAt
    ? new Date(tracking.lastUpdatedAt).toLocaleTimeString()
    : '';
  const showReconnect = tracking?.connectionState === 'reconnecting';
  const showDelayed = tracking?.isStale;
  const statusLine = showDelayed
    ? 'Location update delayed.'
    : showReconnect
    ? 'Reconnecting...'
    : lastUpdated
    ? `Last updated ${lastUpdated}`
    : 'Waiting for live updates...';

  const statusMessage =
    liveStatus === 'in_progress'
      ? 'Technician is on the way.'
      : liveStatus === 'assigned'
      ? 'Technician will start shortly.'
      : liveStatus === 'completed'
      ? 'Job completed.'
      : 'Tracking will appear once the job starts.';

  const reassignmentStatus = String(
    request?.reassignment_status || tracking?.reassignmentStatus || '',
  ).toLowerCase();
  const showReassignmentBanner = Boolean(
    request?.reassignment_requested || reassignmentStatus,
  );

  const reassignmentMessage = (() => {
    if (reassignmentStatus === 'pending') return 'Technician reassignment requested.';
    if (reassignmentStatus === 'requested') return 'Technician reassignment requested.';
    if (reassignmentStatus === 'processing') return 'Technician reassignment in progress.';
    if (reassignmentStatus === 'processed') return 'Technician reassigned successfully.';
    if (reassignmentStatus === 'skipped') return 'Assignment was kept as is.';
    if (reassignmentStatus === 'rejected') return 'Reassignment request was rejected.';
    if (showReassignmentBanner) return 'Assignment update in progress.';
    return '';
  })();

  // Status stepper — mirrors web STATUS_STEPS
  const activeStepIndex = Math.max(
    0,
    STATUS_STEPS.findIndex((step) => step.key === liveStatus),
  );

  return (
    <View style={styles.trackingSection}>
      {/* Header row */}
      <View style={styles.trackingHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.trackingTitle}>Live Technician Tracking</Text>
          <Text style={styles.trackingSubtitle}>{statusMessage}</Text>
        </View>
        <StatusBadge value={liveStatus || requestStatus || 'assigned'} />
      </View>

      {/* Status stepper — mirrors web stepper */}
      <View style={styles.stepperContainer}>
        {STATUS_STEPS.map((step, index) => {
          const isActive = index <= activeStepIndex;
          return (
            <View key={step.key} style={styles.stepperStep}>
              <View
                style={[
                  styles.stepperDot,
                  isActive ? styles.stepperDotActive : styles.stepperDotInactive,
                ]}
              >
                {index < activeStepIndex ? (
                  <Text style={styles.stepperDotCheckText}>✓</Text>
                ) : (
                  <Text
                    style={[
                      styles.stepperDotNumber,
                      isActive && styles.stepperDotNumberActive,
                    ]}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepperLabel,
                  isActive && styles.stepperLabelActive,
                ]}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Reassignment banner — mirrors web */}
      {showReassignmentBanner ? (
        <View style={styles.reassignmentBanner}>
          <Text style={styles.reassignmentTitle}>
            Technician reassignment update
          </Text>
          <Text style={styles.reassignmentMessage}>{reassignmentMessage}</Text>
          <Text style={styles.reassignmentProgress}>
            {formatRouteProgress(request, tracking)}
          </Text>
        </View>
      ) : null}

      {/* Technician + ETA cards — mirrors web grid */}
      <View style={styles.trackingGrid}>
        <View style={styles.trackingGridBox}>
          <Text style={styles.trackingGridLabel}>TECHNICIAN</Text>
          <Text style={styles.trackingGridValue}>
            {formatTechnicianName(request, { showPhone: true })}
          </Text>
          {request?.assigned_technician_zone ? (
            <Text style={styles.trackingGridSub}>
              {request.assigned_technician_zone}
            </Text>
          ) : null}
        </View>
        <View style={styles.trackingGridBox}>
          <Text style={styles.trackingGridLabel}>ETA</Text>
          <Text style={[styles.trackingGridValue, { fontWeight: '700' }]}>
            {etaLabel}
          </Text>
          <Text style={styles.trackingGridSub}>
            {formatRouteProgress(request, tracking)}
          </Text>
        </View>
      </View>

      {/* Status-specific panels — mirrors web */}
      {liveStatus === 'assigned' ? (
        <View style={styles.statusPanel}>
          <Text style={styles.statusPanelTitle}>Technician Assigned</Text>
          <Text style={styles.statusPanelSub}>
            Technician will start shortly.
          </Text>
        </View>
      ) : null}

      {liveStatus === 'completed' ? (
        <View style={styles.statusPanelCompleted}>
          <Text style={styles.statusPanelCompletedTitle}>Job Completed</Text>
          <Text style={styles.statusPanelCompletedSub}>
            Thank you for using our service.
          </Text>
        </View>
      ) : null}

      {liveStatus === 'in_progress' ? (
        <View style={styles.inProgressPanel}>
          {/* Map view section */}
          {tracking?.technicianLocation && tracking?.customerLocation ? (
            <View style={styles.mapContainer}>
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                  latitude: tracking.technicianLocation.lat,
                  longitude: tracking.technicianLocation.lng,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
              >
                <Marker
                  coordinate={{
                    latitude: tracking.technicianLocation.lat,
                    longitude: tracking.technicianLocation.lng,
                  }}
                  title="Technician"
                />
                <Marker
                  coordinate={{
                    latitude: tracking.customerLocation.lat,
                    longitude: tracking.customerLocation.lng,
                  }}
                  title="Destination"
                  pinColor="red"
                />
              </MapView>
            </View>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>Waiting for location...</Text>
            </View>
          )}

          <View style={styles.inProgressDetails}>
            {/* Technician detail */}
            <View style={styles.trackingGridBox}>
              <Text style={styles.trackingGridLabel}>TECHNICIAN</Text>
              <Text style={styles.trackingGridValue}>
                {formatTechnicianName(request, { showPhone: true })}
              </Text>
            </View>
            {/* ETA */}
            <View style={styles.trackingGridBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Clock size={12} color={colors.secondary.DEFAULT} />
                <Text style={[styles.trackingGridLabel, { marginBottom: 0, marginLeft: 4 }]}>ETA</Text>
              </View>
              <Text style={[styles.trackingGridValue, { fontWeight: '700' }]}>
                {etaLabel}
              </Text>
            </View>
            {/* Distance */}
            <View style={styles.trackingGridBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <MapPin size={12} color={colors.secondary.DEFAULT} />
                <Text style={[styles.trackingGridLabel, { marginBottom: 0, marginLeft: 4 }]}>DISTANCE</Text>
              </View>
              <Text style={styles.trackingGridValue}>
                {tracking?.distanceKm != null
                  ? `${Number(tracking.distanceKm).toFixed(1)} km`
                  : 'Calculating...'}
              </Text>
            </View>
            {/* Status line */}
            <Text style={styles.statusLineText}>{statusLine}</Text>
            {/* Error */}
            {tracking?.error ? (
              <Text style={styles.trackingError}>{tracking.error}</Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────

export default function CustomerDashboardScreen() {
  const { user, logout } = useAuth();
  const notification = useNotification();
  const route = useRoute<RouteProp<CustomerTabParamList, 'Dashboard'>>();
  const navigation = useNavigation();

  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ServiceRequest | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailImageUri, setDetailImageUri] = useState<string | null>(null);
  const [detailImageLoading, setDetailImageLoading] = useState(false);

  // ── Live tracking — mirrors web useLiveTracking(detail.detail, detail.isOpen) ──
  const tracking = useLiveTracking(detail, selectedId !== null);
  console.log('TRACKING DATA', tracking);

  // ── "Technician on the way" notification — mirrors web L77–89 ──
  const trackingNotifyRef = useRef<{ jobId: string; sent: boolean }>({
    jobId: '',
    sent: false,
  });

  // Reset notify ref when job changes — mirrors web L69–75
  useEffect(() => {
    const jobId = detail?.id ? String(detail.id) : '';
    if (!jobId) return;
    if (trackingNotifyRef.current.jobId !== jobId) {
      trackingNotifyRef.current = { jobId, sent: false };
    }
  }, [detail?.id]);

  // Fire notification when tracking status becomes in_progress — mirrors web L77–89
  useEffect(() => {
    if (selectedId === null) return;
    const status = String(tracking?.status || '').toLowerCase();
    if (status !== 'in_progress') return;
    if (trackingNotifyRef.current.sent) return;

    notification.info({
      title: 'Technician on the way',
      message: 'Your technician is en route.',
    });
    trackingNotifyRef.current.sent = true;
  }, [selectedId, tracking?.status, notification]);

  // ── detailWithTracking — mirrors web L39–54 ──
  const detailWithTracking = useMemo<ServiceRequest | null>(() => {
    if (!detail) return null;
    const nextStatus = tracking?.status || detail.status;
    return {
      ...detail,
      status: nextStatus,
      assigned_technician_name:
        tracking?.assignedTechnicianName || detail.assigned_technician_name,
      assigned_technician_phone_number:
        tracking?.assignedTechnicianPhoneNumber ||
        detail.assigned_technician_phone_number,
      assigned_technician_zone:
        tracking?.assignedTechnicianZone || detail.assigned_technician_zone,
      distance_km: tracking?.distanceKm ?? detail.distance_km,
      travel_time_min: tracking?.etaMinutes ?? detail.travel_time_min,
      reassignment_requested:
        tracking?.reassignmentRequested ?? detail.reassignment_requested,
      reassignment_status:
        tracking?.reassignmentStatus || detail.reassignment_status,
      reassignment_result:
        tracking?.reassignmentResult || detail.reassignment_result,
    };
  }, [detail, tracking]);

  // ── Fetch requests ──────────────────────────────────────────

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await customerApi.getMyRequests();
      setRequests(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || 'Failed to load your requests',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Mirror Web L56-67: Handle submitSuccess from NewRequestScreen
  useEffect(() => {
    const submitSuccess = route.params?.submitSuccess;
    if (!submitSuccess) return;

    notification.success({
      message: `Tracking ID #${submitSuccess.requestId || '-'} is now available in your dashboard.`,
    });

    // Clear params so it doesn't show again
    navigation.setParams({ submitSuccess: undefined } as any);
  }, [route.params?.submitSuccess, navigation, notification]);

  // Mirror Web: useFocusEffect automatically refreshes list when returning to tab
  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [fetchRequests])
  );

  // ── Detail modal ────────────────────────────────────────────

  const openDetail = useCallback(
    async (id: number) => {
      setSelectedId(id);
      setDetail(null);
      setDetailImageUri(null);
      setDetailLoading(true);
      setDetailImageLoading(true);
      try {
        const [data, imageBase64] = await Promise.all([
          customerApi.getMyRequestById(id),
          customerApi.getMyRequestImageBase64(id),
        ]);
        setDetail(data);
        setDetailImageUri(imageBase64);
      } catch {
        notification.error({ message: 'Failed to load request details' });
      } finally {
        setDetailLoading(false);
        setDetailImageLoading(false);
      }
    },
    [notification],
  );

  const closeDetail = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
    setDetailImageUri(null);
  }, []);

  // ── Render row ──────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: ServiceRequest }) => (
      <View style={styles.tableRow}>
        <View style={styles.rowMain}>
          <Text style={styles.cellLabel}>Request #{item.id}</Text>
          <Text style={styles.cellValue}>{item.fault_type}</Text>
          <Text style={styles.cellDate}>
            {item.created_at
              ? new Date(item.created_at).toLocaleDateString()
              : '-'}
          </Text>
        </View>
        <View style={styles.rowMeta}>
          <StatusBadge value={item.status} />
          <TouchableOpacity
            style={styles.viewBtn}
            onPress={() => openDetail(item.id)}
          >
            <Text style={styles.viewBtnText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [openDetail],
  );

  // ── Render ──────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card
          title="Customer Dashboard"
          subtitle="Track submitted service requests and live status updates"
        >
          {loading ? (
            <ActivityIndicator
              size="large"
              color={colors.accent.DEFAULT}
              style={{ margin: 20 }}
            />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : requests.length === 0 ? (
            <Text style={styles.emptyText}>
              No requests submitted yet
            </Text>
          ) : (
            <FlatList
              data={requests}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderItem}
              scrollEnabled={false}
              ItemSeparatorComponent={() => (
                <View style={styles.separator} />
              )}
            />
          )}
        </Card>
      </ScrollView>

      {/* Detail Modal */}
      <RNModal
        visible={selectedId !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeDetail}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Request Details</Text>
          <Text style={styles.modalSubtitle}>
            Request #{selectedId || '-'}
          </Text>
          <TouchableOpacity onPress={closeDetail} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalContent}>
          {detailLoading ? (
            <ActivityIndicator
              size="large"
              color={colors.accent.DEFAULT}
              style={{ marginTop: 40 }}
            />
          ) : detailWithTracking ? (
            <View style={styles.detailGrid}>
              {/* ── Live Tracking Panel ── */}
              <LiveTrackingPanel
                request={detailWithTracking}
                tracking={tracking}
              />

              {/* ── Detail fields — mirrors web exactly ── */}
              <View style={styles.gridRow}>
                <View style={styles.gridBox}>
                  <Text style={styles.boxLabel}>Fault & Severity</Text>
                  <Text style={styles.boxValue}>
                    {detailWithTracking.fault_type || '-'} |{' '}
                    {detailWithTracking.severity || '-'}
                  </Text>
                </View>
                <View style={styles.gridBox}>
                  <Text style={styles.boxLabel}>Status</Text>
                  <Text style={styles.boxValue}>
                    {detailWithTracking.status || '-'}
                  </Text>
                </View>
              </View>

              <View style={styles.gridRow}>
                <View style={styles.gridBox}>
                  <Text style={styles.boxLabel}>Created At</Text>
                  <Text style={styles.boxValue}>
                    {detailWithTracking.created_at
                      ? new Date(
                          detailWithTracking.created_at,
                        ).toLocaleString()
                      : '-'}
                  </Text>
                </View>
                <View style={styles.gridBox}>
                  <Text style={styles.boxLabel}>Assigned At</Text>
                  <Text style={styles.boxValue}>
                    {detailWithTracking.assigned_at
                      ? new Date(
                          detailWithTracking.assigned_at,
                        ).toLocaleString()
                      : '-'}
                  </Text>
                </View>
              </View>

              <View style={styles.gridBoxFull}>
                <Text style={styles.boxLabel}>Location</Text>
                <Text style={styles.boxValue}>
                  {detailWithTracking.location_text || '-'}
                </Text>
              </View>

              <View style={styles.gridRow}>
                <View style={styles.gridBox}>
                  <Text style={styles.boxLabel}>Technician</Text>
                  <Text style={styles.boxValue}>
                    {formatTechnicianName(detailWithTracking)}
                  </Text>
                </View>
                <View style={styles.gridBox}>
                  <Text style={styles.boxLabel}>Technician Phone</Text>
                  <Text style={styles.boxValue}>
                    {detailWithTracking.assigned_technician_phone_number ||
                      '-'}
                  </Text>
                </View>
              </View>

              {/* Technician Source — mirrors web L215-218 */}
              {/* Full-width, precision=5, matches web md:col-span-2 */}
              <View style={styles.gridBoxFull}>
                <Text style={styles.boxLabel}>Technician Source</Text>
                <Text style={styles.boxValue}>
                  {formatTechnicianSource(detailWithTracking, { precision: 5 })}
                </Text>
              </View>

              <View style={styles.gridBoxFull}>
                <Text style={styles.boxLabel}>Issue Description</Text>
                <Text style={styles.boxValue}>
                  {detailWithTracking.issue_description || '-'}
                </Text>
              </View>

              <View style={styles.gridBoxFull}>
                <Text style={styles.boxLabel}>Evidence Image</Text>
                {detailImageLoading ? (
                  <View style={styles.imageLoadingBox}>
                    <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
                    <Text style={styles.imageLoadingText}>Loading image securely...</Text>
                  </View>
                ) : detailImageUri ? (
                  <Image
                    source={{ uri: detailImageUri }}
                    style={styles.evidenceImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.amberBox}>
                    <Text style={styles.amberText}>
                      No image evidence available for this request.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : null}
        </ScrollView>
      </RNModal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingTop: 48 },
  errorText: { color: colors.danger, fontSize: 14, margin: 20 },
  emptyText: {
    color: colors.secondary.DEFAULT,
    fontSize: 14,
    margin: 20,
    textAlign: 'center',
  },
  separator: { height: 1, backgroundColor: colors.border },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    justifyContent: 'space-between',
  },
  rowMain: { flex: 1, paddingRight: 12 },
  cellLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary.DEFAULT,
    marginBottom: 4,
  },
  cellValue: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.primary.DEFAULT,
    marginBottom: 4,
  },
  cellDate: { fontSize: 12, color: colors.secondary.light },
  rowMeta: { alignItems: 'flex-end', justifyContent: 'space-between' },
  viewBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewBtnText: { fontSize: 13, fontWeight: '500', color: colors.primary.DEFAULT },

  // Modal
  modalHeader: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.primary.DEFAULT },
  modalSubtitle: { fontSize: 14, color: colors.secondary.DEFAULT, marginTop: 4 },
  closeBtn: { position: 'absolute', right: 20, top: 40, padding: 8 },
  closeBtnText: { fontSize: 14, fontWeight: '600', color: colors.secondary.DEFAULT },
  modalContent: {
    padding: 20,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  detailGrid: { gap: 12 },
  gridRow: { flexDirection: 'row', gap: 12 },
  gridBox: {
    flex: 1,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gridBoxFull: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  boxLabel: {
    fontSize: 12,
    color: colors.secondary.DEFAULT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  boxValue: { fontSize: 14, color: colors.primary.DEFAULT },
  evidenceImage: {
    width: '100%',
    height: 250,
    marginTop: 8,
    borderRadius: 6,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },

  // ── Live Tracking Panel styles ──────────────────────────────

  trackingSection: { gap: 12 },

  // Header
  trackingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  trackingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary.DEFAULT,
  },
  trackingSubtitle: {
    fontSize: 12,
    color: colors.secondary.DEFAULT,
    marginTop: 2,
  },

  // Status stepper — mirrors web rounded-lg border p-3
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
  },
  stepperStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  stepperDotActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stepperDotInactive: {
    backgroundColor: colors.card,
    borderColor: '#d1d5db',
  },
  stepperDotCheckText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.card,
  },
  stepperDotNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondary.light,
  },
  stepperDotNumberActive: {
    color: colors.card,
  },
  stepperLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.secondary.DEFAULT,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  stepperLabelActive: {
    color: colors.primary.DEFAULT,
  },

  // Reassignment banner — mirrors web blue border/bg
  reassignmentBanner: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    padding: 14,
  },
  reassignmentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e3a5f',
  },
  reassignmentMessage: {
    fontSize: 13,
    color: '#1e40af',
    marginTop: 4,
  },
  reassignmentProgress: {
    fontSize: 11,
    color: '#1d4ed8',
    marginTop: 6,
  },

  // Tracking grid — mirrors web 2-col layout
  trackingGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  trackingGridBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
  },
  trackingGridLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.secondary.DEFAULT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  trackingGridValue: {
    fontSize: 13,
    color: colors.primary.DEFAULT,
  },
  trackingGridSub: {
    fontSize: 11,
    color: colors.secondary.DEFAULT,
    marginTop: 4,
  },

  // Status-specific panels
  statusPanel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
  },
  statusPanelTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary.DEFAULT,
  },
  statusPanelSub: {
    fontSize: 13,
    color: colors.secondary.DEFAULT,
    marginTop: 4,
  },
  statusPanelCompleted: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 8,
    padding: 14,
  },
  statusPanelCompletedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065f46',
  },
  statusPanelCompletedSub: {
    fontSize: 13,
    color: '#047857',
    marginTop: 4,
  },

  // In-progress panel — mirrors web in_progress grid
  inProgressPanel: {
    gap: 12,
  },
  mapContainer: {
    height: 260,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  mapPlaceholder: {
    height: 260,
    borderRadius: 8,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  mapPlaceholderText: {
    fontSize: 14,
    color: '#78350f',
  },
  inProgressDetails: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    gap: 12,
  },
  statusLineText: {
    fontSize: 11,
    color: colors.secondary.DEFAULT,
  },
  trackingError: {
    fontSize: 11,
    color: '#dc2626',
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
  amberBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 6,
    padding: 12,
    marginTop: 8,
  },
  amberText: { fontSize: 13, color: '#92400e' },
});
