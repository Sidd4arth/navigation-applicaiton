import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function decodePolyline(str, precision = 5) {
  let index = 0, lat = 0, lng = 0, coordinates = [], shift = 0, result = 0, byte = null, latitude_change, longitude_change, factor = Math.pow(10, precision);
  while (index < str.length) {
    byte = null; shift = 0; result = 0;
    do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
    shift = result = 0;
    do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += latitude_change; lng += longitude_change;
    coordinates.push([lat / factor, lng / factor]);
  }
  return coordinates;
}

const CATEGORY_ICONS = {
  STREET_LIGHT: '💡',
  POLICE:       '👮',
  HARASSMENT:   '⚠️',
  CROWD:        '👥',
  OTHER:        '❓',
};

// Component to handle map centering and bounds
function ChangeView({ center, route }) {
  const map = useMap();
  const hasCentered = useRef(false);
  
  useEffect(() => {
    // Only auto-center on user ONCE at start, or if we don't have a route
    if (center && (!hasCentered.current || !route)) {
      map.setView(center, map.getZoom());
      hasCentered.current = true;
    }
  }, [center, route]);

  useEffect(() => {
    if (route && route.encodedPolyline) {
      const points = decodePolyline(route.encodedPolyline);
      if (points.length > 0) {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [route]);

  return null;
}

export default function SafetyMap({ zones = [], reports = [], userLat, userLng, route, routes = [] }) {
  const center = [userLat || 22.7196, userLng || 75.8577];

  // Build a sorted list: unselected routes first (bottom), selected route last (top)
  const unselectedRoutes = routes.filter(r => r && r.encodedPolyline && r.routeId !== route?.routeId);
  const selectedRouteObj = routes.find(r => r && r.routeId === route?.routeId) || route;

  return (
    <div style={{ width: '100%', height: '100%', background: '#000', position: 'relative' }}>
      <MapContainer 
        center={center} 
        zoom={15} 
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <ChangeView center={center} route={route} />
        
        <TileLayer
          url="http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          attribution='&copy; Google Maps'
        />

        {/* Safe/Unsafe Zones */}
        {zones.map((zone) => (
          <Circle
            key={zone.id}
            center={[zone.lat, zone.lng]}
            radius={zone.radiusMeters}
            interactive={false}
            pathOptions={{
              fillColor: '#FF0000',
              fillOpacity: zone.severity * 0.25,
              color: '#FF0000',
              weight: 1,
            }}
          />
        ))}

        {/* Incident Reports */}
        {reports.map((report) => (
          <Marker 
            key={report.id} 
            position={[report.lat, report.lng]}
            icon={L.divIcon({
              className: 'custom-marker',
              html: `<div style="font-size: 24px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3))">${CATEGORY_ICONS[report.category] || '📍'}</div>`,
              iconSize: [30, 30],
              iconAnchor: [15, 15],
            })}
          >
            <Popup>
              <div style={{ color: '#000' }}>
                <strong>{report.category}</strong><br />
                {report.description}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* User Location Marker */}
        <Marker 
          position={center}
          icon={L.divIcon({
            className: 'user-marker',
            html: `
              <div style="position: relative; width: 20px; height: 20px;">
                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #fff; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>
                <div style="position: absolute; top: 4px; left: 4px; width: 12px; height: 12px; background: #000; border-radius: 50%;"></div>
              </div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          })}
        />

        {/* Unselected routes — drawn below, dimmed */}
        {unselectedRoutes.map((r) => {
          const style = r.style || {};
          const dash = style.dashPattern ? style.dashPattern.join(' ') : null;
          return (
            <Polyline
              key={r.routeId}
              positions={decodePolyline(r.encodedPolyline)}
              pathOptions={{
                color: style.strokeColor || '#888888',
                weight: style.strokeWidth || 4,
                opacity: 0.35,
                lineCap: 'round',
                dashArray: dash,
              }}
            />
          );
        })}

        {/* Selected route — drawn on top at full opacity */}
        {selectedRouteObj && selectedRouteObj.encodedPolyline && (() => {
          const style = selectedRouteObj.style || {};
          const dash = style.dashPattern ? style.dashPattern.join(' ') : null;
          return (
            <Polyline
              positions={decodePolyline(selectedRouteObj.encodedPolyline)}
              pathOptions={{
                color: style.strokeColor || '#ffffff',
                weight: style.strokeWidth || 6,
                opacity: style.opacity ?? 1.0,
                lineCap: 'round',
                dashArray: dash,
              }}
            />
          );
        })()}
      </MapContainer>
    </div>
  );
}
