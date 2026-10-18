import React from 'react';

function formatTime(secs: number): string {
  const safe = typeof secs === 'number' && !isNaN(secs) && secs >= 0 ? secs : 0;
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface TimelineRulerProps {
  currentTime: number;
  totalDuration: number;
  safeDur: number;
  rulerTicks: Array<{ pct: number; label: string }>;
  timelineRulerRef: React.RefObject<HTMLDivElement | null>;
  onRulerSeek: (clientX: number) => void;
  onRulerPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onRulerPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onRulerPointerUp: () => void;
}

export function TimelineRuler({
  currentTime,
  totalDuration,
  safeDur,
  rulerTicks,
  timelineRulerRef,
  onRulerSeek,
  onRulerPointerDown,
  onRulerPointerMove,
  onRulerPointerUp
}: TimelineRulerProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px' }}>
      <div className="timeline-track-sticky-header" style={{ width: '160px', minWidth: '160px', maxWidth: '160px', flexShrink: 0, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '8px' }}>
        <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>
          {formatTime(currentTime)}
        </span>
        <span style={{ fontSize: '9px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
          / {formatTime(totalDuration)}
        </span>
      </div>

      <div
        ref={timelineRulerRef}
        onClick={(e) => onRulerSeek(e.clientX)}
        onPointerDown={onRulerPointerDown}
        onPointerMove={onRulerPointerMove}
        onPointerUp={onRulerPointerUp}
        style={{
          flexGrow: 1,
          position: 'relative',
          height: '18px',
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          borderRadius: '4px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          cursor: 'pointer',
          overflow: 'visible',
          userSelect: 'none',
          boxSizing: 'border-box'
        }}
        title="Glissez sur la règle pour parcourir rapidement toute la vidéo"
      >
        {rulerTicks.map((tick, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${tick.pct}%`,
              top: 0,
              bottom: 0,
              borderLeft: '1px solid rgba(255, 255, 255, 0.18)',
              paddingLeft: '3px',
              fontSize: '8px',
              fontFamily: 'monospace',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
              lineHeight: '16px'
            }}
          >
            {tick.label}
          </div>
        ))}

        {totalDuration > 0 && (
          <div
            style={{
              position: 'absolute',
              left: `${Math.max(0, Math.min(100, (currentTime / safeDur) * 100))}%`,
              transform: 'translateX(-50%)',
              top: '-3px',
              bottom: '-3px',
              width: '2px',
              backgroundColor: '#a855f7',
              boxShadow: '0 0 8px #a855f7, 0 0 16px rgba(168, 85, 247, 0.6)',
              pointerEvents: 'none',
              zIndex: 25
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-2px',
              left: '-4px',
              width: '10px',
              height: '8px',
              backgroundColor: '#c084fc',
              clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }} />
          </div>
        )}
      </div>
    </div>
  );
}
