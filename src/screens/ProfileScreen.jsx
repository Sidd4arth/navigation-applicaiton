import { useState } from 'react';
import apiService from '../api';
import { COLORS, REPORT_CATEGORIES, getSafetyColor, getSafetyLabel, formatTime, formatDate } from '../constants';

export default function ProfileScreen({ user, contacts, setContacts, routeHistory, reports, addToast, onLogout }) {
  const [tab, setTab]             = useState('profile');
  const [showAdd, setShowAdd]     = useState(false);
  const [cForm, setCForm]         = useState({ name:'', phone:'', email:'', relationship:'', isPrimary:false });
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(null);

  const handleAddContact = async () => {
    if (!cForm.name || !cForm.phone) { addToast('error', 'Name and phone are required'); return; }
    if (contacts.length >= 5)       { addToast('error', 'Maximum 5 emergency contacts allowed'); return; }
    setSaving(true);
    try {
      const c = await apiService.addContact(cForm);
      setContacts(prev => [...prev, c]);
      addToast('success', 'Emergency contact added');
      setShowAdd(false);
      setCForm({ name:'', phone:'', email:'', relationship:'', isPrimary:false });
    } catch { addToast('error', 'Failed to add contact'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await apiService.deleteContact(id);
      setContacts(prev => prev.filter(c => c.id !== id));
      addToast('success', 'Contact removed');
    } catch { addToast('error', 'Failed to remove contact'); }
    setDeleting(null);
  };

  const TABS = [
    { id:'profile',  label:'Profile'  },
    { id:'contacts', label:'Contacts' },
    { id:'reports',  label:'Reports'  },
    { id:'history',  label:'History'  },
  ];

  const inputStyle = {
    width:'100%', padding:'11px 14px', background:'rgba(255,255,255,0.07)',
    border:'1px solid rgba(255,255,255,0.12)', borderRadius:12,
    color:'#fff', fontSize:13, outline:'none', boxSizing:'border-box', marginBottom:10,
    fontFamily:'DM Sans, sans-serif',
  };

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', background:COLORS.bg }}>
      {/* Header */}
      <div style={{ padding:'20px 20px 14px', flexShrink:0, borderBottom:`1px solid ${COLORS.border}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{
            width:48, height:48, flexShrink:0,
            border:`1px solid ${COLORS.text}`, background:COLORS.bgCard,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:20, fontWeight:700, color:COLORS.text, fontFamily:'JetBrains Mono, monospace'
          }}>
            {user.name[0]}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:600, color:COLORS.text, fontFamily:'JetBrains Mono, monospace' }}>{user.name}</div>
            <div style={{ fontSize:12, color:COLORS.textMuted, fontFamily:'JetBrains Mono, monospace' }}>{user.email}</div>
          </div>
          <button id="btn-logout" onClick={onLogout} style={{
            padding:'8px 12px', background:COLORS.bg, color:COLORS.text,
            border:`1px solid ${COLORS.borderMid}`, fontSize:11, cursor:'pointer', fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase'
          }}>LOGOUT</button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', padding:'0 16px', gap:2, flexShrink:0, borderBottom:`1px solid ${COLORS.borderMid}` }}>
        {TABS.map(t => (
          <button key={t.id} id={`profile-tab-${t.id}`} onClick={() => setTab(t.id)} style={{
            padding:'10px 14px', background:'none', border:'none',
            color: tab===t.id ? COLORS.text : COLORS.textMuted,
            borderBottom: `2px solid ${tab===t.id ? COLORS.text : 'transparent'}`,
            fontSize:12, fontWeight: tab===t.id ? 600 : 400, cursor:'pointer',
            marginBottom:-1, whiteSpace:'nowrap', transition:'all 0.1s', fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase'
          }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:'auto', padding:16 }}>

        {/* ── Profile tab ── */}
        {tab === 'profile' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[
              { label:'Name',    value: user.name },
              { label:'Email',   value: user.email },
              { label:'Phone',   value: user.phone || 'N/A' },
              { label:'Joined',  value: formatDate(user.createdAt) },
            ].map(item => (
              <div key={item.label} style={{ padding:'12px 14px', background:COLORS.bgCard, border:`1px solid ${COLORS.borderMid}` }}>
                <div style={{ fontSize:10, color:COLORS.textMuted, marginBottom:4, fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase' }}>{item.label}</div>
                <div style={{ fontSize:14, color:COLORS.text, fontFamily:'JetBrains Mono, monospace' }}>{item.value}</div>
              </div>
            ))}

            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginTop:8 }}>
              {[
                { value:reports.length,     label:'REPORTS' },
                { value:contacts.length,    label:'CONTACTS' },
                { value:routeHistory.length,label:'TRIPS' },
              ].map(s => (
                <div key={s.label} style={{ padding:'12px 8px', background:COLORS.bgCard, border:`1px solid ${COLORS.borderMid}`, textAlign:'center' }}>
                  <div style={{ fontSize:20, fontWeight:600, color:COLORS.text, fontFamily:'JetBrains Mono, monospace' }}>{s.value}</div>
                  <div style={{ fontSize:10, color:COLORS.textMuted, fontFamily:'JetBrains Mono, monospace' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Contacts tab ── */}
        {tab === 'contacts' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <span style={{ fontSize:11, color:COLORS.textMuted, fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase' }}>{contacts.length}/5 CONTACTS</span>
              {contacts.length < 5 && (
                <button id="btn-add-contact" onClick={() => setShowAdd(s => !s)} style={{
                  padding:'8px 12px', background:COLORS.bg, color:COLORS.text,
                  border:`1px solid ${COLORS.text}`, fontSize:11, cursor:'pointer', fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase'
                }}>+ ADD CONTACT</button>
              )}
            </div>

            {showAdd && (
              <div style={{ padding:16, background:COLORS.bgCard, border:`1px solid ${COLORS.border}`, marginBottom:16 }}>
                <div style={{ fontSize:14, fontWeight:600, color:COLORS.text, marginBottom:14, fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase' }}>NEW CONTACT</div>
                {[
                  { field:'name', placeholder:'Name *', type:'text' },
                  { field:'phone', placeholder:'Phone * (10–15 digits)', type:'tel' },
                  { field:'email', placeholder:'Email (optional)', type:'email' },
                  { field:'relationship', placeholder:'Relationship (e.g. Mother)', type:'text' },
                ].map(({ field, placeholder, type }) => (
                  <input key={field} id={`contact-${field}`} type={type} placeholder={placeholder}
                    value={cForm[field]} onChange={e => setCForm(f => ({ ...f, [field]:e.target.value }))}
                    style={{...inputStyle, borderRadius:0, border:`1px solid ${COLORS.borderMid}`, fontFamily:'JetBrains Mono, monospace', background:COLORS.bg, padding:'10px 12px'}} />
                ))}
                <label style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, fontSize:12, color:COLORS.textMuted, cursor:'pointer', fontFamily:'JetBrains Mono, monospace' }}>
                  <input type="checkbox" id="contact-primary" checked={cForm.isPrimary}
                    onChange={e => setCForm(f => ({ ...f, isPrimary:e.target.checked }))} />
                  PRIMARY CONTACT
                </label>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={() => setShowAdd(false)} style={{ flex:1, padding:'10px', background:COLORS.bgCard, color:COLORS.text, border:`1px solid ${COLORS.borderMid}`, cursor:'pointer', fontFamily:'JetBrains Mono, monospace' }}>CANCEL</button>
                  <button id="btn-save-contact" onClick={handleAddContact} disabled={saving} style={{ flex:2, padding:'10px', background:COLORS.text, color:COLORS.bg, border:`1px solid ${COLORS.text}`, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'JetBrains Mono, monospace' }}>
                    {saving ? 'SAVING...' : 'SAVE'}
                  </button>
                </div>
              </div>
            )}

            {contacts.length === 0 ? (
              <div style={{ textAlign:'center', padding:48, color:COLORS.textMuted, border:`1px dashed ${COLORS.borderMid}` }}>
                <div style={{ fontSize:12, fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase' }}>NO CONTACTS</div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {contacts.map(c => (
                  <div key={c.id} style={{ padding:'12px 14px', background:COLORS.bgCard, border:`1px solid ${c.isPrimary ? COLORS.text : COLORS.borderMid}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                          <span style={{ fontSize:14, fontWeight:600, color:COLORS.text, fontFamily:'JetBrains Mono, monospace' }}>{c.name}</span>
                          {c.isPrimary && <span style={{ fontSize:9, border:`1px solid ${COLORS.text}`, color:COLORS.text, padding:'2px 4px', fontWeight:600, fontFamily:'JetBrains Mono, monospace' }}>PRI</span>}
                        </div>
                        <div style={{ fontSize:12, color:COLORS.textMuted, fontFamily:'JetBrains Mono, monospace' }}>{c.phone}</div>
                      </div>
                      <button id={`btn-del-contact-${c.id}`} onClick={() => handleDelete(c.id)} disabled={deleting===c.id}
                        style={{ background:COLORS.bg, border:`1px solid ${COLORS.borderMid}`, color:COLORS.textMuted, padding:'6px 10px', fontSize:11, cursor:'pointer', fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase' }}>
                        DEL
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Reports tab ── */}
        {tab === 'reports' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }} className="animate-fadeIn">
            {reports.length === 0 ? (
              <div style={{ textAlign:'center', padding:48, color:'rgba(255,255,255,0.25)' }}>
                <div style={{ fontSize:44, marginBottom:12 }}>📋</div>
                <div>No reports submitted yet</div>
              </div>
            ) : reports.map(r => {
              const cat = REPORT_CATEGORIES.find(c => c.value === r.category);
              return (
                <div key={r.id} style={{ padding:'14px 16px', background:'rgba(255,255,255,0.05)', borderRadius:16, border:'1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:18 }}>{cat?.icon || '❓'}</span>
                      <span style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{cat?.label || r.category}</span>
                    </div>
                    <span style={{
                      fontSize:10, padding:'3px 10px', borderRadius:20, fontWeight:700,
                      background: r.status==='VERIFIED' ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
                      color: r.status==='VERIFIED' ? '#22C55E' : '#EAB308',
                    }}>{r.status}</span>
                  </div>
                  {r.description && <div style={{ fontSize:13, color:'rgba(255,255,255,0.65)', marginBottom:6, lineHeight:1.4 }}>{r.description}</div>}
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>{formatTime(r.createdAt)}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── History tab ── */}
        {tab === 'history' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }} className="animate-fadeIn">
            {routeHistory.length === 0 ? (
              <div style={{ textAlign:'center', padding:48, color:'rgba(255,255,255,0.25)' }}>
                <div style={{ fontSize:44, marginBottom:12 }}>🗺️</div>
                <div>No route history yet</div>
              </div>
            ) : routeHistory.map(r => {
              const color = getSafetyColor(r.safetyScore);
              return (
                <div key={r.id} style={{ padding:'14px 16px', background:'rgba(255,255,255,0.05)', borderRadius:16, border:'1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, color:'rgba(255,255,255,0.6)' }}>📍 {r.originAddress}</div>
                      <div style={{ fontSize:14, fontWeight:700, color:'#fff' }}>🏁 {r.destAddress}</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
                      <div style={{ fontSize:20, fontWeight:900, color, fontFamily:"'DM Serif Display', serif" }}>{(r.safetyScore*100).toFixed(0)}%</div>
                      <div style={{ fontSize:10, color, fontWeight:700 }}>{getSafetyLabel(r.safetyScore)}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:12, fontSize:11, color:'rgba(255,255,255,0.35)' }}>
                    <span>🚶 {r.travelMode}</span>
                    <span>{formatTime(r.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
