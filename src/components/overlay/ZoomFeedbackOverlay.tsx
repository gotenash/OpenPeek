import { ZoomIn, Maximize2 } from 'lucide-react';

interface ZoomFeedbackOverlayProps {
  zoomToast: { zoomed: boolean; factor: number } | null;
  isZoomCornerActive: boolean;
  activeZoomFactor: number;
}

export function ZoomFeedbackOverlay({
  zoomToast,
  isZoomCornerActive,
  activeZoomFactor
}: ZoomFeedbackOverlayProps) {
  return (
    <>
      {/* Floating HUD Toast Notification (Zoom feedback) */}
      {zoomToast && (
        <div style={{
          position: 'fixed',
          top: '32px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 22px',
          backgroundColor: zoomToast.zoomed ? 'rgba(15, 23, 42, 0.94)' : 'rgba(15, 23, 42, 0.90)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '9999px',
          border: zoomToast.zoomed ? '1.5px solid rgba(56, 189, 248, 0.7)' : '1.5px solid rgba(148, 163, 184, 0.4)',
          boxShadow: zoomToast.zoomed 
            ? '0 12px 36px rgba(0, 0, 0, 0.6), 0 0 28px rgba(56, 189, 248, 0.4)' 
            : '0 12px 30px rgba(0, 0, 0, 0.5)',
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: 600,
          letterSpacing: '0.3px',
          pointerEvents: 'none',
          zIndex: 9999999,
          userSelect: 'none'
        }}>
          {zoomToast.zoomed ? (
            <>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'rgba(56, 189, 248, 0.2)',
                color: '#38bdf8'
              }}>
                <ZoomIn size={16} />
              </span>
              <span style={{ color: '#38bdf8', fontWeight: 800 }}>Zoom {zoomToast.factor.toFixed(1)}x</span>
              <span style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '12px', fontWeight: 500 }}>Activé (Alt + Z)</span>
            </>
          ) : (
            <>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#94a3b8'
              }}>
                <Maximize2 size={16} />
              </span>
              <span style={{ color: '#f1f5f9', fontWeight: 700 }}>Plein Écran</span>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', fontWeight: 500 }}>Zoom désactivé</span>
            </>
          )}
        </div>
      )}

      {/* Discreet Persistent Corner Indicator while Zoom is Active */}
      {isZoomCornerActive && (
        <div style={{
          position: 'fixed',
          top: '18px',
          right: '22px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: '8px',
          border: '1.5px solid rgba(56, 189, 248, 0.65)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.6), 0 0 16px rgba(56, 189, 248, 0.35)',
          color: '#f8fafc',
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.05em',
          pointerEvents: 'none',
          zIndex: 9999999,
          userSelect: 'none'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#38bdf8',
            boxShadow: '0 0 10px #38bdf8'
          }} />
          <span>ZOOM {activeZoomFactor.toFixed(1)}x</span>
        </div>
      )}
    </>
  );
}
