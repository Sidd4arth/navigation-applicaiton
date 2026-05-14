import { useEffect, useRef } from 'react';

export default function Toast({ toasts, removeToast }) {
  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 99999,
      display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }) {
  const colors = {
    success: { bg: '#22C55E', icon: '✓' },
    error:   { bg: '#EF4444', icon: '✕' },
    info:    { bg: '#3B82F6', icon: 'ℹ' },
    warn:    { bg: '#F59E0B', icon: '⚠' },
  };
  const { bg, icon } = colors[toast.type] || colors.info;

  return (
    <div
      className="animate-slideInRight"
      style={{
        background: bg, color: '#fff', padding: '12px 16px',
        borderRadius: 14, fontSize: 13, fontWeight: 500,
        maxWidth: 320, minWidth: 220,
        boxShadow: `0 6px 24px ${bg}50`,
        display: 'flex', alignItems: 'center', gap: 10,
        pointerEvents: 'all',
      }}
    >
      <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
      <button
        onClick={onRemove}
        style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
          cursor: 'pointer', fontSize: 18, flexShrink: 0, lineHeight: 1,
          padding: 0,
        }}
      >×</button>
    </div>
  );
}
