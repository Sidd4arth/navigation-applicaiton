import { useState, useEffect, useRef } from 'react';
import { COLORS } from '../constants';

export default function SOSScreen({ onResolve }) {
  const [elapsed, setElapsed] = useState(0);
  const [beat, setBeat]       = useState(false);
  const startRef              = useRef(Date.now());

  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      setBeat((b) => !b);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: beat ? COLORS.danger : COLORS.bg,
      transition: 'background 0.2s',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: COLORS.bgCard, border: `2px solid ${beat ? COLORS.bg : COLORS.danger}`,
        padding: 32, width: '100%', maxWidth: 360, textAlign: 'center',
        transition: 'border-color 0.2s', position: 'relative',
      }}>
        {/* SOS badge */}
        <div style={{
          margin: '0 auto 20px',
          width: 80, height: 80, border: `2px solid ${beat ? COLORS.bg : COLORS.danger}`,
          background: beat ? COLORS.danger : COLORS.bgCard,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: beat ? COLORS.bg : COLORS.danger, fontFamily: 'JetBrains Mono, monospace' }}>
            SOS
          </span>
        </div>

        <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: COLORS.text, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
          Emergency Active
        </h2>
        <p style={{ margin: '0 0 4px', fontSize: 11, color: COLORS.textMuted, fontFamily: 'JetBrains Mono, monospace' }}>
          Contacts notified via SMS & Email
        </p>

        {/* Timer */}
        <div style={{
          fontSize: 48, fontWeight: 700, color: beat ? COLORS.text : COLORS.danger,
          letterSpacing: 0, margin: '24px 0', fontFamily: 'JetBrains Mono, monospace',
        }}>
          {fmt(elapsed)}
        </div>

        {/* Status chip */}
        <div style={{
          background: COLORS.bg, border: `1px solid ${COLORS.danger}`,
          padding: '12px 16px', marginBottom: 24,
          fontSize: 11, color: COLORS.text, lineHeight: 1.5, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase'
        }}>
          LOCATION SHARED EVERY 5S<br />
          <span style={{ fontSize: 9, color: COLORS.textMuted }}>
            AUTHORITIES NOTIFIED
          </span>
        </div>

        {/* CTA buttons */}
        <button
          onClick={() => window.open('tel:112')}
          style={{
            width: '100%', padding: '16px', marginBottom: 12,
            background: COLORS.danger, color: COLORS.bg, border: `1px solid ${COLORS.danger}`,
            fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase'
          }}
        >
          CALL 112
        </button>

        <button
          onClick={onResolve}
          style={{
            width: '100%', padding: '14px',
            background: COLORS.bg, color: COLORS.safe,
            border: `1px solid ${COLORS.safe}`,
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase'
          }}
        >
          RESOLVE SOS
        </button>

        <p style={{ marginTop: 14, fontSize: 10, color: COLORS.textMuted, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
          Hold SOS button again to force resolve
        </p>
      </div>
    </div>
  );
}
