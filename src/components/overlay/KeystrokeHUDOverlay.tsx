import React from 'react';

interface KeystrokeHUDOverlayProps {
  keystrokeToast: string | null;
}

export function KeystrokeHUDOverlay({ keystrokeToast }: KeystrokeHUDOverlayProps) {
  if (!keystrokeToast) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '48px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 18px',
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: '12px',
      border: '1.5px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 12px 32px rgba(0,0,0,0.65), 0 0 20px rgba(56, 189, 248, 0.3)',
      pointerEvents: 'none',
      zIndex: 9999999,
      userSelect: 'none'
    }}>
      {keystrokeToast.split(' + ').map((part, idx, arr) => (
        <React.Fragment key={idx}>
          <span style={{
            display: 'inline-block',
            padding: '4px 10px',
            borderRadius: '6px',
            backgroundColor: 'rgba(30, 41, 59, 0.95)',
            border: '1px solid rgba(56, 189, 248, 0.45)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
            color: '#f8fafc',
            fontSize: '13px',
            fontWeight: 800,
            letterSpacing: '0.04em',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            {part}
          </span>
          {idx < arr.length - 1 && (
            <span style={{ color: 'rgba(148, 163, 184, 0.8)', fontSize: '13px', fontWeight: 700 }}>+</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
