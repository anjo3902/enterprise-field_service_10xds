import React, { useMemo, useState } from 'react';

const MAPS_EMBED_KEY_NAME = 'VITE_GOOGLE_MAPS_EMBED_API_KEY';
const PLACEHOLDER_EMBED_KEYS = new Set([
  'your_key',
  'your_key_here',
  'your-embed-api-key-here',
  'replace_me',
]);

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const hasStrictCoordinates = (lat: any, lng: any) => (
  lat !== null
  && lng !== null
  && !(Number(lat) === 0 && Number(lng) === 0)
);

const toQuery = (point: { lat: number, lng: number }) => `${point.lat},${point.lng}`;

const isConfiguredEmbedKey = (value: string) => {
  const normalized = String(value || '').trim().toLowerCase();
  return Boolean(normalized) && !PLACEHOLDER_EMBED_KEYS.has(normalized);
};

function toPoint(rawPoint: any) {
  const lat = toNumber(rawPoint?.lat ?? rawPoint?.latitude);
  const lng = toNumber(rawPoint?.lng ?? rawPoint?.longitude);
  return hasStrictCoordinates(lat, lng) ? { lat, lng } : null;
}

interface GoogleMapEmbedProps {
  latitude: number | string | null;
  longitude: number | string | null;
  zoom?: number;
  origin?: any;
  destination?: any;
  waypoints?: any[];
  title?: string;
  style?: React.CSSProperties;
}

export function TechGoogleMapEmbed({
  latitude,
  longitude,
  zoom = 15,
  origin,
  destination,
  waypoints = [],
  title = 'Google map preview',
  style,
}: GoogleMapEmbedProps) {
  const apiKey = useMemo(() => {
    const raw = String((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || (import.meta as any).env?.[MAPS_EMBED_KEY_NAME] || '').trim();
    return isConfiguredEmbedKey(raw) ? raw : '';
  }, []);

  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isNgrok = hostname.includes('ngrok');
  const allowMap = isLocalhost || isNgrok || hostname !== '';
  const disableMap = !allowMap;
  const [mapFailed, setMapFailed] = useState(false);

  const centerPoint = useMemo(() => {
    const lat = toNumber(latitude);
    const lng = toNumber(longitude);
    return hasStrictCoordinates(lat, lng) ? { lat, lng } : null;
  }, [latitude, longitude]);

  const directionsOrigin = useMemo(() => toPoint(origin), [origin]);
  const directionsDestination = useMemo(() => toPoint(destination), [destination]);

  const normalizedWaypoints = useMemo(
    () => (Array.isArray(waypoints) ? waypoints.map((point) => toPoint(point)).filter(Boolean) as {lat: number, lng: number}[] : []),
    [waypoints]
  );

  const src = useMemo(() => {
    if (!apiKey || !centerPoint || disableMap) return '';

    if (directionsOrigin && directionsDestination) {
      const params = new URLSearchParams({
        key: apiKey,
        origin: toQuery(directionsOrigin),
        destination: toQuery(directionsDestination),
        mode: 'driving',
      });

      if (normalizedWaypoints.length > 0) {
        params.set('waypoints', normalizedWaypoints.map((point) => toQuery(point)).join('|'));
      }

      return `https://www.google.com/maps/embed/v1/directions?${params.toString()}`;
    }

    const params = new URLSearchParams({
      key: apiKey,
      center: toQuery(centerPoint),
      zoom: String(zoom),
    });

    return `https://www.google.com/maps/embed/v1/view?${params.toString()}`;
  }, [
    apiKey,
    centerPoint,
    directionsOrigin,
    directionsDestination,
    normalizedWaypoints,
    disableMap,
    zoom,
  ]);

  const fallbackHref = useMemo(() => {
    const destinationPoint = directionsDestination || centerPoint;
    if (!destinationPoint) return '';
    return `https://www.google.com/maps/dir/?api=1&destination=${destinationPoint.lat},${destinationPoint.lng}`;
  }, [centerPoint, directionsDestination]);

  const amber = "#D97706";
  const amberT = "#FFFBEB";

  if (disableMap) {
    return (
      <div style={{ borderRadius: '12px', border: `1px solid ${amber}40`, backgroundColor: amberT, padding: '16px', fontSize: '14px', color: amber, fontFamily: "'Inter','Roboto',sans-serif" }}>
        Map preview is unavailable in this environment.
      </div>
    );
  }

  if (!src || mapFailed) {
    return fallbackHref ? (
      <div style={{ borderRadius: '12px', border: `1px solid ${amber}40`, backgroundColor: amberT, padding: '16px', fontSize: '14px', color: amber, fontFamily: "'Inter','Roboto',sans-serif" }}>
        <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Map preview could not load.</p>
        <a
          href={fallbackHref}
          target='_blank'
          rel='noreferrer noopener'
          style={{ display: 'inline-flex', alignItems: 'center', borderRadius: '8px', backgroundColor: amber, padding: '8px 12px', fontSize: '13px', fontWeight: 600, color: 'white', textDecoration: 'none' }}
        >
          Open directions in Google Maps
        </a>
      </div>
    ) : null;
  }

  return (
    <iframe
      title={title}
      src={src}
      style={{ border: 0, borderRadius: '12px', width: '100%', height: '100%', ...style }}
      loading='lazy'
      allowFullScreen
      referrerPolicy='no-referrer-when-downgrade'
      onError={() => setMapFailed(true)}
    />
  );
}
