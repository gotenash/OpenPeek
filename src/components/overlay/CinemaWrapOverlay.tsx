import { useI18n } from '../../i18n/I18nContext';

interface CinemaWrapOverlayProps {
  cutAnimation: { active: boolean; duration: number } | null;
}

export function CinemaWrapOverlay({ cutAnimation }: CinemaWrapOverlayProps) {
  const { t } = useI18n();

  if (!cutAnimation?.active) return null;

  return (
    <>
      {/* Cinema Camera Soft Flash */}
      <div className="cut-flash-overlay" />

      {/* Cinema Cut & "That's a wrap! / C'est dans la boîte !" Animation Badge */}
      <div className="cut-badge-container">
        <div className="cut-badge-card">
          {/* Animated SVG Clapperboard */}
          <div style={{ position: 'relative', width: '84px', height: '68px', marginBottom: '2px' }}>
            <svg viewBox="0 0 84 68" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
              {/* Base board */}
              <rect x="6" y="26" width="72" height="38" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
              <line x1="24" y1="26" x2="24" y2="64" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
              <line x1="42" y1="26" x2="42" y2="64" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
              <line x1="60" y1="26" x2="60" y2="64" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
              {/* Animated snapping top bar */}
              <g className="clapper-top-bar">
                <rect x="6" y="8" width="72" height="17" rx="3" fill="#1e293b" stroke="#c084fc" strokeWidth="2.5" />
                <polygon points="12,8 21,8 15,25 6,25" fill="#ffffff" />
                <polygon points="30,8 39,8 33,25 24,25" fill="#ffffff" />
                <polygon points="48,8 57,8 51,25 42,25" fill="#ffffff" />
                <polygon points="66,8 75,8 69,25 60,25" fill="#ffffff" />
              </g>
            </svg>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '26px' }}>🎬</span>
            <h2 style={{
              margin: 0,
              fontSize: '26px',
              fontWeight: 900,
              background: 'linear-gradient(135deg, #4ade80 0%, #38bdf8 50%, #c084fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em',
              textShadow: '0 0 30px rgba(74, 222, 128, 0.4)'
            }}>
              {t('overlay.thatsAWrap')}
            </h2>
          </div>

          <p style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            color: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>{t('overlay.cutSaved')}</span>
          </p>

          {cutAnimation.duration > 0 && (
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#94a3b8',
              backgroundColor: 'rgba(255,255,255,0.06)',
              padding: '3px 12px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              ⏱️ {t('overlay.duration')} {Math.floor(cutAnimation.duration / 60)}m {cutAnimation.duration % 60}s
            </span>
          )}
        </div>
      </div>
    </>
  );
}
