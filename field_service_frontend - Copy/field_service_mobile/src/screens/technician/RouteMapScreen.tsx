/* ────────────────────────────────────────────────────────────
 * RouteMapScreen
 *
 * React Native conversion of:
 *   frontend_react/src/pages/technician/TechnicianDashboard.jsx
 *   → "Optimized Route Map" Card  (routeOnly mode)
 *   → frontend_react/src/components/RouteMap.jsx
 *   → frontend_react/src/components/GoogleMapEmbed.jsx
 *
 * Layout mirrors the web exactly:
 *
 *  ┌────────────────────────────────────────┐
 *  │ Optimized Route Map card               │
 *  │  [Navigate in Google Maps] button      │
 *  │  ── Map area ──────────────────────────│
 *  │   If no technician location:           │
 *  │     grey box "No technician location"  │
 *  │   Else:                                │
 *  │     react-native-maps MapView          │
 *  │       • Technician origin marker       │
 *  │       • Numbered job markers           │
 *  │       • Polyline connecting all stops  │
 *  │       • Auto-fit to all coordinates    │
 *  │  ── Active Route Stops list ───────────│
 *  │   Ordered numbered list of stops       │
 *  │   Job #N | fault | lat, lng            │
 *  └────────────────────────────────────────┘
 *
 * Data sources (mirror useData.useTechnicianDashboard):
 *   • technicianApi.getAssignedJobs()  → active jobs
 *   • technicianApi.getMyRoute()       → route_order + technician_location
 *   • technicianApi.getProfile()       → current_latitude / current_longitude
 *   • expo-location                    → live device GPS (fallback)
 *
 * Map rendering strategy (react-native-maps v1.27.2 installed):
 *   • Uses PROVIDER_GOOGLE on Android for full tile rendering.
 *   • Shows origin marker (green), numbered job markers (blue).
 *   • Draws a Polyline connecting origin → stops in route order.
 *   • Calls fitToCoordinates() once all markers are placed.
 *   • Falls back to grey placeholder if no technician location.
 *
 * Navigation updates:
 *   • None — TechnicianNavigator already mounts this screen as "Route" tab.
 * ──────────────────────────────────────────────────────────── */


import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { colors } from '../../theme/colors';
import { MapPin, AlertTriangle, Compass, Radio, ClipboardList, Map as MapIcon, RefreshCw } from 'lucide-react-native';
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as ExpoLocation from 'expo-location';

import Card from '../../components/Card';
import { technicianApi, TechJob, RouteData, TechnicianProfile } from '../../api/technician';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Constants ─────────────────────────────────────────────────

const POLL_MS = 30_000;
const MAX_WAYPOINTS = 8;

// ─── Pure helpers ───────────────────────────────────────────────

function toNumber(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function hasStrictCoords(lat: number | null, lng: number | null): boolean {
  return lat !== null && lng !== null && !(lat === 0 && lng === 0);
}

function validCoords(lat: unknown, lng: unknown): boolean {
  const la = Number(lat);
  const ln = Number(lng);
  return (
    lat != null &&
    lng != null &&
    Number.isFinite(la) &&
    Number.isFinite(ln) &&
    !(la === 0 && ln === 0)
  );
}

function coordinatesToLabel(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/** Build stop list ordered by routeOrder — mirrors RouteMap.jsx activeRouteStops logic */
function buildActiveRouteStops(
  jobs: TechJob[],
  routeOrder: number[],
): Array<{ id: number; faultType: string; status: string; lat: number; lng: number }> {
  const validJobs = jobs
    .map((job) => {
      const lat = toNumber(job.latitude);
      const lng = toNumber(job.longitude);
      return hasStrictCoords(lat, lng) ? { ...job, _lat: lat!, _lng: lng! } : null;
    })
    .filter(Boolean) as Array<TechJob & { _lat: number; _lng: number }>;

  const byId = new Map(validJobs.map((j) => [String(j.id), j]));
  const ordered = routeOrder.map((id) => byId.get(String(id))).filter(Boolean) as typeof validJobs;
  const orderedIds = new Set(ordered.map((j) => String(j.id)));
  const remainder = validJobs.filter((j) => !orderedIds.has(String(j.id)));

  return [...ordered, ...remainder].map((j) => ({
    id: j.id,
    faultType: j.fault_type || '-',
    status: j.status || '-',
    lat: j._lat,
    lng: j._lng,
  }));
}

/** Mirror TechnicianDashboard.googleMapsUrl — builds full directions URL */
function buildGoogleMapsUrl(
  origin: { lat: number; lng: number } | null,
  stops: Array<{ lat: number; lng: number }>,
): string {
  if (!origin || stops.length === 0) return '';

  const destination = stops[stops.length - 1];
  const params = new URLSearchParams({
    api: '1',
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    travelmode: 'driving',
  });

  if (stops.length > 1) {
    const waypointStops = stops.slice(0, -1).slice(0, MAX_WAYPOINTS);
    if (waypointStops.length > 0) {
      params.set('waypoints', waypointStops.map((s) => `${s.lat},${s.lng}`).join('|'));
    }
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Resolve technician location — mirrors useData.useTechnicianDashboard.technicianLocation */
function resolveTechnicianLocation(
  profile: TechnicianProfile | null,
  routeData: RouteData,
  activeJobs: TechJob[],
  deviceLocation: { latitude: number; longitude: number } | null,
): { latitude: number; longitude: number } | null {
  // 1. Profile current_latitude/current_longitude
  if (validCoords(profile?.current_latitude, profile?.current_longitude)) {
    return {
      latitude: Number(profile!.current_latitude),
      longitude: Number(profile!.current_longitude),
    };
  }
  // 2. Profile latitude/longitude
  if (validCoords(profile?.latitude, profile?.longitude)) {
    return {
      latitude: Number(profile!.latitude),
      longitude: Number(profile!.longitude),
    };
  }
  // 3. Route data technician_location
  if (routeData.technician_location) {
    const tl = routeData.technician_location;
    if (validCoords(tl.latitude, tl.longitude)) return tl;
  }
  // 4. First active job technician location
  if (activeJobs.length > 0) {
    const f = activeJobs[0] as any;
    if (validCoords(f.technician_latitude, f.technician_longitude)) {
      return { latitude: f.technician_latitude, longitude: f.technician_longitude };
    }
  }
  // 5. Device GPS via expo-location
  if (deviceLocation && validCoords(deviceLocation.latitude, deviceLocation.longitude)) {
    return deviceLocation;
  }
  return null;
}

// ─── Embedded Route Map ──────────────────────────────────────────

type RouteStop = { id: number; faultType: string; status: string; lat: number; lng: number };

function EmbeddedRouteMap({
  origin,
  stops,
}: {
  origin: { lat: number; lng: number };
  stops: RouteStop[];
}) {
  const mapRef = useRef<MapView | null>(null);

  // Build the polyline: origin → stop 1 → stop 2 … → last stop
  const polylineCoords = useMemo(() => {
    const coords: Array<{ latitude: number; longitude: number }> = [
      { latitude: origin.lat, longitude: origin.lng },
      ...stops.map((s) => ({ latitude: s.lat, longitude: s.lng })),
    ];
    return coords;
  }, [origin, stops]);

  // Auto-fit to all markers once the map is ready
  const handleMapReady = useCallback(() => {
    if (!mapRef.current) return;
    const allCoords = polylineCoords;
    if (allCoords.length < 2) return;
    mapRef.current.fitToCoordinates(allCoords, {
      edgePadding: { top: 48, right: 32, bottom: 64, left: 32 },
      animated: false,
    });
  }, [polylineCoords]);

  const initialRegion = useMemo(() => {
    const latitudes = polylineCoords.map((c) => c.latitude);
    const longitudes = polylineCoords.map((c) => c.longitude);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(maxLat - minLat, 0.02) * 1.4,
      longitudeDelta: Math.max(maxLng - minLng, 0.02) * 1.4,
    };
  }, [polylineCoords]);

  return (
    <View style={styles.embeddedMapContainer}>
      <MapView
        ref={mapRef}
        style={styles.embeddedMap}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={initialRegion}
        onMapReady={handleMapReady}
        showsCompass
        showsScale
        toolbarEnabled={false}
      >
        {/* Origin: technician location — green marker */}
        <Marker
          coordinate={{ latitude: origin.lat, longitude: origin.lng }}
          title="Your Location"
          description="Technician origin"
          pinColor="#16a34a"
          identifier="origin"
        />

        {/* Job stop markers — numbered blue callouts */}
        {stops.map((stop, i) => (
          <Marker
            key={`stop-${stop.id}`}
            coordinate={{ latitude: stop.lat, longitude: stop.lng }}
            title={`Stop ${i + 1}: Job #${stop.id}`}
            description={stop.faultType.replace(/_/g, ' ')}
            identifier={`stop-${stop.id}`}
          >
            {/* Custom numbered pin */}
            <View style={styles.markerPin}>
              <Text style={styles.markerPinText}>{i + 1}</Text>
            </View>
          </Marker>
        ))}

        {/* Route polyline */}
        {polylineCoords.length >= 2 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor="#4f46e5"
            strokeWidth={3}
            lineDashPattern={[8, 4]}
          />
        )}
      </MapView>
    </View>
  );
}

// ─── Route stop row ─────────────────────────────────────────────

function RouteStopRow({
  stop,
  index,
}: {
  stop: RouteStop;
  index: number;
}) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}`;

  const statusColor = useMemo(() => {
    const s = stop.status.toLowerCase();
    if (s === 'in_progress') return '#d97706';
    if (s === 'completed') return '#15803d';
    return '#4f46e5';
  }, [stop.status]);

  return (
    <TouchableOpacity
      style={styles.stopRow}
      onPress={() => Linking.openURL(mapsUrl)}
      activeOpacity={0.7}
    >
      {/* Numbered badge */}
      <View style={styles.stopBadge}>
        <Text style={styles.stopBadgeText}>{index + 1}</Text>
      </View>

      {/* Stop info */}
      <View style={styles.stopInfo}>
        <Text style={styles.stopTitle}>
          Job #{stop.id}{' '}
          <Text style={styles.stopFault}>| {stop.faultType}</Text>
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MapPin size={12} color={colors.secondary.DEFAULT} />
          <Text style={[styles.stopCoords, { marginLeft: 4 }]}>
            {coordinatesToLabel(stop.lat, stop.lng)}
          </Text>
        </View>
      </View>

      {/* Status pill */}
      <View style={[styles.statusPill, { borderColor: statusColor }]}>
        <Text style={[styles.statusPillText, { color: statusColor }]}>
          {stop.status.replace(/_/g, ' ')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ────────────────────────────────────────────────

export default function RouteMapScreen() {
  // ── Data state ──────────────────────────────────────────────
  const [activeJobs, setActiveJobs] = useState<TechJob[]>([]);
  const [routeData, setRouteData] = useState<RouteData>({ route_order: [] });
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [deviceLocation, setDeviceLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubRef = useRef<ExpoLocation.LocationSubscription | null>(null);
  const geoWarnShownRef = useRef(false);

  // ── Derived ─────────────────────────────────────────────────

  /** Mirror useTechnicianDashboard.technicianLocation */
  const technicianLocation = useMemo(
    () => resolveTechnicianLocation(profile, routeData, activeJobs, deviceLocation),
    [profile, routeData, activeJobs, deviceLocation],
  );

  const technicianPoint = useMemo(() => {
    if (!technicianLocation) return null;
    const lat = toNumber(technicianLocation.latitude);
    const lng = toNumber(technicianLocation.longitude);
    return hasStrictCoords(lat, lng) ? { lat: lat!, lng: lng! } : null;
  }, [technicianLocation]);

  /** Mirror RouteMap.jsx activeRouteStops */
  const activeRouteStops = useMemo(
    () => buildActiveRouteStops(activeJobs, routeData.route_order || []),
    [activeJobs, routeData],
  );

  /** Mirror TechnicianDashboard.googleMapsUrl */
  const googleMapsUrl = useMemo(
    () => buildGoogleMapsUrl(technicianPoint, activeRouteStops),
    [technicianPoint, activeRouteStops],
  );

  // ── Fetch helpers ────────────────────────────────────────────

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [jobsData, routeResult, profileResult] = await Promise.allSettled([
        technicianApi.getAssignedJobs(),
        technicianApi.getMyRoute(),
        technicianApi.getProfile(),
      ]);

      if (jobsData.status === 'fulfilled') {
        setActiveJobs(
          jobsData.value.jobs.filter(
            (j) => String(j.status || '').toLowerCase() !== 'completed',
          ),
        );
      } else {
        const msg =
          (jobsData.reason as any)?.response?.data?.detail ||
          'Failed to load route data';
        setError(msg);
      }

      if (routeResult.status === 'fulfilled') {
        setRouteData(routeResult.value || { route_order: [] });
      }
      if (profileResult.status === 'fulfilled') {
        setProfile(profileResult.value);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Location permissions + watch ─────────────────────────────

  useEffect(() => {
    let active = true;

    (async () => {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted' || !active) return;

      try {
        // Get a quick initial fix
        const pos = await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.Balanced,
        });
        if (active) {
          setDeviceLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        }

        // Watch for updates
        locationSubRef.current = await ExpoLocation.watchPositionAsync(
          {
            accuracy: ExpoLocation.Accuracy.High,
            timeInterval: 5_000,
            distanceInterval: 10,
          },
          (loc) => {
            if (active) {
              setDeviceLocation({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
              });
            }
          },
        );
      } catch {
        // non-fatal: GPS unavailable
      }
    })();

    return () => {
      active = false;
      locationSubRef.current?.remove();
    };
  }, []);

  // ── Mount + poll ─────────────────────────────────────────────

  useEffect(() => {
    fetchAll();

    pollRef.current = setInterval(() => fetchAll(true), POLL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── Open Google Maps navigation ───────────────────────────────

  const openGoogleMapsNavigation = useCallback(() => {
    if (!googleMapsUrl) return;
    Linking.openURL(googleMapsUrl).catch(() => {
      // fallback: open maps app directly
      Linking.openURL('https://maps.google.com');
    });
  }, [googleMapsUrl]);

  // ── Refresh handler ───────────────────────────────────────────

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAll(true);
  }, [fetchAll]);

  // ─── Render ───────────────────────────────────────────────────

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
          title="Optimized Route Map"
          subtitle="Route view for your assigned jobs"
        >
          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxTitle}>Route View</Text>
              <Text style={styles.errorBoxText}>{error}</Text>
            </View>
          ) : null}

          {/* Loading */}
          {loading ? (
            <View style={styles.centeredLoader}>
              <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
              <Text style={styles.loaderLabel}>Loading route map</Text>
              <Text style={styles.loaderDetail}>
                Generating optimized route sequence from dispatch engine.
              </Text>
            </View>
          ) : null}

          {!loading ? (
            <>
              {/* ── Route info line — mirrors web non-routeOnly label */}
              <View style={styles.routeInfoRow}>
                <Text style={styles.routeInfoText}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}><MapPin size={14} color={colors.secondary.DEFAULT} /><RefreshCw size={14} color={colors.secondary.DEFAULT} style={{ marginLeft: 2, marginRight: 6 }} /><Text style={styles.routeInfoText}>Route plan updates from assigned jobs and technician</Text></View>
                  origin point.
                </Text>
              </View>

              {/* ── Map area — react-native-maps embedded map */}
              {!technicianPoint ? (
                /* No technician location — grey placeholder */
                <View style={styles.mapPlaceholderGray}>
                  <Text style={styles.mapPlaceholderGrayText}>
                    No technician location available for route mapping.
                  </Text>
                  <Text style={styles.mapPlaceholderHint}>
                    Enable location services or wait for the profile to sync.
                  </Text>
                </View>
              ) : activeRouteStops.length > 0 ? (
                /* Has origin + stops — render interactive MapView */
                <EmbeddedRouteMap
                  origin={technicianPoint}
                  stops={activeRouteStops}
                />
              ) : (
                /* Has location but no valid route stops — amber box */
                <View style={styles.amberBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <AlertTriangle size={16} color="#b45309" />
                    <Text style={[styles.amberBoxTitle, { marginLeft: 6 }]}>
                      No active route stops
                    </Text>
                  </View>
                  <Text style={styles.amberBoxText}>
                    No active job stops with valid coordinates were found.
                    Assign jobs with GPS coordinates to see the route map.
                  </Text>
                </View>
              )}

              {/* ── Open Full Directions CTA ── */}
              {googleMapsUrl ? (
                <TouchableOpacity
                  style={styles.fullWidthCta}
                  onPress={openGoogleMapsNavigation}
                  activeOpacity={0.85}
                >
                  <MapIcon size={18} color="#fff" />
                  <Text style={styles.fullWidthCtaText}>
                    Open Full Directions
                  </Text>
                </TouchableOpacity>
              ) : null}

              {/* ── Active Route Stops list — mirrors RouteMap.jsx ol list */}
              <View style={styles.stopsCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Compass size={16} color={colors.primary.DEFAULT} />
                  <Text style={[styles.stopsCardTitle, { marginBottom: 0, marginLeft: 6 }]}>
                    Active Route Stops
                  </Text>
                </View>

                {activeRouteStops.length === 0 ? (
                  <Text style={styles.stopsEmptyText}>
                    No active stops with valid coordinates.
                  </Text>
                ) : (
                  activeRouteStops.map((stop, index) => (
                    <RouteStopRow key={`stop-${stop.id}`} stop={stop} index={index} />
                  ))
                )}
              </View>

              {/* ── Technician location info */}
              {technicianPoint ? (
                <View style={styles.techLocationCard}>
                  <Text style={styles.techLocationTitle}>Technician Origin</Text>
                  <Text style={styles.techLocationValue}>
                    {coordinatesToLabel(technicianPoint.lat, technicianPoint.lng)}
                  </Text>
                  {deviceLocation &&
                    validCoords(deviceLocation.latitude, deviceLocation.longitude) ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <Radio size={12} color={colors.secondary.DEFAULT} />
                      <Text style={[styles.techLocationHint, { marginTop: 0, marginLeft: 4 }]}>
                        Using live GPS from device
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <ClipboardList size={12} color={colors.secondary.DEFAULT} />
                      <Text style={[styles.techLocationHint, { marginTop: 0, marginLeft: 4 }]}>
                        Using stored profile location
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.techLocationCard}>
                  <Text style={styles.techLocationTitle}>Technician Origin</Text>
                  <Text style={[styles.techLocationValue, { color: colors.secondary.light }]}>
                    Not yet determined
                  </Text>
                  <Text style={styles.techLocationHint}>
                    Grant location permission or sync profile to show origin.
                  </Text>
                </View>
              )}

              {/* ── Summary stats */}
              <View style={styles.statsRow}>
                <View style={styles.statPill}>
                  <Text style={styles.statPillLabel}>Active Jobs</Text>
                  <Text style={styles.statPillValue}>{activeJobs.length}</Text>
                </View>
                <View style={styles.statPill}>
                  <Text style={styles.statPillLabel}>Route Stops</Text>
                  <Text style={styles.statPillValue}>
                    {activeRouteStops.length}
                  </Text>
                </View>
                <View style={styles.statPill}>
                  <Text style={styles.statPillLabel}>Route Order</Text>
                  <Text style={styles.statPillValue}>
                    {routeData.route_order?.length ?? 0}
                  </Text>
                </View>
              </View>
            </>
          ) : null}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Loading
  centeredLoader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  loaderLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
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

  // Open Full Directions Button
  fullWidthCta: {
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  fullWidthCtaText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Route info row — mirrors web inline-flex label
  routeInfoRow: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeInfoText: { fontSize: 11, color: colors.secondary.DEFAULT },

  // Map area — no technician location
  mapPlaceholderGray: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    minHeight: 80,
    justifyContent: 'center',
  },
  mapPlaceholderGrayText: {
    fontSize: 13,
    color: colors.secondary.DEFAULT,
  },
  mapPlaceholderHint: {
    fontSize: 11,
    color: colors.secondary.light,
    marginTop: 4,
  },

  // Embedded react-native-maps container
  embeddedMapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    height: 300,
  },
  embeddedMap: {
    width: '100%',
    height: '100%',
  },

  // Custom numbered marker pin
  markerPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4f46e5',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  markerPinText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  // Marker Pin container
  // Amber box (no valid stops)
  amberBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  amberBoxTitle: { fontSize: 13, fontWeight: '700', color: '#78350f', marginBottom: 6 },
  amberBoxText: { fontSize: 12, color: '#92400e', lineHeight: 18 },
  amberBoxSub: { fontSize: 11, color: '#78350f', marginTop: 8, fontWeight: '600' },

  // Route stops card — mirrors RouteMap.jsx rounded-lg border bg-white p-3
  stopsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  stopsCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondary.DEFAULT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  stopsEmptyText: { fontSize: 12, color: colors.secondary.light },

  // Stop row — mirrors RouteMap.jsx li items
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  stopBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBadgeText: { fontSize: 10, fontWeight: '700', color: '#1d4ed8' },
  stopInfo: { flex: 1 },
  stopTitle: { fontSize: 13, color: colors.primary.DEFAULT, fontWeight: '500' },
  stopFault: { color: colors.secondary.DEFAULT, fontWeight: '400' },
  stopCoords: { fontSize: 11, color: colors.secondary.DEFAULT, marginTop: 2 },
  statusPill: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPillText: { fontSize: 10, fontWeight: '600' },

  // Technician location info card
  techLocationCard: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  techLocationTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369a1',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  techLocationValue: { fontSize: 14, fontWeight: '700', color: '#0c4a6e' },
  techLocationHint: { fontSize: 11, color: '#0369a1', marginTop: 4 },

  // Summary stats row
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statPillLabel: { fontSize: 10, color: colors.secondary.light, fontWeight: '600' },
  statPillValue: { fontSize: 22, fontWeight: '700', color: colors.primary.DEFAULT, marginTop: 4 },
});
