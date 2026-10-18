import { Trash2 } from 'lucide-react';
import type { TimelineClip } from '../../utils/videoCompositor';

export interface TrackClipCardProps {
  clip: TimelineClip;
  offset: { start: number; end: number; duration: number };
  isSelected: boolean;
  isActive: boolean;
  isTrack2: boolean;
  onSelect: () => void;
  onToggleTrack: () => void;
  onEditSlide?: () => void;
  onRemove: () => void;
}

export function TrackClipCard({
  clip,
  offset,
  isSelected,
  isActive,
  isTrack2,
  onSelect,
  onToggleTrack,
  onEditSlide,
  onRemove
}: TrackClipCardProps) {
  const isSlide = clip.type === 'slide';

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '6px 8px',
        cursor: 'pointer',
        backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.25)' : isActive ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.04)',
        border: isSelected ? '2px solid #38bdf8' : isActive ? '1.5px solid rgba(56, 189, 248, 0.7)' : '1px solid var(--border-color)',
        borderRadius: '6px',
        minWidth: '185px',
        transition: 'all 0.15s ease'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
          {clip.video?.title || 'Clip'}
        </span>
        <span style={{ fontSize: '9px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
          {offset.duration.toFixed(1)}s
        </span>
      </div>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '2px' }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleTrack();
          }}
          className="btn-toolbar"
          style={{ padding: '1px 5px', fontSize: '9px' }}
        >
          {isTrack2 ? '⬇️ V1' : '⬆️ V2'}
        </button>
        {isSlide && onEditSlide && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditSlide();
            }}
            className="btn-toolbar"
            style={{ padding: '1px 5px', fontSize: '9px' }}
          >
            ⚙️ Diapo
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{ background: 'transparent', border: 'none', color: '#fb7185', cursor: 'pointer', padding: '1px' }}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
