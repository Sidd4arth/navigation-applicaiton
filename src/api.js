/**
 * SAFAR API Service — Real Backend Integration
 *
 * Base URL: http://<SERVER_IP>:8080/api/v1
 * Auth: JWT Bearer token (auto-attached via tokenStore)
 * All responses follow: { success, message?, data? } or error: { code, message, details? }
 */

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

let _accessToken = null;
let _refreshToken = null;

export const tokenStore = {
  set(access, refresh) {
    _accessToken = access;
    _refreshToken = refresh;
    if (access) sessionStorage.setItem('@safar/access_token', access);
    if (refresh) sessionStorage.setItem('@safar/refresh_token', refresh);
  },
  get() {
    return _accessToken || sessionStorage.getItem('@safar/access_token');
  },
  getRefresh() {
    return _refreshToken || sessionStorage.getItem('@safar/refresh_token');
  },
  clear() {
    _accessToken = null;
    _refreshToken = null;
    sessionStorage.removeItem('@safar/access_token');
    sessionStorage.removeItem('@safar/refresh_token');
    sessionStorage.removeItem('@safar/user');
  },
  saveUser(user) {
    sessionStorage.setItem('@safar/user', JSON.stringify(user));
  },
  loadUser() {
    const s = sessionStorage.getItem('@safar/user');
    return s ? JSON.parse(s) : null;
  },
};

// ── Core request helper with auto-refresh ────────────────────────────────────

async function request(method, path, body, skipAuth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (!skipAuth && tokenStore.get()) {
    headers['Authorization'] = `Bearer ${tokenStore.get()}`;
  }

  let res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Auto-refresh on 401
  if (res.status === 401 && !skipAuth) {
    const refreshToken = tokenStore.getRefresh();
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const newToken = refreshData.data?.accessToken;
          if (newToken) {
            tokenStore.set(newToken, refreshToken);
            // Retry original request with new token
            headers['Authorization'] = `Bearer ${newToken}`;
            res = await fetch(`${API_BASE}${path}`, {
              method,
              headers,
              body: body ? JSON.stringify(body) : undefined,
            });
          }
        } else {
          // Refresh failed → force logout
          tokenStore.clear();
          throw new Error('UNAUTHORIZED');
        }
      } catch (refreshError) {
        tokenStore.clear();
        throw new Error('UNAUTHORIZED');
      }
    } else {
      tokenStore.clear();
      throw new Error('UNAUTHORIZED');
    }
  }

  // Parse response
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }

  if (!res.ok) {
    const errMsg = json.message || json.error || `Request failed (${res.status})`;
    const err = new Error(errMsg);
    err.code = json.code;
    err.status = res.status;
    err.details = json.details;
    throw err;
  }

  // Backend wraps data in { success, data } — return data
  return json.data !== undefined ? json.data : json;
}

// ── API Service ──────────────────────────────────────────────────────────────

const apiService = {
  // ── Auth ──────────────────────────────────────────────────────────────────

  async login(email, password) {
    const data = await request('POST', '/auth/login', { email, password }, true);
    tokenStore.set(data.accessToken, data.refreshToken);
    tokenStore.saveUser(data.user);
    return data;
  },

  async register({ name, email, password, phone }) {
    const data = await request('POST', '/auth/register', { name, email, password, phone }, true);
    tokenStore.set(data.accessToken, data.refreshToken);
    tokenStore.saveUser(data.user);
    return data;
  },

  async logout() {
    tokenStore.clear();
  },

  // ── User ──────────────────────────────────────────────────────────────────

  async getProfile() {
    return await request('GET', '/users/me');
  },

  async updateFcmToken(fcmToken) {
    return await request('PUT', '/users/me/fcm-token', { fcmToken });
  },

  // ── Zones ─────────────────────────────────────────────────────────────────

  async getZones(params) {
    let qs = '';
    if (params) {
      const p = new URLSearchParams();
      if (params.minLat != null) p.set('minLat', params.minLat);
      if (params.maxLat != null) p.set('maxLat', params.maxLat);
      if (params.minLng != null) p.set('minLng', params.minLng);
      if (params.maxLng != null) p.set('maxLng', params.maxLng);
      qs = `?${p.toString()}`;
    }
    const data = await request('GET', `/zones${qs}`, null, true);
    // Backend returns { zones: [...] }
    return data?.zones || data || [];
  },

  async getZonesNearby(lat, lng, radius = 500) {
    const data = await request('GET', `/zones/nearby?lat=${lat}&lng=${lng}&radius=${radius}`, null, true);
    return data?.zones || data || [];
  },

  async createZone(zoneData) {
    return await request('POST', '/zones', zoneData);
  },

  async updateZone(id, zoneData) {
    return await request('PUT', `/zones/${id}`, zoneData);
  },

  async deleteZone(id) {
    return await request('DELETE', `/zones/${id}`);
  },

  // ── Safety Score ──────────────────────────────────────────────────────────

  async getSafetyScore(lat, lng) {
    return await request('POST', '/safety/score', { lat, lng }, true);
  },

  // ── Reports ───────────────────────────────────────────────────────────────

  async getReports(params) {
    let qs = '';
    if (params) {
      const p = new URLSearchParams();
      if (params.minLat != null) p.set('minLat', params.minLat);
      if (params.maxLat != null) p.set('maxLat', params.maxLat);
      if (params.minLng != null) p.set('minLng', params.minLng);
      if (params.maxLng != null) p.set('maxLng', params.maxLng);
      qs = `?${p.toString()}`;
    }
    const data = await request('GET', `/reports${qs}`);
    return data?.reports || data || [];
  },

  async getMyReports() {
    const data = await request('GET', '/reports/mine');
    return data?.reports || data || [];
  },

  async submitReport({ lat, lng, category, description, occurredAt }) {
    return await request('POST', '/reports', {
      lat, lng, category, description,
      occurredAt: occurredAt || new Date().toISOString(),
    });
  },

  // ── Routes ────────────────────────────────────────────────────────────────

  async analyzeRoutes(origin, destination, travelMode = 'WALKING') {
    // If string is provided, we simulate a search near Indore center
    // Ideally, a geocoding API would be used here.
    const originObj = typeof origin === 'string' 
      ? { address: origin, lat: 22.7196, lng: 75.8577 } 
      : origin;
    const destObj = typeof destination === 'string' 
      ? { address: destination, lat: 22.7230, lng: 75.8600 } 
      : destination;
    
    return await request('POST', '/routes/analyze', {
      origin: originObj,
      destination: destObj,
      travelMode,
    });
  },

  async getRouteHistory(page = 0, size = 20) {
    const data = await request('GET', `/routes/history?page=${page}&size=${size}`);
    return {
      content: data?.content || [],
      totalElements: data?.totalElements || 0,
      totalPages: data?.totalPages || 0,
    };
  },

  // ── Contacts ──────────────────────────────────────────────────────────────

  async getContacts() {
    const data = await request('GET', '/contacts');
    return data?.contacts || data || [];
  },

  async addContact({ name, phone, email, relationship, isPrimary }) {
    const data = await request('POST', '/contacts', { name, phone, email, relationship, isPrimary });
    return data;
  },

  async deleteContact(id) {
    return await request('DELETE', `/contacts/${id}`);
  },

  // ── SOS ───────────────────────────────────────────────────────────────────

  async triggerSOS(lat, lng, accuracy = 10, message = 'I feel unsafe, please help!') {
    return await request('POST', '/sos/trigger', { lat, lng, accuracy, message });
  },

  async updateSOSLocation(eventId, lat, lng, accuracy = 10) {
    return await request('POST', `/sos/${eventId}/location`, { lat, lng, accuracy });
  },

  async resolveSOS(eventId) {
    return await request('POST', '/sos/resolve', { sosSessionId: eventId });
  },

  async getActiveSOS() {
    return await request('GET', '/sos/active');
  },
};

export default apiService;
