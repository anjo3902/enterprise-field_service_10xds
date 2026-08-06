import React, { memo, useEffect, useMemo } from 'react';
import { AlertTriangle, Navigation } from 'lucide-react';
import { TechGoogleMapEmbed } from './TechGoogleMapEmbed';
import { JobItem } from './TechJobList';

const MAPS_EMBED_KEY_NAME = 'VITE_GOOGLE_MAPS_EMBED_API_KEY';
const MAX_WAYPOINTS = 8;
const PLACEHOLDER_EMBED_KEYS = new Set([
  'your_key',
  'your_key_here',
  'your-embed-api-key-here',
  'replace_me',
]);

const toNumber = (value: any) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const hasStrictCoordinates = (lat: any, lng: any) => (
  lat !== null
  && lng !== null
  && !(Number(lat) === 0 && Number(lng) === 0)
);

const isConfiguredEmbedKey = (value: string) => {
  const normalized = String(value || '').trim().toLowerCase();
  return Boolean(normalized) && !PLACEHOLDER_EMBED_KEYS.has(normalized);
};

const coordinatesToLabel = (point: {lat: number, lng: number}) => `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`;

// Need a loose interface since the DB gives us strings or numbers
interface LocationPoint {
  latitude?: number | string;
  longitude?: number | string;
}

interface TechRouteMapProps {
  technicianLocation: LocationPoint | null;
  jobs?: any[];
  routeOrder?: string[];
}

const blue="#2563EB";
const blueTint="#EFF6FF";
const amber="#D97706";
const amberT="#FFFBEB";
const ink="#0F172A";
const inkSec="#475569";
const border="#E2E8F0";
const card="#FFFFFF";
const inter="'Inter','Roboto',sans-serif";

function RouteMapComponent({ technicianLocation, jobs = [], routeOrder = [] }: TechRouteMapProps) {
  const technicianPoint = useMemo(() => {
    if (!technicianLocation) return null;
    const lat = toNumber(technicianLocation.latitude);
    const lng = toNumber(technicianLocation.longitude);
    return hasStrictCoordinates(lat, lng) ? { lat, lng } : null;
  }, [technicianLocation]);

  const activeRouteStops = useMemo(() => {
    const validJobs = jobs
      .map((job) => {
        const lat = toNumber(job.latitude || (job.locationCoords ? job.locationCoords.split(',')[0] : null));
        const lng = toNumber(job.longitude || (job.locationCoords ? job.locationCoords.split(',')[1] : null));
        return hasStrictCoordinates(lat, lng)
          ? { ...job, _lat: lat, _lng: lng }
          : null;
      })
      .filter(Boolean);

    const jobsById = new Map(validJobs.map((job) => [String(job.id), job]));
    const orderedJobs = routeOrder.map((id) => jobsById.get(String(id))).filter(Boolean);
    const orderedIds = new Set(orderedJobs.map((job) => String(job.id)));
    const remainingJobs = validJobs.filter((job) => !orderedIds.has(String(job.id)));

    return [...orderedJobs, ...remainingJobs].map((job) => ({
      id: job.id,
      faultType: job.faultType || job.fault_type || job.title || '-',
      status: job.status || '-',
      lat: job._lat,
      lng: job._lng,
    }));
  }, [jobs, routeOrder]);


  const mapsEmbedApiKey = useMemo(() => {
    const raw = String((import.meta as any).env?.[MAPS_EMBED_KEY_NAME] || '').trim();
    return isConfiguredEmbedKey(raw) ? raw : '';
  }, []);

  const directionsConfig = useMemo(() => {
    if (!technicianPoint || activeRouteStops.length === 0) {
      return null;
    }

    const destination = activeRouteStops[activeRouteStops.length - 1];
    const waypoints = activeRouteStops.slice(0, -1).slice(0, MAX_WAYPOINTS);

    return {
      origin: technicianPoint,
      destination,
      waypoints,
    };
  }, [technicianPoint, activeRouteStops]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as any).MAP_MARKERS_COUNT = activeRouteStops.length;
  }, [activeRouteStops]);

  const handleNavigate = () => {
    if (!directionsConfig) {
      if (technicianPoint) {
        window.open(`https://www.google.com/maps/search/?api=1&query=${technicianPoint.lat},${technicianPoint.lng}`, '_blank');
      }
      return;
    }
    const originStr = `${directionsConfig.origin.lat},${directionsConfig.origin.lng}`;
    const destStr = `${directionsConfig.destination.lat},${directionsConfig.destination.lng}`;
    const waypointsStr = directionsConfig.waypoints.map(w => `${w.lat},${w.lng}`).join('|');
    
    let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}`;
    if (waypointsStr) {
      url += `&waypoints=${encodeURIComponent(waypointsStr)}`;
    }
    window.open(url, '_blank');
  };

  return (
    <div style={{ backgroundColor: card, borderRadius: '16px', border: `1px solid ${border}`, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: inter }}>
      
      {/* Title & Subtitle */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: ink, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Optimized Route Map</h2>
        <p style={{ fontSize: '13px', color: inkSec, margin: 0 }}>Route sequence from dispatch engine</p>
      </div>

      {/* Navigate Button */}
      <div>
        <button onClick={handleNavigate} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: card, border: `1px solid ${border}`, borderRadius: '8px', padding: '8px 14px', cursor: 'pointer' }}>
          <Navigation size={16} color={inkSec} style={{ transform: 'rotate(45deg)' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: ink }}>Navigate in Google Maps</span>
        </button>
      </div>

      {/* Info text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: inkSec, fontSize: '12px' }}>
        <Navigation size={14} />
        <span>Route plan updates from assigned jobs and technician origin point.</span>
      </div>

      {!technicianPoint ? (
        <div style={{ borderRadius: '12px', border: `1px solid ${border}`, backgroundColor: card, padding: '16px', fontSize: '14px', color: inkSec }}>
          No technician location available for route mapping.
        </div>
      ) : !mapsEmbedApiKey ? (
        <div style={{ width: '100%', height: '320px', borderRadius: '12px', overflow: 'hidden', border: `1px solid ${border}`, position: 'relative' }}>
          <img src="/map_placeholder.png" alt="Map Placeholder" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.2)' }} />
        </div>
      ) : (
        <div style={{ width: '100%', height: '320px', borderRadius: '12px', overflow: 'hidden', border: `1px solid ${border}` }}>
          <TechGoogleMapEmbed
            title='Optimized route map'
            latitude={technicianPoint.lat}
            longitude={technicianPoint.lng}
            origin={directionsConfig?.origin}
            destination={directionsConfig?.destination}
            waypoints={directionsConfig?.waypoints || []}
            zoom={12}
          />
        </div>
      )}

      <div style={{ borderRadius: '12px', border: `1px solid ${border}`, backgroundColor: card, padding: '12px' }}>
        <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, color: inkSec, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Navigation size={14} />
          Active Route Stops
        </p>
        {activeRouteStops.length === 0 ? (
          <p style={{ margin: 0, fontSize: '12px', color: inkSec }}>No active stops with valid coordinates.</p>
        ) : (
          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {activeRouteStops.map((stop, index) => (
              <li key={`active-${stop.id}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: ink }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '18px', minWidth: '18px', borderRadius: '9px', backgroundColor: blueTint, color: blue, fontSize: '10px', fontWeight: 700, marginTop: '1px' }}>
                  {index + 1}
                </span>
                <span style={{ lineHeight: 1.5 }}>
                  <strong>#{stop.id}</strong> <span style={{ color: border }}>|</span> {stop.faultType} <span style={{ color: border }}>|</span> <span style={{ color: inkSec }}>{coordinatesToLabel(stop)}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

const serializeJobs = (rows: any[] = []) => rows
  .map((row) => [row.id, row.latitude || row.locationCoords, row.longitude, row.status].join(':'))
  .join('|');

export const TechRouteMap = memo(RouteMapComponent, (prev, next) => {
  const prevLat = prev.technicianLocation?.latitude;
  const prevLng = prev.technicianLocation?.longitude;
  const nextLat = next.technicianLocation?.latitude;
  const nextLng = next.technicianLocation?.longitude;

  if (prevLat !== nextLat || prevLng !== nextLng) return false;
  if (JSON.stringify(prev.routeOrder || []) !== JSON.stringify(next.routeOrder || [])) return false;
  if (serializeJobs(prev.jobs) !== serializeJobs(next.jobs)) return false;
  return true;
});
