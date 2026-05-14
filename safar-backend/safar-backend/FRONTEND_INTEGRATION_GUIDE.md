# 🛡️ SAFAR — Frontend Integration Guide (React Native)

> **For:** Frontend Developer  
> **Backend:** Spring Boot REST API  
> **Base URL:** `http://<SERVER_IP>:8080/api/v1`  
> **Auth:** JWT Bearer Token  
> **Content-Type:** `application/json` for all requests  

---

## 📋 Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Authentication Flow](#2-authentication-flow)
3. [API Client Setup (Axios)](#3-api-client-setup)
4. [Auth APIs](#4-auth-apis)
5. [User APIs](#5-user-apis)
6. [Zone APIs](#6-zone-apis)
7. [Safety Score API](#7-safety-score-api)
8. [Report APIs](#8-report-apis)
9. [Route APIs](#9-route-apis)
10. [Emergency Contacts APIs](#10-emergency-contacts-apis)
11. [SOS APIs](#11-sos-apis)
12. [WebSocket Integration (Live SOS Tracking)](#12-websocket-integration)
13. [Screens & Feature Mapping](#13-screens--feature-mapping)
14. [Color Codes & Constants](#14-color-codes--constants)
15. [Error Handling](#15-error-handling)
16. [Offline Handling](#16-offline-handling)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│              React Native App                       │
│                                                     │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌─────────┐  │
│  │  Auth   │ │   Map   │ │   SOS    │ │ Profile │  │
│  │ Screen  │ │  Screen │ │  Screen  │ │ Screen  │  │
│  └────┬────┘ └────┬────┘ └────┬─────┘ └────┬────┘  │
│       │           │           │             │       │
│  ┌────▼───────────▼───────────▼─────────────▼────┐  │
│  │           API Client (Axios)                   │  │
│  │    + JWT auto-attach                           │  │
│  │    + 401 auto-refresh                          │  │
│  └────────────────┬──────────────────────────────┘  │
│                   │                                  │
│  ┌────────────────▼──────────────────────────────┐  │
│  │        WebSocket Client (STOMP/SockJS)         │  │
│  │    For: Live SOS location tracking             │  │
│  └───────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS / WSS
┌──────────────────────▼──────────────────────────────┐
│              Spring Boot Backend                     │
│              Base: /api/v1                            │
│              WebSocket: /ws                          │
└─────────────────────────────────────────────────────┘
```

---

## 2. Authentication Flow

```
App Launch
    │
    ▼
Check AsyncStorage for stored JWT token
    │
    ├── Token exists → Validate by calling GET /users/me
    │       │
    │       ├── 200 OK → Go to Home Screen
    │       └── 401 → Try refresh token
    │               │
    │               ├── 200 → Save new token → Home Screen
    │               └── 401 → Go to Login Screen
    │
    └── No token → Go to Login Screen
            │
            ▼
    User enters email + password
            │
            ▼
    POST /auth/login → Save tokens to AsyncStorage → Home Screen
```

### Token Storage Strategy
```
AsyncStorage:
  @safar/access_token  → JWT access token (24h expiry)
  @safar/refresh_token → JWT refresh token (7d expiry)
  @safar/user          → JSON user object
```

---

## 3. API Client Setup

### Recommended Axios Instance Setup

```typescript
// src/api/client.ts

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://<SERVER_IP>:8080/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto-attach JWT token to every request
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@safar/access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = await AsyncStorage.getItem('@safar/refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          const newToken = res.data.data.accessToken;
          await AsyncStorage.setItem('@safar/access_token', newToken);
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(error.config); // Retry original request
        } catch (refreshError) {
          // Refresh failed → force logout
          await AsyncStorage.multiRemove(['@safar/access_token', '@safar/refresh_token', '@safar/user']);
          // Navigate to Login screen
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## 4. Auth APIs

### 4.1 Register

```
POST /auth/register
Auth: ❌ None
```

**Request:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securepass123",
  "phone": "9876543210"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "expiresIn": 86400,
    "user": {
      "id": "uuid",
      "email": "jane@example.com",
      "name": "Jane Doe",
      "phone": "9876543210",
      "createdAt": "2026-05-13T...",
      "lastActive": "2026-05-13T..."
    }
  }
}
```

**Frontend Action:**
- Store `accessToken`, `refreshToken`, `user` in AsyncStorage
- Navigate to Home Screen
- Show welcome message with user's name

**Validation to show on form:**
- Name: required, 2-100 chars
- Email: required, valid email format
- Password: required, min 6 chars
- Phone: optional

---

### 4.2 Login

```
POST /auth/login
Auth: ❌ None
```

**Request:**
```json
{
  "email": "jane@example.com",
  "password": "securepass123"
}
```

**Response (200):** Same structure as Register

**Error (401):**
```json
{
  "code": "INVALID_CREDENTIALS",
  "message": "Invalid email or password"
}
```

**Frontend Action:**
- Same as register (store tokens, navigate)
- On error: show "Invalid email or password" toast

---

### 4.3 Refresh Token

```
POST /auth/refresh
Auth: ❌ None
```

**Request:**
```json
{
  "refreshToken": "eyJhbGci..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...(new token)",
    "expiresIn": 86400
  }
}
```

**Frontend Action:**
- Called automatically by Axios interceptor on 401
- Replace stored access token
- Retry failed request

---

## 5. User APIs

### 5.1 Get Profile

```
GET /users/me
Auth: ✅ Bearer Token
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "jane@example.com",
    "phone": "9876543210",
    "name": "Jane Doe",
    "createdAt": "2026-05-13T...",
    "lastActive": "2026-05-13T..."
  }
}
```

**Frontend Use:**
- Profile screen display
- Validate token on app launch
- Show user name in navigation header

---

### 5.2 Update FCM Token (Push Notifications)

```
PUT /users/me/fcm-token
Auth: ✅ Bearer Token
```

**Request:**
```json
{
  "fcmToken": "firebase-cloud-messaging-token"
}
```

**Frontend Action:**
- Call this after Firebase messaging registration
- Call on every app launch (token can change)

```typescript
import messaging from '@react-native-firebase/messaging';

const fcmToken = await messaging().getToken();
await apiClient.put('/users/me/fcm-token', { fcmToken });
```

---

## 6. Zone APIs

### 6.1 Get All Zones

```
GET /zones
Auth: ❌ None
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "zones": [
      {
        "id": "uuid",
        "type": "CRIME_HOTSPOT",
        "severity": 0.90,
        "lat": 28.6289,
        "lng": 77.2310,
        "radiusMeters": 250,
        "label": "High theft zone",
        "description": "42 reported incidents",
        "reportCount": 42,
        "source": "ADMIN"
      }
    ]
  }
}
```

**Zone Types (for icons/colors):**
| Type | Icon Suggestion | Color |
|------|----------------|-------|
| `CRIME_HOTSPOT` | 🔴 danger | Red |
| `HARASSMENT` | ⚠️ warning | Orange-Red |
| `THEFT` | 💰 | Orange |
| `POOR_LIGHTING` | 💡 | Yellow |
| `UNSAFE_ROAD` | 🚧 | Orange |
| `ISOLATED` | 🏚️ | Gray |

**Frontend Use:**
- Render colored circles on map using `react-native-maps` `<Circle>`
- Severity 0.0-1.0 maps to opacity (higher = more opaque/dangerous)
- Tap circle → show callout with label + description

```tsx
{zones.map(zone => (
  <Circle
    key={zone.id}
    center={{ latitude: zone.lat, longitude: zone.lng }}
    radius={zone.radiusMeters}
    fillColor={getZoneColor(zone.type, zone.severity)}
    strokeColor={getZoneStrokeColor(zone.type)}
    strokeWidth={2}
  />
))}
```

---

### 6.2 Get Zones in Viewport (Optimized)

```
GET /zones?minLat=28.5&maxLat=28.7&minLng=77.1&maxLng=77.4
Auth: ❌ None
```

**Frontend Use:**
- Call on every map `onRegionChangeComplete` event
- Only fetches zones visible in current viewport
- More efficient than loading all zones

```typescript
const onRegionChange = async (region) => {
  const zones = await apiClient.get('/zones', {
    params: {
      minLat: region.latitude - region.latitudeDelta/2,
      maxLat: region.latitude + region.latitudeDelta/2,
      minLng: region.longitude - region.longitudeDelta/2,
      maxLng: region.longitude + region.longitudeDelta/2,
    }
  });
  setZones(zones.data.data.zones);
};
```

---

### 6.3 Get Zones Nearby

```
GET /zones/nearby?lat=28.6289&lng=77.2310&radius=500
Auth: ❌ None
```

**Frontend Use:**
- Use with user's current location
- Show "X danger zones near you" badge
- Trigger alert if user enters a zone

---

## 7. Safety Score API

### 7.1 Get Real-Time Safety Score for a Location

```
POST /safety/score
Auth: ❌ None
```

**Request:**
```json
{
  "lat": 28.6139,
  "lng": 77.2090
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "safetyScore": 0.72,
    "safetyLabel": "MODERATE",
    "safetyColor": "#EAB308",
    "analyzedAt": "2026-05-13T12:30:00Z",
    "lat": 28.6139,
    "lng": 77.209,
    "breakdown": {
      "incidentScore": 1.0,
      "lightingScore": 0.75,
      "weatherScore": 0.85,
      "timeScore": 1.0,
      "infrastructureScore": 1.0,
      "incidentCount": 0,
      "streetLampCount": 3,
      "cctvCount": 1,
      "policeStationCount": 0,
      "visibilityMeters": 6000.0,
      "weatherCondition": "Haze",
      "timeOfDay": "DAY"
    },
    "warnings": [
      "Limited street lighting in this area"
    ],
    "rawData": {
      "incidents_30d": 0,
      "street_lamps_200m": 3,
      "cctv_300m": 1,
      "police_stations_1km": 0,
      "visibility_meters": 6000.0,
      "weather": "Haze",
      "time": "DAY",
      "hour": 18
    }
  }
}
```

**Frontend Use — THIS IS THE CORE FEATURE:**

1. **During Navigation:** Call every 10-15 seconds with user's current location
2. **On Map Tap:** Call when user long-presses a point on map
3. **Before Trip:** Call for destination to show preview safety

**UI Components to Build:**

```
┌─────────────────────────────────────────┐
│  Safety Score Badge (always visible)     │
│  ┌───────────────────────────┐          │
│  │  🟢 0.87 SAFE             │          │
│  │  or                       │          │
│  │  🟡 0.65 MODERATE         │          │
│  │  or                       │          │
│  │  🟠 0.42 UNSAFE           │          │
│  │  or                       │          │
│  │  🔴 0.21 DANGER           │          │
│  └───────────────────────────┘          │
│                                          │
│  Breakdown (expandable):                 │
│  ├── 📊 Incidents: 0 nearby             │
│  ├── 💡 Lighting: 3 street lamps        │
│  ├── 🌤️ Weather: Haze, 6km visibility  │
│  ├── 🕐 Time: DAY                       │
│  └── 📹 Infrastructure: 1 CCTV          │
│                                          │
│  ⚠️ Warnings:                           │
│  • Limited street lighting               │
└─────────────────────────────────────────┘
```

**Score → Color Mapping:**
```typescript
const getSafetyColor = (score: number) => {
  if (score >= 0.80) return '#22C55E'; // Green
  if (score >= 0.60) return '#EAB308'; // Yellow
  if (score >= 0.40) return '#F97316'; // Orange
  return '#EF4444';                     // Red
};
```

**Score → Label Mapping:**
```typescript
const getSafetyLabel = (score: number) => {
  if (score >= 0.80) return 'SAFE';
  if (score >= 0.60) return 'MODERATE';
  if (score >= 0.40) return 'UNSAFE';
  return 'DANGER';
};
```

---

## 8. Report APIs

### 8.1 Submit Incident Report

```
POST /reports
Auth: ✅ Bearer Token
```

**Request:**
```json
{
  "lat": 28.6139,
  "lng": 77.2090,
  "category": "HARASSMENT",
  "description": "Faced verbal harassment near metro station",
  "occurredAt": "2026-05-13T20:30:00Z"
}
```

**Valid Categories:**
| Category | Label for UI | Icon |
|----------|-------------|------|
| `HARASSMENT` | Harassment | ⚠️ |
| `THEFT` | Theft/Robbery | 💰 |
| `POOR_LIGHTING` | Poor Lighting | 💡 |
| `UNSAFE_ROAD` | Unsafe Road | 🚧 |
| `SUSPICIOUS_ACTIVITY` | Suspicious Activity | 👁️ |
| `OTHER` | Other | ❓ |

**Response (201):**
```json
{
  "success": true,
  "message": "Report submitted. Thank you for keeping your community safe.",
  "data": {
    "id": "uuid",
    "category": "HARASSMENT",
    "description": "...",
    "lat": 28.6139,
    "lng": 77.209,
    "status": "PENDING",
    "occurredAt": "2026-05-13T20:30:00Z",
    "createdAt": "2026-05-13T21:00:00Z"
  }
}
```

**Error — Duplicate Report (400):**
```json
{
  "code": "DUPLICATE_REPORT",
  "message": "You already submitted a similar report recently"
}
```

**Frontend UI:**
- Long-press on map → "Report Unsafe Area" option
- Category picker (dropdown or chips)
- Optional description text field (max 500 chars)
- Optional date/time picker for "occurredAt"
- Submit button
- Show success toast with the thank you message
- Automatically use user's current location OR tapped location

---

### 8.2 Get Reports in Area

```
GET /reports?minLat=28.5&maxLat=28.7&minLng=77.1&maxLng=77.4
Auth: ✅ Bearer Token
```

**Frontend Use:**
- Show community report pins on map
- Different icon per category
- Tap pin → show report details in callout

---

### 8.3 Get My Reports

```
GET /reports/mine
Auth: ✅ Bearer Token
```

**Frontend Use:**
- Profile screen → "My Reports" section
- List of user's submitted reports with status

---

## 9. Route APIs

### 9.1 Analyze Safe Routes

```
POST /routes/analyze
Auth: ✅ Bearer Token
```

**Request:**
```json
{
  "origin": {
    "lat": 28.6139,
    "lng": 77.2090,
    "address": "Connaught Place"
  },
  "destination": {
    "lat": 28.5355,
    "lng": 77.3910,
    "address": "Noida Sector 18"
  },
  "travelMode": "WALKING"
}
```

**Travel Modes:** `WALKING` | `DRIVING` | `TRANSIT`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "analysisId": "uuid",
    "analyzedAt": "2026-05-13T...",
    "routes": [
      {
        "routeId": "uuid",
        "rank": 1,
        "recommended": true,
        "safetyScore": 0.87,
        "safetyLabel": "SAFE",
        "safetyColor": "#22C55E",
        "encodedPolyline": "abcdef...",
        "duration": { "value": 1440, "text": "24 min" },
        "distance": { "value": 2300, "text": "2.3 km" },
        "dangerZones": [
          {
            "id": "uuid",
            "type": "POOR_LIGHTING",
            "severity": 0.6,
            "lat": 28.62,
            "lng": 77.24,
            "radiusMeters": 100,
            "label": "Poorly lit street"
          }
        ],
        "warnings": ["Route passes through 1 flagged zone"]
      },
      {
        "routeId": "uuid",
        "rank": 2,
        "recommended": false,
        "safetyScore": 0.52,
        "safetyLabel": "UNSAFE",
        "safetyColor": "#F97316",
        "encodedPolyline": "xyz...",
        "duration": { "value": 1200, "text": "20 min" },
        "distance": { "value": 2100, "text": "2.1 km" },
        "dangerZones": [...],
        "warnings": ["Night risk elevated", "Passes through 3 zones"]
      }
    ]
  }
}
```

**Frontend UI — Route Analysis Screen:**

```
┌─────────────────────────────────────────┐
│  [Map with multiple colored polylines]   │
│                                          │
│  🟢 Route 1 (Recommended)               │
│  🟡 Route 2                              │
│  🔴 Route 3                              │
│                                          │
├─────────────────────────────────────────┤
│  Route Cards (scrollable):               │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │ ⭐ RECOMMENDED                      │ │
│  │ 🟢 Safety: 0.87 SAFE               │ │
│  │ ⏱️ 24 min  📏 2.3 km               │ │
│  │ ⚠️ 1 flagged zone                  │ │
│  │ [Navigate]                          │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │ 🟠 Safety: 0.52 UNSAFE             │ │
│  │ ⏱️ 20 min  📏 2.1 km               │ │
│  │ ⚠️ 3 flagged zones, Night risk     │ │
│  │ [Navigate]                          │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Polyline Decoding:**
```typescript
// Install: npm install @mapbox/polyline
import polyline from '@mapbox/polyline';

const coordinates = polyline.decode(route.encodedPolyline).map(([lat, lng]) => ({
  latitude: lat,
  longitude: lng,
}));

<Polyline
  coordinates={coordinates}
  strokeColor={route.safetyColor}
  strokeWidth={route.recommended ? 6 : 3}
  lineDashPattern={route.recommended ? undefined : [5, 5]}
/>
```

---

### 9.2 Route History

```
GET /routes/history?page=0&size=20
Auth: ✅ Bearer Token
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "uuid",
        "originLat": 28.6139,
        "originLng": 77.209,
        "destLat": 28.5355,
        "destLng": 77.391,
        "originAddress": "Connaught Place",
        "destAddress": "Noida Sector 18",
        "safetyScore": 0.87,
        "travelMode": "WALKING",
        "createdAt": "2026-05-13T..."
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 5,
    "totalPages": 1,
    "last": true
  }
}
```

**Frontend Use:**
- Profile screen → "Recent Trips" section
- Tap to re-navigate same route
- Show safety score with color badge

---

## 10. Emergency Contacts APIs

### 10.1 Add Emergency Contact

```
POST /contacts
Auth: ✅ Bearer Token
```

**Request:**
```json
{
  "name": "Mom",
  "phone": "9876543210",
  "email": "mom@example.com",
  "relationship": "Mother",
  "isPrimary": true
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Emergency contact added",
  "data": {
    "id": "uuid",
    "name": "Mom",
    "phone": "9876543210",
    "email": "mom@example.com",
    "relationship": "Mother",
    "isPrimary": true,
    "createdAt": "2026-05-13T..."
  }
}
```

**Error — Max 5 contacts (400):**
```json
{
  "code": "MAX_CONTACTS",
  "message": "Maximum 5 emergency contacts allowed"
}
```

**Frontend UI:**
- Profile → Emergency Contacts section
- "Add Contact" button → form modal
- Show contacts list with primary contact highlighted
- Swipe to delete

**Validation:**
- Name: required
- Phone: required, 10-15 digits
- Email: optional
- Relationship: optional

---

### 10.2 List My Contacts

```
GET /contacts
Auth: ✅ Bearer Token
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "contacts": [
      {
        "id": "uuid",
        "name": "Mom",
        "phone": "9876543210",
        "email": "mom@example.com",
        "relationship": "Mother",
        "isPrimary": true,
        "createdAt": "2026-05-13T..."
      },
      {
        "id": "uuid",
        "name": "Best Friend",
        "phone": "9123456789",
        "email": null,
        "relationship": "Friend",
        "isPrimary": false,
        "createdAt": "2026-05-13T..."
      }
    ]
  }
}
```

---

### 10.3 Delete Contact

```
DELETE /contacts/{id}
Auth: ✅ Bearer Token
```

**Response (200):**
```json
{
  "success": true,
  "message": "Contact removed"
}
```

---

## 11. SOS APIs

### ⚠️ THIS IS THE MOST CRITICAL FEATURE

### 11.1 Trigger SOS

```
POST /sos/trigger
Auth: ✅ Bearer Token
```

**Request:**
```json
{
  "lat": 28.6139,
  "lng": 77.2090,
  "accuracy": 10.5,
  "message": "I feel unsafe, please help!"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "SOS activated. Contacts notified. Call 112 if needed.",
  "data": {
    "eventId": "uuid",
    "status": "ACTIVE",
    "triggerLat": 28.6139,
    "triggerLng": 77.209,
    "lastLat": 28.6139,
    "lastLng": 77.209,
    "message": "I feel unsafe, please help!",
    "wsChannel": "/topic/sos/uuid",
    "triggeredAt": "2026-05-13T21:10:00Z",
    "expiresAt": "2026-05-13T21:40:00Z"
  }
}
```

**What Backend Does Automatically (in parallel):**
1. ✅ Saves SOS event to database
2. 📱 Sends SMS to ALL emergency contacts with Google Maps link
3. 📧 Sends Email to contacts + authority
4. 🔴 Broadcasts via WebSocket

**Frontend Actions on Trigger:**
1. Call the API
2. Save `eventId` in state
3. Connect to WebSocket channel `wsChannel`
4. Start foreground location service (send location every 5 seconds)
5. Show SOS Active screen (full screen, red, pulsing)
6. Show "Call 112" button (uses `Linking.openURL('tel:112')`)
7. Show "I'm Safe" button to resolve

**SOS Button Implementation:**
```tsx
// ALWAYS visible floating button on all main screens
<TouchableOpacity
  style={styles.sosButton}
  onLongPress={triggerSOS}  // Long press to prevent accidental triggers
  delayLongPress={1000}     // 1 second hold
>
  <Text style={styles.sosText}>SOS</Text>
</TouchableOpacity>

// Style: Large red circle, always on top
const styles = {
  sosButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    zIndex: 999,
  }
};
```

---

### 11.2 Update Location During SOS

```
POST /sos/{eventId}/location
Auth: ✅ Bearer Token
```

**Request:**
```json
{
  "lat": 28.6150,
  "lng": 77.2100,
  "accuracy": 8.0
}
```

**Frontend Action:**
- Call every 5 seconds while SOS is active
- Use React Native background location service

```typescript
// Start location tracking when SOS is triggered
const locationInterval = setInterval(async () => {
  const location = await Geolocation.getCurrentPosition();
  await apiClient.post(`/sos/${eventId}/location`, {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    accuracy: location.coords.accuracy,
  });
}, 5000);

// Stop when SOS is resolved
clearInterval(locationInterval);
```

---

### 11.3 Resolve SOS (User is Safe)

**Option A — POST:**
```
POST /sos/resolve
Auth: ✅ Bearer Token
```
```json
{
  "sosSessionId": "uuid-from-trigger"
}
```

**Option B — DELETE:**
```
DELETE /sos/{eventId}
Auth: ✅ Bearer Token
```

Both do the same thing.

**Response (200):**
```json
{
  "success": true,
  "message": "SOS resolved. Your contacts have been notified that you are safe.",
  "data": {
    "eventId": "uuid",
    "status": "RESOLVED",
    "triggeredAt": "2026-05-13T21:10:00Z"
  }
}
```

**What Backend Does Automatically:**
1. ✅ Updates DB status to RESOLVED
2. 📱 Sends "User is safe" SMS to all contacts
3. 📧 Sends "User is safe" Email to contacts
4. 🟢 Broadcasts SOS_RESOLVED via WebSocket

**Frontend Actions:**
1. Stop location tracking
2. Disconnect WebSocket
3. Show "You're Safe" confirmation screen
4. Navigate back to Home

---

### 11.4 Check Active SOS

```
GET /sos/active
Auth: ✅ Bearer Token
```

**Response — Active SOS exists:**
```json
{
  "success": true,
  "data": {
    "eventId": "uuid",
    "status": "ACTIVE",
    "wsChannel": "/topic/sos/uuid",
    ...
  }
}
```

**Response — No active SOS:**
```json
{
  "success": true,
  "data": null
}
```

**Frontend Use:**
- Check on app launch
- If active SOS found → resume SOS Active screen
- Handles app restart during SOS

---

## 12. WebSocket Integration (Live SOS Tracking)

### Connection Setup

```typescript
// Install: npm install @stomp/stompjs sockjs-client
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_URL = 'http://<SERVER_IP>:8080/api/v1/ws';

const stompClient = new Client({
  webSocketFactory: () => new SockJS(WS_URL),
  reconnectDelay: 5000,
  heartbeatIncoming: 4000,
  heartbeatOutgoing: 4000,
});

stompClient.activate();
```

### Subscribe to SOS Updates (Emergency Contact Side)

```typescript
// When a contact receives SOS SMS/Email with tracking link
stompClient.subscribe(`/topic/sos/${sosSessionId}`, (message) => {
  const data = JSON.parse(message.body);
  
  switch (data.type) {
    case 'SOS_TRIGGERED':
      // Show alert: "User triggered SOS!"
      // Show their location on map
      break;
      
    case 'LOCATION_UPDATE':
      // Update marker position on map
      // data.lat, data.lng
      break;
      
    case 'SOS_RESOLVED':
      // Show: "User is safe!"
      // Stop tracking
      break;
  }
});
```

### Send Location via WebSocket (Alternative to REST)

```typescript
// Instead of POST /sos/{id}/location, can also use WebSocket
stompClient.publish({
  destination: '/app/sos/location',
  body: JSON.stringify({
    sosSessionId: eventId,
    lat: currentLocation.latitude,
    lng: currentLocation.longitude,
  }),
});
```

### WebSocket Message Types

| Type | Direction | Description |
|------|-----------|-------------|
| `SOS_TRIGGERED` | Server → Client | SOS was just triggered |
| `LOCATION_UPDATE` | Server → Client | User's location updated |
| `SOS_RESOLVED` | Server → Client | User is safe |

### Message Payload Structure

```json
{
  "type": "LOCATION_UPDATE",
  "eventId": "uuid",
  "userId": "uuid",
  "userName": "Jane Doe",
  "lat": 28.6150,
  "lng": 77.2100,
  "status": "ACTIVE",
  "timestamp": "2026-05-13T21:11:00Z",
  "emergencyNumber": "112",
  "dialIntent": "tel:112"
}
```

---

## 13. Screens & Feature Mapping

### Screen Architecture

```
App
├── Auth Stack (unauthenticated)
│   ├── LoginScreen
│   ├── RegisterScreen
│   └── OnboardingScreen
│
└── Main Stack (authenticated)
    ├── Tab: Home (Map)
    │   ├── HomeScreen — Full-screen map with:
    │   │   ├── User location pin
    │   │   ├── Unsafe zone circles (from GET /zones)
    │   │   ├── Community report pins (from GET /reports)
    │   │   ├── Safety score badge (from POST /safety/score)
    │   │   └── SOS floating button (always visible)
    │   │
    │   ├── SearchScreen — Origin/Destination input
    │   │   └── Calls POST /routes/analyze
    │   │
    │   └── RouteResultScreen — Show scored routes
    │       ├── Multiple polylines on map
    │       ├── Route cards with scores
    │       └── "Navigate" button → opens Google Maps / in-app nav
    │
    ├── Tab: Report
    │   └── ReportScreen — Submit incident
    │       ├── Category picker
    │       ├── Description field
    │       ├── Location (auto or manual)
    │       └── Calls POST /reports
    │
    ├── Tab: Profile
    │   ├── ProfileScreen
    │   │   ├── User info (GET /users/me)
    │   │   ├── Emergency Contacts (GET /contacts)
    │   │   ├── My Reports (GET /reports/mine)
    │   │   ├── Route History (GET /routes/history)
    │   │   └── Settings
    │   │
    │   └── ContactsScreen — CRUD contacts
    │       └── Calls POST/GET/DELETE /contacts
    │
    └── Modal: SOS Active Screen (full-screen overlay)
        ├── Pulsing red background
        ├── Live location on map
        ├── "Call 112" button
        ├── "I'm Safe" button (calls POST /sos/resolve)
        └── Timer showing duration
```

### API Calls Per Screen

| Screen | API Calls | Frequency |
|--------|-----------|-----------|
| **Home (Map)** | `GET /zones`, `POST /safety/score` | On load + every 15s |
| **Search** | `POST /routes/analyze` | On search submit |
| **Route Result** | None (uses data from analyze) | — |
| **Report** | `POST /reports` | On submit |
| **Profile** | `GET /users/me`, `GET /contacts`, `GET /reports/mine`, `GET /routes/history` | On load |
| **SOS Active** | `POST /sos/trigger`, `POST /sos/{id}/location`, `POST /sos/resolve` | Trigger once, location every 5s |

---

## 14. Color Codes & Constants

### Safety Colors
```typescript
export const SAFETY_COLORS = {
  SAFE: '#22C55E',       // Green
  MODERATE: '#EAB308',   // Yellow
  UNSAFE: '#F97316',     // Orange
  DANGER: '#EF4444',     // Red
};
```

### Zone Type Colors
```typescript
export const ZONE_COLORS = {
  CRIME_HOTSPOT: '#EF4444',   // Red
  HARASSMENT: '#F97316',       // Orange
  THEFT: '#F59E0B',            // Amber
  POOR_LIGHTING: '#EAB308',   // Yellow
  UNSAFE_ROAD: '#F97316',     // Orange
  ISOLATED: '#6B7280',        // Gray
};
```

### Report Category Labels
```typescript
export const REPORT_CATEGORIES = [
  { value: 'HARASSMENT', label: 'Harassment', icon: '⚠️' },
  { value: 'THEFT', label: 'Theft/Robbery', icon: '💰' },
  { value: 'POOR_LIGHTING', label: 'Poor Lighting', icon: '💡' },
  { value: 'UNSAFE_ROAD', label: 'Unsafe Road', icon: '🚧' },
  { value: 'SUSPICIOUS_ACTIVITY', label: 'Suspicious Activity', icon: '👁️' },
  { value: 'OTHER', label: 'Other', icon: '❓' },
];
```

---

## 15. Error Handling

### Standard Error Response
```json
{
  "code": "ERROR_CODE",
  "message": "Human readable message",
  "details": [
    { "field": "email", "message": "Invalid email format" }
  ],
  "timestamp": "2026-05-13T..."
}
```

### Error Codes to Handle

| Code | Status | Action |
|------|--------|--------|
| `VALIDATION_ERROR` | 400 | Show field-level errors on form |
| `EMAIL_EXISTS` | 400 | Show "Email already registered" |
| `DUPLICATE_REPORT` | 400 | Show "Already reported" toast |
| `MAX_CONTACTS` | 400 | Show "Max 5 contacts" |
| `SOS_ALREADY_ACTIVE` | 400 | Resume existing SOS screen |
| `INVALID_CREDENTIALS` | 401 | Show "Wrong email/password" |
| `UNAUTHORIZED` | 401 | Token expired → auto-refresh |
| `ACCESS_DENIED` | 403 | Show "Access denied" |
| `USER_NOT_FOUND` | 404 | Redirect to login |
| `ZONE_NOT_FOUND` | 404 | Show "Zone not found" |
| `SOS_NOT_FOUND` | 404 | Show "No active SOS" |
| `INTERNAL_ERROR` | 500 | Show "Something went wrong" toast |

### Error Handling Pattern
```typescript
try {
  const response = await apiClient.post('/reports', reportData);
  showToast('success', response.data.message);
} catch (error) {
  if (error.response) {
    const { code, message, details } = error.response.data;
    
    if (code === 'VALIDATION_ERROR' && details) {
      // Show field errors
      details.forEach(d => setFieldError(d.field, d.message));
    } else {
      showToast('error', message);
    }
  } else {
    showToast('error', 'Network error. Check your connection.');
  }
}
```

---

## 16. Offline Handling

### Strategy

| Feature | Offline Behavior |
|---------|-----------------|
| View map | Works (cached tiles) |
| View zones | Show last cached zones |
| Safety score | Show "Offline — score unavailable" |
| Submit report | Queue locally, submit when online |
| SOS trigger | Show "No internet. SMS only." + open `tel:112` |
| Route analysis | Show "Offline — cannot analyze routes" |

### Implementation

```typescript
import NetInfo from '@react-native-community/netinfo';

// Listen for connectivity changes
NetInfo.addEventListener(state => {
  if (!state.isConnected) {
    showBanner('No internet connection. Limited features available.');
  } else {
    hideBanner();
    // Flush queued reports
    flushPendingReports();
  }
});
```

---

## 📦 Required React Native Packages

```bash
npm install axios
npm install @react-native-async-storage/async-storage
npm install react-native-maps
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
npm install react-native-geolocation-service
npm install @react-native-community/netinfo
npm install @stomp/stompjs sockjs-client
npm install @mapbox/polyline
npm install react-native-permissions
npm install react-native-background-geolocation  # For SOS background tracking
```

Optional (for push notifications):
```bash
npm install @react-native-firebase/app @react-native-firebase/messaging
```

---

## 🔑 Environment Variables for Frontend

```typescript
// src/constants/config.ts
export const CONFIG = {
  API_BASE_URL: 'http://<SERVER_IP>:8080/api/v1',
  WS_URL: 'http://<SERVER_IP>:8080/api/v1/ws',
  GOOGLE_MAPS_API_KEY: 'your-google-maps-key',  // For react-native-maps
  SOS_LOCATION_INTERVAL: 5000,   // 5 seconds
  SAFETY_SCORE_INTERVAL: 15000,  // 15 seconds
  MAX_EMERGENCY_CONTACTS: 5,
};
```

---

**Good luck building the frontend! 🚀**

*If you need any API changes or have questions, ask the backend developer.*
