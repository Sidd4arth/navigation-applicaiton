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
        <div style={{ padding:'0 12px 10px', borderTop:`1px solid ${COLORS.borderMid}` }}>
          <div style={{ paddingTop:10, display:'flex', flexDirection:'column', gap:4, fontFamily:'JetBrains Mono, monospace' }}>
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

  const greeting = 'Welcome';

  const handleAnalyze = async () => {
    if (!origin || !destination) { addToast('error', 'Enter both origin and destination'); return; }
    setAnalyzing(true);
    try {
      // 0. Get current city context for better geocoding
      let cityContext = '';
      try {
        const cityRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLng}`);
        const cityData = await cityRes.json();
        cityContext = cityData.address?.city || cityData.address?.town || cityData.address?.state || '';
      } catch (e) { console.warn('Could not get city context', e); }

      // Geocoding: 4-strategy progressive fallback so obscure/abbreviated names still resolve
      const geocode = async (query) => {
        const attempt = async (q, params = '') => {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=3&${params}&q=${encodeURIComponent(q)}`);
            const data = await res.json();
            if (data?.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), address: data[0].display_name };
          } catch {}
          return null;
        };

        // 1. City-context + soft viewbox (bounded=0 means viewbox just biases, not restricts)
        if (cityContext) {
          const vb = `${userLng - 0.5},${userLat - 0.5},${userLng + 0.5},${userLat + 0.5}`;
          const r = await attempt(`${query}, ${cityContext}`, `viewbox=${vb}&bounded=0&countrycodes=in`);
          if (r) return r;
          await sleep(300);
        }

        // 2. Viewbox-biased search (no city, soft bound, India)
        const vb = `${userLng - 1},${userLat - 1},${userLng + 1},${userLat + 1}`;
        const r2 = await attempt(query, `viewbox=${vb}&bounded=0&countrycodes=in`);
        if (r2) return r2;
        await sleep(300);

        // 3. India-wide, no viewbox
        const r3 = await attempt(query, 'countrycodes=in');
        if (r3) return r3;
        await sleep(300);

        // 4. Global fallback — no restrictions at all
        const r4 = await attempt(query, '');
        if (r4) return r4;

        throw new Error('Location not found');
      };

      const sleep = m => new Promise(r => setTimeout(r, m));

      // 1. Get Origin
      let start;
      if (origin.toLowerCase() === 'current' || origin === '') {
        start = { lat: userLat, lng: userLng, address: 'Current Location' };
      } else {
        try { start = await geocode(origin); } catch { addToast('error', `Could not find origin: ${origin}`); setAnalyzing(false); return; }
      }

      // 2. Get Destination
      await sleep(400); // Rate limit protection
      let end;
      try { end = await geocode(destination); } catch { addToast('error', `Could not find destination: ${destination}`); setAnalyzing(false); return; }

      const res = await apiService.analyzeRoutes(start, end, 'WALKING');
      if (res && res.routes && res.routes.length > 0) {
        setRoutes(res.routes);
        setSelectedRoute(res.routes[0]);
        addToast('success', `${res.routes.length} routes found — recommended: ${res.routes[0].safetyLabel}`);
      } else {
        addToast('warn', 'No routes found for this journey');
      }
    } catch (err) { 
      console.error(err);
      addToast('error', 'Could not analyze routes'); 
    }
    setAnalyzing(false);
  };

  const handleReport = async () => {
    if (!reportForm.category) { addToast('error', 'Please select a category'); return; }
    if (!userLat || !userLng) { addToast('error', 'GPS location not available'); return; }
    
    setReporting(true);
    try {
      await apiService.submitReport({ 
        ...reportForm, 
        lat: userLat, 
        lng: userLng, 
        occurredAt: reportForm.occurredAt || new Date().toISOString() 
      });
      addToast('success', 'Report submitted successfully');
      setShowReport(false);
      setReportForm({ category:'', description:'', occurredAt:'' });
      if (onRefresh) onRefresh(); 
    } catch (err) { 
      console.error('Report submission failed', err);
      addToast('error', 'Failed to submit report. Please try again.'); 
    }
    setReporting(false);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', position:'relative', overflow:'hidden', background:COLORS.bg }}>
      {/* Top bar */}
      <div style={{ 
        padding: '12px 16px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        flexShrink: 0, 
        borderBottom: `1px solid ${COLORS.border}`,
        background: COLORS.bg,
        zIndex: 100
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>{greeting}</div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: COLORS.text, fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name?.split(' ')[0] || 'User'}
          </h2>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <button
            id="btn-toggle-routes"
            onClick={() => { setShowRoutes(s => !s); if(!showRoutes) { setRoutes(null); setSelectedRoute(null); } }}
            style={{
              padding: '10px 20px', 
              background: COLORS.danger,
              border: 'none',
              color: '#fff',
              fontSize: 12, 
              cursor: 'pointer', 
              fontWeight: 800, 
              fontFamily: 'JetBrains Mono, monospace', 
              textTransform: 'uppercase',
              borderRadius: '4px',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
              whiteSpace: 'nowrap'
            }}
          >
            {showRoutes ? 'CLOSE' : 'NAVIGATE'}
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          {/* Spacer to keep center button centered */}
        </div>
      </div>

      {/* Route search */}
      {showRoutes && (
        <div style={{ padding:'12px 16px', background:COLORS.bgCard, borderBottom:`1px solid ${COLORS.border}`, flexShrink:0 }}>
          <input id="input-origin" value={origin} onChange={e => setOrigin(e.target.value)} placeholder="From (address or 'Current')"
            style={{ width:'100%', padding:'8px 10px', background:COLORS.bg, border:`1px solid ${COLORS.borderMid}`, color:COLORS.text, fontSize:12, outline:'none', boxSizing:'border-box', marginBottom:6, fontFamily:'JetBrains Mono, monospace' }} />
          <input id="input-destination" value={destination} onChange={e => setDestination(e.target.value)} placeholder="To (destination)"
            style={{ width:'100%', padding:'8px 10px', background:COLORS.bg, border:`1px solid ${COLORS.borderMid}`, color:COLORS.text, fontSize:12, outline:'none', boxSizing:'border-box', marginBottom:10, fontFamily:'JetBrains Mono, monospace' }} />
          <button id="btn-analyze-routes" onClick={handleAnalyze} disabled={analyzing} style={{
            width:'100%', padding:'10px', border:`1px solid ${COLORS.text}`,
            background: analyzing ? COLORS.bgCard : COLORS.text,
            color: analyzing ? COLORS.textMuted : COLORS.bg, fontSize:12, fontWeight:700, cursor: analyzing ? 'not-allowed' : 'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase'
          }}>
            {analyzing ? 'ANALYZING...' : 'FIND SAFE ROUTES'}
          </button>

          {routes && Array.isArray(routes) && (
            <div style={{ 
              marginTop:10, display:'flex', flexDirection:'column', gap:6, 
              maxHeight: 180, overflowY: 'auto', paddingRight: 4
            }}>
              <div style={{ fontSize:10, color:COLORS.textMuted, fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase', display:'flex', justifyContent:'space-between' }}>
                <span>{selectedRoute ? 'Selected Route' : 'Options'}</span>
                {selectedRoute && <span onClick={() => setSelectedRoute(null)} style={{ cursor:'pointer', color:COLORS.text }}>CHANGE</span>}
              </div>
              
              {routes.filter(r => r && (!selectedRoute || r.routeId === selectedRoute.routeId)).map(r => {
                  const lineColor = r.style?.strokeColor || r.safetyColor || COLORS.text;
                  const rankSymbol = ['①','②','③'][( r.rank || 1) - 1] || `#${r.rank}`;
                  return (
                  <div key={r.routeId || Math.random()} id={`route-${r.routeId}`} onClick={() => setSelectedRoute(r)} style={{
                    padding:'12px',
                    background: selectedRoute?.routeId===r.routeId ? COLORS.bg : COLORS.bgCard,
                    border: `1px solid ${selectedRoute?.routeId===r.routeId ? lineColor : COLORS.borderMid}`,
                    cursor:'pointer', fontFamily:'JetBrains Mono, monospace',
                    transition:'all 0.2s ease'
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                      <span style={{ fontSize:14, color:lineColor, fontWeight:800, flexShrink:0 }}>{rankSymbol}</span>
                      {r.recommended && <span style={{ fontSize:8, border:`1px solid ${COLORS.safe}`, color:COLORS.safe, padding:'1px 3px' }}>REC</span>}
                      <span style={{ fontSize:8, background: lineColor, color: COLORS.bg, padding:'1px 4px', fontWeight:700 }}>{r.safetyLabel || 'STANDARD'}</span>
                      {r.style?.lineType && <span style={{ fontSize:8, color:COLORS.textMuted, marginLeft:'auto' }}>{r.style.lineType}</span>}
                    </div>
                    <div style={{ fontSize:12, color:COLORS.text, marginBottom:2, fontWeight:600 }}>{r.destination?.address?.split(',')[0] || 'Destination'}</div>
                    {r.comparisonText && (
                      <div style={{ fontSize:10, color: r.recommended ? COLORS.safe : COLORS.textMuted, marginBottom:4, fontStyle:'italic' }}>
                        {r.comparisonText}
                      </div>
                    )}
                    <div style={{ display:'flex', gap:12, fontSize:11, color:COLORS.textMuted, marginBottom:selectedRoute?.routeId===r.routeId ? 12 : 0 }}>
                      <span>{r.duration?.text || 'N/A'}</span>
                      <span>{r.distance?.text || 'N/A'}</span>
                      <span style={{ color: lineColor, fontWeight:600 }}>{((r.safetyScore || 0)*100).toFixed(0)}% Safe</span>
                    </div>
                    
                    {selectedRoute?.routeId===r.routeId && r.origin && r.destination && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const start = `${r.origin.lat},${r.origin.lng}`;
                          const end = `${r.destination.lat},${r.destination.lng}`;
                          const url = `https://www.google.com/maps/dir/?api=1&origin=${start}&destination=${end}&travelmode=walking`;
                          window.location.href = url;
                        }}
                        style={{
                          width:'100%', padding:'12px', background:COLORS.text, color:COLORS.bg,
                          border:'none', fontSize:11, fontWeight:800, cursor:'pointer',
                          fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase',
                          boxShadow:'0 4px 12px rgba(255,255,255,0.1)'
                        }}
                      >
                        🚀 START NAVIGATION
                      </button>
                    )}
                  </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      <div style={{ flex:1, position:'relative' }}>
        <SafetyMap zones={zones} reports={reports} userLat={userLat} userLng={userLng} route={selectedRoute} routes={routes || []} />
      </div>

      <div style={{ padding:'10px 16px', flexShrink:0 }}>
        {safetyScore && (
          <SafetyBadge score={safetyScore} expanded={scoreExpanded} onToggle={() => setScoreExpanded(s => !s)} />
        )}
      </div>

      <div style={{ padding:'0 16px 16px', display:'flex', gap:10, flexShrink:0, background:COLORS.bg }}>
        <button id="btn-report-incident" onClick={() => setShowReport(true)} style={{
          flex:1, padding:'12px 8px', background:COLORS.bg, border:`1px solid ${COLORS.unsafe}`,
          color:COLORS.unsafe, fontSize:11, fontWeight:700, cursor:'pointer',
          fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase', letterSpacing:0.5
        }}>
          REPORT
        </button>
        <button id="btn-emergency-sos" onClick={onSOS} style={{
          flex:1, padding:'12px 8px', background:COLORS.danger, border:'none',
          color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer',
          fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase', letterSpacing:0.5
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
