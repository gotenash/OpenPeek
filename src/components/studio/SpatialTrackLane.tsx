import React, { useRef, useState } from 'react';

export interface SpatialBlockItem {
  id: string;
  startTime: number;
  duration: number;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  thumbnailUrl?: string;
}

export interface SpatialTrackLaneProps {
  label: string;
  icon: React.ReactNode;
  labelColor: string;
  items: SpatialBlockItem[];
  totalDuration: number;
  currentTime: number;
  emptyMessage: string;
  theme: {
    bg: string;
    border: string;
    text: string;
    badgeColor: string;
  };
  selectedItemId?: string | null;
  onSelect?: (id: string) => void;
  onUpdateTiming: (id: string, startTime: number, duration: number) => void;
  onSeek: (time: number) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAddQuick?: () => void;
  quickAddLabel?: string;
}

export function SpatialTrackLane({
  label,
  icon,
  labelColor,
  items,
  totalDuration,
  currentTime,
  emptyMessage,
  theme,
  selectedItemId,
  onSelect,
  onUpdateTiming,
  onSeek,
  onEdit,
  onDelete: _onDelete,
  onAddQuick,
  quickAddLabel
}: SpatialTrackLaneProps) {
  const laneRef = useRef<HTMLDivElement>(null);
  const dragInfoRef = useRef<{
    id: string;
    action: 'move' | 'resize-left' | 'resize-right';
    startX: number;
    initialStart: number;
    initialDur: number;
    laneWidth: number;
  } | null>(null);

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeFeedback, setActiveFeedback] = useState<string | null>(null);

  const safeDur = Math.max(0.1, typeof totalDuration === 'number' && !isNaN(totalDuration) ? totalDuration : 1);
  const safeTheme = theme || { bg: 'rgba(139, 92, 246, 0.28)', border: '#8b5cf6', text: '#ffffff', badgeColor: '#c084fc' };

  const handleStartDrag = (
    e: React.PointerEvent<HTMLDivElement>,
    item: SpatialBlockItem,
    action: 'move' | 'resize-left' | 'resize-right'
  ) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.closest('button') || target.closest('.timeline-block-actions') || target.closest('.timeline-mini-btn'))) {
      return;
    }
    e.stopPropagation();
    if (!laneRef.current || totalDuration <= 0) return;
    const laneRect = laneRef.current.getBoundingClientRect();
    const sTime = typeof item.startTime === 'number' && !isNaN(item.startTime) ? item.startTime : 0;
    const dur = typeof item.duration === 'number' && !isNaN(item.duration) && item.duration > 0 ? item.duration : 1;

    dragInfoRef.current = {
      id: item.id,
      action,
      startX: e.clientX,
      initialStart: sTime,
      initialDur: dur,
      laneWidth: Math.max(10, laneRect.width)
    };

    setActiveDragId(item.id);
    setActiveFeedback(`${sTime.toFixed(1)}s → ${(sTime + dur).toFixed(1)}s (${dur.toFixed(1)}s)`);

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {
      console.debug('[Timeline] setPointerCapture ignored:', err);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragInfoRef.current;
    if (!drag || totalDuration <= 0) return;

    const dx = e.clientX - drag.startX;
    const dt = (dx / drag.laneWidth) * totalDuration;

    if (drag.action === 'move') {
      const maxStart = Math.max(0, totalDuration - 0.2);
      const newStart = Math.max(0, Math.min(maxStart, Math.round((drag.initialStart + dt) * 10) / 10));
      onUpdateTiming(drag.id, newStart, drag.initialDur);
      onSeek(newStart);
      setActiveFeedback(`Début: ${newStart.toFixed(1)}s | Fin: ${(newStart + drag.initialDur).toFixed(1)}s (Durée: ${drag.initialDur.toFixed(1)}s)`);
    } else if (drag.action === 'resize-right') {
      const maxDur = Math.max(0.5, totalDuration - drag.initialStart);
      const newDur = Math.max(0.5, Math.min(maxDur, Math.round((drag.initialDur + dt) * 10) / 10));
      onUpdateTiming(drag.id, drag.initialStart, newDur);
      onSeek(drag.initialStart + newDur);
      setActiveFeedback(`Durée: ${newDur.toFixed(1)}s | Fin: ${(drag.initialStart + newDur).toFixed(1)}s`);
    } else if (drag.action === 'resize-left') {
      const maxStart = drag.initialStart + drag.initialDur - 0.5;
      const newStart = Math.max(0, Math.min(maxStart, Math.round((drag.initialStart + dt) * 10) / 10));
      const newDur = Math.max(0.5, Math.round((drag.initialDur - (newStart - drag.initialStart)) * 10) / 10);
      onUpdateTiming(drag.id, newStart, newDur);
      onSeek(newStart);
      setActiveFeedback(`Début: ${newStart.toFixed(1)}s | Durée: ${newDur.toFixed(1)}s`);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragInfoRef.current) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {
        console.debug('[Timeline] releasePointerCapture ignored:', err);
      }
      dragInfoRef.current = null;
      setActiveDragId(null);
      setActiveFeedback(null);
    }
  };

  const handleLaneClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragInfoRef.current) return;
    if (!laneRef.current || totalDuration <= 0) return;
    const rect = laneRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const seekTime = (clickX / rect.width) * totalDuration;
    onSeek(seekTime);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(0,0,0,0.25)', padding: '5px 8px', borderRadius: '5px' }}>
      <div className="timeline-track-sticky-header" style={{ width: '160px', minWidth: '160px', maxWidth: '160px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '8px', boxSizing: 'border-box' }}>
        <span style={{ fontSize: '10px', color: labelColor, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {icon}
          {label} ({(items || []).length})
        </span>
        {onAddQuick && (
          <button
            type="button"
            onClick={onAddQuick}
            style={{
              background: 'transparent',
              border: `1px solid ${labelColor}`,
              borderRadius: '3px',
              color: labelColor,
              padding: '1px 5px',
              fontSize: '10px',
              cursor: 'pointer',
              lineHeight: 1,
              flexShrink: 0
            }}
            title={`Ajouter ${label} à la position courante`}
          >
            {quickAddLabel || '+'}
          </button>
        )}
      </div>

      <div
        ref={laneRef}
        className="timeline-spatial-lane"
        onClick={handleLaneClick}
        style={{ flexGrow: 1, position: 'relative' }}
        title="Cliquez n'importe où sur la piste pour caler la tête de lecture"
      >
        {/* Subtle grid ticks */}
        <div className="timeline-lane-ruler-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="timeline-lane-ruler-tick" />
          ))}
        </div>

        {/* Playhead indicator */}
        {totalDuration > 0 && (
          <div
            className="timeline-playhead-line"
            style={{ left: `${Math.max(0, Math.min(100, (currentTime / safeDur) * 100))}%` }}
          />
        )}

        {/* Live Drag Tooltip */}
        {activeFeedback && (
          <div style={{
            position: 'absolute',
            top: '-24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.95)',
            border: `1px solid ${safeTheme.border}`,
            color: '#ffffff',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
            zIndex: 30,
            pointerEvents: 'none'
          }}>
            {activeFeedback}
          </div>
        )}

        {/* Items blocks */}
        {(items || []).map((item) => {
          if (!item) return null;
          const sTime = typeof item.startTime === 'number' && !isNaN(item.startTime) ? item.startTime : 0;
          const dur = typeof item.duration === 'number' && !isNaN(item.duration) && item.duration > 0 ? item.duration : 1;
          const leftPercent = Math.max(0, Math.min(99, (sTime / safeDur) * 100));
          const widthPercent = Math.max(1.5, Math.min(100 - leftPercent, (dur / safeDur) * 100));
          const isDraggingThis = activeDragId === item.id;
          const isSelected = selectedItemId === item.id;

          return (
            <div
              key={item.id}
              className={`timeline-spatial-block ${isDraggingThis ? 'is-dragging' : ''} ${isSelected ? 'is-selected' : ''}`}
              style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
                minWidth: '55px',
                backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.35)' : safeTheme.bg,
                border: isSelected ? '2px solid #38bdf8' : `1px solid ${safeTheme.border}`,
                boxShadow: isSelected ? '0 0 10px rgba(56, 189, 248, 0.8)' : 'none',
                color: safeTheme.text,
                zIndex: isSelected ? 15 : 5
              }}
              onPointerDown={(e) => {
                onSelect?.(item.id);
                handleStartDrag(e, item, 'move');
              }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onClick={(e) => {
                const target = e.target as HTMLElement | null;
                if (target && (target.closest('button') || target.closest('.timeline-block-actions') || target.closest('.timeline-mini-btn'))) {
                  return;
                }
                e.stopPropagation();
                onSelect?.(item.id);
                onSeek(sTime);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (onEdit) {
                  onEdit(item.id);
                }
              }}
              title={`Double-cliquez pour modifier (${sTime.toFixed(1)}s - ${(sTime + dur).toFixed(1)}s). Glissez pour déplacer. Touche Suppr pour supprimer.`}
            >
              {/* Left Stretch Handle */}
              <div
                className="timeline-resize-handle timeline-resize-handle-left"
                onPointerDown={(e) => handleStartDrag(e, item, 'resize-left')}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                title="Étirer le début"
              />

              {/* Block Content */}
              <div className="timeline-block-content">
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    style={{ width: '16px', height: '16px', objectFit: 'contain', borderRadius: '2px', backgroundColor: 'rgba(0,0,0,0.3)', flexShrink: 0 }}
                  />
                ) : item.icon ? (
                  <span style={{ flexShrink: 0 }}>{item.icon}</span>
                ) : null}

                <span className="timeline-block-title">
                  {item.label || ''}
                </span>

                <span className="timeline-block-time">
                  {sTime.toFixed(1)}s - {(sTime + dur).toFixed(1)}s
                </span>
              </div>

              {/* Actions: Edit */}
              {onEdit && (
                <div
                  className="timeline-block-actions"
                  style={{ position: 'relative', zIndex: 25, pointerEvents: 'auto' }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="timeline-mini-btn"
                    title="Modifier les options (ou double-cliquez sur le bloc)"
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(item.id);
                    }}
                  >
                    ⚙️
                  </button>
                </div>
              )}

              {/* Right Stretch Handle */}
              <div
                className="timeline-resize-handle timeline-resize-handle-right"
                onPointerDown={(e) => handleStartDrag(e, item, 'resize-right')}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                title="Étirer la fin (durée)"
              />
            </div>
          );
        })}

        {(!items || items.length === 0) && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
            padding: '0 12px'
          }}>
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}
