import { useState } from 'react';
import apiService from '../api';
import { COLORS } from '../constants';

export default function AuthScreen({ onAuth, addToast }) {
  const [mode, setMode]     = useState('login');
  const [form, setForm]     = useState({ name:'', email:'', password:'', phone:'' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (mode === 'register' && (!form.name || form.name.length < 2))
      e.name = 'Name must be at least 2 characters';
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email))
      e.email = 'Valid email required';
    if (!form.password || form.password.length < 6)
      e.password = 'Password must be at least 6 characters';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    try {
      const res = mode === 'login'
        ? await apiService.login(form.email, form.password)
        : await apiService.register(form);
      addToast('success', `Welcome, ${res.user.name}! 🛡️`);
      onAuth(res.user);
    } catch (err) {
      addToast('error', err.message || 'Invalid credentials');
    }
    setLoading(false);
  };

  const demoLogin = async () => {
    setLoading(true);
    try {
      const res = await apiService.login('priya@example.com', 'demo123');
      addToast('success', `Welcome, ${res.user.name}!`);
      onAuth(res.user);
    } catch { addToast('error', 'Demo login failed'); }
    setLoading(false);
  };



  return (
    <div style={{
      minHeight:'100vh', background:COLORS.bg,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20,
    }}>
      <div style={{ width:'100%', maxWidth:400, position:'relative' }}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{
            width:64, height:64, border:`1px solid ${COLORS.text}`, margin:'0 auto 18px',
            background:COLORS.bg,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <span style={{ fontSize:28, color: COLORS.text }}>🛡️</span>
          </div>
          <h1 style={{ margin:0, fontSize:32, fontWeight:700, color:'#fff', fontFamily:"'JetBrains Mono', monospace", letterSpacing:-1 }}>SAFAR</h1>
          <p style={{ margin:'8px 0 0', fontSize:11, color:COLORS.textMuted, letterSpacing:2, textTransform:'uppercase' }}>
            Safe · Aware · Free · Always · Resilient
          </p>
        </div>

        <div style={{ display:'flex', border:`1px solid ${COLORS.borderMid}`, marginBottom:24 }}>
          {['login','register'].map(m => (
            <button key={m} id={`tab-${m}`} onClick={() => { setMode(m); setErrors({}); }} style={{
              flex:1, padding:'12px', border:'none',
              background: mode===m ? COLORS.text : COLORS.bg,
              color: mode===m ? COLORS.bg : COLORS.textMuted,
              fontSize:13, fontWeight: 500, fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase', cursor:'pointer', transition:'all 0.1s',
            }}>
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <div className="animate-slideInUp">
          {mode==='register' && (
            <div style={{ marginBottom: 14 }}>
              <input id="auth-name" type="text" placeholder="Full Name"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={{ width:'100%', padding:'14px 18px', borderRadius:0, border: errors.name ? `1px solid ${COLORS.danger}` : `1px solid ${COLORS.borderMid}`, background:COLORS.bgCard, color:'#fff', fontSize:14, fontFamily:'JetBrains Mono, monospace', outline:'none', boxSizing:'border-box', transition:'border-color 0.2s' }} />
              {errors.name && <p style={{ margin:'5px 0 0 0', fontSize:11, color:COLORS.danger, fontFamily:'JetBrains Mono, monospace' }}>{errors.name}</p>}
            </div>
          )}
          
          <div style={{ marginBottom: 14 }}>
            <input id="auth-email" type="email" placeholder="Email Address"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              style={{ width:'100%', padding:'14px 18px', borderRadius:0, border: errors.email ? `1px solid ${COLORS.danger}` : `1px solid ${COLORS.borderMid}`, background:COLORS.bgCard, color:'#fff', fontSize:14, fontFamily:'JetBrains Mono, monospace', outline:'none', boxSizing:'border-box', transition:'border-color 0.2s' }} />
            {errors.email && <p style={{ margin:'5px 0 0 0', fontSize:11, color:COLORS.danger, fontFamily:'JetBrains Mono, monospace' }}>{errors.email}</p>}
          </div>

          <div style={{ marginBottom: 14 }}>
            <input id="auth-password" type="password" placeholder="Password"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              style={{ width:'100%', padding:'14px 18px', borderRadius:0, border: errors.password ? `1px solid ${COLORS.danger}` : `1px solid ${COLORS.borderMid}`, background:COLORS.bgCard, color:'#fff', fontSize:14, fontFamily:'JetBrains Mono, monospace', outline:'none', boxSizing:'border-box', transition:'border-color 0.2s' }} />
            {errors.password && <p style={{ margin:'5px 0 0 0', fontSize:11, color:COLORS.danger, fontFamily:'JetBrains Mono, monospace' }}>{errors.password}</p>}
          </div>

          {mode==='register' && (
            <div style={{ marginBottom: 14 }}>
              <input id="auth-phone" type="tel" placeholder="Phone (optional)"
                value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                style={{ width:'100%', padding:'14px 18px', borderRadius:0, border: errors.phone ? `1px solid ${COLORS.danger}` : `1px solid ${COLORS.borderMid}`, background:COLORS.bgCard, color:'#fff', fontSize:14, fontFamily:'JetBrains Mono, monospace', outline:'none', boxSizing:'border-box', transition:'border-color 0.2s' }} />
              {errors.phone && <p style={{ margin:'5px 0 0 0', fontSize:11, color:COLORS.danger, fontFamily:'JetBrains Mono, monospace' }}>{errors.phone}</p>}
            </div>
          )}
        </div>

        <button id="btn-auth-submit" onClick={handleSubmit} disabled={loading} style={{
          width:'100%', padding:'16px', border:loading ? `1px solid ${COLORS.borderMid}` : `1px solid ${COLORS.text}`,
          background: loading ? COLORS.bgCard : COLORS.text,
          color: loading ? COLORS.textMuted : COLORS.bg,
          fontSize:14, fontWeight:600, fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase', cursor: loading ? 'not-allowed' : 'pointer',
          transition:'all 0.1s', marginBottom:14,
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
        }}>
          {loading ? (
            <><span style={{ display:'inline-block', width:14, height:14, border:`2px solid ${COLORS.borderMid}`, borderTopColor:COLORS.textMuted, borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />WAIT…</>
          ) : (
            mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'
          )}
        </button>

        <button id="btn-demo-login" onClick={demoLogin} disabled={loading} style={{
          width:'100%', padding:'14px', background:'transparent', color:COLORS.text,
          border:`1px solid ${COLORS.borderMid}`, fontSize:12, fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase', cursor:'pointer', marginBottom:20,
        }}>
          Demo Login (Skip Auth)
        </button>

        <p style={{ textAlign:'center', fontSize:11, color:COLORS.textMuted, fontFamily:'JetBrains Mono, monospace' }}>
          Location data encrypted. Never shared.
        </p>
      </div>
    </div>
  );
}
