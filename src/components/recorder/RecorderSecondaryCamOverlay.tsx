import type { RecorderOptions } from '../../hooks/useRecorder';

interface RecorderSecondaryCamOverlayProps {
  options: RecorderOptions;
  recorder: any;
}

export function RecorderSecondaryCamOverlay({ options, recorder }: RecorderSecondaryCamOverlayProps) {
  const { isRecording, isSecondaryCamRecording, secondaryCamStream, toggleSecondaryCamRecording } = recorder;

  if (!isRecording || !isSecondaryCamRecording || !secondaryCamStream) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '320px',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(16px)',
        border: '2px solid #ef4444',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.7), 0 0 20px rgba(239, 68, 68, 0.35)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.2)', borderBottom: '1px solid rgba(239, 68, 68, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#fca5a5', letterSpacing: '0.5px' }}>
            CAMÉRA 2 (B-ROLL V2)
          </span>
        </div>
        <button
          onClick={toggleSecondaryCamRecording}
          style={{
            background: 'rgba(239, 68, 68, 0.85)',
            border: 'none',
            color: '#fff',
            borderRadius: '4px',
            padding: '3px 8px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
          title={`Terminer le plan B-Roll (${options.secondaryCamShortcut || 'F10'})`}
        >
          Terminer ({options.secondaryCamShortcut || 'F10'})
        </button>
      </div>
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000' }}>
        <video
          ref={(el) => {
            if (el && el.srcObject !== secondaryCamStream) {
              el.srcObject = secondaryCamStream;
            }
          }}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      <div style={{ padding: '6px 12px', fontSize: '10px', color: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.4)' }}>
        <span>Retour cadrage (non incrusté dans la capture)</span>
        {options.secondaryCamAudio && <span style={{ color: '#4ade80', fontWeight: 600 }}>🎙️ Audio Caméra 2</span>}
      </div>
    </div>
  );
}
