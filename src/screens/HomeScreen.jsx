import { useState } from 'react';
import SafetyMap from '../components/SafetyMap';
import apiService from '../api';
import { COLORS, REPORT_CATEGORIES, getSafetyColor, getSafetyLabel } from '../constants';

function SafetyBadge({ score, expanded, onToggle }) {
  const color = getSafetyColor(score.safetyScore);
  const label = getSafetyLabel(score.safetyScore);
  return (
    <div style={{ background:COLORS.bgCard, border:`1px solid ${color}`, overflow:'hidden' }}>
      <div onClick={onToggle} style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}>
        <div style={{ width:40, height:40, border:`1px solid ${color}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <span style={{ fontSize:16, fontWeight:700, color, fontFamily:'JetBrains Mono, monospace' }}>{(score.safetyScore*100).toFixed(0)}</span>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:10, color:COLORS.textMuted, fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase', letterSpacing:1 }}>Safety Score</div>
          <div style={{ fontSize:16, fontWeight:600, color, fontFamily:'JetBrains Mono, monospace', letterSpacing:1 }}>{label}</div>
        </div>
        <span style={{ color:COLORS.textMuted, fontSize:12, fontFamily:'JetBrains Mono, monospace' }}>{expanded ? '[-]' : '[+]'}</span>
      </div>
      {expanded && (
        <div style={{ padding:'0 16px 14px', borderTop:`1px solid ${COLORS.borderMid}` }}>
          <div style={{ paddingTop:12, display:'flex', flexDirection:'column', gap:6, fontFamily:'JetBrains Mono, monospace' }}>
            {[
              { icon:'📊', label:'Incidents',  value:`${score.breakdown.incidentCount} nearby` },
              { icon:'💡', label:'Lighting',   value:`${score.breakdown.streetLampCount} lamps` },
              { icon:'🌤️', label:'Weather',    value: score.breakdown.weatherCondition },
              { icon:'🕐', label:'Time of day',value: score.breakdown.timeOfDay },
              { icon:'📹', label:'CCTV',       value:`${score.breakdown.cctvCount} cameras` },
            ].map(item => (
              <div key={item.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12 }}>
                <span style={{ color:COLORS.textMuted }}>{item.icon} {item.label}</span>
                <span style={{ color:COLORS.text }}>{item.value}</span>
              </div>
            ))}
            {score.warnings.map((w,i) => (
              <div key={i} style={{ marginTop:6, padding:'6px 8px', border:`1px solid ${COLORS.unsafe}`, color:COLORS.unsafe, fontSize:11 }}>
                ! {w}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomeScreen({ user, zones, reports, safetyScore, onSOS, onRefresh, addToast, userLat, userLng }) {
  const [scoreExpanded, setScoreExpanded] = useState(false);
  const [showRoutes, setShowRoutes]       = useState(false);
  const [origin, setOrigin]               = useState('');
  const [destination, setDestination]     = useState('');
  const [analyzing, setAnalyzing]         = useState(false);
  const [routes, setRoutes]               = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showReport, setShowReport]       = useState(false);
  const [reportForm, setReportForm]       = useState({ category:'', description:'', occurredAt:'' });
  const [reporting, setReporting]         = useState(false);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const handleAnalyze = async () => {
    if (!origin || !destination) { addToast('error', 'Enter both origin and destination'); return; }
    setAnalyzing(true);
    try {
      // Geocoding helper (Nominatim)
      const geocode = async (query) => {
        // We add a delay to avoid rate limiting
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
        const data = await res.json();
        if (data && data.length > 0) {
          return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), address: data[0].display_name };
        }
        throw new Error('Location not found');
      };

      // 1. Get Origin
      let start;
      if (origin.toLowerCase() === 'current' || origin === '') {
        start = { lat: userLat, lng: userLng, address: 'Current Location' };
      } else {
        try { start = await geocode(origin); } catch { addToast('error', `Could not find origin: ${origin}`); setAnalyzing(false); return; }
      }

      // 2. Get Destination
      let end;
      try { end = await geocode(destination); } catch { addToast('error', `Could not find destination: ${destination}`); setAnalyzing(false); return; }

      const res = await apiService.analyzeRoutes(start, end, 'WALKING');
      setRoutes(res.routes);
      setSelectedRoute(res.routes[0]);
      addToast('success', `${res.routes.length} routes found — recommended is ${res.routes[0].safetyLabel}`);
    } catch (err) { 
      console.error(err);
      addToast('error', 'Could not analyze routes'); 
    }
    setAnalyzing(false);
  };

  const handleReport = async () => {
    if (!reportForm.category) { addToast('error', 'Please select a category'); return; }
    setReporting(true);
    try {
      await apiService.submitReport({ 
        ...reportForm, 
        lat: userLat, 
        lng: userLng, 
        occurredAt: reportForm.occurredAt || new Date().toISOString() 
      });
      addToast('success', 'Report submitted. Thank you for keeping your community safe.');
      setShowReport(false);
      setReportForm({ category:'', description:'', occurredAt:'' });
      if (onRefresh) onRefresh(); 
    } catch { addToast('error', 'Failed to submit report'); }
    setReporting(false);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', position:'relative', overflow:'hidden', background:COLORS.bg }}>
      {/* Top bar */}
      <div style={{ padding:'16px 16px 10px', display:'flex', alignItems:'center', gap:12, flexShrink:0, borderBottom:`1px solid ${COLORS.border}` }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:11, color:COLORS.textMuted, fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase' }}>{greeting}</div>
          <h2 style={{ margin:0, fontSize:18, fontWeight:600, color:COLORS.text, fontFamily:'JetBrains Mono, monospace', letterSpacing:0 }}>
            {user.name.split(' ')[0]}
          </h2>
        </div>
        <button
          id="btn-toggle-routes"
          onClick={() => { setShowRoutes(s => !s); if(showRoutes) setRoutes(null); }}
          style={{
            padding:'8px 12px', background: showRoutes ? COLORS.text : COLORS.bg,
            border: `1px solid ${COLORS.text}`,
            color: showRoutes ? COLORS.bg : COLORS.text,
            fontSize:12, cursor:'pointer', fontWeight:600, fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase',
          }}
        >
          {showRoutes ? 'CLOSE' : 'ROUTES'}
        </button>
      </div>

      {/* Route search */}
      {showRoutes && (
        <div style={{ padding:16, background:COLORS.bgCard, borderBottom:`1px solid ${COLORS.border}`, flexShrink:0 }}>
          <input id="input-origin" value={origin} onChange={e => setOrigin(e.target.value)} placeholder="From (address or 'Current')"
            style={{ width:'100%', padding:'10px 12px', background:COLORS.bg, border:`1px solid ${COLORS.borderMid}`, color:COLORS.text, fontSize:13, outline:'none', boxSizing:'border-box', marginBottom:8, fontFamily:'JetBrains Mono, monospace' }} />
          <input id="input-destination" value={destination} onChange={e => setDestination(e.target.value)} placeholder="To (destination)"
            style={{ width:'100%', padding:'10px 12px', background:COLORS.bg, border:`1px solid ${COLORS.borderMid}`, color:COLORS.text, fontSize:13, outline:'none', boxSizing:'border-box', marginBottom:12, fontFamily:'JetBrains Mono, monospace' }} />
          <button id="btn-analyze-routes" onClick={handleAnalyze} disabled={analyzing} style={{
            width:'100%', padding:'12px', border:`1px solid ${COLORS.text}`,
            background: analyzing ? COLORS.bgCard : COLORS.text,
            color: analyzing ? COLORS.textMuted : COLORS.bg, fontSize:13, fontWeight:600, cursor: analyzing ? 'not-allowed' : 'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase'
          }}>
            {analyzing ? 'ANALYZING...' : 'FIND SAFE ROUTES'}
          </button>

          {routes && (
            <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ fontSize:10, color:COLORS.textMuted, fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase' }}>Options</div>
              {routes.map(r => (
                <div key={r.routeId} id={`route-${r.routeId}`} onClick={() => setSelectedRoute(r)} style={{
                  padding:'10px 12px',
                  background: selectedRoute?.routeId===r.routeId ? COLORS.bg : COLORS.bgCard,
                  border: `1px solid ${selectedRoute?.routeId===r.routeId ? r.safetyColor : COLORS.borderMid}`,
                  cursor:'pointer', fontFamily:'JetBrains Mono, monospace'
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    {r.recommended && <span style={{ fontSize:9, border:`1px solid ${COLORS.safe}`, color:COLORS.safe, padding:'2px 4px' }}>REC</span>}
                    <span style={{ fontSize:9, background:r.safetyColor, color:COLORS.bg, padding:'2px 4px', fontWeight:600 }}>{r.safetyLabel}</span>
                  </div>
                  <div style={{ display:'flex', gap:12, fontSize:11, color:COLORS.textMuted, marginBottom:selectedRoute?.routeId===r.routeId ? 10 : 0 }}>
                    <span>{r.duration.text}</span>
                    <span>{r.distance.text}</span>
                    <span style={{ color:r.safetyColor, fontWeight:600 }}>{(r.safetyScore*100).toFixed(0)}%</span>
                  </div>
                  {selectedRoute?.routeId===r.routeId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const start = `${r.origin.lat},${r.origin.lng}`;
                        const end = `${r.destination.lat},${r.destination.lng}`;
                        window.open(`https://www.google.com/maps/dir/?api=1&origin=${start}&destination=${end}&travelmode=walking`, '_blank');
                      }}
                      style={{
                        width:'100%', padding:'8px', background:COLORS.text, color:COLORS.bg,
                        border:'none', fontSize:10, fontWeight:700, cursor:'pointer',
                        fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase'
                      }}
                    >
                      🗺️ OPEN IN GOOGLE MAPS
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ flex:1, position:'relative' }}>
        <SafetyMap zones={zones} reports={reports} userLat={userLat} userLng={userLng} route={selectedRoute} />
      </div>

      <div style={{ padding:'10px 16px', flexShrink:0 }}>
        {safetyScore && (
          <SafetyBadge score={safetyScore} expanded={scoreExpanded} onToggle={() => setScoreExpanded(s => !s)} />
        )}
      </div>

      <div style={{ padding:'0 16px 16px', display:'flex', gap:10, flexShrink:0, background:COLORS.bg }}>
        <button id="btn-report-incident" onClick={() => setShowReport(true)} style={{
          flex:1, padding:'14px', background:COLORS.bg, border:`1px solid ${COLORS.unsafe}`,
          color:COLORS.unsafe, fontSize:12, fontWeight:700, cursor:'pointer',
          fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase', letterSpacing:1
        }}>
          REPORT INCIDENT
        </button>
        <button id="btn-emergency-sos" onClick={onSOS} style={{
          flex:1, padding:'14px', background:COLORS.danger, border:'none',
          color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer',
          fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase', letterSpacing:1
        }}>
          EMERGENCY SOS
        </button>
      </div>

      {showReport && (
        <div style={{
          position:'fixed', top:0, left:0, right:0, bottom:0, zIndex:3000,
          background:'rgba(0,0,0,0.85)', backdropFilter:'blur(10px)',
          display:'flex', alignItems:'center', justifyContent:'center', padding:20
        }} onClick={(e) => e.target === e.currentTarget && setShowReport(false)}>
          <div style={{
            width:'100%', maxWidth:400, background:COLORS.bgCard, border:`1px solid ${COLORS.border}`,
            padding:24, position:'relative'
          }}>
            <h3 style={{ margin:'0 0 20px', fontSize:18, fontFamily:'JetBrains Mono, monospace' }}>REPORT INCIDENT</h3>
            
            <div style={{ fontSize:11, color:COLORS.textMuted, marginBottom:8, textTransform:'uppercase' }}>Category</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:20 }}>
              {REPORT_CATEGORIES.map(cat => (
                <button key={cat.value} id={`cat-${cat.value}`} onClick={() => setReportForm(f => ({ ...f, category:cat.value }))} style={{
                  padding:'8px 12px',
                  background: reportForm.category===cat.value ? COLORS.unsafe : COLORS.bg,
                  border: `1px solid ${reportForm.category===cat.value ? COLORS.unsafe : COLORS.borderMid}`,
                  color: reportForm.category===cat.value ? COLORS.bg : COLORS.text,
                  fontSize:11, cursor:'pointer', fontFamily:'JetBrains Mono, monospace'
                }}>
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>

            <div style={{ fontSize:11, color:COLORS.textMuted, marginBottom:8, textTransform:'uppercase' }}>Details</div>
            <textarea id="report-description" placeholder="Describe the situation..." value={reportForm.description}
              onChange={e => setReportForm(f => ({ ...f, description:e.target.value }))}
              style={{
                width:'100%', height:100, padding:12, background:COLORS.bg, border:`1px solid ${COLORS.borderMid}`,
                color:COLORS.text, fontSize:13, outline:'none', resize:'none', marginBottom:20, fontFamily:'JetBrains Mono, monospace'
              }} />

            <div style={{ display:'flex', gap:12 }}>
              <button onClick={() => setShowReport(false)} style={{ flex:1, padding:12, background:'transparent', border:`1px solid ${COLORS.border}`, color:COLORS.textMuted, cursor:'pointer', fontSize:12 }}>CANCEL</button>
              <button id="btn-submit-report" onClick={handleReport} disabled={reporting} style={{
                flex:2, padding:12, background:COLORS.unsafe, border:'none', color:COLORS.bg, fontWeight:700, cursor: reporting ? 'not-allowed' : 'pointer', fontSize:12
              }}>
                {reporting ? 'SUBMITTING...' : 'SUBMIT REPORT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
