import React from 'react';
import {
  Layers,
  Film,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Scissors,
  Trash2
} from 'lucide-react';
import type { TimelineClip } from '../../utils/videoCompositor';

interface TimelineToolbarProps {
  timelineViewMode: 'spatial' | 'filmstrip' | 'compact';
  setTimelineViewMode: (mode: 'spatial' | 'filmstrip' | 'compact') => void;
  timelineScale: number;
  setTimelineScale: React.Dispatch<React.SetStateAction<number>>;
  canUndo: boolean;
  onUndo: () => void;
  canRedo: boolean;
  onRedo: () => void;
  canSplitAtPlayhead: boolean;
  onSplitAtPlayhead: () => void;
  selectedElement: { type: string; id: string } | null;
  selectedClipId: string | null;
  onDeleteSelected: () => void;
  detectedOverlaps: Array<{
    id: string;
    clip1: TimelineClip;
    clip2: TimelineClip;
    start: number;
    end: number;
    duration: number;
  }>;
  onSeek: (time: number) => void;
  setSelectedClipId: (id: string | null) => void;
  setSelectedElement: (el: any) => void;
}

export function TimelineToolbar({
  timelineViewMode,
  setTimelineViewMode,
  timelineScale,
  setTimelineScale,
  canUndo,
  onUndo,
  canRedo,
  onRedo,
  canSplitAtPlayhead,
  onSplitAtPlayhead,
  selectedElement,
  selectedClipId,
  onDeleteSelected,
  detectedOverlaps,
  onSeek,
  setSelectedClipId,
  setSelectedElement
}: TimelineToolbarProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* View Mode Toggle */}
        <div style={{
          display: 'flex',
          background: 'rgba(0,0,0,0.4)',
          borderRadius: '6px',
          padding: '2px',
          border: '1px solid var(--border-color)'
        }}>
          <button
            type="button"
            onClick={() => setTimelineViewMode('spatial')}
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              border: 'none',
              fontSize: '10px',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: timelineViewMode === 'spatial' ? 'var(--primary)' : 'transparent',
              color: timelineViewMode === 'spatial' ? '#ffffff' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease'
            }}
            title="Piste vidéo alignée à 100% avec la tête de lecture et toutes les pistes"
          >
            <Layers size={11} />
            <span>Piste Alignée</span>
          </button>
          <button
            type="button"
            onClick={() => setTimelineViewMode('filmstrip')}
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              border: 'none',
              fontSize: '10px',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: timelineViewMode === 'filmstrip' ? 'var(--primary)' : 'transparent',
              color: timelineViewMode === 'filmstrip' ? '#ffffff' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease'
            }}
            title="Vue détaillée avec toutes les vignettes dépliées côte à côte"
          >
            <Film size={11} />
            <span>Vignettes Dépliées</span>
          </button>
          <button
            type="button"
            onClick={() => setTimelineViewMode('compact')}
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              border: 'none',
              fontSize: '10px',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: timelineViewMode === 'compact' ? 'var(--primary)' : 'transparent',
              color: timelineViewMode === 'compact' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
            title="Vue compacte par cartes"
          >
            <span>Cartes Compactes</span>
          </button>
        </div>

        {/* Potard Horizontal d'Échelle de la Timeline */}
        <div className="timeline-potard-wrapper" title="Potard d'Échelle de la Timeline (Ctrl + Molette au-dessus de la frise pour zoomer)">
          <button
            type="button"
            className="timeline-potard-btn"
            onClick={() => setTimelineScale(prev => Math.max(1, Math.round((prev - 0.5) * 10) / 10))}
            disabled={timelineScale <= 1}
            title="Zoom Arrière (Échelle -)"
          >
            <ZoomOut size={12} />
          </button>
          <div className="timeline-potard-track">
            <input
              type="range"
              min="1"
              max="8"
              step="0.1"
              value={timelineScale}
              onChange={(e) => setTimelineScale(parseFloat(e.target.value))}
              className="timeline-potard-fader"
              title={`Échelle de frise : ${timelineScale.toFixed(1)}x`}
            />
          </div>
          <button
            type="button"
            className="timeline-potard-btn"
            onClick={() => setTimelineScale(prev => Math.min(8, Math.round((prev + 0.5) * 10) / 10))}
            disabled={timelineScale >= 8}
            title="Zoom Avant (Échelle +)"
          >
            <ZoomIn size={12} />
          </button>
          <span className="timeline-potard-value">{timelineScale.toFixed(1)}x</span>
        </div>

        {/* Undo / Redo */}
        <div style={{ display: 'flex', gap: '2px' }}>
          <button
            type="button"
            className="control-icon-btn"
            style={{ width: '26px', height: '26px' }}
            onClick={onUndo}
            disabled={!canUndo}
            title="Annuler (Ctrl+Z)"
          >
            <Undo2 size={12} />
          </button>
          <button
            type="button"
            className="control-icon-btn"
            style={{ width: '26px', height: '26px' }}
            onClick={onRedo}
            disabled={!canRedo}
            title="Rétablir (Ctrl+Y)"
          >
            <Redo2 size={12} />
          </button>
        </div>

        {/* Cut / Split */}
        <button
          type="button"
          className="btn-toolbar"
          style={{ fontSize: '11px', padding: '3px 8px' }}
          onClick={onSplitAtPlayhead}
          disabled={!canSplitAtPlayhead}
          title="Scinder le clip à la tête de lecture (S)"
        >
          <Scissors size={12} />
          <span>Scinder (S)</span>
        </button>

        {/* Delete */}
        <button
          type="button"
          className="btn-toolbar"
          style={{ fontSize: '11px', padding: '3px 8px', color: (selectedElement || selectedClipId) ? '#fb7185' : undefined }}
          onClick={onDeleteSelected}
          disabled={!selectedElement && !selectedClipId}
          title="Supprimer l'élément sélectionné (Suppr)"
        >
          <Trash2 size={12} />
          <span>Supprimer</span>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {detectedOverlaps.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '10px',
            color: '#38bdf8'
          }} title="Superposition détectée entre la Piste V1 et la Piste V2 (effet Picture-in-Picture automatique)">
            <span>📹 {detectedOverlaps.length} PiP actif{detectedOverlaps.length > 1 ? 's' : ''}</span>
            <button
              type="button"
              onClick={() => {
                const first = detectedOverlaps[0];
                if (first) {
                  onSeek(first.start);
                  setSelectedClipId(first.clip2.id);
                  setSelectedElement({ type: 'clip', id: first.clip2.id });
                }
              }}
              style={{ background: 'none', border: 'none', color: '#fff', textDecoration: 'underline', cursor: 'pointer', fontSize: '10px', padding: 0 }}
            >
              Aller à
            </button>
          </div>
        )}
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          Astuce : glissez les bords pour rogner • Ctrl+Molette pour zoomer
        </span>
      </div>
    </div>
  );
}
