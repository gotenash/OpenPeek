import { useI18n } from '../../i18n/I18nContext';

interface CountdownOverlayProps {
  countdownValue: number | null;
}

export function CountdownOverlay({ countdownValue }: CountdownOverlayProps) {
  const { t } = useI18n();

  if (countdownValue === null) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.42)',
      backdropFilter: 'blur(10px)',
      pointerEvents: 'none',
      zIndex: 999999
    }}>
      <div style={{
        width: '190px',
        height: '190px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(192, 132, 252, 0.45) 0%, rgba(236, 72, 153, 0.2) 70%, transparent 100%)',
        border: '4px solid #c084fc',
        boxShadow: '0 0 60px rgba(192, 132, 252, 0.7), 0 0 100px rgba(236, 72, 153, 0.4), inset 0 0 30px rgba(192, 132, 252, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'countdown-pop 0.95s cubic-bezier(0.175, 0.885, 0.32, 1.275) infinite'
      }}>
        <span style={{
          fontSize: countdownValue === 0 ? '42px' : '96px',
          fontWeight: 900,
          color: '#ffffff',
          textShadow: '0 0 30px #c084fc, 0 0 60px #ec4899',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          {countdownValue === 0 ? t('overlay.action') : countdownValue}
        </span>
      </div>

      <p style={{
        marginTop: '22px',
        fontSize: '22px',
        fontWeight: 800,
        color: '#f8fafc',
        letterSpacing: '0.04em',
        textShadow: '0 2px 12px rgba(0,0,0,0.9)'
      }}>
        {countdownValue === 0 ? t('overlay.recordingInProgress') : `${t('overlay.startingIn')} ${countdownValue}s...`}
      </p>

      <p style={{
        marginTop: '6px',
        fontSize: '12px',
        color: '#cbd5e1',
        textShadow: '0 1px 6px rgba(0,0,0,0.9)',
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        padding: '4px 12px',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        {t('overlay.shortcutsNotice')}
      </p>
    </div>
  );
}
