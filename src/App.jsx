import { useState, useEffect, useCallback, useRef } from 'react';
import Toast      from './components/Toast';
import SOSScreen  from './components/SOSScreen';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import AdminScreen   from './screens/AdminScreen';
import apiService, { tokenStore } from './api';
import { COLORS } from './constants';
import SafetyMap from './components/SafetyMap';

const TABS = [
  { id:'home',    icon:'🗺️', label:'Map'     },
  { id:'profile', icon:'👤', label:'Profile' },
  { id:'admin',   icon:'⚙️', label:'Admin'   },
];

export default function App() {
  // ─── Application State ──────────────────────────────────────────────────────
  // Auth & Session
  const [user, setUser]               = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  // Navigation
  const [activeTab, setActiveTab]     = useState('home');
  // SOS
  const [sosActive, setSosActive]     = useState(false);
  const [sosEventId, setSosEventId]   = useState(null);
  const sosIntervalRef                = useRef(null);
  // Data & Location
  const [zones, setZones]             = useState([]);
  const [reports, setReports]         = useState([]);
  const [contacts, setContacts]       = useState([]);
  const [routeHistory, setRouteHistory] = useState([]);
  const [safetyScore, setSafetyScore] = useState(null);
  const [myReports, setMyReports]     = useState([]);
  const [userLocation, setUserLocation] = useState({ lat: 22.7196, lng: 75.8577 });
  const [loading, setLoading]         = useState(true);
  // UI
  const [toasts, setToasts]           = useState([]);

  // Toast helpers
  const addToast = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // ── Session restore on mount ──────────────────────────────────────────────
  useEffect(() => {
    const savedUser = tokenStore.loadUser();
    const token = tokenStore.get();
    
    const initData = (loc) => {
      if (savedUser && token) {
        apiService.getProfile()
          .then((profile) => {
            setUser(profile);
            tokenStore.saveUser(profile);
            loadAllData(false, loc);
          })
          .catch(() => {
            tokenStore.clear();
            loadAllData(false, loc);
          })
          .finally(() => setAuthChecked(true));
      } else {
        loadAllData(false, loc);
        setAuthChecked(true);
      }
    };

    if (navigator.geolocation) {
      // Set a timeout so we don't hang if user ignores the prompt
      const geoTimeout = setTimeout(() => {
        initData(userLocation);
      }, 5000);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(geoTimeout);
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          initData(loc);
        },
        () => {
          clearTimeout(geoTimeout);
          initData(userLocation);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      initData(userLocation);
    }
  }, []);

  // ── Load data when user authenticates ─────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    // Check for active SOS on login
    checkActiveSOS();
  }, [user]);

  const loadAllData = async (isBackground = false, locOverride) => {
    const loc = locOverride || userLocation;
    if (!isBackground) setLoading(true);
    try {
      // Parallel fetch — zones and safety score don't need auth
      const [zonesData, scoreData] = await Promise.allSettled([
        apiService.getZones({
          minLat: loc.lat - 0.2, maxLat: loc.lat + 0.2,
          minLng: loc.lng - 0.2, maxLng: loc.lng + 0.2
        }),
        apiService.getSafetyScore(loc.lat, loc.lng),
      ]);

      if (zonesData.status === 'fulfilled') setZones(zonesData.value || []);
      if (scoreData.status === 'fulfilled') setSafetyScore(scoreData.value);

      if (!user) return;

      // Auth-required fetches
      const [reportsData, contactsData, historyData, myReportsData] = await Promise.allSettled([
        apiService.getReports({
          minLat: loc.lat - 0.2, maxLat: loc.lat + 0.2,
          minLng: loc.lng - 0.2, maxLng: loc.lng + 0.2
        }),
        apiService.getContacts(),
        apiService.getRouteHistory(),
        apiService.getMyReports(),
      ]);

      if (reportsData.status === 'fulfilled') setReports(reportsData.value || []);
      if (contactsData.status === 'fulfilled') setContacts(contactsData.value || []);
      if (historyData.status === 'fulfilled') setRouteHistory(historyData.value?.content || []);
      if (myReportsData.status === 'fulfilled') setMyReports(myReportsData.value || []);

      // Initial safety score for current location
      try {
        const score = await apiService.getSafetyScore(loc.lat, loc.lng);
        setSafetyScore(score);
      } catch (err) {
        console.error("Safety score fetch failed", err);
      }
    } catch (err) {
      console.error("Global data fetch failed", err);
      addToast('error', 'Failed to load data from server');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const checkActiveSOS = async () => {
    try {
      const activeSos = await apiService.getActiveSOS();
      if (activeSos && activeSos.eventId) {
        setSosEventId(activeSos.eventId);
        setSosActive(true);
        startSOSLocationTracking(activeSos.eventId);
        addToast('warn', 'Active SOS session resumed');
      }
    } catch {
      // No active SOS — normal
    }
  };

  // ── SOS location tracking ────────────────────────────────────────────────
  const startSOSLocationTracking = (eventId) => {
    // Clear any existing interval
    if (sosIntervalRef.current) clearInterval(sosIntervalRef.current);

    // Try to use geolocation, fallback to default coords
    sosIntervalRef.current = setInterval(async () => {
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                await apiService.updateSOSLocation(
                  eventId,
                  pos.coords.latitude,
                  pos.coords.longitude,
                  pos.coords.accuracy
                );
              } catch {
                // Silent fail — location update not critical enough to interrupt UX
              }
            },
            async () => {
              // Fallback: send default location
              try {
                await apiService.updateSOSLocation(eventId, 22.7196, 75.8577, 100);
              } catch {}
            },
            { enableHighAccuracy: true, timeout: 4000 }
          );
        }
      } catch {}
    }, 5000);
  };

  const stopSOSLocationTracking = () => {
    if (sosIntervalRef.current) {
      clearInterval(sosIntervalRef.current);
      sosIntervalRef.current = null;
    }
  };

  // ── SOS handlers ─────────────────────────────────────────────────────────
  const handleSOSTrigger = async () => {
    try {
      let lat = 22.7196, lng = 75.8577, accuracy = 100;
      
      // Trigger immediately with default/cached coords
      const res = await apiService.triggerSOS(lat, lng, accuracy, 'I feel unsafe, please help!');
      setSosEventId(res.eventId);
      setSosActive(true);
      startSOSLocationTracking(res.eventId);
      addToast('error', '🚨 SOS Activated! Contacts notified via SMS & Email.');

      // Try to get real location to update it immediately
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          await apiService.updateSOSLocation(res.eventId, pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
        }, () => {}, { enableHighAccuracy: true, timeout: 5000 });
      }
    } catch (err) {
      if (err.code === 'SOS_ALREADY_ACTIVE') {
        // Resume existing SOS
        checkActiveSOS();
        addToast('warn', 'Active SOS found — resuming');
      } else {
        addToast('error', 'Failed to trigger SOS. Call 112 directly.');
      }
    }
  };

  const handleSOSResolve = async () => {
    try {
      await apiService.resolveSOS(sosEventId);
      stopSOSLocationTracking();
      setSosActive(false);
      setSosEventId(null);
      addToast('success', 'SOS resolved. Contacts notified that you are safe. 💚');
    } catch {
      addToast('error', 'Failed to resolve SOS');
    }
  };

  const handleLogout = () => {
    stopSOSLocationTracking();
    apiService.logout();
    setUser(null);
    setZones([]);
    setReports([]);
    setContacts([]);
    setRouteHistory([]);
    setSafetyScore(null);
    setMyReports([]);
    setActiveTab('home');
    addToast('success', 'Logged out successfully');
  };

  const handleAuth = (authUser) => {
    setUser(authUser);
  };

  // ── Loading screen while checking session ────────────────────────────────
  if (!authChecked) {
    return (
      <div style={{
        height: '100vh', background: COLORS.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16,
      }}>
        <div style={{
          width: 64, height: 64, border: `1px solid ${COLORS.text}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: COLORS.bg,
        }}>
          <span style={{ fontSize: 28 }}>🛡️</span>
        </div>
        <div style={{
          fontSize: 24, fontWeight: 700, color: COLORS.text,
          fontFamily: 'JetBrains Mono, monospace', letterSpacing: -1,
        }}>SAFAR</div>
        <div style={{
          width: 14, height: 14,
          border: `2px solid ${COLORS.borderMid}`,
          borderTopColor: COLORS.text,
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    );
  }

  // ── Auth gate ─────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <>
        <Toast toasts={toasts} removeToast={removeToast} />
        <AuthScreen onAuth={handleAuth} addToast={addToast} />
      </>
    );
  }

  // ── Main app shell ────────────────────────────────────────────────────────
  return (
    <>
      <Toast toasts={toasts} removeToast={removeToast} />
      {sosActive && <SOSScreen onResolve={handleSOSResolve} />}

      {/* Mobile shell */}
      <div style={{
        width: '100%',
        maxWidth: 480,
        margin: '0 auto',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: COLORS.bg,
        borderLeft: `1px solid ${COLORS.border}`,
        borderRight: `1px solid ${COLORS.border}`,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Loading indicator */}
        {loading && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: COLORS.text, zIndex: 600,
            animation: 'shimmer 1.5s infinite',
            backgroundImage: `linear-gradient(90deg, transparent, ${COLORS.text}, transparent)`,
            backgroundSize: '200% 100%',
          }} />
        )}

        {/* Screen content */}
        <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', position:'relative' }}>
          {activeTab === 'home' && (
            <HomeScreen
              user={user}
              zones={zones}
              reports={reports}
              safetyScore={safetyScore}
              onSOS={handleSOSTrigger}
              onRefresh={() => loadAllData(true)}
              addToast={addToast}
              userLat={userLocation.lat}
              userLng={userLocation.lng}
            />
          )}
          {activeTab === 'map' && (
            <div style={{ flex: 1 }}>
              <SafetyMap 
                zones={zones} 
                reports={reports} 
                userLat={userLocation.lat} 
                userLng={userLocation.lng} 
              />
            </div>
          )}
          {activeTab === 'profile' && (
            <ProfileScreen
              user={user}
              contacts={contacts}
              setContacts={setContacts}
              routeHistory={routeHistory}
              reports={myReports}
              addToast={addToast}
              onLogout={handleLogout}
            />
          )}
          {activeTab === 'admin' && (
            <AdminScreen
              zones={zones}
              reports={reports}
              addToast={addToast}
            />
          )}
        </div>

        {/* SOS floating button */}
        {!sosActive && (
          <button
            id="btn-sos-float"
            title="Hold 5 seconds to activate SOS"
            onMouseDown={(e) => {
              e.currentTarget._t = setTimeout(handleSOSTrigger, 5000);
            }}
            onMouseUp={(e) => clearTimeout(e.currentTarget._t)}
            onMouseLeave={(e) => clearTimeout(e.currentTarget._t)}
            onTouchStart={(e) => {
              e.currentTarget._t = setTimeout(handleSOSTrigger, 5000);
            }}
            onTouchEnd={(e) => clearTimeout(e.currentTarget._t)}
            onClick={() => addToast('info', 'Hold for 5 seconds to activate SOS')}
            style={{
              position:'fixed', bottom:120, right:20, zIndex:2000,
              width:64, height:64, borderRadius:'50%', background:COLORS.danger,
              border:'none', color:'#fff', fontSize:20, fontWeight:700, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 8px 24px rgba(239, 68, 68, 0.4)',
              userSelect:'none', touchAction:'none'
            }}
          >
            SOS
          </button>
        )}

        {/* Bottom nav */}
        <nav style={{
          display: 'flex',
          background: COLORS.bgCard,
          borderTop: `1px solid ${COLORS.borderMid}`,
          flexShrink: 0,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '12px 0 10px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  position: 'relative',
                }}
              >
                {/* Active pill */}
                {active && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    width: 40,
                    height: 2,
                    background: COLORS.text,
                  }} />
                )}
                <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
                <span style={{
                  fontSize: 10,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: active ? 600 : 400,
                  color: active ? COLORS.text : COLORS.textMuted,
                  textTransform: 'uppercase',
                  transition: 'color 0.1s',
                }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
