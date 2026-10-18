import type { TimelineClip } from '../../utils/videoCompositor';

interface TimelineTransitionsOverlayProps {
  detectedOverlaps: Array<{
    id: string;
    clip1: TimelineClip;
    clip2: TimelineClip;
    start: number;
    end: number;
    duration: number;
  }>;
  safeDur: number;
  onSeek: (time: number) => void;
  onUpdateClipTransition: (clipId: string, transition: any, duration: number) => void;
}

export function TimelineTransitionsOverlay({
  detectedOverlaps,
  safeDur,
  onSeek,
  onUpdateClipTransition
}: TimelineTransitionsOverlayProps) {
  if (detectedOverlaps.length === 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '1px 8px', margin: '-2px 0' }}>
      <div className="timeline-track-sticky-header" style={{ width: '160px', minWidth: '160px', maxWidth: '160px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px' }}>
        <span style={{ fontSize: '9px', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '3px' }}>
          ✨ Transitions ({detectedOverlaps.length})
        </span>
      </div>
      <div style={{ flexGrow: 1, position: 'relative', height: '22px' }}>
        {detectedOverlaps.map(ovl => {
          const leftPct = (ovl.start / safeDur) * 100;
          const widthPct = Math.max(2.5, (ovl.duration / safeDur) * 100);
          return (
            <div
              key={ovl.id}
              onClick={(e) => {
                e.stopPropagation();
                onSeek(ovl.start);
              }}
              style={{
                position: 'absolute',
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                top: '0px',
                bottom: '0px',
                backgroundColor: 'rgba(245, 158, 11, 0.28)',
                border: '1.5px dashed #f59e0b',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10,
                padding: '0 2px',
                boxSizing: 'border-box'
              }}
              title={`Chevauchement V1 & V2: ${ovl.duration.toFixed(1)}s. Cliquez pour choisir la transition`}
            >
              <select
                value={ovl.clip1.transitionToNext || 'crossfade'}
                onChange={(e) => {
                  e.stopPropagation();
                  onUpdateClipTransition(ovl.clip1.id, e.target.value as any, ovl.duration);
                }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: 'rgba(15, 23, 42, 0.92)',
                  color: '#fbbf24',
                  border: '1px solid #f59e0b',
                  borderRadius: '3px',
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '1px 3px',
                  cursor: 'pointer',
                  maxWidth: '100%',
                  height: '18px'
                }}
              >
                <option value="crossfade">✨ Fondu ({ovl.duration.toFixed(1)}s)</option>
                <option value="fade-black">🌑 Au noir ({ovl.duration.toFixed(1)}s)</option>
                <option value="slide">➡️ Gliss. ({ovl.duration.toFixed(1)}s)</option>
                <option value="none">✂️ Coupe ({ovl.duration.toFixed(1)}s)</option>
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
