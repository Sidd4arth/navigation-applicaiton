import { useState } from 'react';
import { COLORS, ZONE_COLORS, REPORT_CATEGORIES, getSafetyColor } from '../constants';

export default function AdminScreen({ zones, reports, addToast }) {
  const [section, setSection] = useState('overview');

  const total    = reports.length;
  const pending  = reports.filter(r => r.status === 'PENDING').length;
  const verified = reports.filter(r => r.status === 'VERIFIED').length;
  const danger   = zones.filter(z => z.severity > 0.7).length;

  const catCount = REPORT_CATEGORIES.reduce((acc, cat) => {
    acc[cat.value] = reports.filter(r => r.category === cat.value).length;
    return acc;
  }, {});

  const SECTIONS = ['overview', 'zones', 'reports'];

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <div style={{ padding:'20px 20px 12px', flexShrink:0, borderBottom:`1px solid ${COLORS.border}` }}>
        <div style={{ fontSize:11, color:COLORS.textMuted, fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase', letterSpacing:2, marginBottom:4 }}>ADMIN PANEL</div>
        <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:COLORS.text, fontFamily:'JetBrains Mono, monospace' }}>Dashboard</h2>
      </div>

      {/* Section tabs */}
      <div style={{ display:'flex', gap:0, padding:'16px 16px', flexShrink:0, overflowX:'auto', borderBottom:`1px solid ${COLORS.borderMid}` }}>
        {SECTIONS.map(s => (
          <button key={s} id={`admin-tab-${s}`} onClick={() => setSection(s)} style={{
            padding:'8px 16px', border:'none', borderRight:`1px solid ${COLORS.borderMid}`,
            background: section===s ? COLORS.text : COLORS.bg,
            color: section===s ? COLORS.bg : COLORS.textMuted,
            fontSize:11, fontWeight: 600, cursor:'pointer', fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase'
          }}>
            {s}
          </button>
        ))}
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'0 16px 16px' }}>

        {/* ── Overview ── */}
        {section === 'overview' && (
          <div className="animate-fadeIn">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:20, marginTop:16 }}>
              {[
                { label:'TOTAL REPORTS', value:total,    color:COLORS.text },
                { label:'PENDING',       value:pending,  color:COLORS.textMuted },
                { label:'VERIFIED',      value:verified, color:COLORS.text },
                { label:'DANGER ZONES',  value:danger,   color:COLORS.unsafe },
              ].map(s => (
                <div key={s.label} style={{ padding:'16px', background:COLORS.bgCard, border:`1px solid ${COLORS.borderMid}` }}>
                  <div style={{ fontSize:28, fontWeight:700, color:s.color, fontFamily:'JetBrains Mono, monospace', lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:10, color:COLORS.textMuted, marginTop:6, fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Category bars */}
            <div style={{ padding:16, background:COLORS.bgCard, border:`1px solid ${COLORS.borderMid}`, marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:600, color:COLORS.text, marginBottom:14, fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase' }}>REPORTS BY CATEGORY</div>
              {REPORT_CATEGORIES.map(cat => {
                const count = catCount[cat.value] || 0;
                const pct   = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={cat.value} style={{ marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                      <span style={{ fontSize:11, color:COLORS.textMuted, fontFamily:'JetBrains Mono, monospace' }}>{cat.label}</span>
                      <span style={{ fontSize:11, color:COLORS.text, fontFamily:'JetBrains Mono, monospace' }}>{count}</span>
                    </div>
                    <div style={{ height:4, background:COLORS.bg, border:`1px solid ${COLORS.border}` }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:COLORS.text }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Zone severity */}
            <div style={{ padding:16, background:COLORS.bgCard, border:`1px solid ${COLORS.borderMid}` }}>
              <div style={{ fontSize:12, fontWeight:600, color:COLORS.text, marginBottom:14, fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase' }}>ZONE SEVERITY</div>
              {zones.map(z => {
                const color = ZONE_COLORS[z.type] || COLORS.borderMid;
                return (
                  <div key={z.id} style={{ marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                      <span style={{ fontSize:11, color:COLORS.textMuted, fontFamily:'JetBrains Mono, monospace' }}>{z.label}</span>
                      <span style={{ fontSize:11, color, fontFamily:'JetBrains Mono, monospace' }}>{(z.severity*100).toFixed(0)}%</span>
                    </div>
                    <div style={{ height:4, background:COLORS.bg, border:`1px solid ${COLORS.border}` }}>
                      <div style={{ height:'100%', width:`${z.severity*100}%`, background:color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Zones ── */}
        {section === 'zones' && (
          <div style={{ marginTop:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <span style={{ fontSize:11, color:COLORS.textMuted, fontFamily:'JetBrains Mono, monospace' }}>{zones.length} ZONES</span>
              <button id="btn-add-zone" onClick={() => addToast('info', 'Zone creation: POST /zones with admin token')}
                style={{ padding:'6px 10px', background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.text}`, fontSize:10, cursor:'pointer', fontFamily:'JetBrains Mono, monospace' }}>
                + ADD ZONE
              </button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {zones.map(z => {
                const color = ZONE_COLORS[z.type] || COLORS.borderMid;
                return (
                  <div key={z.id} style={{ padding:'12px 14px', background:COLORS.bgCard, border:`1px solid ${COLORS.borderMid}`, borderLeft:`3px solid ${color}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                          <span style={{ fontSize:13, fontWeight:600, color:COLORS.text, fontFamily:'JetBrains Mono, monospace' }}>{z.label}</span>
                        </div>
                        <div style={{ fontSize:11, color:COLORS.textMuted, marginBottom:4, fontFamily:'JetBrains Mono, monospace' }}>{z.type.replace(/_/g,' ')} · {z.radiusMeters}M</div>
                        <div style={{ fontSize:11, color:COLORS.textFaint, fontFamily:'JetBrains Mono, monospace' }}>{z.description}</div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
                        <div style={{ fontSize:16, fontWeight:700, color, fontFamily:'JetBrains Mono, monospace' }}>{(z.severity*100).toFixed(0)}%</div>
                        <div style={{ fontSize:9, color:COLORS.textMuted, fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase' }}>{z.reportCount} REPORTS</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Reports moderation ── */}
        {section === 'reports' && (
          <div style={{ marginTop:16 }}>
            <div style={{ fontSize:11, color:COLORS.textMuted, marginBottom:14, fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase' }}>
              MODERATION VIEW
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {reports.map(r => {
                const cat = REPORT_CATEGORIES.find(c => c.value === r.category);
                return (
                  <div key={r.id} style={{ padding:'12px 14px', background:COLORS.bgCard, border:`1px solid ${COLORS.borderMid}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:13, fontWeight:600, color:COLORS.text, fontFamily:'JetBrains Mono, monospace' }}>{cat?.label}</span>
                      </div>
                      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        {r.status === 'PENDING' && (
                          <button id={`btn-verify-${r.id}`} onClick={() => addToast('success', 'Report verified')}
                            style={{ padding:'4px 8px', background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.text}`, fontSize:9, cursor:'pointer', fontFamily:'JetBrains Mono, monospace' }}>
                            VERIFY
                          </button>
                        )}
                        <span style={{
                          fontSize:9, padding:'2px 6px', border:`1px solid ${r.status==='VERIFIED' ? COLORS.safe : COLORS.moderate}`,
                          color: r.status==='VERIFIED' ? COLORS.safe : COLORS.moderate, fontFamily:'JetBrains Mono, monospace'
                        }}>{r.status}</span>
                      </div>
                    </div>
                    {r.description && <div style={{ fontSize:11, color:COLORS.textMuted, marginBottom:6, fontFamily:'JetBrains Mono, monospace' }}>{r.description}</div>}
                    <div style={{ fontSize:10, color:COLORS.textFaint, fontFamily:'JetBrains Mono, monospace' }}>
                      {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
