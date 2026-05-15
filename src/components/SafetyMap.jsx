import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Decode Google encoded polyline → [[lng, lat], ...] (MapLibre order)
function decodePolyline(str, precision = 5) {
  let index = 0, lat = 0, lng = 0, result = 0, shift = 0, byte = null,
    factor = Math.pow(10, precision), coords = [];
  while (index < str.length) {
    byte = null; shift = 0; result = 0;
    do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lat += ((result & 1) ? ~(result >> 1) : (result >> 1));
    shift = result = 0;
    do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lng += ((result & 1) ? ~(result >> 1) : (result >> 1));
    coords.push([lng / factor, lat / factor]); // [lng, lat] for MapLibre
  }
  return coords;
}

function makeZonesGeoJSON(zones) {
  return {
    type: 'FeatureCollection',
    features: zones.map(zone => {
      const pts = 48, r = zone.radiusMeters / 1000;
      const dx = r / (111.320 * Math.cos(zone.lat * Math.PI / 180));
      const dy = r / 110.574;
      const ring = Array.from({ length: pts + 1 }, (_, i) => {
        const a = (i / pts) * 2 * Math.PI;
        return [zone.lng + dx * Math.cos(a), zone.lat + dy * Math.sin(a)];
      });
      return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: { severity: zone.severity || 0.5 } };
    })
  };
}

const CATEGORY_ICONS = { STREET_LIGHT: '💡', POLICE: '👮', HARASSMENT: '⚠️', CROWD: '👥', OTHER: '❓', THEFT: '💰', POOR_LIGHTING: '💡', UNSAFE_ROAD: '🚧', SUSPICIOUS_ACTIVITY: '👁️' };
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export default function SafetyMap({ zones = [], reports = [], userLat, userLng, route, routes = [] }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const loadedRef = useRef(false);
  const markersRef = useRef([]);

  // ── Initialize map ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return;
    const center = [userLng || 75.8577, userLat || 22.7196];

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center,
      zoom: 14,
      attributionControl: false,
    });
    mapRef.current = map;

    map.on('load', () => {
      loadedRef.current = true;

      // Sources
      map.addSource('zones-src',     { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addSource('unsel-src',     { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addSource('sel-src',       { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

      // Zone fill
      map.addLayer({ id: 'zones-fill', type: 'fill', source: 'zones-src',
        paint: { 'fill-color': '#EF4444', 'fill-opacity': ['*', ['get', 'severity'], 0.18] } });
      map.addLayer({ id: 'zones-line', type: 'line', source: 'zones-src',
        paint: { 'line-color': '#EF4444', 'line-width': 1, 'line-opacity': 0.5 } });

      // Unselected routes (dimmed, data-driven color)
      map.addLayer({ id: 'unsel-layer', type: 'line', source: 'unsel-src',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': ['get', 'strokeColor'], 'line-width': ['get', 'strokeWidth'], 'line-opacity': 0.3 } });

      // Selected route — solid layer
      map.addLayer({ id: 'sel-solid', type: 'line', source: 'sel-src',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': ['get', 'strokeColor'], 'line-width': ['get', 'strokeWidth'], 'line-opacity': ['get', 'opacity'] } });

      // Selected route — dashed overlay (hidden by default)
      map.addLayer({ id: 'sel-dashed', type: 'line', source: 'sel-src',
        layout: { 'line-join': 'round', 'line-cap': 'round', 'visibility': 'none' },
        paint: { 'line-color': ['get', 'strokeColor'], 'line-width': ['get', 'strokeWidth'], 'line-opacity': ['get', 'opacity'], 'line-dasharray': [3, 4] } });

      // Trigger initial data paint
      map.fire('safar:update');
    });

    return () => { map.remove(); mapRef.current = null; loadedRef.current = false; };
  }, []);

  // ── Update zones ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    mapRef.current.getSource('zones-src')?.setData(makeZonesGeoJSON(zones));
  }, [zones]);

  // ── Update routes ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;

    // Unselected
    const unsel = routes.filter(r => r?.encodedPolyline && r.routeId !== route?.routeId);
    map.getSource('unsel-src')?.setData({
      type: 'FeatureCollection',
      features: unsel.map(r => ({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: decodePolyline(r.encodedPolyline) },
        properties: { strokeColor: r.style?.strokeColor || '#888', strokeWidth: r.style?.strokeWidth || 4 }
      }))
    });

    // Selected
    const sel = routes.find(r => r?.routeId === route?.routeId) || route;
    if (sel?.encodedPolyline) {
      const coords = decodePolyline(sel.encodedPolyline);
      map.getSource('sel-src')?.setData({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords },
          properties: { strokeColor: sel.style?.strokeColor || '#fff', strokeWidth: sel.style?.strokeWidth || 6, opacity: sel.style?.opacity ?? 1.0 } }]
      });

      // Toggle solid vs dashed
      const isDotted = sel.style?.lineType === 'DOTTED';
      map.setLayoutProperty('sel-solid',  'visibility', isDotted ? 'none' : 'visible');
      map.setLayoutProperty('sel-dashed', 'visibility', isDotted ? 'visible' : 'none');

      // Fit bounds
      if (coords.length > 0) {
        const bounds = coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
        map.fitBounds(bounds, { padding: 60, duration: 800 });
      }
    } else {
      map.getSource('sel-src')?.setData({ type: 'FeatureCollection', features: [] });
      map.setLayoutProperty('sel-solid',  'visibility', 'visible');
      map.setLayoutProperty('sel-dashed', 'visibility', 'none');
    }
  }, [routes, route]);

  // ── Update markers (user + reports) ──────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const addMarker = (lng, lat, html, anchor = 'center') => {
      const el = document.createElement('div');
      el.innerHTML = html;
      const m = new maplibregl.Marker({ element: el.firstChild, anchor }).setLngLat([lng, lat]).addTo(map);
      markersRef.current.push(m);
    };

    // User location
    if (userLat && userLng) {
      addMarker(userLng, userLat, `
        <div style="position:relative;width:20px;height:20px">
          <div style="position:absolute;inset:0;background:#fff;border-radius:50%;box-shadow:0 0 12px rgba(255,255,255,0.6)"></div>
          <div style="position:absolute;top:4px;left:4px;width:12px;height:12px;background:#000;border-radius:50%"></div>
        </div>`);
    }

    // Report markers
    reports.forEach(r => {
      addMarker(r.lng, r.lat, `
        <div style="font-size:20px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));cursor:pointer" title="${r.category}">
          ${CATEGORY_ICONS[r.category] || '📍'}
        </div>`);
    });
  }, [reports, userLat, userLng]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
