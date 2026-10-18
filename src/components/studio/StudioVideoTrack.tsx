import { Film, Type, Image as ImageIcon } from 'lucide-react';
import type { TimelineClip } from '../../utils/videoCompositor';
import { TrackClipCard } from './TrackClipCard';

export interface StudioVideoTrackProps {
  trackNumber: 1 | 2;
  clips: TimelineClip[];
  totalDuration: number;
  currentTime: number;
  safeDur: number;
  timelineViewMode: 'spatial' | 'filmstrip' | 'compact';
  selectedClipId: string | null;
  clipTimelineOffsets: Map<string, { start: number; end: number; duration: number }>;
  clipFilmstrips?: any;
  activeClipDragId: string | null;
  clipDragFeedback: string | null;
  videoLaneRef: React.RefObject<HTMLDivElement | null>;
  onVideoLaneSeek: (clientX: number, target: HTMLDivElement) => void;
  onVideoLanePointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onVideoLanePointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onVideoLanePointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onStartClipDrag: (e: React.PointerEvent<HTMLDivElement>, clipId: string, mode: 'move' | 'resize-left' | 'resize-right', laneEl: HTMLDivElement | null) => void;
  onClipPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onClipPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onSelectClip: (clipId: string) => void;
  onSeek: (time: number) => void;
  onOpenEditSlide: (clip: TimelineClip) => void;
  onToggleClipTrack: (clipId: string, track: 1 | 2) => void;
  onUpdateClipTrim: (clipId: string, start: number, end: number) => void;
  onUpdateClipSpeed: (clipId: string, speed: number) => void;
  onUpdateClipVolume: (clipId: string, vol: number) => void;
  onUpdateClipTransition: (clipId: string, trans: any, dur: number) => void;
  onRemoveClip: (clipId: string) => void;
  onOpenVideoPicker: () => void;
  onOpenAddSlide: () => void;
  onOpenAddImage: () => void;
  onOpenSilenceRemover?: (clip: TimelineClip) => void;
}

export function StudioVideoTrack({
  trackNumber,
  clips,
  totalDuration,
  currentTime,
  safeDur,
  timelineViewMode,
  selectedClipId,
  clipTimelineOffsets,
  clipFilmstrips: _clipFilmstrips,
  activeClipDragId,
  clipDragFeedback,
  videoLaneRef,
  onVideoLaneSeek,
  onVideoLanePointerDown,
  onVideoLanePointerMove,
  onVideoLanePointerUp,
  onStartClipDrag,
  onClipPointerMove,
  onClipPointerUp,
  onSelectClip,
  onSeek,
  onOpenEditSlide,
  onToggleClipTrack,
  onUpdateClipTrim: _onUpdateClipTrim,
  onUpdateClipSpeed: _onUpdateClipSpeed,
  onUpdateClipVolume: _onUpdateClipVolume,
  onUpdateClipTransition: _onUpdateClipTransition,
  onRemoveClip,
  onOpenVideoPicker,
  onOpenAddSlide,
  onOpenAddImage,
  onOpenSilenceRemover: _onOpenSilenceRemover
}: StudioVideoTrackProps) {
  const isTrack2 = trackNumber === 2;
  const trackClips = (clips || []).filter(c => isTrack2 ? c.track === 2 : c.track !== 2);
  const trackColor = isTrack2 ? '#c084fc' : '#38bdf8';
  const trackBg = isTrack2 ? 'rgba(168, 85, 247, 0.2)' : 'rgba(6, 182, 212, 0.2)';
  const trackBorder = isTrack2 ? 'rgba(168, 85, 247, 0.45)' : 'rgba(6, 182, 212, 0.45)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: 'rgba(0,0,0,0.25)', padding: '5px 8px', borderRadius: '5px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div className="timeline-track-sticky-header" style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '160px', minWidth: '160px', maxWidth: '160px', flexShrink: 0, boxSizing: 'border-box', paddingRight: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Film size={11} color={trackColor} />
            <span style={{ fontSize: '10px', color: trackColor, fontWeight: 700 }}>
              {isTrack2 ? 'Piste Vidéo 2 (V2)' : 'Piste Vidéo 1 (V1)'} ({trackClips.length})
            </span>
          </div>
          <div style={{ display: 'flex', gap: '3px', flexWrap: 'nowrap' }}>
            <button
              type="button"
              className="btn-toolbar"
              onClick={onOpenVideoPicker}
              style={{ padding: '2px 4px', fontSize: '9px', backgroundColor: trackBg, color: trackColor, borderColor: trackBorder, display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}
              title={`Insérer une vidéo sur la ${isTrack2 ? 'Piste Vidéo 2 (V2)' : 'Piste Vidéo 1 (V1)'}`}
            >
              <Film size={9} />
              <span>+ Vidéo</span>
            </button>
            <button
              type="button"
              className="btn-toolbar"
              onClick={onOpenAddSlide}
              style={{ padding: '2px 4px', fontSize: '9px', backgroundColor: 'rgba(139, 92, 246, 0.2)', color: '#c084fc', borderColor: 'rgba(139, 92, 246, 0.45)', display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}
              title={`Insérer une diapositive titre sur la ${isTrack2 ? 'Piste Vidéo 2 (V2)' : 'Piste Vidéo 1 (V1)'}`}
            >
              <Type size={9} />
              <span>+ Diapo</span>
            </button>
            <button
              type="button"
              className="btn-toolbar"
              onClick={onOpenAddImage}
              style={{ padding: '2px 4px', fontSize: '9px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.45)', display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}
              title={`Insérer une image sur la ${isTrack2 ? 'Piste Vidéo 2 (V2)' : 'Piste Vidéo 1 (V1)'}`}
            >
              <ImageIcon size={9} />
              <span>+ Image</span>
            </button>
          </div>
        </div>

        {/* Spatial Aligned Video Lane */}
        {timelineViewMode === 'spatial' ? (
          <div
            ref={videoLaneRef}
            className="timeline-spatial-lane"
            onClick={(e) => onVideoLaneSeek(e.clientX, e.currentTarget)}
            onPointerDown={onVideoLanePointerDown}
            onPointerMove={onVideoLanePointerMove}
            onPointerUp={onVideoLanePointerUp}
            style={{
              flexGrow: 1,
              position: 'relative',
              height: '48px',
              cursor: 'pointer',
              overflow: 'visible',
              backgroundColor: isTrack2 ? 'rgba(168, 85, 247, 0.04)' : 'rgba(0, 0, 0, 0.28)',
              border: isTrack2 ? '1px dashed rgba(168, 85, 247, 0.25)' : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '4px'
            }}
            title={`${isTrack2 ? 'Piste Vidéo 2 (V2)' : 'Piste Vidéo 1 (V1)'} - Cliquez ou glissez pour déplacer la tête de lecture`}
          >
            {/* Ruler grid ticks */}
            <div className="timeline-lane-ruler-grid">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="timeline-lane-ruler-tick" />
              ))}
            </div>

            {/* Live Drag Tooltip */}
            {clipDragFeedback && activeClipDragId && trackClips.some(c => c.id === activeClipDragId) && (
              <div style={{
                position: 'absolute',
                top: '-24px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(15, 23, 42, 0.95)',
                border: `1px solid ${trackColor}`,
                color: trackColor,
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                zIndex: 30,
                pointerEvents: 'none'
              }}>
                ⏱️ {clipDragFeedback}
              </div>
            )}

            {/* Clips mapped to this Track */}
            {trackClips.map((clip) => {
              const offset = clipTimelineOffsets.get(clip.id) || { start: 0, end: 10, duration: 10 };
              const leftPct = (offset.start / safeDur) * 100;
              const widthPct = Math.max(1.5, (offset.duration / safeDur) * 100);
              const isSlide = clip.type === 'slide';
              const isImage = clip.type === 'image';
              const isActive = currentTime >= offset.start && currentTime <= offset.end;
              const isSelected = selectedClipId === clip.id;

              return (
                <div
                  key={clip.id}
                  onPointerDown={(e) => onStartClipDrag(e, clip.id, 'move', videoLaneRef.current)}
                  onPointerMove={onClipPointerMove}
                  onPointerUp={onClipPointerUp}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectClip(clip.id);
                    onSeek(offset.start);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (isSlide) {
                      onSelectClip(clip.id);
                      onOpenEditSlide(clip);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    top: '3px',
                    bottom: '3px',
                    borderRadius: '5px',
                    backgroundColor: isSlide
                      ? (isSelected ? 'rgba(168, 85, 247, 0.55)' : isActive ? 'rgba(168, 85, 247, 0.4)' : 'rgba(168, 85, 247, 0.28)')
                      : isImage
                        ? (isSelected ? 'rgba(16, 185, 129, 0.5)' : isActive ? 'rgba(16, 185, 129, 0.38)' : 'rgba(16, 185, 129, 0.25)')
                        : (isSelected ? (isTrack2 ? 'rgba(192, 132, 252, 0.45)' : 'rgba(6, 182, 212, 0.4)') : isActive ? (isTrack2 ? 'rgba(192, 132, 252, 0.35)' : 'rgba(6, 182, 212, 0.3)') : (isTrack2 ? 'rgba(147, 51, 234, 0.22)' : 'rgba(15, 23, 42, 0.7)')),
                    border: isSelected
                      ? `2px solid ${trackColor}`
                      : isActive
                        ? `1.5px solid ${trackColor}`
                        : '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: isSelected ? `0 0 10px ${trackColor}` : isActive ? `0 0 6px ${trackColor}` : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 6px',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    cursor: activeClipDragId === clip.id ? 'grabbing' : 'grab',
                    transition: activeClipDragId === clip.id ? 'none' : 'all 0.15s ease',
                    userSelect: 'none',
                    zIndex: isSelected ? 8 : (isActive ? 6 : 4)
                  }}
                  title={`[${isTrack2 ? 'Piste 2' : 'Piste 1'}] ${clip.video?.title || 'Clip'} (${offset.duration.toFixed(1)}s)`}
                >
                  {/* Left Resize Handle */}
                  <div
                    className="timeline-resize-handle timeline-resize-handle-left"
                    onPointerDown={(e) => onStartClipDrag(e, clip.id, 'resize-left', videoLaneRef.current)}
                    onPointerMove={onClipPointerMove}
                    onPointerUp={onClipPointerUp}
                    title="Ajuster le début / chevauchement"
                  />

                  {/* Left: Badge + Title */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                    <span style={{
                      fontSize: '8px',
                      fontWeight: 800,
                      padding: '1px 4px',
                      borderRadius: '3px',
                      backgroundColor: isSlide ? 'rgba(139, 92, 246, 0.4)' : isImage ? 'rgba(16, 185, 129, 0.4)' : isTrack2 ? 'rgba(168, 85, 247, 0.4)' : 'rgba(6, 182, 212, 0.3)',
                      color: isSlide ? '#c4b5fd' : isImage ? '#6ee7b7' : isTrack2 ? '#c084fc' : '#7dd3fc'
                    }}>
                      {isSlide ? '📑 Diapo' : isImage ? '🖼️ Image' : isTrack2 ? '🎬 V2' : '🎬 V1'}
                    </span>
                    <span style={{ fontSize: '9px', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {clip.video?.title || 'Clip'}
                    </span>
                  </div>

                  {/* Right: Duration + Toggle Track button + Edit */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.75)', fontFamily: 'monospace', pointerEvents: 'none' }}>
                      {offset.duration.toFixed(1)}s
                    </span>
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleClipTrack(clip.id, isTrack2 ? 1 : 2);
                      }}
                      style={{ background: isTrack2 ? 'rgba(6, 182, 212, 0.25)' : 'rgba(168, 85, 247, 0.25)', border: `1px solid ${isTrack2 ? 'rgba(6, 182, 212, 0.45)' : 'rgba(168, 85, 247, 0.45)'}`, borderRadius: '3px', color: isTrack2 ? '#38bdf8' : '#c084fc', cursor: 'pointer', padding: '1px 4px', fontSize: '8px', fontWeight: 700 }}
                      title={isTrack2 ? "Faire descendre ce clip sur la Piste Vidéo 1 (V1)" : "Faire monter ce clip sur la Piste Vidéo 2 (V2)"}
                    >
                      {isTrack2 ? '⬇️ V1' : '⬆️ V2'}
                    </button>
                    {isSlide && (
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectClip(clip.id);
                          onOpenEditSlide(clip);
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#c084fc', cursor: 'pointer', padding: '1px', fontSize: '9px' }}
                        title="Modifier le style de cette diapo"
                      >
                        ⚙️
                      </button>
                    )}
                  </div>

                  {/* Right Resize Handle */}
                  <div
                    className="timeline-resize-handle timeline-resize-handle-right"
                    onPointerDown={(e) => onStartClipDrag(e, clip.id, 'resize-right', videoLaneRef.current)}
                    onPointerMove={onClipPointerMove}
                    onPointerUp={onClipPointerUp}
                    title="Ajuster la fin / durée"
                  />
                </div>
              );
            })}

            {/* Playhead indicator on this lane */}
            {totalDuration > 0 && (
              <div
                className="timeline-playhead-line"
                style={{ left: `${Math.max(0, Math.min(100, (currentTime / safeDur) * 100))}%` }}
              />
            )}

            {trackClips.length === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: '10px', color: 'var(--text-muted)' }}>
                {isTrack2 ? 'Piste Vidéo 2 vide — Utilisez « ⬆️ V2 » sur un clip pour l\'amener ici' : 'Piste Vidéo 1 vide — Cliquez sur « + Vidéo » ci-dessus'}
              </div>
            )}
          </div>
        ) : (
          /* Cards view for 'compact' or 'filmstrip' mode */
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', flexGrow: 1 }}>
            {trackClips.map((clip) => {
              const offset = clipTimelineOffsets.get(clip.id) || { start: 0, end: 10, duration: 10 };
              return (
                <TrackClipCard
                  key={clip.id}
                  clip={clip}
                  offset={offset}
                  isSelected={selectedClipId === clip.id}
                  isActive={currentTime >= offset.start && currentTime <= offset.end}
                  isTrack2={isTrack2}
                  onSelect={() => {
                    onSelectClip(clip.id);
                    onSeek(offset.start);
                  }}
                  onToggleTrack={() => onToggleClipTrack(clip.id, isTrack2 ? 1 : 2)}
                  onEditSlide={() => onOpenEditSlide(clip)}
                  onRemove={() => onRemoveClip(clip.id)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
