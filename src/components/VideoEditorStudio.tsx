import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  getAllMedia,
  saveRecording, 
  deleteMedia,
  getAllProjects, 
  saveProject, 
  deleteProject, 
  type SavedVideo, 
  type SavedMedia,
  type SavedProject 
} from '../utils/db';
import { 
  type TimelineClip, 
  type TimelineTitle, 
  type TimelineZoom,
  type TimelineImage,
  type TimelineChapter,
  type ImagePositionPreset,
  type EditorProject, 
  type BackgroundMusicTrack,
  type TimelineVoiceover,
  AMBIENT_MUSIC_PRESETS,
  generateAmbientMusicBlob,
  calculateTotalDuration, 
  drawTitleOverlay,
  drawImageOverlay,
  drawFastForwardBadge,
  drawSlideClip,
  drawImageClip,
  type SlideContent,
  getActiveTimelineZoom,
  applyTimelineZoomTransform,
  formatYouTubeChapters
} from '../utils/videoCompositor';
import { resolveAccurateBlobDuration } from '../utils/subtitlesEngine';
import { 
  Film, Plus, Trash2, Play, Pause, 
  Download, Sparkles, Type, Layers, Check, X, Save, FolderOpen, 
  FileText, Upload, RefreshCw, Music, Volume2, VolumeX, Headphones, Mic,
  Scissors, FastForward, ZoomIn, Crosshair, Image as ImageIcon,
  ListTree, Bookmark, Copy, BookOpen, Maximize2, Minimize2
} from 'lucide-react';
import { importSingleFile } from '../utils/mediaImporter';
import { GifExportModal } from './GifExportModal';
import { DeviceFrameModal } from './DeviceFrameModal';
import { SubtitlesStudioModal } from './SubtitlesStudioModal';
import { VoiceGeneratorModal } from './VoiceGeneratorModal';
import { SilenceRemoverModal } from './SilenceRemoverModal';
import { TutorialMakerModal } from './TutorialMakerModal';
import type { SpeechSegment } from '../utils/audioSilenceDetector';

const PREVIEW_HEIGHTS = {
  compact: 260,
  standard: 380,
  large: 520
} as const;

type PreviewSize = keyof typeof PREVIEW_HEIGHTS;

interface SpatialBlockItem {
  id: string;
  startTime: number;
  duration: number;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  thumbnailUrl?: string;
}

interface SpatialTrackLaneProps {
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
  onUpdateTiming: (id: string, startTime: number, duration: number) => void;
  onSeek: (time: number) => void;
  onEdit?: (id: string) => void;
  onDelete: (id: string) => void;
  onAddQuick?: () => void;
}

function SpatialTrackLane({
  label,
  icon,
  labelColor,
  items,
  totalDuration,
  currentTime,
  emptyMessage,
  theme,
  onUpdateTiming,
  onSeek,
  onEdit,
  onDelete,
  onAddQuick
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
    } catch {}
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
      } catch {}
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
      <div style={{ width: '160px', minWidth: '160px', maxWidth: '160px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '8px', boxSizing: 'border-box' }}>
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
            +
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

          return (
            <div
              key={item.id}
              className={`timeline-spatial-block ${isDraggingThis ? 'is-dragging' : ''}`}
              style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
                minWidth: '55px',
                backgroundColor: safeTheme.bg,
                border: `1px solid ${safeTheme.border}`,
                color: safeTheme.text
              }}
              onPointerDown={(e) => handleStartDrag(e, item, 'move')}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onClick={(e) => {
                const target = e.target as HTMLElement | null;
                if (target && (target.closest('button') || target.closest('.timeline-block-actions') || target.closest('.timeline-mini-btn'))) {
                  return;
                }
                e.stopPropagation();
                onSeek(sTime);
              }}
              title={`Glisser le bloc pour déplacer (${sTime.toFixed(1)}s). Étirer les bords pour allonger/réduire.`}
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

              {/* Actions: Edit & Delete */}
              <div
                className="timeline-block-actions"
                style={{ position: 'relative', zIndex: 25, pointerEvents: 'auto' }}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                {onEdit && (
                  <button
                    type="button"
                    className="timeline-mini-btn"
                    title="Modifier les options"
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
                )}
                <button
                  type="button"
                  className="timeline-mini-btn"
                  style={{ color: '#fb7185' }}
                  title="Supprimer"
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                >
                  <X size={10} />
                </button>
              </div>

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

const SLIDE_COLOR_PRESETS = [
  { name: 'Nuit Bleutée', bg: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', text: '#ffffff', sub: '#94a3b8' },
  { name: 'Cyber Violet', bg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)', text: '#ffffff', sub: '#c4b5fd' },
  { name: 'Océan Cyan', bg: 'linear-gradient(135deg, #0f172a 0%, #0369a1 100%)', text: '#ffffff', sub: '#7dd3fc' },
  { name: 'Émeraude Sombre', bg: 'linear-gradient(135deg, #062419 0%, #065f46 100%)', text: '#ffffff', sub: '#6ee7b7' },
  { name: 'Ambre Chaud', bg: 'linear-gradient(135deg, #241402 0%, #78350f 100%)', text: '#ffffff', sub: '#fcd34d' },
  { name: 'Rouge Cinéma', bg: 'linear-gradient(135deg, #2a0808 0%, #881337 100%)', text: '#ffffff', sub: '#fda4af' },
  { name: 'Noir Pur', bg: '#09090b', text: '#ffffff', sub: '#a1a1aa' }
];

interface SlideEditorModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  initialForm: {
    title: string;
    subtitle: string;
    bgColor: string;
    textColor: string;
    subtextColor: string;
    fontSize: number;
    duration: number;
    align: 'center' | 'left' | 'right';
    bgImageUrl: string;
    transitionToNext: 'crossfade' | 'none' | 'fade-black' | 'slide';
  };
  initialPosition: 'start' | 'current' | 'end';
  libraryImages: SavedMedia[];
  onSave: (form: any, position: 'start' | 'current' | 'end') => void;
  onClose: () => void;
}

function SlideEditorModal({
  isOpen,
  mode,
  initialForm,
  initialPosition,
  libraryImages,
  onSave,
  onClose
}: SlideEditorModalProps) {
  const [form, setForm] = useState(initialForm);
  const [position, setPosition] = useState<'start' | 'current' | 'end'>(initialPosition);
  const miniCanvasRef = useRef<HTMLCanvasElement>(null);
  const bgImgElRef = useRef<HTMLImageElement | null>(null);

  // Pre-load background image if selected
  useEffect(() => {
    if (form.bgImageUrl) {
      const img = new Image();
      img.onload = () => {
        bgImgElRef.current = img;
        drawPreview();
      };
      img.src = form.bgImageUrl;
    } else {
      bgImgElRef.current = null;
      drawPreview();
    }
  }, [form.bgImageUrl]);

  const drawPreview = () => {
    const canvas = miniCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawSlideClip(ctx, {
      title: form.title,
      subtitle: form.subtitle,
      bgColor: form.bgColor,
      textColor: form.textColor,
      subtextColor: form.subtextColor,
      fontSize: form.fontSize,
      align: form.align,
      bgImageUrl: form.bgImageUrl,
      bgImageEl: bgImgElRef.current || undefined
    }, canvas.width, canvas.height);
  };

  useEffect(() => {
    drawPreview();
  }, [form]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1050 }}>
      <div
        className="glass-panel modal-content"
        style={{
          maxWidth: '680px',
          width: '94%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '18px',
          border: '1px solid rgba(139, 92, 246, 0.45)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.85), 0 0 35px rgba(139, 92, 246, 0.25)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ marginBottom: '12px' }}>
          <h3 className="modal-title" style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc' }}>
            <span>📑</span>
            <span>{mode === 'add' ? 'Ajouter une Diapositive Titre' : 'Modifier la Diapositive'}</span>
          </h3>
          <button className="close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Live Mini Preview Canvas */}
        <div style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16/9',
          maxHeight: '220px',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#000000',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '14px'
        }}>
          <canvas
            ref={miniCanvasRef}
            width={640}
            height={360}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
          <div style={{
            position: 'absolute',
            bottom: '6px',
            right: '8px',
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '9px',
            color: '#c4b5fd',
            fontFamily: 'monospace',
            fontWeight: 600
          }}>
            Aperçu Direct ({form.duration}s)
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Title & Subtitle Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>
                Titre principal
              </label>
              <input
                type="text"
                className="form-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="ex: Tutoriel Complet : OpenPeek Studio"
                style={{ width: '100%', fontSize: '13px', padding: '6px 10px', fontWeight: 600 }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>
                Sous-titre / Description (optionnel)
              </label>
              <input
                type="text"
                className="form-input"
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                placeholder="ex: Partie 1 : Introduction et prise en main"
                style={{ width: '100%', fontSize: '12px', padding: '5px 8px' }}
              />
            </div>
          </div>

          {/* Color Presets */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px', display: 'block' }}>
              Thème & Ambiance de couleur
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(85px, 1fr))', gap: '6px' }}>
              {SLIDE_COLOR_PRESETS.map((p) => {
                const isSelected = form.bgColor === p.bg;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setForm({
                      ...form,
                      bgColor: p.bg,
                      textColor: p.text,
                      subtextColor: p.sub
                    })}
                    style={{
                      padding: '6px 4px',
                      borderRadius: '5px',
                      background: p.bg,
                      border: isSelected ? '2px solid #8b5cf6' : '1px solid rgba(255,255,255,0.15)',
                      boxShadow: isSelected ? '0 0 10px rgba(139, 92, 246, 0.8)' : 'none',
                      color: p.text,
                      fontSize: '9px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Typography & Alignment Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            {/* Font Size */}
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>
                Taille Titre ({form.fontSize}px)
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[38, 48, 56, 68].map(sz => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setForm({ ...form, fontSize: sz })}
                    style={{
                      flex: 1,
                      padding: '4px 2px',
                      fontSize: '10px',
                      fontWeight: 600,
                      borderRadius: '4px',
                      backgroundColor: form.fontSize === sz ? 'rgba(139, 92, 246, 0.35)' : 'rgba(255,255,255,0.05)',
                      border: form.fontSize === sz ? '1px solid #8b5cf6' : '1px solid var(--border-color)',
                      color: form.fontSize === sz ? '#c4b5fd' : 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Alignment */}
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>
                Alignement
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['center', 'left', 'right'] as const).map(al => (
                  <button
                    key={al}
                    type="button"
                    onClick={() => setForm({ ...form, align: al })}
                    style={{
                      flex: 1,
                      padding: '4px 2px',
                      fontSize: '10px',
                      fontWeight: 600,
                      borderRadius: '4px',
                      backgroundColor: form.align === al ? 'rgba(139, 92, 246, 0.35)' : 'rgba(255,255,255,0.05)',
                      border: form.align === al ? '1px solid #8b5cf6' : '1px solid var(--border-color)',
                      color: form.align === al ? '#c4b5fd' : 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    {al === 'center' ? 'Centré' : al === 'left' ? 'Gauche' : 'Droite'}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>
                Durée (secondes)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                step={0.5}
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: parseFloat(e.target.value) || 4 })}
                className="form-input"
                style={{ width: '100%', fontSize: '11px', padding: '4px 6px' }}
              />
            </div>
          </div>

          {/* Transition & Optional Background Image */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>
                Transition vers le clip suivant
              </label>
              <select
                value={form.transitionToNext}
                onChange={(e) => setForm({ ...form, transitionToNext: e.target.value as any })}
                className="form-input"
                style={{ width: '100%', fontSize: '11px', padding: '4px 6px' }}
              >
                <option value="crossfade">Fondu Enchaîné (Crossfade)</option>
                <option value="fade-black">Fondu au Noir</option>
                <option value="slide">Glissement (Slide)</option>
                <option value="none">Coupe Franche (Cut)</option>
              </select>
            </div>

            {/* Background Image Picker from Library */}
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>
                Image d'arrière-plan (optionnelle)
              </label>
              <select
                value={form.bgImageUrl || ''}
                onChange={(e) => setForm({ ...form, bgImageUrl: e.target.value })}
                className="form-input"
                style={{ width: '100%', fontSize: '11px', padding: '4px 6px' }}
              >
                <option value="">Aucune (Dégradé uniquement)</option>
                {libraryImages.map((img) => (
                  <option key={img.id} value={img.thumbnail || (img.blob ? URL.createObjectURL(img.blob) : '')}>
                    {img.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Placement Position (only when adding a new slide) */}
          {mode === 'add' && (
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                Position d'insertion sur la piste vidéo
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { key: 'start', label: 'Au tout début (Intro)', desc: 'Avant la première vidéo' },
                  { key: 'current', label: 'Au curseur actuel', desc: 'À la position de lecture' },
                  { key: 'end', label: 'À la fin', desc: 'Après toutes les vidéos' }
                ].map((item) => {
                  const isSelected = position === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setPosition(item.key as any)}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: '6px',
                        backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255,255,255,0.03)',
                        border: isSelected ? '1px solid #8b5cf6' : '1px solid var(--border-color)',
                        color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 700, color: isSelected ? '#c4b5fd' : '#ffffff' }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                        {item.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions Bottom Bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button className="action-btn" type="button" onClick={onClose}>
              Annuler
            </button>
            <button
              className="btn-primary"
              type="button"
              onClick={() => onSave(form, position)}
              style={{
                backgroundColor: '#8b5cf6',
                borderColor: '#8b5cf6',
                padding: '6px 16px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Check size={14} />
              <span>{mode === 'add' ? 'Insérer la Diapositive' : 'Enregistrer les Modifications'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ImageSlidePickerModalProps {
  isOpen: boolean;
  libraryImages: SavedMedia[];
  initialPosition: 'start' | 'current' | 'end';
  onSelectImage: (media: SavedMedia, duration: number, position: 'start' | 'current' | 'end') => void;
  onImportNewImage: () => void;
  onClose: () => void;
}

function ImageSlidePickerModal({
  isOpen,
  libraryImages,
  initialPosition,
  onSelectImage,
  onImportNewImage,
  onClose
}: ImageSlidePickerModalProps) {
  const [selectedImageId, setSelectedImageId] = useState<string>(libraryImages[0]?.id || '');
  const [duration, setDuration] = useState<number>(5);
  const [position, setPosition] = useState<'start' | 'current' | 'end'>(initialPosition);

  useEffect(() => {
    if (libraryImages.length > 0 && !selectedImageId) {
      setSelectedImageId(libraryImages[0].id);
    }
  }, [libraryImages]);

  if (!isOpen) return null;

  const selectedMedia = libraryImages.find(img => img.id === selectedImageId);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1050 }}>
      <div
        className="glass-panel modal-content"
        style={{
          maxWidth: '560px',
          width: '92%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '18px',
          border: '1px solid rgba(16, 185, 129, 0.45)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.85), 0 0 35px rgba(16, 185, 129, 0.25)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ marginBottom: '12px' }}>
          <h3 className="modal-title" style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399' }}>
            <ImageIcon size={16} />
            <span>Insérer une Image sur la Piste Vidéo</span>
          </h3>
          <button className="close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Sélectionnez une image de votre bibliothèque ou importez-en une nouvelle :
            </span>
            <button
              type="button"
              className="btn-toolbar"
              onClick={onImportNewImage}
              style={{ fontSize: '10px', padding: '3px 8px', color: '#34d399', borderColor: '#10b981' }}
            >
              <Upload size={11} />
              <span>+ Importer</span>
            </button>
          </div>

          {/* Images Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
            gap: '8px',
            maxHeight: '200px',
            overflowY: 'auto',
            backgroundColor: 'rgba(0,0,0,0.3)',
            padding: '8px',
            borderRadius: '6px'
          }}>
            {libraryImages.map((img) => {
              const isSelected = img.id === selectedImageId;
              return (
                <div
                  key={img.id}
                  onClick={() => setSelectedImageId(img.id)}
                  style={{
                    position: 'relative',
                    aspectRatio: '16/9',
                    borderRadius: '5px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: isSelected ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                    boxShadow: isSelected ? '0 0 10px rgba(16, 185, 129, 0.7)' : 'none',
                    backgroundColor: '#050811'
                  }}
                >
                  <img
                    src={img.thumbnail || (img.blob ? URL.createObjectURL(img.blob) : '')}
                    alt={img.title}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    insetInline: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    padding: '2px 4px',
                    fontSize: '8px',
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {img.title}
                  </div>
                </div>
              );
            })}
            {libraryImages.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                Aucune image enregistrée. Cliquez sur "+ Importer" pour ajouter une image JPG ou PNG.
              </div>
            )}
          </div>

          {/* Duration Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Durée d'affichage à l'écran :
            </label>
            <input
              type="number"
              min={1}
              max={60}
              step={0.5}
              value={duration}
              onChange={(e) => setDuration(parseFloat(e.target.value) || 5)}
              className="form-input"
              style={{ width: '60px', fontSize: '11px', padding: '3px 6px' }}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>secondes</span>
          </div>

          {/* Position Selector */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
              Emplacement sur la piste vidéo
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { key: 'start', label: 'Au tout début (Intro)', desc: 'Avant la première vidéo' },
                { key: 'current', label: 'Au curseur actuel', desc: 'À la position de lecture' },
                { key: 'end', label: 'À la fin', desc: 'Après toutes les vidéos' }
              ].map((item) => {
                const isSelected = position === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setPosition(item.key as any)}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: '6px',
                      backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.03)',
                      border: isSelected ? '1px solid #10b981' : '1px solid var(--border-color)',
                      color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: isSelected ? '#6ee7b7' : '#ffffff' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                      {item.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions Bottom Bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button className="action-btn" type="button" onClick={onClose}>
              Annuler
            </button>
            <button
              className="btn-primary"
              type="button"
              disabled={!selectedMedia}
              onClick={() => {
                if (selectedMedia) {
                  onSelectImage(selectedMedia, duration, position);
                }
              }}
              style={{
                backgroundColor: '#10b981',
                borderColor: '#10b981',
                padding: '6px 16px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Check size={14} />
              <span>Insérer la Diapositive Image</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface VideoPickerModalProps {
  isOpen: boolean;
  libraryVideos: SavedVideo[];
  initialPosition?: 'start' | 'current' | 'end';
  onSelectVideo: (video: SavedVideo, position: 'start' | 'current' | 'end') => void;
  onImportNewVideo: () => void;
  onClose: () => void;
}

function VideoPickerModal({
  isOpen,
  libraryVideos,
  initialPosition = 'current',
  onSelectVideo,
  onImportNewVideo,
  onClose
}: VideoPickerModalProps) {
  const [selectedVideoId, setSelectedVideoId] = useState<string>(libraryVideos[0]?.id || '');
  const [insertPos, setInsertPos] = useState<'start' | 'current' | 'end'>(initialPosition);

  useEffect(() => {
    if (isOpen) {
      setInsertPos(initialPosition);
      if (libraryVideos.length > 0 && !selectedVideoId) {
        setSelectedVideoId(libraryVideos[0].id);
      }
    }
  }, [isOpen, initialPosition, libraryVideos]);

  if (!isOpen) return null;

  const formatDur = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleConfirm = () => {
    const v = libraryVideos.find(x => x.id === selectedVideoId) || libraryVideos[0];
    if (!v) {
      alert("Veuillez sélectionner une vidéo ou en importer une nouvelle.");
      return;
    }
    onSelectVideo(v, insertPos);
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={onClose}>
      <div
        className="glass-panel"
        style={{
          width: '540px',
          maxWidth: '92vw',
          padding: '18px',
          border: '1px solid rgba(6, 182, 212, 0.45)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.85), 0 0 35px rgba(6, 182, 212, 0.25)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ marginBottom: '12px' }}>
          <h3 className="modal-title" style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8' }}>
            <Film size={16} />
            <span>Insérer une Vidéo sur la Piste Principale</span>
          </h3>
          <button className="close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Sélectionnez une vidéo ou importez-en une depuis votre PC :
            </span>
            <button
              type="button"
              className="btn-toolbar"
              onClick={onImportNewVideo}
              style={{ fontSize: '10px', padding: '3px 8px', color: '#38bdf8', borderColor: '#06b6d4' }}
            >
              <Upload size={11} />
              <span>+ Importer depuis PC</span>
            </button>
          </div>

          {/* Videos Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '8px',
            maxHeight: '220px',
            overflowY: 'auto',
            backgroundColor: 'rgba(0,0,0,0.3)',
            padding: '8px',
            borderRadius: '6px'
          }}>
            {libraryVideos.map((v) => {
              const isSelected = v.id === selectedVideoId;
              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVideoId(v.id)}
                  style={{
                    position: 'relative',
                    aspectRatio: '16/9',
                    borderRadius: '5px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: isSelected ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                    boxShadow: isSelected ? '0 0 10px rgba(56, 189, 248, 0.7)' : 'none',
                    backgroundColor: '#050811'
                  }}
                >
                  {v.thumbnail ? (
                    <img
                      src={v.thumbnail}
                      alt={v.title}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                      <Film size={24} />
                    </div>
                  )}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    insetInline: 0,
                    backgroundColor: 'rgba(0,0,0,0.75)',
                    padding: '2px 4px',
                    fontSize: '8px',
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.title}</span>
                    <span style={{ fontFamily: 'monospace', color: '#38bdf8', fontSize: '8px', flexShrink: 0 }}>
                      {formatDur(v.duration || 0)}
                    </span>
                  </div>
                </div>
              );
            })}
            {libraryVideos.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
                Aucune vidéo enregistrée. Cliquez sur « + Importer depuis PC » ci-dessus.
              </div>
            )}
          </div>

          {/* Position Selector */}
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Emplacement d'insertion sur la piste vidéo
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {[
                { key: 'start', label: 'Au tout début (Intro)', desc: 'Avant la première vidéo' },
                { key: 'current', label: 'À la tête de lecture', desc: 'Position actuelle' },
                { key: 'end', label: 'À la fin', desc: 'Après toutes les vidéos' }
              ].map((pos) => (
                <button
                  key={pos.key}
                  type="button"
                  onClick={() => setInsertPos(pos.key as any)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '5px',
                    border: insertPos === pos.key ? '1.5px solid #38bdf8' : '1px solid var(--border-color)',
                    backgroundColor: insertPos === pos.key ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255,255,255,0.02)',
                    color: insertPos === pos.key ? '#ffffff' : 'var(--text-secondary)',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 600 }}>{pos.label}</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{pos.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
            <button type="button" className="action-btn" onClick={onClose}>
              Annuler
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleConfirm}
              style={{ backgroundColor: '#06b6d4', borderColor: '#06b6d4', color: '#000000', fontWeight: 700 }}
              disabled={libraryVideos.length === 0}
            >
              <Check size={14} />
              <span>Insérer la Vidéo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function formatTime(secs: number): string {
  const safe = typeof secs === 'number' && !isNaN(secs) && secs >= 0 ? secs : 0;
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function VideoEditorStudio() {
  const [previewSize, setPreviewSize] = useState<PreviewSize>(() => {
    const saved = localStorage.getItem('openpeek_editor_preview_size');
    return (saved === 'compact' || saved === 'standard' || saved === 'large') ? saved : 'standard';
  });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const [libraryVideos, setLibraryVideos] = useState<SavedVideo[]>([]);
  const [libraryImages, setLibraryImages] = useState<SavedMedia[]>([]);
  const [projectId, setProjectId] = useState<string>(() => `proj_${Date.now()}`);
  const [projectName, setProjectName] = useState<string>('Mon Projet de Montage');
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [isProjectListModalOpen, setIsProjectListModalOpen] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [gifModalVideo, setGifModalVideo] = useState<SavedVideo | null>(null);
  const [frameModalVideo, setFrameModalVideo] = useState<SavedVideo | null>(null);
  const [subtitlesModalVideo, setSubtitlesModalVideo] = useState<SavedVideo | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [silenceRemoverClip, setSilenceRemoverClip] = useState<TimelineClip | null>(null);
  const [silenceRemoverLibraryVideo, setSilenceRemoverLibraryVideo] = useState<SavedVideo | null>(null);

  // Chutier tab ('videos' | 'images' | 'audio')
  const [chutierTab, setChutierTab] = useState<'videos' | 'images' | 'audio'>('videos');
  const [customAudios, setCustomAudios] = useState<{ id: string; title: string; blob: Blob; url: string }[]>([]);
  const [previewingAudioId, setPreviewingAudioId] = useState<string | null>(null);
  const [generatingPresetId, setGeneratingPresetId] = useState<string | null>(null);

  // Export format preference
  const [exportFormat, setExportFormat] = useState<'mp4' | 'webm'>('mp4');

  const [project, setProject] = useState<EditorProject>({
    clips: [],
    titles: [],
    zooms: [],
    images: [],
    chapters: [],
    voiceovers: [],
    backgroundMusic: null
  });

  const [currentTime, setCurrentTime] = useState(0);
  const currentTimeRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef<boolean>(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportCurrentSec, setExportCurrentSec] = useState(0);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const abortExportRef = useRef<boolean>(false);

  // Title modal state
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  const [titleForm, setTitleForm] = useState<TimelineTitle>({
    id: '',
    text: 'Titre de la vidéo',
    subtitle: 'Sous-titre ou explication',
    startTime: 0,
    duration: 3,
    style: 'lowerthird',
    textColor: '#ffffff',
    bgColor: 'rgba(15, 23, 42, 0.85)',
    fontSize: 28
  });

  // Timeline Zoom modal state
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [zoomForm, setZoomForm] = useState<TimelineZoom>({
    id: '',
    startTime: 0,
    duration: 3,
    scale: 2.0,
    originX: 0.5,
    originY: 0.5,
    label: 'Zoom Focus'
  });

  // Image / Logo Overlay modal state
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageModalMode, setImageModalMode] = useState<'add' | 'edit'>('add');
  const [isPermanentOverlay, setIsPermanentOverlay] = useState(true);
  const [imageForm, setImageForm] = useState<TimelineImage>({
    id: '',
    name: 'Logo',
    dataUrl: '',
    startTime: 0,
    duration: 10,
    position: 'top-right',
    x: 0.85,
    y: 0.15,
    scale: 0.15,
    opacity: 1.0,
    hasShadow: true,
    borderRadius: 0
  });

  // YouTube Chapters modal state
  const [isChaptersModalOpen, setIsChaptersModalOpen] = useState(false);
  const [copiedChapters, setCopiedChapters] = useState(false);
  const [isTutorialMakerOpen, setIsTutorialMakerOpen] = useState(false);

  // Slide / Title Card modal state
  const [isSlideModalOpen, setIsSlideModalOpen] = useState(false);
  const [slideModalMode, setSlideModalMode] = useState<'add' | 'edit'>('add');
  const [editingSlideClipId, setEditingSlideClipId] = useState<string | null>(null);
  const [slideInsertPosition, setSlideInsertPosition] = useState<'start' | 'current' | 'end'>('start');
  const [slideForm, setSlideForm] = useState<{
    title: string;
    subtitle: string;
    bgColor: string;
    textColor: string;
    subtextColor: string;
    fontSize: number;
    duration: number;
    align: 'center' | 'left' | 'right';
    bgImageUrl: string;
    transitionToNext: 'crossfade' | 'none' | 'fade-black' | 'slide';
  }>({
    title: 'Titre de la Présentation',
    subtitle: 'Chapitre 1 : Introduction',
    bgColor: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
    textColor: '#ffffff',
    subtextColor: '#94a3b8',
    fontSize: 52,
    duration: 4,
    align: 'center',
    bgImageUrl: '',
    transitionToNext: 'crossfade'
  });

  // Image Slide Picker Modal state
  const [isImageSlidePickerOpen, setIsImageSlidePickerOpen] = useState(false);
  const [imageSlideInsertPosition, setImageSlideInsertPosition] = useState<'start' | 'current' | 'end'>('end');

  // Video Picker Modal state
  const [isVideoPickerOpen, setIsVideoPickerOpen] = useState(false);
  const [videoInsertPosition, setVideoInsertPosition] = useState<'start' | 'current' | 'end'>('current');

  // Timeline View Mode: 'spatial' (piste alignée 1:1 avec la tête de lecture), 'filmstrip' (vignettes vidéo) or 'compact'
  const [timelineViewMode, setTimelineViewMode] = useState<'spatial' | 'filmstrip' | 'compact'>('spatial');
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const timelineRulerRef = useRef<HTMLDivElement>(null);
  const videoLaneRef = useRef<HTMLDivElement>(null);
  const isScrubbingRulerRef = useRef<boolean>(false);
  const [clipFilmstrips, setClipFilmstrips] = useState<Record<string, { id: string; clipTime: number; timelineTime: number; formattedTime: string; dataUrl: string }[]>>({});
  const [generatingFilmstrips, setGeneratingFilmstrips] = useState<Record<string, boolean>>({});

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const imagesCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const animationFrameRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const audioPreviewElRef = useRef<HTMLAudioElement | null>(null);
  const bgMusicAudioRef = useRef<HTMLAudioElement | null>(null);
  const exportContainerRef = useRef<HTMLDivElement | null>(null);

  // Voiceover (Voix Off en direct) state & refs
  const [isRecordingVoiceover, setIsRecordingVoiceover] = useState(false);
  const isRecordingVoiceoverRef = useRef(false);
  const voiceoverRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceoverStreamRef = useRef<MediaStream | null>(null);
  const voiceoverStartPosRef = useRef<number>(0);
  const voiceoverChunksRef = useRef<Blob[]>([]);
  const voiceoverAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Edit Voiceover modal state
  const [isVoiceoverModalOpen, setIsVoiceoverModalOpen] = useState(false);
  const [voiceoverForm, setVoiceoverForm] = useState<{
    id: string;
    label: string;
    startTime: number;
    duration: number;
    volume: number;
    url?: string;
  } | null>(null);

  // Load recordings, images & saved projects from IndexedDB
  const loadLibraryAndProjects = async () => {
    const list = await getAllMedia();
    setLibraryVideos(list.filter(m => !m.type || m.type === 'video'));
    setLibraryImages(list.filter(m => m.type === 'image'));
    const projs = await getAllProjects();
    setSavedProjects(projs);
  };

  useEffect(() => {
    loadLibraryAndProjects();
  }, []);

  // Pre-load video DOM elements and image assets for clips in the timeline
  useEffect(() => {
    (project.clips || []).forEach((clip) => {
      if (clip.type === 'slide') {
        if (clip.slideContent?.bgImageUrl) {
          const cacheKey = `slide_bg_${clip.id}`;
          if (!imagesCacheRef.current.has(cacheKey)) {
            const img = new Image();
            img.src = clip.slideContent.bgImageUrl;
            img.onload = () => {
              if (clip.slideContent) clip.slideContent.bgImageEl = img;
              if (!isPlayingRef.current) renderStaticPreviewAt(currentTimeRef.current);
            };
            imagesCacheRef.current.set(cacheKey, img);
          } else {
            const img = imagesCacheRef.current.get(cacheKey);
            if (img && clip.slideContent) clip.slideContent.bgImageEl = img;
          }
        }
        return;
      }

      if (clip.type === 'image') {
        if (!imagesCacheRef.current.has(clip.id)) {
          const img = new Image();
          if (clip.video?.thumbnail) {
            img.src = clip.video.thumbnail;
          } else if (clip.video?.blob && clip.video.blob.size > 0) {
            img.src = URL.createObjectURL(clip.video.blob);
          }
          img.onload = () => {
            if (!isPlayingRef.current) renderStaticPreviewAt(currentTimeRef.current);
          };
          imagesCacheRef.current.set(clip.id, img);
        }
        return;
      }

      // Normal video element - preload & attach render listeners
      if (!videoElementsRef.current.has(clip.id)) {
        const v = document.createElement('video');
        v.muted = true;
        v.playsInline = true;
        v.preload = 'auto';
        if (clip.video?.blob && clip.video.blob.size > 0) {
          v.src = URL.createObjectURL(clip.video.blob);
        }
        v.onloadeddata = () => {
          if (!isPlayingRef.current) renderStaticPreviewAt(currentTimeRef.current);
        };
        v.oncanplay = () => {
          if (!isPlayingRef.current) renderStaticPreviewAt(currentTimeRef.current);
        };
        v.load();
        if (exportContainerRef.current) {
          exportContainerRef.current.appendChild(v);
        }
        videoElementsRef.current.set(clip.id, v);
      }

      // Also pre-cache thumbnail as instant fallback so canvas never shows black
      if (clip.video?.thumbnail && !imagesCacheRef.current.has(`thumb_${clip.id}`)) {
        const tImg = new Image();
        tImg.onload = () => {
          if (!isPlayingRef.current) renderStaticPreviewAt(currentTimeRef.current);
        };
        tImg.src = clip.video.thumbnail;
        imagesCacheRef.current.set(`thumb_${clip.id}`, tImg);
      }
    });

    // Cleanup unused video elements
    const activeVideoIds = new Set((project.clips || []).filter(c => !c.type || c.type === 'video').map((c) => c.id));
    for (const [id, el] of videoElementsRef.current.entries()) {
      if (!activeVideoIds.has(id)) {
        if (el.parentNode) el.parentNode.removeChild(el);
        URL.revokeObjectURL(el.src);
        videoElementsRef.current.delete(id);
      }
    }
  }, [project.clips]);

  // Memoized cumulative start/end timeline offsets for each clip
  const clipTimelineOffsets = useMemo(() => {
    const offsets = new Map<string, { start: number; end: number; duration: number }>();
    let currentOffset = 0;
    const clips = project.clips || [];
    for (let i = 0; i < clips.length; i++) {
      const c = clips[i];
      const speed = c.playbackSpeed && c.playbackSpeed > 0 ? c.playbackSpeed : 1.0;
      const duration = Math.max(0.1, ((c.endTrim ?? 10) - (c.startTrim ?? 0)) / speed);
      offsets.set(c.id, { start: currentOffset, end: currentOffset + duration, duration });
      currentOffset += duration;
      if (i < clips.length - 1 && c.transitionToNext !== 'none') {
        const transDur = Math.min(c.transitionDuration || 1, duration / 2);
        currentOffset -= transDur;
      }
    }
    return offsets;
  }, [project.clips]);

  // Generate visual filmstrip thumbnails when clips are added or modified
  useEffect(() => {
    if (!project.clips || project.clips.length === 0) return;

    let isCancelled = false;

    (project.clips || []).forEach(async (clip) => {
      const offset = clipTimelineOffsets.get(clip.id);
      if (!offset) return;

      const cacheKey = `${clip.id}_${clip.startTrim}_${clip.endTrim}_${clip.playbackSpeed || 1}`;
      if (clipFilmstrips[cacheKey] || generatingFilmstrips[clip.id]) return;

      setGeneratingFilmstrips(prev => ({ ...prev, [clip.id]: true }));

      try {
        const frameCount = 5;
        const frames: { id: string; clipTime: number; timelineTime: number; formattedTime: string; dataUrl: string }[] = [];
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 160;
        tempCanvas.height = 90;
        const ctx = tempCanvas.getContext('2d');
        const clipDur = Math.max(0.1, clip.endTrim - clip.startTrim);

        if (clip.type === 'slide' && clip.slideContent) {
          if (ctx) {
            drawSlideClip(ctx, clip.slideContent, 160, 90);
            const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.85);
            for (let i = 0; i < frameCount; i++) {
              const ratio = i / (frameCount - 1);
              const targetClipTime = clip.startTrim + clipDur * ratio;
              const targetTimelineTime = offset.start + (offset.duration * ratio);
              frames.push({
                id: `${clip.id}_f${i}`,
                clipTime: targetClipTime,
                timelineTime: targetTimelineTime,
                formattedTime: formatTime(targetTimelineTime),
                dataUrl
              });
            }
          }
          if (!isCancelled && frames.length > 0) {
            setClipFilmstrips(prev => ({
              ...prev,
              [cacheKey]: frames,
              [clip.id]: frames
            }));
          }
          return;
        }

        if (clip.type === 'image') {
          let cachedImg = imagesCacheRef.current.get(clip.id);
          if (!cachedImg && (clip.video?.thumbnail || (clip.video?.blob && clip.video.blob.size > 0))) {
            cachedImg = new Image();
            cachedImg.src = clip.video?.thumbnail || (clip.video?.blob ? URL.createObjectURL(clip.video.blob) : '');
            await new Promise((res) => { cachedImg!.onload = res; cachedImg!.onerror = res; });
            imagesCacheRef.current.set(clip.id, cachedImg);
          }
          if (ctx && cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
            drawImageClip(ctx, cachedImg, 160, 90);
            const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.85);
            for (let i = 0; i < frameCount; i++) {
              const ratio = i / (frameCount - 1);
              const targetClipTime = clip.startTrim + clipDur * ratio;
              const targetTimelineTime = offset.start + (offset.duration * ratio);
              frames.push({
                id: `${clip.id}_f${i}`,
                clipTime: targetClipTime,
                timelineTime: targetTimelineTime,
                formattedTime: formatTime(targetTimelineTime),
                dataUrl
              });
            }
          }
          if (!isCancelled && frames.length > 0) {
            setClipFilmstrips(prev => ({
              ...prev,
              [cacheKey]: frames,
              [clip.id]: frames
            }));
          }
          return;
        }

        if (!clip.video?.blob || clip.video.blob.size === 0) {
          return;
        }

        const blobUrl = URL.createObjectURL(clip.video.blob);
        const tempVideo = document.createElement('video');
        tempVideo.src = blobUrl;
        tempVideo.preload = 'auto';
        tempVideo.muted = true;
        tempVideo.playsInline = true;

        await new Promise<void>((resolve) => {
          tempVideo.onloadeddata = () => resolve();
          tempVideo.onerror = () => resolve();
          setTimeout(() => resolve(), 1200);
        });

        for (let i = 0; i < frameCount; i++) {
          if (isCancelled) break;
          const ratio = i / (frameCount - 1);
          const targetClipTime = clip.startTrim + clipDur * ratio;
          const targetTimelineTime = offset.start + (offset.duration * ratio);

          await new Promise<void>((resolve) => {
            const onSeeked = () => {
              tempVideo.removeEventListener('seeked', onSeeked);
              resolve();
            };
            tempVideo.addEventListener('seeked', onSeeked);
            tempVideo.currentTime = Math.max(0, Math.min(tempVideo.duration || 999, targetClipTime));
            setTimeout(() => {
              tempVideo.removeEventListener('seeked', onSeeked);
              resolve();
            }, 350);
          });

          if (ctx) {
            ctx.drawImage(tempVideo, 0, 0, 160, 90);
            frames.push({
              id: `${clip.id}_f${i}`,
              clipTime: targetClipTime,
              timelineTime: targetTimelineTime,
              formattedTime: formatTime(targetTimelineTime),
              dataUrl: tempCanvas.toDataURL('image/jpeg', 0.75)
            });
          }
        }

        URL.revokeObjectURL(blobUrl);

        if (!isCancelled && frames.length > 0) {
          setClipFilmstrips(prev => ({
            ...prev,
            [cacheKey]: frames,
            [clip.id]: frames
          }));
        }
      } catch (err) {
        console.error('Filmstrip extraction error:', err);
      } finally {
        if (!isCancelled) {
          setGeneratingFilmstrips(prev => ({ ...prev, [clip.id]: false }));
        }
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [project.clips, clipTimelineOffsets]);

  // Quick visual placement handlers from filmstrip thumbnails
  const openAddTitleAtTime = (time: number) => {
    handleSeek(time);
    setTitleForm({
      id: '',
      text: 'Nouveau Titre',
      subtitle: '',
      startTime: Math.round(time * 10) / 10,
      duration: 3,
      style: 'lowerthird',
      textColor: '#ffffff',
      bgColor: 'rgba(15, 23, 42, 0.85)',
      fontSize: 28
    });
    setIsTitleModalOpen(true);
  };

  const openAddZoomAtTime = (time: number) => {
    handleSeek(time);
    setZoomForm({
      id: '',
      startTime: Math.round(time * 10) / 10,
      duration: 3,
      scale: 2.0,
      originX: 0.5,
      originY: 0.5,
      label: 'Zoom Focus'
    });
    setIsZoomModalOpen(true);
  };

  const openAddImageAtTime = async (time: number) => {
    handleSeek(time);
    if (libraryImages.length > 0) {
      const media = libraryImages[0];
      let dataUrl = media.thumbnail || '';
      if (media.blob) {
        try {
          dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(media.blob);
          });
        } catch (e) {
          dataUrl = media.thumbnail || '';
        }
      }

      const defaultDuration = 5;
      setImageForm({
        id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: media.title || 'Logo',
        dataUrl,
        startTime: Math.round(time * 10) / 10,
        duration: defaultDuration,
        position: 'top-right',
        x: 0.85,
        y: 0.15,
        scale: 0.15,
        opacity: 1.0,
        hasShadow: true,
        borderRadius: 0
      });
      setIsPermanentOverlay(false);
      setImageModalMode('add');
      setIsImageModalOpen(true);
    } else {
      setChutierTab('images');
      imageFileInputRef.current?.click();
    }
  };

  const openAddChapterAtTime = (time: number) => {
    handleSeek(time);
    const roundedTime = Math.round(time * 10) / 10;
    const newChapter: TimelineChapter = {
      id: `chap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      time: roundedTime,
      title: `Chapitre ${(project.chapters || []).length + 1}`
    };
    setProject(prev => {
      const existing = prev.chapters || [];
      const updated = [...existing, newChapter].sort((a, b) => a.time - b.time);
      return { ...prev, chapters: updated };
    });
  };

  // Pre-load HTMLImageElement cache for active timeline images
  useEffect(() => {
    if (!project.images) return;
    (project.images || []).forEach((img) => {
      let cached = imagesCacheRef.current.get(img.id);
      if ((!cached || cached.src !== img.dataUrl) && img.dataUrl) {
        const imageEl = new Image();
        imageEl.onload = () => {
          if (!isPlayingRef.current) {
            renderStaticPreviewAt(currentTimeRef.current);
          }
        };
        imageEl.src = img.dataUrl;
        imagesCacheRef.current.set(img.id, imageEl);
      }
    });

    const activeIds = new Set((project.images || []).map(i => i.id));
    for (const [id] of imagesCacheRef.current.entries()) {
      if (!activeIds.has(id)) {
        imagesCacheRef.current.delete(id);
      }
    }
  }, [project.images]);

  // Sync background music audio element with project
  useEffect(() => {
    if (project.backgroundMusic && project.backgroundMusic.blob) {
      if (!bgMusicAudioRef.current) {
        bgMusicAudioRef.current = document.createElement('audio');
        if (exportContainerRef.current) {
          exportContainerRef.current.appendChild(bgMusicAudioRef.current);
        }
      }
      const audioEl = bgMusicAudioRef.current;
      const url = URL.createObjectURL(project.backgroundMusic.blob);
      audioEl.src = url;
      audioEl.loop = project.backgroundMusic.loop !== false;
      audioEl.volume = project.backgroundMusic.volume ?? 0.15;

      return () => {
        audioEl.pause();
        URL.revokeObjectURL(url);
      };
    } else {
      if (bgMusicAudioRef.current) {
        bgMusicAudioRef.current.pause();
        bgMusicAudioRef.current.src = '';
      }
    }
  }, [project.backgroundMusic?.id, project.backgroundMusic?.blob]);

  // Sync background music volume
  useEffect(() => {
    if (bgMusicAudioRef.current && project.backgroundMusic) {
      bgMusicAudioRef.current.volume = Math.max(0, Math.min(1, project.backgroundMusic.volume ?? 0.15));
    }
  }, [project.backgroundMusic?.volume]);

  // Sync voiceover audio elements with project
  useEffect(() => {
    const activeVoiceoverIds = new Set((project.voiceovers || []).map(v => v.id));
    for (const vo of (project.voiceovers || [])) {
      if (!vo.blob || vo.blob.size === 0) continue;
      if (!voiceoverAudiosRef.current.has(vo.id)) {
        const audio = document.createElement('audio');
        audio.preload = 'auto';
        audio.src = URL.createObjectURL(vo.blob);
        audio.volume = vo.volume ?? 1.0;
        if (exportContainerRef.current) {
          exportContainerRef.current.appendChild(audio);
        }
        voiceoverAudiosRef.current.set(vo.id, audio);
      } else {
        const audio = voiceoverAudiosRef.current.get(vo.id);
        if (audio) {
          audio.volume = vo.volume ?? 1.0;
        }
      }
    }
    for (const [id, audio] of voiceoverAudiosRef.current.entries()) {
      if (!activeVoiceoverIds.has(id)) {
        audio.pause();
        if (audio.parentNode) audio.parentNode.removeChild(audio);
        URL.revokeObjectURL(audio.src);
        voiceoverAudiosRef.current.delete(id);
      }
    }
  }, [project.voiceovers]);

  const totalDuration = calculateTotalDuration(project);
  const safeDur = Math.max(0.1, totalDuration || 1);

  // --- Project Persistence Functions ---

  // 1. Save current project to IndexedDB
  const handleSaveProject = async () => {
    try {
      const serializableClips = project.clips.map(c => ({
        id: c.id,
        videoId: c.video.id,
        videoTitle: c.video.title,
        startTrim: c.startTrim,
        endTrim: c.endTrim,
        transitionToNext: c.transitionToNext,
        transitionDuration: c.transitionDuration,
        playbackSpeed: c.playbackSpeed || 1.0,
        type: c.type || 'video',
        slideContent: c.slideContent,
        imageThumbnail: c.type === 'image' ? (c.video.thumbnail || '') : undefined
      }));

      const projectData = {
        clips: serializableClips,
        titles: project.titles,
        zooms: project.zooms || [],
        images: project.images || [],
        chapters: project.chapters || [],
        voiceovers: (project.voiceovers || []).map(v => ({
          id: v.id,
          startTime: v.startTime,
          duration: v.duration,
          volume: v.volume,
          label: v.label,
          dataUrl: v.dataUrl
        })),
        backgroundMusic: project.backgroundMusic ? {
          id: project.backgroundMusic.id,
          title: project.backgroundMusic.title,
          volume: project.backgroundMusic.volume,
          loop: project.backgroundMusic.loop,
          isPreset: project.backgroundMusic.isPreset
        } : null
      };

      const record: SavedProject = {
        id: projectId,
        title: projectName.trim() || 'Sans titre',
        date: new Date().toISOString(),
        data: JSON.stringify(projectData),
        clipCount: project.clips.length,
        totalDuration: Math.round(totalDuration)
      };

      await saveProject(record);
      setSaveSuccessMsg("Projet enregistré !");
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      loadLibraryAndProjects();
    } catch (e) {
      alert("Erreur lors de l'enregistrement du projet.");
    }
  };

  // 2. Load project from IndexedDB
  const handleLoadProject = async (saved: SavedProject) => {
    try {
      const parsed = JSON.parse(saved.data);
      const loadedClips: TimelineClip[] = [];

      for (const item of parsed.clips) {
        if (item.type === 'slide') {
          loadedClips.push({
            id: item.id || `clip_${Date.now()}_${Math.random()}`,
            type: 'slide',
            slideContent: item.slideContent,
            video: {
              id: item.videoId || `slide_${Date.now()}`,
              title: item.videoTitle || item.slideContent?.title || 'Diapositive Titre',
              blob: new Blob([], { type: 'video/mp4' }),
              thumbnail: '',
              duration: (item.endTrim || 4) - (item.startTrim || 0),
              size: 0,
              date: new Date().toISOString()
            },
            startTrim: item.startTrim || 0,
            endTrim: item.endTrim || 4,
            transitionToNext: item.transitionToNext || 'crossfade',
            transitionDuration: item.transitionDuration || 1.0,
            playbackSpeed: item.playbackSpeed || 1.0
          });
        } else if (item.type === 'image') {
          const matchingImg = libraryImages.find(img => img.id === item.videoId || img.title === item.videoTitle);
          loadedClips.push({
            id: item.id || `clip_${Date.now()}_${Math.random()}`,
            type: 'image',
            video: {
              id: item.videoId || (matchingImg ? matchingImg.id : `img_${Date.now()}`),
              title: item.videoTitle || (matchingImg ? matchingImg.title : 'Image Diapo'),
              blob: matchingImg?.blob || new Blob([], { type: 'image/png' }),
              thumbnail: matchingImg?.thumbnail || item.imageThumbnail || '',
              duration: (item.endTrim || 5) - (item.startTrim || 0),
              size: matchingImg?.size || 0,
              date: new Date().toISOString()
            },
            startTrim: item.startTrim || 0,
            endTrim: item.endTrim || 5,
            transitionToNext: item.transitionToNext || 'crossfade',
            transitionDuration: item.transitionDuration || 1.0,
            playbackSpeed: item.playbackSpeed || 1.0
          });
        } else {
          const matchingVideo = libraryVideos.find(v => v.id === item.videoId || v.title === item.videoTitle);
          if (matchingVideo) {
            loadedClips.push({
              id: item.id || `clip_${Date.now()}_${Math.random()}`,
              type: 'video',
              video: matchingVideo,
              startTrim: item.startTrim || 0,
              endTrim: item.endTrim || matchingVideo.duration || 10,
              transitionToNext: item.transitionToNext || 'crossfade',
              transitionDuration: item.transitionDuration || 1.0,
              playbackSpeed: item.playbackSpeed || 1.0
            });
          }
        }
      }

      let loadedBgMusic: BackgroundMusicTrack | null = null;
      if (parsed.backgroundMusic) {
        if (parsed.backgroundMusic.isPreset) {
          const blob = await generateAmbientMusicBlob(parsed.backgroundMusic.id);
          loadedBgMusic = {
            id: parsed.backgroundMusic.id,
            title: parsed.backgroundMusic.title,
            blob,
            volume: parsed.backgroundMusic.volume ?? 0.15,
            loop: parsed.backgroundMusic.loop !== false,
            isPreset: true
          };
        }
      }

      const loadedVoiceovers: TimelineVoiceover[] = [];
      if (parsed.voiceovers && Array.isArray(parsed.voiceovers)) {
        for (const v of parsed.voiceovers) {
          let blob: Blob = new Blob([]);
          if (v.dataUrl) {
            try {
              const res = await fetch(v.dataUrl);
              blob = await res.blob();
            } catch {}
          }
          loadedVoiceovers.push({
            id: v.id,
            startTime: v.startTime,
            duration: v.duration,
            volume: v.volume ?? 1.0,
            label: v.label,
            dataUrl: v.dataUrl,
            blob
          });
        }
      }

      setProjectId(saved.id);
      setProjectName(saved.title);
      setProject({
        clips: loadedClips,
        titles: parsed.titles || [],
        zooms: parsed.zooms || [],
        images: parsed.images || [],
        chapters: parsed.chapters || [],
        voiceovers: loadedVoiceovers,
        backgroundMusic: loadedBgMusic
      });

      setCurrentTime(0);
      setIsProjectListModalOpen(false);
      setSaveSuccessMsg(`Projet "${saved.title}" chargé !`);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (e) {
      alert("Impossible de charger ce projet.");
    }
  };

  // 3. Delete a saved project
  const handleDeleteSavedProject = async (id: string) => {
    if (confirm("Voulez-vous supprimer ce projet sauvegardé ?")) {
      await deleteProject(id);
      loadLibraryAndProjects();
    }
  };

  // 4. Reset to New Fresh Project
  const handleNewProject = () => {
    if (project.clips.length > 0 && !confirm("Créer un nouveau projet effacera la timeline actuelle. Continuer ?")) {
      return;
    }
    setProjectId(`proj_${Date.now()}`);
    setProjectName('Nouveau Projet');
    setProject({ clips: [], titles: [], zooms: [], images: [], chapters: [], voiceovers: [], backgroundMusic: null });
    setCurrentTime(0);
    isPlayingRef.current = false;
    setIsPlaying(false);
  };

  // 5. Export .captproj JSON File
  const handleExportProjectFile = () => {
    const serializableClips = project.clips.map(c => ({
      id: c.id,
      videoId: c.video.id,
      videoTitle: c.video.title,
      startTrim: c.startTrim,
      endTrim: c.endTrim,
      transitionToNext: c.transitionToNext,
      transitionDuration: c.transitionDuration,
      playbackSpeed: c.playbackSpeed || 1.0,
      type: c.type || 'video',
      slideContent: c.slideContent,
      imageThumbnail: c.type === 'image' ? (c.video.thumbnail || '') : undefined
    }));

    const exportObj = {
      version: 1,
      appName: 'OpenPeek Studio',
      projectId,
      projectName,
      date: new Date().toISOString(),
      clips: serializableClips,
      titles: project.titles,
      zooms: project.zooms || [],
      images: project.images || [],
      chapters: project.chapters || [],
      voiceovers: (project.voiceovers || []).map(v => ({
        id: v.id,
        startTime: v.startTime,
        duration: v.duration,
        volume: v.volume,
        label: v.label,
        dataUrl: v.dataUrl
      })),
      backgroundMusic: project.backgroundMusic ? {
        id: project.backgroundMusic.id,
        title: project.backgroundMusic.title,
        volume: project.backgroundMusic.volume,
        loop: project.backgroundMusic.loop,
        isPreset: project.backgroundMusic.isPreset
      } : null
    };

    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const clean = projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `${clean}.captproj`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 6. Import .captproj JSON File
  const handleImportProjectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const loadedClips: TimelineClip[] = [];

        for (const item of (parsed.clips || [])) {
          if (item.type === 'slide') {
            loadedClips.push({
              id: item.id || `clip_${Date.now()}_${Math.random()}`,
              type: 'slide',
              slideContent: item.slideContent,
              video: {
                id: item.videoId || `slide_${Date.now()}`,
                title: item.videoTitle || item.slideContent?.title || 'Diapositive Titre',
                blob: new Blob([], { type: 'video/mp4' }),
                thumbnail: '',
                duration: (item.endTrim || 4) - (item.startTrim || 0),
                size: 0,
                date: new Date().toISOString()
              },
              startTrim: item.startTrim || 0,
              endTrim: item.endTrim || 4,
              transitionToNext: item.transitionToNext || 'crossfade',
              transitionDuration: item.transitionDuration || 1.0,
              playbackSpeed: item.playbackSpeed || 1.0
            });
          } else if (item.type === 'image') {
            const matchingImg = libraryImages.find(img => img.id === item.videoId || img.title === item.videoTitle);
            loadedClips.push({
              id: item.id || `clip_${Date.now()}_${Math.random()}`,
              type: 'image',
              video: {
                id: item.videoId || (matchingImg ? matchingImg.id : `img_${Date.now()}`),
                title: item.videoTitle || (matchingImg ? matchingImg.title : 'Image Diapo'),
                blob: matchingImg?.blob || new Blob([], { type: 'image/png' }),
                thumbnail: matchingImg?.thumbnail || item.imageThumbnail || '',
                duration: (item.endTrim || 5) - (item.startTrim || 0),
                size: matchingImg?.size || 0,
                date: new Date().toISOString()
              },
              startTrim: item.startTrim || 0,
              endTrim: item.endTrim || 5,
              transitionToNext: item.transitionToNext || 'crossfade',
              transitionDuration: item.transitionDuration || 1.0,
              playbackSpeed: item.playbackSpeed || 1.0
            });
          } else {
            const matchingVideo = libraryVideos.find(v => v.id === item.videoId || v.title === item.videoTitle);
            if (matchingVideo) {
              loadedClips.push({
                id: item.id || `clip_${Date.now()}_${Math.random()}`,
                type: 'video',
                video: matchingVideo,
                startTrim: item.startTrim || 0,
                endTrim: item.endTrim || matchingVideo.duration || 10,
                transitionToNext: item.transitionToNext || 'crossfade',
                transitionDuration: item.transitionDuration || 1.0,
                playbackSpeed: item.playbackSpeed || 1.0
              });
            }
          }
        }

        let loadedBgMusic: BackgroundMusicTrack | null = null;
        if (parsed.backgroundMusic?.isPreset) {
          const blob = await generateAmbientMusicBlob(parsed.backgroundMusic.id);
          loadedBgMusic = {
            id: parsed.backgroundMusic.id,
            title: parsed.backgroundMusic.title,
            blob,
            volume: parsed.backgroundMusic.volume ?? 0.15,
            loop: parsed.backgroundMusic.loop !== false,
            isPreset: true
          };
        }

        const loadedVoiceovers: TimelineVoiceover[] = [];
        if (parsed.voiceovers && Array.isArray(parsed.voiceovers)) {
          for (const v of parsed.voiceovers) {
            let blob: Blob = new Blob([]);
            if (v.dataUrl) {
              try {
                const res = await fetch(v.dataUrl);
                blob = await res.blob();
              } catch {}
            }
            loadedVoiceovers.push({
              id: v.id,
              startTime: v.startTime,
              duration: v.duration,
              volume: v.volume ?? 1.0,
              label: v.label,
              dataUrl: v.dataUrl,
              blob
            });
          }
        }

        setProjectId(parsed.projectId || `proj_${Date.now()}`);
        setProjectName(parsed.projectName || 'Projet Importé');
        setProject({
          clips: loadedClips,
          titles: parsed.titles || [],
          zooms: parsed.zooms || [],
          images: parsed.images || [],
          chapters: parsed.chapters || [],
          voiceovers: loadedVoiceovers,
          backgroundMusic: loadedBgMusic
        });

        setCurrentTime(0);
        setSaveSuccessMsg(`Fichier ${file.name} importé !`);
        setTimeout(() => setSaveSuccessMsg(null), 3000);
      } catch (err) {
        alert("Fichier projet corrompu ou illisible.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // --- Background Music Handlers ---

  const handleSelectPresetMusic = async (presetId: string) => {
    const preset = AMBIENT_MUSIC_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    setGeneratingPresetId(presetId);
    try {
      const blob = await generateAmbientMusicBlob(presetId);
      setProject(prev => ({
        ...prev,
        backgroundMusic: {
          id: preset.id,
          title: preset.title,
          blob,
          volume: prev.backgroundMusic?.volume ?? 0.15,
          loop: true,
          isPreset: true
        }
      }));
    } catch (e) {
      alert("Erreur lors de la génération de l'ambiance musicale.");
    } finally {
      setGeneratingPresetId(null);
    }
  };

  const handleUploadAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newAudio = {
      id: `audio_${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ""),
      blob: file,
      url: URL.createObjectURL(file)
    };

    setCustomAudios(prev => [newAudio, ...prev]);

    // Automatically apply to timeline as background music
    setProject(prev => ({
      ...prev,
      backgroundMusic: {
        id: newAudio.id,
        title: newAudio.title,
        blob: newAudio.blob,
        volume: prev.backgroundMusic?.volume ?? 0.15,
        loop: true,
        isPreset: false
      }
    }));

    e.target.value = '';
  };

  const handleTogglePreviewAudio = (id: string, blob: Blob) => {
    if (previewingAudioId === id) {
      if (audioPreviewElRef.current) {
        audioPreviewElRef.current.pause();
      }
      setPreviewingAudioId(null);
    } else {
      if (!audioPreviewElRef.current) {
        audioPreviewElRef.current = document.createElement('audio');
      }
      const audioEl = audioPreviewElRef.current;
      audioEl.src = URL.createObjectURL(blob);
      audioEl.volume = 0.5;
      audioEl.play().catch(() => {});
      audioEl.onended = () => setPreviewingAudioId(null);
      setPreviewingAudioId(id);
    }
  };

  const handleUpdateMusicVolume = (volume: number) => {
    setProject(prev => {
      if (!prev.backgroundMusic) return prev;
      return {
        ...prev,
        backgroundMusic: {
          ...prev.backgroundMusic,
          volume: Math.max(0, Math.min(1, volume))
        }
      };
    });
  };

  const handleRemoveBackgroundMusic = () => {
    setProject(prev => ({ ...prev, backgroundMusic: null }));
    if (bgMusicAudioRef.current) {
      bgMusicAudioRef.current.pause();
    }
  };

  // --- Clip Manipulation ---

  const addClipToTimeline = (video: SavedVideo, insertPosition: 'start' | 'current' | 'end' = 'end') => {
    const newClipId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const initialEndTrim = video.duration && video.duration > 0 ? video.duration : 10;
    const newClip: TimelineClip = {
      id: newClipId,
      video,
      startTrim: 0,
      endTrim: initialEndTrim,
      transitionToNext: 'crossfade',
      transitionDuration: 1.0,
      playbackSpeed: 1.0
    };

    // Pre-create and preload the video DOM element immediately
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    if (video.blob && video.blob.size > 0) {
      v.src = URL.createObjectURL(video.blob);
    }
    v.onloadeddata = () => {
      if (!isPlayingRef.current) renderStaticPreviewAt(currentTimeRef.current);
    };
    v.oncanplay = () => {
      if (!isPlayingRef.current) renderStaticPreviewAt(currentTimeRef.current);
    };
    v.load();
    if (exportContainerRef.current) {
      exportContainerRef.current.appendChild(v);
    }
    videoElementsRef.current.set(newClipId, v);

    // Pre-cache thumbnail if available as immediate zero-latency preview
    if (video.thumbnail) {
      const thumbImg = new Image();
      thumbImg.onload = () => {
        if (!isPlayingRef.current) renderStaticPreviewAt(currentTimeRef.current);
      };
      thumbImg.src = video.thumbnail;
      imagesCacheRef.current.set(`thumb_${newClipId}`, thumbImg);
    }

    setProject((prev) => {
      const clips = [...prev.clips];
      if (insertPosition === 'start') {
        clips.unshift(newClip);
      } else if (insertPosition === 'current') {
        let insertIdx = clips.length;
        let cumulative = 0;
        for (let i = 0; i < clips.length; i++) {
          const c = clips[i];
          const clipDur = (c.endTrim - c.startTrim) / (c.playbackSpeed || 1.0);
          if (currentTimeRef.current >= cumulative && currentTimeRef.current <= cumulative + clipDur) {
            insertIdx = i + 1;
            break;
          }
          cumulative += clipDur;
        }
        clips.splice(insertIdx, 0, newClip);
      } else {
        clips.push(newClip);
      }
      return { ...prev, clips };
    });

    setSelectedClipId(newClipId);

    // Trigger instant preview render
    setTimeout(() => {
      if (!isPlayingRef.current) {
        renderStaticPreviewAt(currentTimeRef.current);
      }
    }, 50);

    // Probe accurate duration in case metadata was throttled/inaccurate
    if (video.blob && video.blob.size > 0) {
      resolveAccurateBlobDuration(video.blob, video.duration).then((dur) => {
        if (dur > initialEndTrim) {
          setProject((prev) => ({
            ...prev,
            clips: prev.clips.map((c) => (c.id === newClipId && c.endTrim === initialEndTrim) ? { ...c, endTrim: dur } : c)
          }));
        }
      }).catch(() => {});
    }
  };

  // --- Slide & Image Clip Handlers ---

  const openAddSlideModal = (position: 'start' | 'current' | 'end' = 'start') => {
    setSlideModalMode('add');
    setEditingSlideClipId(null);
    setSlideInsertPosition(position);
    setSlideForm({
      title: position === 'start' ? 'Titre de la Présentation' : 'Nouveau Chapitre',
      subtitle: position === 'start' ? 'Introduction et présentation' : 'Sous-titre explicatif',
      bgColor: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      textColor: '#ffffff',
      subtextColor: '#94a3b8',
      fontSize: 52,
      duration: 4,
      align: 'center',
      bgImageUrl: '',
      transitionToNext: 'crossfade'
    });
    setIsSlideModalOpen(true);
  };

  const openEditSlideModal = (clip: TimelineClip) => {
    if (!clip.slideContent) return;
    setEditingSlideClipId(clip.id);
    setSlideModalMode('edit');
    const dur = Math.max(0.5, clip.endTrim - clip.startTrim);
    setSlideForm({
      title: clip.slideContent.title || 'Diapositive Titre',
      subtitle: clip.slideContent.subtitle || '',
      bgColor: clip.slideContent.bgColor || 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      textColor: clip.slideContent.textColor || '#ffffff',
      subtextColor: clip.slideContent.subtextColor || '#94a3b8',
      fontSize: clip.slideContent.fontSize || 52,
      duration: dur,
      align: clip.slideContent.align || 'center',
      bgImageUrl: clip.slideContent.bgImageUrl || '',
      transitionToNext: clip.transitionToNext || 'crossfade'
    });
    setIsSlideModalOpen(true);
  };

  const handleSaveSlideClip = (savedForm?: typeof slideForm, position?: 'start' | 'current' | 'end') => {
    const activeForm = savedForm || slideForm;
    const activePos = position || slideInsertPosition;

    if (!activeForm.title.trim()) {
      alert("Veuillez saisir un titre pour la diapositive.");
      return;
    }

    const slideContent: SlideContent = {
      title: activeForm.title.trim(),
      subtitle: activeForm.subtitle.trim(),
      bgColor: activeForm.bgColor,
      textColor: activeForm.textColor,
      subtextColor: activeForm.subtextColor,
      fontSize: activeForm.fontSize,
      align: activeForm.align,
      bgImageUrl: activeForm.bgImageUrl
    };

    const dur = Math.max(0.5, activeForm.duration);

    if (slideModalMode === 'edit' && editingSlideClipId) {
      setProject(prev => ({
        ...prev,
        clips: prev.clips.map(c => {
          if (c.id === editingSlideClipId) {
            return {
              ...c,
              slideContent,
              video: {
                ...c.video,
                title: activeForm.title.trim(),
                duration: dur
              },
              startTrim: 0,
              endTrim: dur,
              transitionToNext: activeForm.transitionToNext
            };
          }
          return c;
        })
      }));
    } else {
      // Add mode
      const newSlideClip: TimelineClip = {
        id: `slide_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'slide',
        slideContent,
        video: {
          id: `slide_vid_${Date.now()}`,
          title: activeForm.title.trim(),
          blob: new Blob([], { type: 'video/mp4' }),
          thumbnail: '',
          duration: dur,
          size: 0,
          date: new Date().toISOString()
        },
        startTrim: 0,
        endTrim: dur,
        transitionToNext: activeForm.transitionToNext,
        transitionDuration: 1.0,
        playbackSpeed: 1.0
      };

      setProject(prev => {
        const clips = [...prev.clips];
        if (activePos === 'start') {
          clips.unshift(newSlideClip);
        } else if (activePos === 'current') {
          let insertIdx = clips.length;
          let cumulative = 0;
          for (let i = 0; i < clips.length; i++) {
            const c = clips[i];
            const clipDur = (c.endTrim - c.startTrim) / (c.playbackSpeed || 1.0);
            if (currentTimeRef.current >= cumulative && currentTimeRef.current <= cumulative + clipDur) {
              insertIdx = i + 1;
              break;
            }
            cumulative += clipDur;
          }
          clips.splice(insertIdx, 0, newSlideClip);
        } else {
          clips.push(newSlideClip);
        }
        return { ...prev, clips };
      });
    }

    setIsSlideModalOpen(false);
    setEditingSlideClipId(null);
    setTimeout(() => {
      if (!isPlayingRef.current) renderStaticPreviewAt(currentTimeRef.current);
    }, 60);
  };

  const handleAddImageAsClip = (media: SavedMedia, duration: number = 5, insertPosition: 'start' | 'current' | 'end' = 'end') => {
    const newClipId = `imgclip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newImageClip: TimelineClip = {
      id: newClipId,
      type: 'image',
      video: {
        id: media.id,
        title: media.title || 'Diapositive Image',
        blob: media.blob || new Blob([], { type: 'image/png' }),
        thumbnail: media.thumbnail || '',
        duration: duration,
        size: media.size || 0,
        date: new Date().toISOString()
      },
      startTrim: 0,
      endTrim: duration,
      transitionToNext: 'crossfade',
      transitionDuration: 1.0,
      playbackSpeed: 1.0
    };

    // Pre-cache image element
    const imgEl = new Image();
    if (media.thumbnail) {
      imgEl.src = media.thumbnail;
    } else if (media.blob) {
      imgEl.src = URL.createObjectURL(media.blob);
    }
    imgEl.onload = () => {
      if (!isPlayingRef.current) renderStaticPreviewAt(currentTimeRef.current);
    };
    imagesCacheRef.current.set(newClipId, imgEl);

    setProject(prev => {
      const clips = [...prev.clips];
      if (insertPosition === 'start') {
        clips.unshift(newImageClip);
      } else if (insertPosition === 'current') {
        let insertIdx = clips.length;
        let cumulative = 0;
        for (let i = 0; i < clips.length; i++) {
          const c = clips[i];
          const clipDur = (c.endTrim - c.startTrim) / (c.playbackSpeed || 1.0);
          if (currentTimeRef.current >= cumulative && currentTimeRef.current <= cumulative + clipDur) {
            insertIdx = i + 1;
            break;
          }
          cumulative += clipDur;
        }
        clips.splice(insertIdx, 0, newImageClip);
      } else {
        clips.push(newImageClip);
      }
      return { ...prev, clips };
    });

    setIsImageSlidePickerOpen(false);
    setTimeout(() => {
      if (!isPlayingRef.current) renderStaticPreviewAt(currentTimeRef.current);
    }, 60);
  };

  const updateSlideOrImageDuration = (clipId: string, duration: number) => {
    const validDur = Math.max(0.5, Math.round(duration * 10) / 10);
    setProject(prev => ({
      ...prev,
      clips: prev.clips.map(c => c.id === clipId ? {
        ...c,
        startTrim: 0,
        endTrim: validDur,
        video: { ...c.video, duration: validDur }
      } : c)
    }));
    if (!isPlayingRef.current) {
      renderStaticPreviewAt(currentTimeRef.current);
    }
  };

  const removeClipFromTimeline = (id: string) => {
    setProject((prev) => ({
      ...prev,
      clips: prev.clips.filter((c) => c.id !== id)
    }));
  };

  const moveClip = (index: number, direction: 'left' | 'right') => {
    const newClips = [...project.clips];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newClips.length) return;
    const temp = newClips[index];
    newClips[index] = newClips[targetIndex];
    newClips[targetIndex] = temp;
    setProject((prev) => ({ ...prev, clips: newClips }));
  };

  const updateClipTrim = (id: string, startTrim: number, endTrim: number) => {
    setProject((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => c.id === id ? { ...c, startTrim, endTrim } : c)
    }));
  };

  const updateClipTransition = (id: string, transitionToNext: any, transitionDuration: number) => {
    setProject((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => c.id === id ? { ...c, transitionToNext, transitionDuration } : c)
    }));
  };

  const updateClipSpeed = (id: string, playbackSpeed: number) => {
    setProject((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => c.id === id ? {
        ...c,
        playbackSpeed,
        showFastForwardBadge: playbackSpeed > 1
      } : c)
    }));
  };

  const splitAndFastForward = (clipId: string, speed: number = 4) => {
    setProject((prev) => {
      const idx = prev.clips.findIndex((c) => c.id === clipId);
      if (idx === -1) return prev;
      const c = prev.clips[idx];
      const dur = c.endTrim - c.startTrim;
      if (dur < 3) {
        return {
          ...prev,
          clips: prev.clips.map((item) => item.id === clipId ? { ...item, playbackSpeed: speed, showFastForwardBadge: true } : item)
        };
      }

      const part1End = c.startTrim + dur * 0.25;
      const part2End = c.startTrim + dur * 0.75;

      const clip1: TimelineClip = {
        ...c,
        id: `clip_${Date.now()}_1`,
        startTrim: c.startTrim,
        endTrim: part1End,
        playbackSpeed: 1.0,
        showFastForwardBadge: false,
        transitionToNext: 'none'
      };

      const clip2: TimelineClip = {
        ...c,
        id: `clip_${Date.now()}_2`,
        startTrim: part1End,
        endTrim: part2End,
        playbackSpeed: speed,
        showFastForwardBadge: true,
        transitionToNext: 'none'
      };

      const clip3: TimelineClip = {
        ...c,
        id: `clip_${Date.now()}_3`,
        startTrim: part2End,
        endTrim: c.endTrim,
        playbackSpeed: 1.0,
        showFastForwardBadge: false
      };

      const updated = [...prev.clips];
      updated.splice(idx, 1, clip1, clip2, clip3);
      return { ...prev, clips: updated };
    });
  };

  const handleApplySilenceSegmentsToClip = (targetClipId: string, speechSegments: SpeechSegment[]) => {
    setProject((prev) => {
      const clipIndex = prev.clips.findIndex((c) => c.id === targetClipId);
      if (clipIndex === -1) return prev;
      const originalClip = prev.clips[clipIndex];

      const newClips: TimelineClip[] = speechSegments.map((seg, idx) => ({
        id: `clip_${Date.now()}_${idx}`,
        video: originalClip.video,
        startTrim: seg.start,
        endTrim: seg.end,
        transitionToNext: idx === speechSegments.length - 1 ? originalClip.transitionToNext : 'none',
        transitionDuration: originalClip.transitionDuration,
        playbackSpeed: originalClip.playbackSpeed,
        showFastForwardBadge: originalClip.showFastForwardBadge
      }));

      const updatedClips = [...prev.clips];
      updatedClips.splice(clipIndex, 1, ...newClips);
      return { ...prev, clips: updatedClips };
    });
  };

  const handleApplySilenceSegmentsToLibraryVideo = (video: SavedVideo, speechSegments: SpeechSegment[]) => {
    const newClips: TimelineClip[] = speechSegments.map((seg, idx) => ({
      id: `clip_${Date.now()}_${idx}`,
      video: video,
      startTrim: seg.start,
      endTrim: seg.end,
      transitionToNext: 'none',
      transitionDuration: 0.5,
      playbackSpeed: 1.0
    }));
    setProject((prev) => ({
      ...prev,
      clips: [...prev.clips, ...newClips]
    }));
  };

  // --- Title Manipulation ---

  const handleSaveTitle = () => {
    if (!titleForm.text.trim()) return;
    const newTitle: TimelineTitle = {
      ...titleForm,
      id: titleForm.id || `title_${Date.now()}`
    };
    setProject((prev) => {
      const exists = prev.titles.some((t) => t.id === newTitle.id);
      return {
        ...prev,
        titles: exists
          ? prev.titles.map((t) => t.id === newTitle.id ? newTitle : t)
          : [...prev.titles, newTitle]
      };
    });
    setIsTitleModalOpen(false);
  };

  const openEditTitleModal = (title: TimelineTitle) => {
    setTitleForm({ ...title });
    setIsTitleModalOpen(true);
  };

  const updateTitleTiming = (id: string, startTime: number, duration: number) => {
    const maxDur = Math.max(1, totalDuration);
    const validStart = Math.max(0, Math.min(Math.max(0, maxDur - 0.2), Math.round(startTime * 10) / 10));
    const validDuration = Math.max(0.5, Math.round(duration * 10) / 10);
    setProject(prev => ({
      ...prev,
      titles: prev.titles.map(t => t.id === id ? {
        ...t,
        startTime: validStart,
        duration: validDuration
      } : t)
    }));
    if (!isPlayingRef.current) {
      renderStaticPreviewAt(currentTimeRef.current);
    }
  };

  const removeTitle = (id: string) => {
    setProject((prev) => ({
      ...prev,
      titles: (prev.titles || []).filter((t) => t.id !== id)
    }));
    if (!isPlayingRef.current) {
      renderStaticPreviewAt(currentTimeRef.current);
    }
  };

  // --- Timeline Zoom Manipulation ---

  const openEditZoomModal = (zoom: TimelineZoom) => {
    setZoomForm({ ...zoom });
    setIsZoomModalOpen(true);
  };

  const updateZoomTiming = (id: string, startTime: number, duration: number) => {
    const maxDur = Math.max(1, totalDuration);
    const validStart = Math.max(0, Math.min(Math.max(0, maxDur - 0.2), Math.round(startTime * 10) / 10));
    const validDuration = Math.max(0.5, Math.round(duration * 10) / 10);
    setProject(prev => ({
      ...prev,
      zooms: (prev.zooms || []).map(z => z.id === id ? {
        ...z,
        startTime: validStart,
        duration: validDuration
      } : z)
    }));
    if (!isPlayingRef.current) {
      renderStaticPreviewAt(currentTimeRef.current);
    }
  };

  const handleSaveZoom = () => {
    const newZoom: TimelineZoom = {
      ...zoomForm,
      id: zoomForm.id || `zoom_${Date.now()}`
    };
    setProject((prev) => {
      const exists = (prev.zooms || []).some((z) => z.id === newZoom.id);
      return {
        ...prev,
        zooms: exists
          ? (prev.zooms || []).map((z) => z.id === newZoom.id ? newZoom : z)
          : [...(prev.zooms || []), newZoom]
      };
    });
    setIsZoomModalOpen(false);
  };

  const removeZoom = (id: string) => {
    setProject((prev) => ({
      ...prev,
      zooms: (prev.zooms || []).filter((z) => z.id !== id)
    }));
    if (!isPlayingRef.current) {
      renderStaticPreviewAt(currentTimeRef.current);
    }
  };

  // --- Timeline Image & Logo Overlays ---

  const updateImageTiming = (id: string, startTime: number, duration: number) => {
    const maxDur = Math.max(1, totalDuration);
    const validStart = Math.max(0, Math.min(Math.max(0, maxDur - 0.2), Math.round(startTime * 10) / 10));
    const validDuration = Math.max(0.5, Math.round(duration * 10) / 10);
    setProject(prev => ({
      ...prev,
      images: (prev.images || []).map(img => img.id === id ? {
        ...img,
        startTime: validStart,
        duration: validDuration
      } : img)
    }));
    if (!isPlayingRef.current) {
      renderStaticPreviewAt(currentTimeRef.current);
    }
  };

  const openAddImageOverlayModal = async (media: SavedMedia) => {
    let dataUrl = media.thumbnail || '';
    if (media.blob) {
      try {
        dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(media.blob);
        });
      } catch (e) {
        dataUrl = media.thumbnail || '';
      }
    }

    const defaultDuration = totalDuration > 0 ? totalDuration : 10;
    setImageForm({
      id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: media.title || 'Logo',
      dataUrl,
      startTime: 0,
      duration: defaultDuration,
      position: 'top-right',
      x: 0.85,
      y: 0.15,
      scale: 0.15,
      opacity: 1.0,
      hasShadow: true,
      borderRadius: 0
    });
    setIsPermanentOverlay(true);
    setImageModalMode('add');
    setIsImageModalOpen(true);
  };

  const openEditImageOverlayModal = (overlay: TimelineImage) => {
    setImageForm({ ...overlay });
    setIsPermanentOverlay(Math.abs(overlay.duration - totalDuration) < 0.5 && overlay.startTime === 0);
    setImageModalMode('edit');
    setIsImageModalOpen(true);
  };

  const handleSaveImageOverlay = () => {
    const finalDuration = isPermanentOverlay ? Math.max(1, totalDuration || 10) : imageForm.duration;
    const finalStartTime = isPermanentOverlay ? 0 : imageForm.startTime;
    const finalOverlay: TimelineImage = {
      ...imageForm,
      startTime: Math.max(0, finalStartTime),
      duration: Math.max(0.1, finalDuration)
    };

    if (finalOverlay.dataUrl) {
      const img = new Image();
      img.onload = () => {
        imagesCacheRef.current.set(finalOverlay.id, img);
        if (!isPlayingRef.current) {
          renderStaticPreviewAt(currentTimeRef.current);
        }
      };
      img.src = finalOverlay.dataUrl;
      imagesCacheRef.current.set(finalOverlay.id, img);
    }

    setProject((prev) => {
      const existing = (prev.images || []).some((i) => i.id === finalOverlay.id);
      return {
        ...prev,
        images: existing
          ? (prev.images || []).map((i) => i.id === finalOverlay.id ? finalOverlay : i)
          : [...(prev.images || []), finalOverlay]
      };
    });

    setIsImageModalOpen(false);
    renderStaticPreviewAt(currentTimeRef.current);
  };

  const removeImageOverlay = (id: string) => {
    setProject((prev) => ({
      ...prev,
      images: (prev.images || []).filter((i) => i.id !== id)
    }));
    imagesCacheRef.current.delete(id);
    renderStaticPreviewAt(currentTimeRef.current);
  };

  const handleImportImageFromDisk = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await importSingleFile(file);
      await loadLibraryAndProjects();
      await openAddImageOverlayModal(imported);
    } catch (err) {
      alert("Impossible de charger ce fichier image.");
    }
    e.target.value = '';
  };

  const handleImportVideoFromDisk = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await importSingleFile(file);
      await loadLibraryAndProjects();
      addClipToTimeline(imported, videoInsertPosition);
    } catch (err) {
      alert("Impossible de charger ce fichier vidéo.");
    }
    e.target.value = '';
  };

  // --- YouTube Chapters Helpers ---

  const handleAutoGenerateChaptersFromClips = () => {
    if (project.clips.length === 0) {
      alert("Ajoutez au moins un clip sur la timeline pour générer des chapitres.");
      return;
    }

    let cumulative = 0;
    const generated: TimelineChapter[] = [];

    for (let i = 0; i < project.clips.length; i++) {
      const clip = project.clips[i];
      const speed = clip.playbackSpeed && clip.playbackSpeed > 0 ? clip.playbackSpeed : 1.0;
      const clipDuration = Math.max(0.1, (clip.endTrim - clip.startTrim) / speed);
      const isLast = i === project.clips.length - 1;
      const transDur = (!isLast && clip.transitionToNext !== 'none')
        ? Math.min(clip.transitionDuration, clipDuration / 2)
        : 0;

      generated.push({
        id: `chap_clip_${clip.id}_${i}`,
        time: Math.round(cumulative * 10) / 10,
        title: i === 0 ? 'Introduction' : (clip.video?.title || `Partie ${i + 1}`)
      });

      cumulative += clipDuration - transDur;
    }

    setProject(prev => ({
      ...prev,
      chapters: generated
    }));
  };

  const handleAutoGenerateChaptersFromTitles = () => {
    if (!project.titles || project.titles.length === 0) {
      alert("Aucun titre texte n'est présent sur la timeline.");
      return;
    }

    const sortedTitles = [...(project.titles || [])].sort((a, b) => a.startTime - b.startTime);
    const generated: TimelineChapter[] = [];

    if (sortedTitles[0].startTime > 0.5) {
      generated.push({ id: 'chap_intro_auto', time: 0, title: 'Introduction' });
    }

    for (const t of sortedTitles) {
      generated.push({
        id: `chap_title_${t.id}`,
        time: Math.round(t.startTime * 10) / 10,
        title: t.text
      });
    }

    setProject(prev => ({
      ...prev,
      chapters: generated
    }));
  };

  const handleAddChapterAtCurrentTime = () => {
    const curTime = Math.round(currentTime * 10) / 10;
    const newChap: TimelineChapter = {
      id: `chap_${Date.now()}`,
      time: curTime,
      title: curTime === 0 ? 'Introduction' : `Chapitre à ${formatTime(curTime)}`
    };

    setProject(prev => {
      const list = [...(prev.chapters || []), newChap].sort((a, b) => a.time - b.time);
      return { ...prev, chapters: list };
    });
  };

  const handleUpdateChapter = (id: string, time: number, title: string) => {
    setProject(prev => ({
      ...prev,
      chapters: (prev.chapters || []).map(c => c.id === id ? { ...c, time: Math.max(0, time), title } : c).sort((a, b) => a.time - b.time)
    }));
  };

  const handleRemoveChapter = (id: string) => {
    setProject(prev => ({
      ...prev,
      chapters: (prev.chapters || []).filter(c => c.id !== id)
    }));
  };

  const handleCopyYouTubeChapters = () => {
    const formatted = formatYouTubeChapters(project.chapters || []);
    navigator.clipboard.writeText(formatted);
    setCopiedChapters(true);
    setTimeout(() => setCopiedChapters(false), 2500);
  };

  const handleDownloadYouTubeChapters = () => {
    const formatted = formatYouTubeChapters(project.chapters || []);
    const blob = new Blob([formatted], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chapitres_${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Live Voiceover (Voix Off en Direct) Recording & Manipulation ---

  const startVoiceoverRecording = async () => {
    if (isRecordingVoiceover) {
      stopVoiceoverRecording();
      return;
    }
    if (totalDuration <= 0) {
      alert("Ajoutez au moins un clip vidéo avant d'enregistrer une voix off.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      voiceoverStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';

      const recorder = new MediaRecorder(stream, { mimeType });
      voiceoverRecorderRef.current = recorder;
      voiceoverChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          voiceoverChunksRef.current.push(e.data);
        }
      };

      const startPos = currentTimeRef.current;
      voiceoverStartPosRef.current = startPos;

      recorder.onstop = () => {
        const audioBlob = new Blob(voiceoverChunksRef.current, { type: mimeType });
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
          voiceoverStreamRef.current = null;
        }
        const currentPos = currentTimeRef.current;
        const dur = Math.max(0.5, Math.round((currentPos - startPos) * 10) / 10);

        if (audioBlob.size > 100) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const newVo: TimelineVoiceover = {
              id: `vo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              blob: audioBlob,
              dataUrl,
              startTime: Math.round(startPos * 10) / 10,
              duration: dur,
              volume: 1.0,
              label: `Voix Off #${(project.voiceovers || []).length + 1}`
            };
            setProject(prev => ({
              ...prev,
              voiceovers: [...(prev.voiceovers || []), newVo]
            }));
          };
          reader.readAsDataURL(audioBlob);
        }
      };

      recorder.start(100);
      isRecordingVoiceoverRef.current = true;
      setIsRecordingVoiceover(true);

      // Start playback synchronously if currently paused
      if (!isPlayingRef.current) {
        isPlayingRef.current = true;
        setIsPlaying(true);
        if (bgMusicAudioRef.current && project.backgroundMusic) {
          bgMusicAudioRef.current.play().catch(() => {});
        }
      }
    } catch (err) {
      console.error("Impossible d'accéder au microphone :", err);
      alert("Impossible d'accéder à votre microphone. Veuillez vérifier les autorisations dans Windows.");
    }
  };

  const stopVoiceoverRecording = () => {
    if (!isRecordingVoiceoverRef.current && !voiceoverRecorderRef.current) return;
    isRecordingVoiceoverRef.current = false;
    setIsRecordingVoiceover(false);
    if (voiceoverRecorderRef.current && voiceoverRecorderRef.current.state !== 'inactive') {
      try {
        voiceoverRecorderRef.current.stop();
      } catch {}
    }
    voiceoverRecorderRef.current = null;

    if (isPlayingRef.current) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
      videoElementsRef.current.forEach(v => {
        v.pause();
        v.muted = true;
      });
      voiceoverAudiosRef.current.forEach(a => a.pause());
      if (bgMusicAudioRef.current) bgMusicAudioRef.current.pause();
      renderStaticPreviewAt(currentTimeRef.current);
    }
  };

  const updateVoiceoverTiming = (id: string, startTime: number, duration: number) => {
    const maxDur = Math.max(1, totalDuration);
    const validStart = Math.max(0, Math.min(Math.max(0, maxDur - 0.2), Math.round(startTime * 10) / 10));
    const validDuration = Math.max(0.5, Math.round(duration * 10) / 10);
    setProject(prev => ({
      ...prev,
      voiceovers: (prev.voiceovers || []).map(v => v.id === id ? {
        ...v,
        startTime: validStart,
        duration: validDuration
      } : v)
    }));
  };

  const removeVoiceover = (id: string) => {
    setProject(prev => ({
      ...prev,
      voiceovers: (prev.voiceovers || []).filter(v => v.id !== id)
    }));
    const audio = voiceoverAudiosRef.current.get(id);
    if (audio) {
      audio.pause();
      if (audio.parentNode) audio.parentNode.removeChild(audio);
      URL.revokeObjectURL(audio.src);
      voiceoverAudiosRef.current.delete(id);
    }
  };

  const openEditVoiceoverModal = (vo: TimelineVoiceover) => {
    let url = '';
    if (vo.blob && vo.blob.size > 0) {
      url = URL.createObjectURL(vo.blob);
    } else if (vo.dataUrl) {
      url = vo.dataUrl;
    }
    setVoiceoverForm({
      id: vo.id,
      label: vo.label || 'Voix Off',
      startTime: vo.startTime,
      duration: vo.duration,
      volume: vo.volume ?? 1.0,
      url
    });
    setIsVoiceoverModalOpen(true);
  };

  const handleSaveVoiceoverForm = () => {
    if (!voiceoverForm) return;
    setProject(prev => ({
      ...prev,
      voiceovers: (prev.voiceovers || []).map(v => v.id === voiceoverForm.id ? {
        ...v,
        label: voiceoverForm.label,
        volume: voiceoverForm.volume
      } : v)
    }));
    setIsVoiceoverModalOpen(false);
  };

  // --- Playback Engine & Interactive Seek ---

  const togglePlay = () => {
    if (isRecordingVoiceover) {
      stopVoiceoverRecording();
      return;
    }
    if (isPlayingRef.current) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
      videoElementsRef.current.forEach((v) => {
        v.pause();
        v.muted = true;
      });
      voiceoverAudiosRef.current.forEach((a) => a.pause());
      if (bgMusicAudioRef.current) bgMusicAudioRef.current.pause();
      renderStaticPreviewAt(currentTimeRef.current);
    } else {
      if (currentTimeRef.current >= totalDuration) {
        currentTimeRef.current = 0;
        setCurrentTime(0);
      }
      isPlayingRef.current = true;
      setIsPlaying(true);
      if (bgMusicAudioRef.current && project.backgroundMusic) {
        bgMusicAudioRef.current.play().catch(() => {});
      }
    }
  };

  const handleSeek = (time: number) => {
    if (isRecordingVoiceover) {
      stopVoiceoverRecording();
    }
    currentTimeRef.current = time;
    setCurrentTime(time);
    voiceoverAudiosRef.current.forEach((a) => a.pause());
    if (!isPlayingRef.current) {
      videoElementsRef.current.forEach((v) => {
        v.pause();
        v.muted = true;
      });
      renderStaticPreviewAt(time);
    }
    if (bgMusicAudioRef.current && project.backgroundMusic) {
      bgMusicAudioRef.current.currentTime = time % (bgMusicAudioRef.current.duration || 16);
    }
  };

  // Timeline Ruler graduation markers
  const rulerTicks = useMemo(() => {
    if (totalDuration <= 0) return [];
    const count = 10;
    const ticks: { pct: number; label: string }[] = [];
    for (let i = 0; i <= count; i++) {
      const t = (i / count) * totalDuration;
      ticks.push({
        pct: (i / count) * 100,
        label: formatTime(t)
      });
    }
    return ticks;
  }, [totalDuration]);

  const handleRulerSeek = (clientX: number) => {
    if (!timelineRulerRef.current || totalDuration <= 0) return;
    const rect = timelineRulerRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const seekTime = (clickX / rect.width) * totalDuration;
    handleSeek(seekTime);
  };

  const handleRulerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (totalDuration <= 0) return;
    isScrubbingRulerRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    handleRulerSeek(e.clientX);
  };

  const handleRulerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRulerRef.current) return;
    handleRulerSeek(e.clientX);
  };

  const handleRulerPointerUp = () => {
    isScrubbingRulerRef.current = false;
  };

  const handleVideoLaneSeek = (clientX: number) => {
    if (!videoLaneRef.current || totalDuration <= 0) return;
    const rect = videoLaneRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const seekTime = (clickX / rect.width) * totalDuration;
    handleSeek(seekTime);
  };

  const handleVideoLanePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (totalDuration <= 0) return;
    isScrubbingRulerRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    handleVideoLaneSeek(e.clientX);
  };

  const handleVideoLanePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRulerRef.current) return;
    handleVideoLaneSeek(e.clientX);
  };

  const handleVideoLanePointerUp = () => {
    isScrubbingRulerRef.current = false;
  };

  // Currently inspected or active clip on Track 1
  const activeInspectorClip = useMemo(() => {
    if (project.clips.length === 0) return null;
    if (selectedClipId) {
      const found = project.clips.find(c => c.id === selectedClipId);
      if (found) return found;
    }
    const currentPlayingClip = project.clips.find(c => {
      const off = clipTimelineOffsets.get(c.id);
      return off && currentTime >= off.start && currentTime <= off.end;
    });
    return currentPlayingClip || project.clips[0] || null;
  }, [project.clips, selectedClipId, currentTime, clipTimelineOffsets]);

  const updatePreviewSize = (size: PreviewSize) => {
    setPreviewSize(size);
    try {
      localStorage.setItem('openpeek_editor_preview_size', size);
    } catch {}
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      try {
        if (previewContainerRef.current && previewContainerRef.current.requestFullscreen) {
          previewContainerRef.current.requestFullscreen().catch(() => {});
        } else if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch {}
    } else {
      setIsFullscreen(false);
      try {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      } catch {}
    }
  };

  // Sync state if user exits native fullscreen with Escape or browser controls
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isFullscreen]);

  // Keyboard navigation & shortcuts (F for fullscreen, Space, Left/Right seek)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        toggleFullscreen();
      } else if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === ' ' && isFullscreen) {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft' && isFullscreen) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        handleSeek(Math.max(0, currentTime - step));
      } else if (e.key === 'ArrowRight' && isFullscreen) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        handleSeek(Math.min(totalDuration, currentTime + step));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, currentTime, totalDuration, isPlaying]);

  // Live Canvas Rendering Loop
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!isPlaying) {
      renderStaticPreviewAt(currentTimeRef.current);
      return;
    }

    let lastTime = performance.now();

    const playbackLoop = () => {
      if (!isPlayingRef.current) return;

      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      let curTime = currentTimeRef.current + dt;
      if (curTime >= totalDuration) {
        curTime = totalDuration;
        videoElementsRef.current.forEach((v) => {
          v.pause();
          v.muted = true;
        });
        if (bgMusicAudioRef.current) bgMusicAudioRef.current.pause();
        voiceoverAudiosRef.current.forEach(a => a.pause());
        if (isRecordingVoiceoverRef.current) {
          stopVoiceoverRecording();
        }
        isPlayingRef.current = false;
        setIsPlaying(false);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = 0;
        }
        currentTimeRef.current = curTime;
        setCurrentTime(curTime);
        renderStaticPreviewAt(curTime);
        return;
      }
      currentTimeRef.current = curTime;
      setCurrentTime(curTime);

      try {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Auto-ducking preview: lower music volume when video clips or voiceovers are active
        if (project.backgroundMusic && bgMusicAudioRef.current) {
          const baseVol = project.backgroundMusic.volume ?? 0.15;
          if (project.backgroundMusic.autoDucking !== false) {
            const hasActiveClip = (project.clips || []).length > 0;
            const hasActiveVoiceover = (project.voiceovers || []).some(
              vo => curTime >= vo.startTime && curTime <= vo.startTime + vo.duration
            ) || isRecordingVoiceoverRef.current;
            const targetVol = (hasActiveClip || hasActiveVoiceover) ? baseVol * (project.backgroundMusic.duckingLevel ?? 0.25) : baseVol;
            bgMusicAudioRef.current.volume = bgMusicAudioRef.current.volume * 0.8 + targetVol * 0.2;
          } else {
            bgMusicAudioRef.current.volume = baseVol;
          }
        }

        // Apply Timeline Zoom Transform if active at curTime
        const activeZoom = getActiveTimelineZoom(project.zooms || [], curTime);
        const isZoomed = applyTimelineZoomTransform(ctx, activeZoom, curTime, canvas.width, canvas.height);

        let cumulative = 0;
        const clips = project.clips || [];
        for (let i = 0; i < clips.length; i++) {
          const clip = clips[i];
          const speed = clip.playbackSpeed && clip.playbackSpeed > 0 ? clip.playbackSpeed : 1.0;
          const clipDuration = Math.max(0.1, (clip.endTrim - clip.startTrim) / speed);
          const isLast = i === clips.length - 1;
          const transDur = (!isLast && clip.transitionToNext !== 'none')
            ? Math.min(clip.transitionDuration, clipDuration / 2)
            : 0;

          const clipStart = cumulative;
          const clipEnd = cumulative + clipDuration;
          const videoEl = videoElementsRef.current.get(clip.id);

          if (curTime >= clipStart && curTime <= clipEnd) {
            if (clip.type === 'slide' && clip.slideContent) {
              drawSlideClip(ctx, clip.slideContent, canvas.width, canvas.height);
            } else if (clip.type === 'image') {
              let imgEl = imagesCacheRef.current.get(clip.id);
              if (!imgEl && (clip.video?.thumbnail || (clip.video?.blob && clip.video.blob.size > 0))) {
                imgEl = new Image();
                imgEl.src = clip.video?.thumbnail || (clip.video?.blob ? URL.createObjectURL(clip.video.blob) : '');
                imagesCacheRef.current.set(clip.id, imgEl);
              }
              if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
                drawImageClip(ctx, imgEl, canvas.width, canvas.height);
              }
            } else if (videoEl) {
              if (exportContainerRef.current && !exportContainerRef.current.contains(videoEl)) {
                exportContainerRef.current.appendChild(videoEl);
              }
              videoEl.playbackRate = speed;
              videoEl.muted = false;
              videoEl.volume = 1.0;
              if (videoEl.paused && isPlaying) {
                videoEl.currentTime = ((curTime - clipStart) * speed) + clip.startTrim;
                videoEl.play().catch(() => {});
              }
              if (videoEl.readyState >= 2) {
                ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
                if (speed > 1.0) {
                  drawFastForwardBadge(ctx, speed, canvas.width, canvas.height);
                }
              } else if (clip.video?.thumbnail) {
                let thumbImg = imagesCacheRef.current.get(`thumb_${clip.id}`);
                if (!thumbImg) {
                  thumbImg = new Image();
                  thumbImg.src = clip.video.thumbnail;
                  imagesCacheRef.current.set(`thumb_${clip.id}`, thumbImg);
                }
                if (thumbImg && thumbImg.complete && thumbImg.naturalWidth > 0) {
                  ctx.drawImage(thumbImg, 0, 0, canvas.width, canvas.height);
                  if (speed > 1.0) {
                    drawFastForwardBadge(ctx, speed, canvas.width, canvas.height);
                  }
                }
              }
            }

            // Render transition to next clip
            if (!isLast && clip.transitionToNext !== 'none' && curTime > clipEnd - transDur) {
              const transProgress = (curTime - (clipEnd - transDur)) / transDur;
              const nextClip = clips[i + 1];

              const drawNextTransitionFrame = (targetCtx: CanvasRenderingContext2D, offX: number = 0) => {
                if (!nextClip) return;
                if (nextClip.type === 'slide' && nextClip.slideContent) {
                  if (offX !== 0) {
                    targetCtx.save();
                    targetCtx.translate(offX, 0);
                    drawSlideClip(targetCtx, nextClip.slideContent, canvas.width, canvas.height);
                    targetCtx.restore();
                  } else {
                    drawSlideClip(targetCtx, nextClip.slideContent, canvas.width, canvas.height);
                  }
                } else if (nextClip.type === 'image') {
                  let nextImg = imagesCacheRef.current.get(nextClip.id);
                  if (!nextImg && (nextClip.video?.thumbnail || (nextClip.video?.blob && nextClip.video.blob.size > 0))) {
                    nextImg = new Image();
                    nextImg.src = nextClip.video?.thumbnail || (nextClip.video?.blob ? URL.createObjectURL(nextClip.video.blob) : '');
                    imagesCacheRef.current.set(nextClip.id, nextImg);
                  }
                  if (nextImg && nextImg.complete && nextImg.naturalWidth > 0) {
                    if (offX !== 0) {
                      targetCtx.save();
                      targetCtx.translate(offX, 0);
                      drawImageClip(targetCtx, nextImg, canvas.width, canvas.height);
                      targetCtx.restore();
                    } else {
                      drawImageClip(targetCtx, nextImg, canvas.width, canvas.height);
                    }
                  }
                } else {
                  const nextVideoEl = videoElementsRef.current.get(nextClip.id);
                  if (nextVideoEl) {
                    if (exportContainerRef.current && !exportContainerRef.current.contains(nextVideoEl)) {
                      exportContainerRef.current.appendChild(nextVideoEl);
                    }
                    nextVideoEl.muted = false;
                    nextVideoEl.volume = Math.max(0, Math.min(1, transProgress));
                    if (videoEl) {
                      videoEl.volume = Math.max(0, Math.min(1, 1 - transProgress));
                    }
                    if (nextVideoEl.paused && isPlaying) {
                      nextVideoEl.currentTime = nextClip.startTrim + (transProgress * transDur);
                      nextVideoEl.play().catch(() => {});
                    }
                    if (nextVideoEl.readyState >= 2) {
                      targetCtx.drawImage(nextVideoEl, offX, 0, canvas.width, canvas.height);
                    }
                  }
                }
              };

              ctx.save();
              if (clip.transitionToNext === 'crossfade') {
                ctx.globalAlpha = transProgress;
                drawNextTransitionFrame(ctx, 0);
              } else if (clip.transitionToNext === 'fade-black') {
                ctx.fillStyle = '#000000';
                ctx.globalAlpha = Math.sin(transProgress * Math.PI);
                ctx.fillRect(0, 0, canvas.width, canvas.height);
              } else if (clip.transitionToNext === 'slide') {
                const offsetX = (1.0 - transProgress) * canvas.width;
                drawNextTransitionFrame(ctx, offsetX);
              }
              ctx.restore();
            }
          } else {
            if (videoEl) {
              videoEl.muted = true;
              videoEl.volume = 0;
              if (!videoEl.paused && (curTime < clipStart - 1 || curTime > clipEnd + 1)) {
                videoEl.pause();
              }
            }
          }

          cumulative += clipDuration - transDur;
        }

        // Restore zoom transform before drawing text titles on top
        if (isZoomed) {
          ctx.restore();
        }

        // Overlay active titles
        for (const title of (project.titles || [])) {
          if (curTime >= title.startTime && curTime <= title.startTime + title.duration) {
            drawTitleOverlay(ctx, title, canvas.width, canvas.height, curTime - title.startTime);
          }
        }

        // Overlay active images & logos
        if (project.images) {
          for (const imgOverlay of (project.images || [])) {
            if (curTime >= imgOverlay.startTime && curTime <= imgOverlay.startTime + imgOverlay.duration) {
              const cachedImg = imagesCacheRef.current.get(imgOverlay.id);
              drawImageOverlay(ctx, imgOverlay, cachedImg, canvas.width, canvas.height, curTime - imgOverlay.startTime, false);
            }
          }
        }

        // Playback sync for voiceovers
        if (!isRecordingVoiceoverRef.current) {
          (project.voiceovers || []).forEach((vo) => {
            const voAudio = voiceoverAudiosRef.current.get(vo.id);
            if (voAudio) {
              const voEnd = vo.startTime + vo.duration;
              if (curTime >= vo.startTime && curTime <= voEnd) {
                const targetAudioTime = curTime - vo.startTime;
                if (Math.abs(voAudio.currentTime - targetAudioTime) > 0.18) {
                  voAudio.currentTime = targetAudioTime;
                }
                voAudio.volume = Math.max(0, Math.min(1, vo.volume ?? 1));
                if (voAudio.paused) {
                  voAudio.play().catch(() => {});
                }
              } else {
                if (!voAudio.paused) {
                  voAudio.pause();
                }
              }
            }
          });
        }
      } catch (err) {
        console.warn("playbackLoop render error:", err);
      }

      animationFrameRef.current = requestAnimationFrame(playbackLoop);
    };

    animationFrameRef.current = requestAnimationFrame(playbackLoop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      voiceoverAudiosRef.current.forEach(a => a.pause());
    };
  }, [isPlaying, totalDuration, project]);

  const renderStaticPreviewAt = (time: number) => {
    try {
      const canvas = previewCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const clips = project.clips || [];

      if (clips.length === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = '15px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Ajoutez des clips depuis le chutier pour commencer le montage', canvas.width / 2, canvas.height / 2);

        // Overlay active titles if any
        for (const title of (project.titles || [])) {
          if (time >= title.startTime && time <= title.startTime + title.duration) {
            drawTitleOverlay(ctx, title, canvas.width, canvas.height, time - title.startTime);
          }
        }
        // Overlay active images if any
        if (project.images) {
          for (const imgOverlay of (project.images || [])) {
            if (time >= imgOverlay.startTime && time <= imgOverlay.startTime + imgOverlay.duration) {
              const cachedImg = imagesCacheRef.current.get(imgOverlay.id);
              if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
                drawImageOverlay(ctx, imgOverlay, cachedImg, canvas.width, canvas.height, time - imgOverlay.startTime, true);
              }
            }
          }
        }
        return;
      }

      // Apply Timeline Zoom Transform if active at preview time
      const activeZoom = getActiveTimelineZoom(project.zooms || [], time);
      const isZoomed = applyTimelineZoomTransform(ctx, activeZoom, time, canvas.width, canvas.height);

      let cumulative = 0;
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const speed = clip.playbackSpeed && clip.playbackSpeed > 0 ? clip.playbackSpeed : 1.0;
        const clipDuration = Math.max(0.1, (clip.endTrim - clip.startTrim) / speed);
        const isLast = i === clips.length - 1;
        const transDur = (!isLast && clip.transitionToNext !== 'none')
          ? Math.min(clip.transitionDuration, clipDuration / 2)
          : 0;

        const clipStart = cumulative;
        const clipEnd = cumulative + clipDuration;

        if (time >= clipStart && time <= clipEnd) {
          if (clip.type === 'slide' && clip.slideContent) {
            drawSlideClip(ctx, clip.slideContent, canvas.width, canvas.height);
          } else if (clip.type === 'image') {
            let imgEl = imagesCacheRef.current.get(clip.id);
            if (!imgEl && (clip.video?.thumbnail || (clip.video?.blob && clip.video.blob.size > 0))) {
              imgEl = new Image();
              imgEl.src = clip.video?.thumbnail || (clip.video?.blob ? URL.createObjectURL(clip.video.blob) : '');
              imagesCacheRef.current.set(clip.id, imgEl);
            }
            if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
              drawImageClip(ctx, imgEl, canvas.width, canvas.height);
            }
          } else {
            const videoEl = videoElementsRef.current.get(clip.id);
            let frameDrawn = false;

            if (videoEl) {
              const targetClipTime = Math.max(0, Math.min(
                videoEl.duration || 9999,
                ((time - clipStart) * speed) + clip.startTrim
              ));
              const timeDiff = Math.abs(videoEl.currentTime - targetClipTime);

              // Draw the current ready frame immediately so preview does not flash black
              if (videoEl.readyState >= 2) {
                ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
                if (speed > 1.0) {
                  drawFastForwardBadge(ctx, speed, canvas.width, canvas.height);
                }
                frameDrawn = true;
              }

              // If the target position is different, perform seek and re-render once seeked
              if (timeDiff > 0.05) {
                const onSeeked = () => {
                  videoEl.removeEventListener('seeked', onSeeked);
                  if (!isPlayingRef.current) {
                    renderStaticPreviewAt(currentTimeRef.current);
                  }
                };
                videoEl.addEventListener('seeked', onSeeked, { once: true });
                videoEl.currentTime = targetClipTime;
              } else if (videoEl.readyState < 2) {
                // Wait for video data if not yet loaded
                const onCanPlay = () => {
                  videoEl.removeEventListener('canplay', onCanPlay);
                  videoEl.removeEventListener('loadeddata', onCanPlay);
                  if (!isPlayingRef.current) {
                    renderStaticPreviewAt(currentTimeRef.current);
                  }
                };
                videoEl.addEventListener('canplay', onCanPlay, { once: true });
                videoEl.addEventListener('loadeddata', onCanPlay, { once: true });
              }
            }

            // Fallback if video frame is not yet ready: draw thumbnail so screen is NEVER black or empty!
            if (!frameDrawn && clip.video?.thumbnail) {
              let thumbImg = imagesCacheRef.current.get(`thumb_${clip.id}`);
              if (!thumbImg) {
                thumbImg = new Image();
                thumbImg.onload = () => {
                  if (!isPlayingRef.current) renderStaticPreviewAt(currentTimeRef.current);
                };
                thumbImg.src = clip.video.thumbnail;
                imagesCacheRef.current.set(`thumb_${clip.id}`, thumbImg);
              }
              if (thumbImg && thumbImg.complete && thumbImg.naturalWidth > 0) {
                ctx.drawImage(thumbImg, 0, 0, canvas.width, canvas.height);
                if (speed > 1.0) {
                  drawFastForwardBadge(ctx, speed, canvas.width, canvas.height);
                }
              }
            }
          }

          // Render transition to next clip if inside transition window
          if (!isLast && clip.transitionToNext !== 'none' && time > clipEnd - transDur) {
            const transProgress = (time - (clipEnd - transDur)) / transDur;
            const nextClip = clips[i + 1];

            const drawNextStaticFrame = (targetCtx: CanvasRenderingContext2D, offX: number = 0) => {
              if (!nextClip) return;
              if (nextClip.type === 'slide' && nextClip.slideContent) {
                if (offX !== 0) {
                  targetCtx.save();
                  targetCtx.translate(offX, 0);
                  drawSlideClip(targetCtx, nextClip.slideContent, canvas.width, canvas.height);
                  targetCtx.restore();
                } else {
                  drawSlideClip(targetCtx, nextClip.slideContent, canvas.width, canvas.height);
                }
              } else if (nextClip.type === 'image') {
                let nextImg = imagesCacheRef.current.get(nextClip.id);
                if (!nextImg && (nextClip.video?.thumbnail || (nextClip.video?.blob && nextClip.video.blob.size > 0))) {
                  nextImg = new Image();
                  nextImg.src = nextClip.video?.thumbnail || (nextClip.video?.blob ? URL.createObjectURL(nextClip.video.blob) : '');
                  imagesCacheRef.current.set(nextClip.id, nextImg);
                }
                if (nextImg && nextImg.complete && nextImg.naturalWidth > 0) {
                  if (offX !== 0) {
                    targetCtx.save();
                    targetCtx.translate(offX, 0);
                    drawImageClip(targetCtx, nextImg, canvas.width, canvas.height);
                    targetCtx.restore();
                  } else {
                    drawImageClip(targetCtx, nextImg, canvas.width, canvas.height);
                  }
                }
              } else {
                const nextVideoEl = videoElementsRef.current.get(nextClip.id);
                if (nextVideoEl) {
                  const nextTargetTime = nextClip.startTrim + (transProgress * transDur);
                  if (Math.abs(nextVideoEl.currentTime - nextTargetTime) > 0.05) {
                    const onNextSeeked = () => {
                      nextVideoEl.removeEventListener('seeked', onNextSeeked);
                      if (!isPlayingRef.current) {
                        renderStaticPreviewAt(currentTimeRef.current);
                      }
                    };
                    nextVideoEl.addEventListener('seeked', onNextSeeked, { once: true });
                    nextVideoEl.currentTime = nextTargetTime;
                  }

                  if (nextVideoEl.readyState >= 2) {
                    targetCtx.drawImage(nextVideoEl, offX, 0, canvas.width, canvas.height);
                  } else if (nextClip.video?.thumbnail) {
                    let nextThumb = imagesCacheRef.current.get(`thumb_${nextClip.id}`);
                    if (!nextThumb) {
                      nextThumb = new Image();
                      nextThumb.src = nextClip.video.thumbnail;
                      imagesCacheRef.current.set(`thumb_${nextClip.id}`, nextThumb);
                    }
                    if (nextThumb && nextThumb.complete && nextThumb.naturalWidth > 0) {
                      targetCtx.drawImage(nextThumb, offX, 0, canvas.width, canvas.height);
                    }
                  }
                }
              }
            };

            ctx.save();
            if (clip.transitionToNext === 'crossfade') {
              ctx.globalAlpha = transProgress;
              drawNextStaticFrame(ctx, 0);
            } else if (clip.transitionToNext === 'fade-black') {
              ctx.fillStyle = '#000000';
              ctx.globalAlpha = Math.sin(transProgress * Math.PI);
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            } else if (clip.transitionToNext === 'slide') {
              const offsetX = (1.0 - transProgress) * canvas.width;
              drawNextStaticFrame(ctx, offsetX);
            }
            ctx.restore();
          }

          break;
        }

        cumulative += clipDuration - transDur;
      }

      // Restore zoom transform before drawing text titles
      if (isZoomed) {
        ctx.restore();
      }

      for (const title of (project.titles || [])) {
        if (time >= title.startTime && time <= title.startTime + title.duration) {
          drawTitleOverlay(ctx, title, canvas.width, canvas.height, time - title.startTime);
        }
      }

      if (project.images) {
        for (const imgOverlay of (project.images || [])) {
          if (time >= imgOverlay.startTime && time <= imgOverlay.startTime + imgOverlay.duration) {
            let cachedImg = imagesCacheRef.current.get(imgOverlay.id);
            if (!cachedImg && imgOverlay.dataUrl) {
              cachedImg = new Image();
              cachedImg.onload = () => {
                if (!isPlayingRef.current) renderStaticPreviewAt(currentTimeRef.current);
              };
              cachedImg.src = imgOverlay.dataUrl;
              imagesCacheRef.current.set(imgOverlay.id, cachedImg);
            } else if (cachedImg && (!cachedImg.complete || cachedImg.naturalWidth === 0)) {
              cachedImg.onload = () => {
                if (!isPlayingRef.current) renderStaticPreviewAt(currentTimeRef.current);
              };
            }
            if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
              drawImageOverlay(ctx, imgOverlay, cachedImg, canvas.width, canvas.height, time - imgOverlay.startTime, true);
            }
          }
        }
      }
    } catch (err) {
      console.warn("renderStaticPreviewAt error:", err);
    }
  };

  // --- Project Video Export ---

  const handleCancelExport = () => {
    abortExportRef.current = true;
    setIsExporting(false);
    setExportStatus('');
    setExportProgress(0);
    setExportCurrentSec(0);
  };

  const handleExportProject = async () => {
    if (project.clips.length === 0 || totalDuration <= 0) {
      alert("Ajoutez au moins un clip à la timeline avant d'exporter.");
      return;
    }

    abortExportRef.current = false;
    setExportCurrentSec(0);
    videoElementsRef.current.forEach(v => v.pause());
    if (bgMusicAudioRef.current) bgMusicAudioRef.current.pause();
    isPlayingRef.current = false;
    setIsPlaying(false);
    setIsExporting(true);
    setExportProgress(0);
    setExportStatus('Préparation du montage et des médias...');

    // Preload all timeline images and image clips in cache for synchronous canvas rendering
    if (project.images && project.images.length > 0) {
      for (const img of project.images) {
        if (!imagesCacheRef.current.has(img.id) && img.dataUrl) {
          const imageEl = new Image();
          imageEl.src = img.dataUrl;
          await new Promise((resolve) => {
            imageEl.onload = resolve;
            imageEl.onerror = resolve;
          });
          imagesCacheRef.current.set(img.id, imageEl);
        }
      }
    }

    for (const clip of project.clips) {
      if (clip.type === 'image') {
        if (!imagesCacheRef.current.has(clip.id)) {
          const imageEl = new Image();
          if (clip.video.thumbnail) {
            imageEl.src = clip.video.thumbnail;
          } else if (clip.video.blob && clip.video.blob.size > 0) {
            imageEl.src = URL.createObjectURL(clip.video.blob);
          }
          await new Promise((resolve) => {
            imageEl.onload = resolve;
            imageEl.onerror = resolve;
          });
          imagesCacheRef.current.set(clip.id, imageEl);
        }
      } else if (clip.type === 'slide' && clip.slideContent?.bgImageUrl) {
        const cacheKey = `slide_bg_${clip.id}`;
        if (!imagesCacheRef.current.has(cacheKey)) {
          const imageEl = new Image();
          imageEl.src = clip.slideContent.bgImageUrl;
          await new Promise((resolve) => {
            imageEl.onload = resolve;
            imageEl.onerror = resolve;
          });
          if (clip.slideContent) clip.slideContent.bgImageEl = imageEl;
          imagesCacheRef.current.set(cacheKey, imageEl);
        }
      }
    }

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 1920;
    exportCanvas.height = 1080;
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) {
      setIsExporting(false);
      alert("Erreur: Contexte Canvas indisponible.");
      return;
    }

    // Build clean AudioContext + Destination
    let exportAudioCtx: AudioContext | null = null;
    let dest: MediaStreamAudioDestinationNode | null = null;
    let voiceAnalyser: AnalyserNode | null = null;
    let voiceDataArray: Uint8Array | null = null;
    const exportVideos = new Map<string, HTMLVideoElement>();
    const exportVoiceovers = new Map<string, HTMLAudioElement>();
    let bgExportAudioEl: HTMLAudioElement | null = null;
    let bgGain: GainNode | null = null;
    const container = exportContainerRef.current || document.body;

    try {
      exportAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (exportAudioCtx.state === 'suspended') {
        await exportAudioCtx.resume();
      }
      dest = exportAudioCtx.createMediaStreamDestination();

      voiceAnalyser = exportAudioCtx.createAnalyser();
      voiceAnalyser.fftSize = 256;
      voiceDataArray = new Uint8Array(voiceAnalyser.frequencyBinCount);

      // Create fresh dedicated video elements for this export session in the DOM (skip slides and images)
      for (const clip of project.clips) {
        if (clip.type === 'slide' || clip.type === 'image') continue;
        const v = document.createElement('video');
        v.src = URL.createObjectURL(clip.video.blob);
        v.preload = 'auto';
        v.playsInline = true;
        v.muted = false;
        v.volume = 1.0;
        container.appendChild(v);
        exportVideos.set(clip.id, v);

        try {
          const source = exportAudioCtx.createMediaElementSource(v);
          source.connect(dest);
          source.connect(voiceAnalyser);
        } catch (audioErr) {
          console.warn("Audio node connection error for clip:", clip.id, audioErr);
        }
      }

      // Connect Background Music if present
      if (project.backgroundMusic && project.backgroundMusic.blob) {
        bgExportAudioEl = document.createElement('audio');
        bgExportAudioEl.src = URL.createObjectURL(project.backgroundMusic.blob);
        bgExportAudioEl.loop = project.backgroundMusic.loop !== false;
        container.appendChild(bgExportAudioEl);
        try {
          const bgSource = exportAudioCtx.createMediaElementSource(bgExportAudioEl);
          bgGain = exportAudioCtx.createGain();
          bgGain.gain.value = project.backgroundMusic.volume ?? 0.15;
          bgSource.connect(bgGain);
          bgGain.connect(dest);
        } catch (e) {
          console.warn("Bg music audio route error:", e);
        }
      }

      // Connect Voiceovers if present
      if (project.voiceovers && project.voiceovers.length > 0) {
        for (const vo of project.voiceovers) {
          if (!vo.blob) continue;
          const voEl = document.createElement('audio');
          voEl.src = URL.createObjectURL(vo.blob);
          voEl.volume = Math.max(0, Math.min(1, vo.volume ?? 1));
          container.appendChild(voEl);
          exportVoiceovers.set(vo.id, voEl);

          try {
            const voSource = exportAudioCtx.createMediaElementSource(voEl);
            const voGain = exportAudioCtx.createGain();
            voGain.gain.value = Math.max(0, Math.min(1, vo.volume ?? 1));
            voSource.connect(voGain);
            voGain.connect(dest);
            if (voiceAnalyser) {
              voGain.connect(voiceAnalyser);
            }
          } catch (audioErr) {
            console.warn("Audio node connection error for voiceover:", vo.id, audioErr);
          }
        }
      }
    } catch (e) {
      console.warn("AudioContext setup warning:", e);
    }

    // Wait for all clips to load enough data (readyState >= 2) (skip slides and images)
    setExportStatus('Préparation et décodage des vidéos...');
    await Promise.all(project.clips.map((clip) => {
      if (clip.type === 'slide' || clip.type === 'image') return Promise.resolve();
      const v = exportVideos.get(clip.id);
      if (!v || v.readyState >= 2) return Promise.resolve();
      return new Promise<void>((resolve) => {
        let isDone = false;
        const done = () => {
          if (!isDone) {
            isDone = true;
            v.removeEventListener('loadeddata', done);
            v.removeEventListener('canplay', done);
            resolve();
          }
        };
        v.addEventListener('loadeddata', done);
        v.addEventListener('canplay', done);
        setTimeout(done, 2500);
      });
    }));

    // Pre-seek first clip if applicable
    if (project.clips.length > 0) {
      const firstClip = project.clips[0];
      if (firstClip.type !== 'slide' && firstClip.type !== 'image') {
        const firstVideo = exportVideos.get(firstClip.id);
        if (firstVideo && firstClip.startTrim > 0) {
          firstVideo.currentTime = firstClip.startTrim;
          await new Promise<void>((resolve) => {
            if (Math.abs(firstVideo.currentTime - firstClip.startTrim) < 0.1) {
              resolve();
              return;
            }
            const onSeek = () => {
              firstVideo.removeEventListener('seeked', onSeek);
              resolve();
            };
            firstVideo.addEventListener('seeked', onSeek);
            setTimeout(resolve, 1000);
          });
        }
      }
    }

    // Capture canvas video stream (called ONCE)
    const canvasStream = exportCanvas.captureStream(30);
    const audioTracks = dest ? dest.stream.getAudioTracks() : [];
    const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
    if (audioTracks.length > 0) {
      combinedTracks.push(audioTracks[0]);
    }
    const combinedStream = new MediaStream(combinedTracks);

    // Record via WebM for 100% stability with Web Audio (prevents Chromium MP4 audio encoding crash)
    const chosenMime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : (MediaRecorder.isTypeSupported('video/webm;codecs=h264,opus')
          ? 'video/webm;codecs=h264,opus'
          : 'video/webm');

    const mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType: chosenMime
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    let isFinished = false;
    let animId: number | null = null;
    let watchdogTimer: any = null;

    const cleanupExportSession = () => {
      isFinished = true;
      if (animId) cancelAnimationFrame(animId);
      if (watchdogTimer) clearInterval(watchdogTimer);
      exportVideos.forEach((v) => {
        v.pause();
        URL.revokeObjectURL(v.src);
        v.remove();
      });
      exportVideos.clear();
      exportVoiceovers.forEach((voEl) => {
        voEl.pause();
        URL.revokeObjectURL(voEl.src);
        voEl.remove();
      });
      exportVoiceovers.clear();
      if (bgExportAudioEl) {
        bgExportAudioEl.pause();
        URL.revokeObjectURL(bgExportAudioEl.src);
        bgExportAudioEl.remove();
      }
      if (exportAudioCtx) {
        exportAudioCtx.close().catch(() => {});
      }
    };

    mediaRecorder.onerror = (event: any) => {
      console.error("MediaRecorder export error:", event);
      cleanupExportSession();
      setIsExporting(false);
      setExportStatus('');
      alert("Une erreur est survenue lors de l'enregistrement du flux vidéo.");
    };

    setExportStatus('Enregistrement du montage en cours...');
    mediaRecorder.start(100);
    if (bgExportAudioEl) {
      bgExportAudioEl.play().catch(() => {});
    }

    const startTime = performance.now();
    let lastTickTime = performance.now();

    const exportLoop = () => {
      if (isFinished || abortExportRef.current) return;
      lastTickTime = performance.now();
      const now = performance.now();
      const elapsedSec = (now - startTime) / 1000;

      if (elapsedSec >= totalDuration) {
        isFinished = true;
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
        return;
      }

      const currentExportTime = Math.min(totalDuration, elapsedSec);
      setExportCurrentSec(currentExportTime);
      const pct = Math.min(94, Math.round((currentExportTime / totalDuration) * 94));
      setExportProgress(pct);
      setExportStatus(`Enregistrement du flux (${formatTime(currentExportTime)} / ${formatTime(totalDuration)})`);

      // Auto-ducking: dynamically lower background music volume during speech
      if (bgGain && exportAudioCtx && project.backgroundMusic && project.backgroundMusic.autoDucking !== false && voiceAnalyser && voiceDataArray) {
        voiceAnalyser.getByteFrequencyData(voiceDataArray as any);
        let sum = 0;
        for (let i = 0; i < voiceDataArray.length; i++) {
          sum += voiceDataArray[i];
        }
        const avg = sum / voiceDataArray.length;
        const baseVol = project.backgroundMusic.volume ?? 0.15;
        const duckingMult = project.backgroundMusic.duckingLevel ?? 0.25;
        const isVoiceActive = avg > 8; // detected speech threshold
        const targetVol = isVoiceActive ? baseVol * duckingMult : baseVol;
        bgGain.gain.setTargetAtTime(targetVol, exportAudioCtx.currentTime, 0.12);
      }

      exportCtx.fillStyle = '#0a0a0a';
      exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

      // Apply Timeline Zoom Transform in final render
      const activeZoom = getActiveTimelineZoom(project.zooms, currentExportTime);
      const isZoomed = applyTimelineZoomTransform(exportCtx, activeZoom, currentExportTime, exportCanvas.width, exportCanvas.height);

      let cumulative = 0;
      for (let i = 0; i < project.clips.length; i++) {
        const clip = project.clips[i];
        const speed = clip.playbackSpeed && clip.playbackSpeed > 0 ? clip.playbackSpeed : 1.0;
        const clipDuration = Math.max(0.1, (clip.endTrim - clip.startTrim) / speed);
        const isLast = i === project.clips.length - 1;
        const transDur = (!isLast && clip.transitionToNext !== 'none')
          ? Math.min(clip.transitionDuration, clipDuration / 2)
          : 0;

        const clipStart = cumulative;
        const clipEnd = cumulative + clipDuration;
        const videoEl = exportVideos.get(clip.id);

        if (currentExportTime >= clipStart && currentExportTime <= clipEnd) {
          if (clip.type === 'slide' && clip.slideContent) {
            drawSlideClip(exportCtx, clip.slideContent, exportCanvas.width, exportCanvas.height);
          } else if (clip.type === 'image') {
            const cachedImg = imagesCacheRef.current.get(clip.id);
            if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
              drawImageClip(exportCtx, cachedImg, exportCanvas.width, exportCanvas.height);
            }
          } else if (videoEl) {
            videoEl.playbackRate = speed;
            if (videoEl.paused) {
              const expectedVideoTime = clip.startTrim + ((currentExportTime - clipStart) * speed);
              videoEl.currentTime = expectedVideoTime;
              videoEl.play().catch(() => {});
            }

            if (videoEl.readyState >= 1) {
              exportCtx.drawImage(videoEl, 0, 0, exportCanvas.width, exportCanvas.height);
              if (speed > 1.0) {
                drawFastForwardBadge(exportCtx, speed, exportCanvas.width, exportCanvas.height);
              }
            }
          }

          if (!isLast && clip.transitionToNext !== 'none' && currentExportTime > clipEnd - transDur) {
            const transProgress = (currentExportTime - (clipEnd - transDur)) / transDur;
            const nextClip = project.clips[i + 1];

            const drawNextExportFrame = (targetCtx: CanvasRenderingContext2D, offX: number = 0) => {
              if (nextClip.type === 'slide' && nextClip.slideContent) {
                if (offX !== 0) {
                  targetCtx.save();
                  targetCtx.translate(offX, 0);
                  drawSlideClip(targetCtx, nextClip.slideContent, exportCanvas.width, exportCanvas.height);
                  targetCtx.restore();
                } else {
                  drawSlideClip(targetCtx, nextClip.slideContent, exportCanvas.width, exportCanvas.height);
                }
              } else if (nextClip.type === 'image') {
                const nextImg = imagesCacheRef.current.get(nextClip.id);
                if (nextImg && nextImg.complete && nextImg.naturalWidth > 0) {
                  if (offX !== 0) {
                    targetCtx.save();
                    targetCtx.translate(offX, 0);
                    drawImageClip(targetCtx, nextImg, exportCanvas.width, exportCanvas.height);
                    targetCtx.restore();
                  } else {
                    drawImageClip(targetCtx, nextImg, exportCanvas.width, exportCanvas.height);
                  }
                }
              } else {
                const nextVideoEl = exportVideos.get(nextClip.id);
                if (nextVideoEl) {
                  if (nextVideoEl.paused) {
                    const nextExpectedTime = nextClip.startTrim + (transProgress * transDur);
                    nextVideoEl.currentTime = nextExpectedTime;
                    nextVideoEl.play().catch(() => {});
                  }

                  if (nextVideoEl.readyState >= 1) {
                    targetCtx.drawImage(nextVideoEl, offX, 0, exportCanvas.width, exportCanvas.height);
                  }
                }
              }
            };

            exportCtx.save();
            if (clip.transitionToNext === 'crossfade') {
              exportCtx.globalAlpha = transProgress;
              drawNextExportFrame(exportCtx, 0);
            } else if (clip.transitionToNext === 'fade-black') {
              exportCtx.fillStyle = '#000000';
              exportCtx.globalAlpha = Math.sin(transProgress * Math.PI);
              exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
            } else if (clip.transitionToNext === 'slide') {
              const offsetX = (1.0 - transProgress) * exportCanvas.width;
              drawNextExportFrame(exportCtx, offsetX);
            }
            exportCtx.restore();
          }
        } else {
          if (videoEl && !videoEl.paused && (currentExportTime < clipStart - 0.5 || currentExportTime > clipEnd + 0.5)) {
            videoEl.pause();
          }
        }

        cumulative += clipDuration - transDur;
      }


      // Restore zoom transform before drawing text titles on top
      if (isZoomed) {
        exportCtx.restore();
      }

      // Overlay titles
      for (const title of project.titles) {
        if (currentExportTime >= title.startTime && currentExportTime <= title.startTime + title.duration) {
          drawTitleOverlay(exportCtx, title, exportCanvas.width, exportCanvas.height, currentExportTime - title.startTime);
        }
      }

      // Overlay active images & logos
      if (project.images) {
        for (const imgOverlay of project.images) {
          if (currentExportTime >= imgOverlay.startTime && currentExportTime <= imgOverlay.startTime + imgOverlay.duration) {
            const cachedImg = imagesCacheRef.current.get(imgOverlay.id);
            drawImageOverlay(exportCtx, imgOverlay, cachedImg, exportCanvas.width, exportCanvas.height, currentExportTime - imgOverlay.startTime);
          }
        }
      }

      // Sync voiceovers during export
      (project.voiceovers || []).forEach((vo) => {
        const voEl = exportVoiceovers.get(vo.id);
        if (voEl) {
          const voEnd = vo.startTime + vo.duration;
          if (currentExportTime >= vo.startTime && currentExportTime <= voEnd) {
            if (voEl.paused) {
              voEl.currentTime = Math.max(0, currentExportTime - vo.startTime);
              voEl.play().catch(() => {});
            }
          } else {
            if (!voEl.paused) {
              voEl.pause();
            }
          }
        }
      });

      // Mirror rendered frame to master monitor canvas for live visual feedback
      if (previewCanvasRef.current) {
        const pCtx = previewCanvasRef.current.getContext('2d');
        if (pCtx) {
          pCtx.drawImage(exportCanvas, 0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
        }
      }

      animId = requestAnimationFrame(exportLoop);
    };

    // Watchdog timer to ensure export continues even when window is minimized / backgrounded
    watchdogTimer = setInterval(() => {
      if (isFinished || abortExportRef.current) {
        clearInterval(watchdogTimer);
        return;
      }
      if (performance.now() - lastTickTime > 80) {
        exportLoop();
      }
    }, 40);

    animId = requestAnimationFrame(exportLoop);

    mediaRecorder.onstop = async () => {
      cleanupExportSession();
      if (abortExportRef.current) return;

      let finalBlob = new Blob(chunks, { type: 'video/webm' });
      let outputExt: 'mp4' | 'webm' = 'webm';

      if (exportFormat === 'mp4') {
        try {
          setExportStatus('Finalisation MP4 (H.264 / AAC)...');
          setExportProgress(96);
          const { invoke } = await import('@tauri-apps/api/core');
          const isFfmpeg = await invoke<boolean>('is_ffmpeg_available').catch(() => false);
          if (isFfmpeg) {
            setExportStatus('Encodage haute qualité FFmpeg...');
            setExportProgress(98);
            const arrayBuf = await finalBlob.arrayBuffer();
            const mp4Data = await invoke<ArrayBuffer | Uint8Array>('convert_webm_to_mp4', new Uint8Array(arrayBuf));
            if (mp4Data instanceof ArrayBuffer) {
              finalBlob = new Blob([mp4Data], { type: 'video/mp4' });
            } else {
              finalBlob = new Blob([mp4Data as any], { type: 'video/mp4' });
            }
            outputExt = 'mp4';
          } else {
            console.warn("FFmpeg non détecté, exportation WebM.");
            outputExt = 'webm';
          }
        } catch (convErr) {
          console.warn("Erreur lors de la conversion MP4 via FFmpeg:", convErr);
          outputExt = 'webm';
        }
      }

      setExportedBlob(finalBlob);
      setIsExporting(false);
      setExportStatus('');
      setExportProgress(100);
      setSaveSuccessMsg(`Montage exporté en ${outputExt.toUpperCase()} avec succès !`);
      setTimeout(() => setSaveSuccessMsg(null), 5000);

      // Save to IndexedDB
      await saveRecording({
        id: crypto.randomUUID ? crypto.randomUUID() : `montage_${Date.now()}`,
        title: `${projectName || 'Montage'}.${outputExt}`,
        blob: finalBlob,
        thumbnail: exportCanvas.toDataURL('image/jpeg', 0.8),
        duration: Math.round(totalDuration),
        size: finalBlob.size,
        date: new Date().toISOString()
      });
      loadLibraryAndProjects();
    };
  };

  const handleDownloadExported = () => {
    if (!exportedBlob) return;
    const url = URL.createObjectURL(exportedBlob);
    const a = document.createElement('a');
    a.href = url;
    const isMp4 = exportedBlob.type.includes('mp4');
    const ext = isMp4 ? 'mp4' : 'webm';
    a.download = `${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'montage'}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
      {/* Hidden container for rendering & export media elements */}
      <div 
        ref={exportContainerRef}
        style={{ position: 'fixed', left: -9999, top: -9999, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} 
        aria-hidden="true"
      />
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".captproj,.json"
        style={{ display: 'none' }}
        onChange={handleImportProjectFile}
      />
      <input
        type="file"
        ref={audioFileInputRef}
        accept="audio/*,.mp3,.wav,.m4a,.ogg"
        style={{ display: 'none' }}
        onChange={handleUploadAudio}
      />
      <input
        type="file"
        ref={videoFileInputRef}
        accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv"
        style={{ display: 'none' }}
        onChange={handleImportVideoFromDisk}
      />

      {/* Top Project Bar */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={16} color="#c084fc" />
          <input
            type="text"
            className="form-input"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            style={{ width: '220px', padding: '4px 8px', fontSize: '13px', fontWeight: 600 }}
            placeholder="Nom du projet"
          />
          {saveSuccessMsg && (
            <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Check size={12} /> {saveSuccessMsg}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className="btn-primary"
            onClick={handleSaveProject}
            style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}
            title="Enregistrer ce montage dans votre base locale"
          >
            <Save size={13} />
            <span>Enregistrer</span>
          </button>

          <button
            className="btn-secondary"
            onClick={() => setIsProjectListModalOpen(true)}
            style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}
            title="Ouvrir un projet enregistré"
          >
            <FolderOpen size={13} />
            <span>Mes Projets ({savedProjects.length})</span>
          </button>

          <button
            className="btn-toolbar"
            onClick={handleNewProject}
            style={{ padding: '4px 8px', fontSize: '11px' }}
            title="Démarrer un nouveau projet vierge"
          >
            <RefreshCw size={12} />
            <span>Nouveau</span>
          </button>

          <button
            className="btn-toolbar"
            onClick={handleExportProjectFile}
            style={{ padding: '4px 8px', fontSize: '11px' }}
            title="Exporter le fichier projet (.captproj) sur votre PC"
          >
            <Download size={12} />
            <span>Export .captproj</span>
          </button>

          <button
            className="btn-toolbar"
            onClick={() => fileInputRef.current?.click()}
            style={{ padding: '4px 8px', fontSize: '11px' }}
            title="Importer un fichier projet (.captproj) depuis votre PC"
          >
            <Upload size={12} />
            <span>Importer</span>
          </button>
        </div>
      </div>

      {/* Middle Split: Media Bin & Master Preview Player */}
      <div style={{ display: 'grid', gridTemplateColumns: '270px 1fr', gap: '12px' }}>
        {/* Media Bin (Chutier) */}
        <div className="glass-panel" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', height: `${PREVIEW_HEIGHTS[previewSize]}px`, transition: 'height 0.22s ease-in-out' }}>
          {/* Hidden image file input */}
          <input
            type="file"
            ref={imageFileInputRef}
            onChange={handleImportImageFromDisk}
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
            style={{ display: 'none' }}
          />

          {/* Chutier Tabs */}
          <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
            <button
              onClick={() => setChutierTab('videos')}
              style={{
                flex: 1,
                padding: '4px 6px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: chutierTab === 'videos' ? 'rgba(192, 132, 252, 0.2)' : 'transparent',
                border: chutierTab === 'videos' ? '1px solid #c084fc' : '1px solid transparent',
                color: chutierTab === 'videos' ? '#c084fc' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <Film size={12} />
              <span>Vidéos ({libraryVideos.length})</span>
            </button>

            <button
              onClick={() => setChutierTab('images')}
              style={{
                flex: 1,
                padding: '4px 6px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: chutierTab === 'images' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                border: chutierTab === 'images' ? '1px solid #10b981' : '1px solid transparent',
                color: chutierTab === 'images' ? '#34d399' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <ImageIcon size={12} />
              <span>Images ({libraryImages.length})</span>
            </button>

            <button
              onClick={() => setChutierTab('audio')}
              style={{
                flex: 1,
                padding: '4px 6px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: chutierTab === 'audio' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                border: chutierTab === 'audio' ? '1px solid #38bdf8' : '1px solid transparent',
                color: chutierTab === 'audio' ? '#38bdf8' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <Music size={12} />
              <span>Musiques</span>
            </button>
          </div>

          {/* Videos Tab Content */}
          {chutierTab === 'videos' && (
            <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <button
                className="btn-toolbar"
                onClick={() => videoFileInputRef.current?.click()}
                style={{
                  padding: '5px 8px',
                  fontSize: '11px',
                  backgroundColor: 'rgba(6, 182, 212, 0.15)',
                  border: '1px solid rgba(6, 182, 212, 0.4)',
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  borderRadius: '4px'
                }}
                title="Importer un fichier vidéo depuis votre PC (MP4, WebM, MOV, MKV)"
              >
                <Upload size={12} />
                <span>+ Importer une Vidéo</span>
              </button>

              {libraryVideos.map((v) => (
                <div 
                  key={v.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '5px 7px', 
                    borderRadius: '5px', 
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-color)',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                    {v.thumbnail ? (
                      <img src={v.thumbnail} alt="" style={{ width: '32px', height: '20px', objectFit: 'cover', borderRadius: '3px' }} />
                    ) : (
                      <Film size={16} color="#94a3b8" />
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span style={{ fontSize: '11px', fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '140px' }}>{v.title}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{formatTime(v.duration || 0)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    <button
                      className="btn-toolbar"
                      style={{ padding: '2px 5px', fontSize: '10px', backgroundColor: 'rgba(6, 182, 212, 0.2)', color: '#38bdf8' }}
                      onClick={() => setSilenceRemoverLibraryVideo(v)}
                      title="Détecter et supprimer les silences avant d'ajouter à la timeline"
                    >
                      <Scissors size={11} />
                    </button>
                    <button
                      className="btn-toolbar"
                      style={{ padding: '2px 5px', fontSize: '10px', backgroundColor: 'rgba(139, 92, 246, 0.25)', color: '#c084fc' }}
                      onClick={() => addClipToTimeline(v)}
                      title="Ajouter brut à la timeline"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                </div>
              ))}
              {libraryVideos.length === 0 && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                  Aucune capture vidéo enregistrée.
                </div>
              )}
            </div>
          )}

          {/* Images & Logos Tab Content */}
          {chutierTab === 'images' && (
            <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button
                className="btn-toolbar"
                onClick={() => imageFileInputRef.current?.click()}
                style={{
                  padding: '5px 8px',
                  fontSize: '11px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#34d399',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  borderRadius: '4px'
                }}
                title="Importer un logo ou image (PNG transparent, SVG, JPG, WebP)"
              >
                <Upload size={12} />
                <span>+ Importer un Logo / Image</span>
              </button>

              {libraryImages.map((img) => (
                <div
                  key={img.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 6px',
                    borderRadius: '5px',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-color)',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                    <div style={{
                      width: '32px',
                      height: '24px',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      backgroundImage: 'repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 50% / 8px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <img
                        src={img.thumbnail || (img.blob ? URL.createObjectURL(img.blob) : '')}
                        alt=""
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span style={{ fontSize: '11px', fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '130px' }} title={img.title}>
                        {img.title}
                      </span>
                      <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
                        {img.width && img.height ? `${img.width}×${img.height}` : 'Image'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                    <button
                      className="btn-toolbar"
                      style={{ padding: '2px 5px', fontSize: '10px', backgroundColor: 'rgba(6, 182, 212, 0.2)', color: '#38bdf8', borderColor: 'rgba(6, 182, 212, 0.4)', display: 'flex', alignItems: 'center', gap: '2px' }}
                      onClick={() => handleAddImageAsClip(img, 5, 'end')}
                      title="Insérer cette image directement comme un clip diapositive sur la piste vidéo"
                    >
                      <Film size={10} />
                      <span>Diapo</span>
                    </button>
                    <button
                      className="btn-toolbar"
                      style={{ padding: '2px 6px', fontSize: '10px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', borderColor: '#10b981' }}
                      onClick={() => openAddImageOverlayModal(img)}
                      title="Ajouter ce logo en superposition sur la vidéo"
                    >
                      <Plus size={11} />
                    </button>
                    <button
                      style={{ background: 'transparent', border: 'none', color: '#fb7185', cursor: 'pointer', padding: '2px' }}
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm(`Supprimer "${img.title}" de la bibliothèque locale ?`)) {
                          await deleteMedia(img.id);
                          loadLibraryAndProjects();
                        }
                      }}
                      title="Supprimer cette image"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}

              {libraryImages.length === 0 && (
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', padding: '14px 4px', lineHeight: 1.4 }}>
                  Aucun logo ou image enregistré.<br />
                  Cliquez ci-dessus pour importer un logo PNG ou SVG transparent.
                </div>
              )}
            </div>
          )}

          {/* Audio Tab Content */}
          {chutierTab === 'audio' && (
            <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                {/* Voice Generator Button */}
                <button
                  className="btn-primary"
                  onClick={() => setIsVoiceModalOpen(true)}
                  style={{ padding: '4px 6px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: 'linear-gradient(135deg, #c084fc, #ec4899)' }}
                  title="Générer une voix off IA à partir de votre texte"
                >
                  <Mic size={11} />
                  <span>🎙️ Voix Off IA</span>
                </button>

                {/* Upload Button */}
                <button
                  className="btn-secondary"
                  onClick={() => audioFileInputRef.current?.click()}
                  style={{ padding: '4px 6px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  title="Importer un fichier audio existant (MP3, WAV, M4A)"
                >
                  <Upload size={11} />
                  <span>Importer MP3</span>
                </button>
              </div>

              {/* Ambient Presets */}
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '2px' }}>
                Ambiances Libres de Droits :
              </div>
              {AMBIENT_MUSIC_PRESETS.map((preset) => {
                const isSelected = project.backgroundMusic?.id === preset.id;
                return (
                  <div
                    key={preset.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.02)',
                      border: isSelected ? '1px solid #38bdf8' : '1px solid var(--border-color)',
                      fontSize: '11px'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', maxWidth: '170px' }}>
                      <span style={{ fontWeight: 600, color: isSelected ? '#38bdf8' : '#ffffff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {preset.title}
                      </span>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{preset.genre} • {preset.bpm} BPM</span>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => handleSelectPresetMusic(preset.id)}
                        disabled={generatingPresetId === preset.id}
                        style={{
                          background: isSelected ? '#38bdf8' : 'rgba(56, 189, 248, 0.2)',
                          color: isSelected ? '#000000' : '#38bdf8',
                          border: 'none',
                          borderRadius: '3px',
                          padding: '2px 6px',
                          fontSize: '10px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                        title="Ajouter comme musique de fond sur la timeline"
                      >
                        {generatingPresetId === preset.id ? '...' : (isSelected ? '✓ Actif' : '+ Ajouter')}
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Custom Uploaded Audios */}
              {customAudios.length > 0 && (
                <>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Mes Fichiers Importés :
                  </div>
                  {customAudios.map((audio) => {
                    const isSelected = project.backgroundMusic?.id === audio.id;
                    const isPreviewing = previewingAudioId === audio.id;
                    return (
                      <div
                        key={audio.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '4px 6px',
                          borderRadius: '4px',
                          backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.02)',
                          border: isSelected ? '1px solid #38bdf8' : '1px solid var(--border-color)',
                          fontSize: '11px'
                        }}
                      >
                        <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                          {audio.title}
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => handleTogglePreviewAudio(audio.id, audio.blob)}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                            title="Écouter un extrait"
                          >
                            {isPreviewing ? <Pause size={12} /> : <Play size={12} />}
                          </button>
                          <button
                            onClick={() => setProject(prev => ({
                              ...prev,
                              backgroundMusic: {
                                id: audio.id,
                                title: audio.title,
                                blob: audio.blob,
                                volume: prev.backgroundMusic?.volume ?? 0.15,
                                loop: true,
                                isPreset: false
                              }
                            }))}
                            style={{
                              background: isSelected ? '#38bdf8' : 'rgba(56, 189, 248, 0.2)',
                              color: isSelected ? '#000000' : '#38bdf8',
                              border: 'none',
                              borderRadius: '3px',
                              padding: '2px 5px',
                              fontSize: '10px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            {isSelected ? '✓ Actif' : '+ Ajouter'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>

        {/* Master Monitor Preview */}
        <div 
          ref={previewContainerRef}
          className={`glass-panel editor-monitor-panel ${isFullscreen ? 'is-fullscreen' : ''}`}
          style={{ 
            padding: isFullscreen ? '16px 24px' : '10px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '6px', 
            height: isFullscreen ? undefined : `${PREVIEW_HEIGHTS[previewSize]}px`,
            transition: 'height 0.22s ease-in-out'
          }}
        >
          {/* Header Bar: Title, Size Selector, and Fullscreen Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ 
                fontSize: '11px', 
                fontWeight: 700, 
                color: isFullscreen ? '#a78bfa' : 'var(--text-secondary)', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px' 
              }}>
                <Film size={12} color="#8b5cf6" />
                <span>{isFullscreen ? 'MONITEUR MASTER PLEIN ÉCRAN' : 'Moniteur Vidéo Master'}</span>
              </span>
              {isFullscreen && (
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#f1f5f9' }}>
                  • {projectName}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Size Preset Selector (Compact / Standard / Grand) */}
              {!isFullscreen && (
                <div style={{
                  display: 'flex',
                  backgroundColor: 'rgba(0,0,0,0.35)',
                  borderRadius: '5px',
                  padding: '2px',
                  border: '1px solid var(--border-color)',
                  gap: '2px'
                }}>
                  <button
                    type="button"
                    onClick={() => updatePreviewSize('compact')}
                    style={{
                      padding: '2px 7px',
                      fontSize: '10px',
                      fontWeight: 600,
                      borderRadius: '3px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: previewSize === 'compact' ? '#8b5cf6' : 'transparent',
                      color: previewSize === 'compact' ? '#ffffff' : 'var(--text-muted)',
                      transition: 'all 0.15s ease'
                    }}
                    title="Aperçu compact (260px)"
                  >
                    260px
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePreviewSize('standard')}
                    style={{
                      padding: '2px 7px',
                      fontSize: '10px',
                      fontWeight: 600,
                      borderRadius: '3px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: previewSize === 'standard' ? '#8b5cf6' : 'transparent',
                      color: previewSize === 'standard' ? '#ffffff' : 'var(--text-muted)',
                      transition: 'all 0.15s ease'
                    }}
                    title="Aperçu standard recommandé (380px)"
                  >
                    380px
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePreviewSize('large')}
                    style={{
                      padding: '2px 7px',
                      fontSize: '10px',
                      fontWeight: 600,
                      borderRadius: '3px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: previewSize === 'large' ? '#8b5cf6' : 'transparent',
                      color: previewSize === 'large' ? '#ffffff' : 'var(--text-muted)',
                      transition: 'all 0.15s ease'
                    }}
                    title="Grand aperçu cinéma (520px)"
                  >
                    520px
                  </button>
                </div>
              )}

              {/* Fullscreen Toggle Button */}
              <button
                type="button"
                className="btn-toolbar"
                onClick={toggleFullscreen}
                style={{
                  padding: isFullscreen ? '4px 10px' : '2px 8px',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: isFullscreen ? 'rgba(239, 68, 68, 0.15)' : 'rgba(139, 92, 246, 0.2)',
                  color: isFullscreen ? '#f87171' : '#c084fc',
                  borderColor: isFullscreen ? 'rgba(239, 68, 68, 0.4)' : 'rgba(139, 92, 246, 0.45)',
                  fontWeight: 600
                }}
                title={isFullscreen ? "Quitter le plein écran (Échap ou F)" : "Passer en plein écran cinéma (F ou double-clic)"}
              >
                {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                <span>{isFullscreen ? 'Quitter Plein Écran (Échap)' : 'Plein écran'}</span>
              </button>
            </div>
          </div>

          <div 
            className="monitor-canvas-box"
            onDoubleClick={toggleFullscreen}
            style={{ 
              flexGrow: 1, 
              backgroundColor: '#000', 
              borderRadius: '6px', 
              overflow: 'hidden', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              position: 'relative',
              cursor: 'pointer'
            }}
            title={isFullscreen ? "Double-cliquez pour réduire l'écran" : "Double-cliquez pour passer en plein écran"}
          >
            <canvas 
              ref={previewCanvasRef} 
              width={1280} 
              height={720} 
              style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
            />

            {/* Live Voiceover Recording HUD Overlay */}
            {isRecordingVoiceover && (
              <div className="voiceover-recording-badge">
                <div className="voiceover-rec-dot" />
                <span>ENREGISTREMENT VOIX OFF • {formatTime(currentTime)}</span>
              </div>
            )}

            {/* Live Export Progress HUD Overlay */}
            {isExporting && (
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(10, 15, 30, 0.75)',
                backdropFilter: 'blur(5px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                zIndex: 25
              }}>
                <div style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(139, 92, 246, 0.45)',
                  borderRadius: '10px',
                  padding: '12px 18px',
                  width: '100%',
                  maxWidth: '420px',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={15} className="spinning" color="#a855f7" />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>Exportation en cours</span>
                          <span style={{ fontSize: '9px', color: '#a855f7', backgroundColor: 'rgba(168, 85, 247, 0.2)', padding: '1px 5px', borderRadius: '4px' }}>
                            {exportFormat.toUpperCase()} {exportFormat === 'mp4' ? '(H.264/AAC)' : ''}
                          </span>
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {exportStatus || "Génération du métrage..."}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#c084fc', fontFamily: 'var(--font-display)' }}>
                        {exportProgress}%
                      </div>
                      <div style={{ fontSize: '9px', color: '#94a3b8' }}>
                        {formatTime(exportCurrentSec)} / {formatTime(totalDuration)}
                      </div>
                    </div>
                  </div>

                  {/* High-Tech Glowing Progress Bar */}
                  <div style={{
                    height: '7px',
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${exportProgress}%`,
                      background: 'linear-gradient(90deg, #06b6d4, #8b5cf6, #ec4899)',
                      borderRadius: '4px',
                      transition: 'width 0.15s ease-out',
                      boxShadow: '0 0 10px rgba(139, 92, 246, 0.8)'
                    }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', color: '#64748b' }}>
                      Rendu direct image par image
                    </span>
                    <button
                      onClick={handleCancelExport}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#f87171',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        fontSize: '10px',
                        cursor: 'pointer'
                      }}
                      title="Interrompre l'exportation"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Master Transport Controls or Cinema Fullscreen HUD */}
          {isFullscreen ? (
            <div style={{
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(139, 92, 246, 0.45)',
              borderRadius: '12px',
              padding: '12px 20px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.85), 0 0 30px rgba(139, 92, 246, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              {/* Fullscreen Scrubber Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 700, color: '#c084fc', minWidth: '45px' }}>
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={totalDuration || 1}
                  step={0.05}
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  style={{ flexGrow: 1, accentColor: '#8b5cf6', cursor: 'pointer', height: '6px' }}
                />
                <span style={{ fontSize: '13px', fontFamily: 'monospace', color: '#94a3b8', minWidth: '45px', textAlign: 'right' }}>
                  {formatTime(totalDuration)}
                </span>
              </div>

              {/* Fullscreen Transport Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={togglePlay}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: isPlaying ? '#8b5cf6' : '#ffffff',
                      color: isPlaying ? '#ffffff' : '#000000',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
                    <span>{isPlaying ? 'Pause' : 'Lecture'}</span>
                  </button>

                  <button
                    onClick={() => handleSeek(Math.max(0, currentTime - 1))}
                    className="btn-toolbar"
                    style={{ padding: '5px 12px', fontSize: '11px', fontWeight: 600 }}
                    title="Reculer de 1 seconde (Flèche Gauche)"
                  >
                    -1s
                  </button>
                  <button
                    onClick={() => handleSeek(Math.min(totalDuration, currentTime + 1))}
                    className="btn-toolbar"
                    style={{ padding: '5px 12px', fontSize: '11px', fontWeight: 600 }}
                    title="Avancer de 1 seconde (Flèche Droite)"
                  >
                    +1s
                  </button>

                  <button
                    onClick={isRecordingVoiceover ? stopVoiceoverRecording : startVoiceoverRecording}
                    className={isRecordingVoiceover ? "btn-danger pulse-recording" : "btn-toolbar"}
                    style={{
                      padding: '5px 12px',
                      fontSize: '11px',
                      fontWeight: isRecordingVoiceover ? 700 : 600,
                      backgroundColor: isRecordingVoiceover ? '#e11d48' : 'rgba(244, 63, 94, 0.15)',
                      color: isRecordingVoiceover ? '#ffffff' : '#fda4af',
                      borderColor: 'rgba(244, 63, 94, 0.45)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                    title={isRecordingVoiceover ? "Arrêter l'enregistrement de la voix off" : "Enregistrer votre voix au micro en direct"}
                  >
                    <Mic size={12} color={isRecordingVoiceover ? '#ffffff' : '#f43f5e'} />
                    <span>{isRecordingVoiceover ? 'Arrêter Micro' : '🔴 Voix Off'}</span>
                  </button>

                  {/* Active overlays badges in fullscreen */}
                  <div style={{ display: 'flex', gap: '6px', marginLeft: '8px' }}>
                    {(project.titles || []).some(t => currentTime >= t.startTime && currentTime <= t.startTime + t.duration) && (
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(192, 132, 252, 0.2)', color: '#c084fc', border: '1px solid rgba(192, 132, 252, 0.4)', fontWeight: 600 }}>
                        🔤 Titre actif
                      </span>
                    )}
                    {(project.zooms || []).some(z => currentTime >= z.startTime && currentTime <= z.startTime + z.duration) && (
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)', fontWeight: 600 }}>
                        🔍 Zoom actif
                      </span>
                    )}
                    {(project.images || []).some(img => currentTime >= img.startTime && currentTime <= img.startTime + img.duration) && (
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', fontWeight: 600 }}>
                        🖼️ Logo actif
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    [Espace] Lecture • [← →] Saut 1s • [Échap] ou [F] Quitter
                  </span>
                  <button
                    onClick={toggleFullscreen}
                    style={{
                      padding: '5px 14px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#f87171',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    title="Quitter le mode plein écran (Échap)"
                  >
                    <Minimize2 size={13} />
                    <span>Quitter le Plein Écran</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  className="btn-toolbar"
                  onClick={togglePlay}
                  style={{ padding: '3px 8px', backgroundColor: isPlaying ? '#8b5cf6' : 'rgba(255,255,255,0.06)' }}
                >
                  {isPlaying ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}
                </button>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  {formatTime(currentTime)} / {formatTime(totalDuration)}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  className="btn-toolbar"
                  onClick={() => {
                    setTitleForm({
                      id: '',
                      text: 'Introduction',
                      subtitle: 'Bienvenue dans ce tutoriel',
                      startTime: Math.round(currentTime * 10) / 10,
                      duration: 3,
                      style: 'lowerthird',
                      textColor: '#ffffff',
                      bgColor: 'rgba(15, 23, 42, 0.85)',
                      fontSize: 28
                    });
                    setIsTitleModalOpen(true);
                  }}
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                  title="Ajouter un titre en superposition sur la vidéo"
                >
                  <Type size={12} color="#c084fc" />
                  <span>+ Titre</span>
                </button>

                <button
                  className="btn-toolbar"
                  onClick={() => openAddSlideModal('current')}
                  style={{ fontSize: '11px', padding: '3px 8px', color: '#c084fc', borderColor: 'rgba(192, 132, 252, 0.45)' }}
                  title="Insérer une diapositive plein écran de titre ou de chapitre sur la piste vidéo"
                >
                  <Film size={12} color="#c084fc" />
                  <span>+ Diapo</span>
                </button>

                <button
                  className={isRecordingVoiceover ? "btn-danger pulse-recording" : "btn-toolbar"}
                  onClick={isRecordingVoiceover ? stopVoiceoverRecording : startVoiceoverRecording}
                  style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    color: isRecordingVoiceover ? '#ffffff' : '#f43f5e',
                    borderColor: 'rgba(244, 63, 94, 0.45)',
                    backgroundColor: isRecordingVoiceover ? '#e11d48' : 'rgba(244, 63, 94, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: isRecordingVoiceover ? 700 : 600
                  }}
                  title={isRecordingVoiceover ? "Arrêter l'enregistrement de la voix off" : "Enregistrer votre voix au micro en direct pendant que la vidéo défile"}
                >
                  <Mic size={12} color={isRecordingVoiceover ? '#ffffff' : '#f43f5e'} />
                  <span>{isRecordingVoiceover ? 'Arrêter Micro' : '🔴 Voix Off'}</span>
                </button>

                <button
                  className="btn-toolbar"
                  onClick={() => {
                    setZoomForm({
                      id: '',
                      startTime: Math.round(currentTime * 10) / 10,
                      duration: 3,
                      scale: 2.0,
                      originX: 0.5,
                      originY: 0.5,
                      label: 'Zoom Focus'
                    });
                    setIsZoomModalOpen(true);
                  }}
                  style={{ fontSize: '11px', padding: '3px 8px', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                  title="Ajouter un zoom dynamique / focus sur une zone de l'écran"
                >
                  <ZoomIn size={12} />
                  <span>+ Zoom</span>
                </button>

                <button
                  className="btn-toolbar"
                  onClick={() => {
                    if (libraryImages.length > 0) {
                      openAddImageOverlayModal(libraryImages[0]);
                    } else {
                      setChutierTab('images');
                      imageFileInputRef.current?.click();
                    }
                  }}
                  style={{ fontSize: '11px', padding: '3px 8px', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                  title="Ajouter un logo ou une image en superposition sur la vidéo"
                >
                  <ImageIcon size={12} color="#10b981" />
                  <span>+ Logo / Image</span>
                </button>

                <button
                  className="btn-toolbar"
                  onClick={() => setIsChaptersModalOpen(true)}
                  style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    color: '#38bdf8',
                    borderColor: 'rgba(56, 189, 248, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Générer et exporter les chapitres YouTube (Table des matières)"
                >
                  <ListTree size={12} color="#38bdf8" />
                  <span>📑 Chapitres ({(project.chapters || []).length})</span>
                </button>

                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'mp4' | 'webm')}
                  style={{
                    fontSize: '11px',
                    padding: '3px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    color: exportFormat === 'mp4' ? '#10b981' : '#38bdf8',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer'
                  }}
                  title="Format d'exportation : MP4 universel ou WebM"
                >
                  <option value="mp4">Format MP4</option>
                  <option value="webm">Format WebM</option>
                </select>

                <button
                  className="btn-primary"
                  onClick={handleExportProject}
                  disabled={isExporting || project.clips.length === 0}
                  style={{ fontSize: '11px', padding: '3px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  {isExporting ? <Sparkles size={12} className="spinning" /> : <Check size={12} />}
                  <span>{isExporting ? `Exportation (${exportProgress}%)` : `Exporter (${exportFormat.toUpperCase()})`}</span>
                </button>

                {exportedBlob && (
                  <>
                    <button 
                      className="btn-secondary" 
                      onClick={() => {
                        setSubtitlesModalVideo({
                          id: projectId,
                          title: projectName,
                          blob: exportedBlob,
                          thumbnail: '',
                          duration: Math.round(totalDuration),
                          size: exportedBlob.size,
                          date: new Date().toISOString()
                        });
                      }} 
                      style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px', color: '#fde047', borderColor: 'rgba(253, 224, 71, 0.4)' }}
                      title="Générer des sous-titres et captions dynamiques pour ce montage"
                    >
                      <Type size={12} />
                      <span>Sous-titres</span>
                    </button>

                    <button 
                      className="btn-secondary" 
                      onClick={() => {
                        setFrameModalVideo({
                          id: projectId,
                          title: projectName,
                          blob: exportedBlob,
                          thumbnail: '',
                          duration: Math.round(totalDuration),
                          size: exportedBlob.size,
                          date: new Date().toISOString()
                        });
                      }} 
                      style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                      title="Ajouter un habillage gradient, cadre macOS et formats TikTok/YouTube/LinkedIn"
                    >
                      <Layers size={12} />
                      <span>Habillage</span>
                    </button>

                    <button 
                      className="btn-secondary" 
                      onClick={() => {
                        setGifModalVideo({
                          id: projectId,
                          title: projectName,
                          blob: exportedBlob,
                          thumbnail: '',
                          duration: Math.round(totalDuration),
                          size: exportedBlob.size,
                          date: new Date().toISOString()
                        });
                      }} 
                      style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px', color: '#c084fc', borderColor: 'rgba(192, 132, 252, 0.4)' }}
                      title="Générer un GIF animé à partir de ce montage"
                    >
                      <Sparkles size={12} />
                      <span>Créer un GIF</span>
                    </button>

                    <button 
                      className="btn-secondary" 
                      onClick={() => setIsTutorialMakerOpen(true)}
                      style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                      title="Générer un guide pas-à-pas illustré (Markdown, HTML, PDF) à partir de ce montage"
                    >
                      <BookOpen size={12} />
                      <span>Guide Tuto</span>
                    </button>

                    <button 
                      className="btn-primary" 
                      onClick={handleDownloadExported} 
                      style={{ 
                        fontSize: '11px', 
                        padding: '3px 10px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '5px',
                        backgroundColor: '#10b981',
                        borderColor: '#10b981',
                        boxShadow: '0 0 10px rgba(16, 185, 129, 0.35)'
                      }}
                    >
                      <Download size={12} />
                      <span>Télécharger ({exportedBlob.type.includes('mp4') ? 'MP4' : 'WebM'})</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Timeline Multi-Track Panel */}
      <div className="glass-panel" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* View Mode Toggle: Spatial / Filmstrip / Compact */}
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
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '48%' }}>
            <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={totalDuration || 1}
              step={0.1}
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              style={{ flexGrow: 1, accentColor: '#8b5cf6', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
              {formatTime(totalDuration)}
            </span>
          </div>
        </div>

        {/* Master Timeline Ruler with Time Markers & Unified Playhead Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px' }}>
          <div style={{ width: '160px', minWidth: '160px', maxWidth: '160px', flexShrink: 0, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '8px' }}>
            <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>
              {formatTime(currentTime)}
            </span>
            <span style={{ fontSize: '9px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
              / {formatTime(totalDuration)}
            </span>
          </div>

          <div
            ref={timelineRulerRef}
            onClick={(e) => handleRulerSeek(e.clientX)}
            onPointerDown={handleRulerPointerDown}
            onPointerMove={handleRulerPointerMove}
            onPointerUp={handleRulerPointerUp}
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
            {/* Dynamic graduation markers */}
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

            {/* Master Playhead Needle Top Triangular Head */}
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

        {/* Track 1: Video Clips & Transitions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: 'rgba(0,0,0,0.25)', padding: '6px 8px', borderRadius: '5px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '160px', minWidth: '160px', maxWidth: '160px', flexShrink: 0, boxSizing: 'border-box', paddingRight: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Film size={11} color="#06b6d4" />
                <span style={{ fontSize: '10px', color: '#06b6d4', fontWeight: 700 }}>Piste Vidéo ({(project.clips || []).length})</span>
              </div>
              <div style={{ display: 'flex', gap: '3px', flexWrap: 'nowrap' }}>
                <button
                  type="button"
                  className="btn-toolbar"
                  onClick={() => {
                    setVideoInsertPosition('current');
                    setIsVideoPickerOpen(true);
                  }}
                  style={{ padding: '2px 4px', fontSize: '9px', backgroundColor: 'rgba(6, 182, 212, 0.2)', color: '#38bdf8', borderColor: 'rgba(6, 182, 212, 0.45)', display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}
                  title="Insérer une vidéo depuis la bibliothèque ou importer depuis votre PC"
                >
                  <Film size={9} />
                  <span>+ Vidéo</span>
                </button>
                <button
                  type="button"
                  className="btn-toolbar"
                  onClick={() => openAddSlideModal('current')}
                  style={{ padding: '2px 4px', fontSize: '9px', backgroundColor: 'rgba(139, 92, 246, 0.2)', color: '#c084fc', borderColor: 'rgba(139, 92, 246, 0.45)', display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}
                  title="Insérer une diapositive titre / carton de début ou de chapitre"
                >
                  <Type size={9} />
                  <span>+ Diapo</span>
                </button>
                <button
                  type="button"
                  className="btn-toolbar"
                  onClick={() => {
                    setImageSlideInsertPosition('current');
                    setIsImageSlidePickerOpen(true);
                  }}
                  style={{ padding: '2px 4px', fontSize: '9px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.45)', display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}
                  title="Insérer une image comme clip plein écran sur la piste vidéo"
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
                onClick={(e) => handleVideoLaneSeek(e.clientX)}
                onPointerDown={handleVideoLanePointerDown}
                onPointerMove={handleVideoLanePointerMove}
                onPointerUp={handleVideoLanePointerUp}
                style={{ flexGrow: 1, position: 'relative', height: '52px', cursor: 'pointer', overflow: 'visible' }}
                title="Cliquez ou glissez pour déplacer la tête de lecture sur la piste vidéo"
              >
                {/* Ruler grid ticks */}
                <div className="timeline-lane-ruler-grid">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="timeline-lane-ruler-tick" />
                  ))}
                </div>

                {/* Clips mapped proportionally to total duration */}
                {(project.clips || []).map((clip, idx) => {
                  const offset = clipTimelineOffsets.get(clip.id) || { start: 0, end: 10, duration: 10 };
                  const leftPct = (offset.start / safeDur) * 100;
                  const widthPct = Math.max(1.5, (offset.duration / safeDur) * 100);
                  const isSlide = clip.type === 'slide';
                  const isImage = clip.type === 'image';
                  const isActive = currentTime >= offset.start && currentTime <= offset.end;
                  const isSelected = selectedClipId === clip.id || (!selectedClipId && idx === 0);

                  return (
                    <div
                      key={clip.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClipId(clip.id);
                        handleSeek(offset.start);
                      }}
                      style={{
                        position: 'absolute',
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        top: '3px',
                        bottom: '3px',
                        borderRadius: '5px',
                        backgroundColor: isSlide
                          ? (isActive ? 'rgba(139, 92, 246, 0.4)' : 'rgba(139, 92, 246, 0.22)')
                          : isImage
                            ? (isActive ? 'rgba(16, 185, 129, 0.38)' : 'rgba(16, 185, 129, 0.2)')
                            : (isActive ? 'rgba(6, 182, 212, 0.35)' : 'rgba(15, 23, 42, 0.7)'),
                        border: isActive
                          ? '2px solid #38bdf8'
                          : isSelected
                            ? '1.5px solid #a855f7'
                            : isSlide
                              ? '1px solid rgba(139, 92, 246, 0.5)'
                              : isImage
                                ? '1px solid rgba(16, 185, 129, 0.45)'
                                : '1px solid rgba(255, 255, 255, 0.15)',
                        boxShadow: isActive ? '0 0 10px rgba(56, 189, 248, 0.65)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 6px',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        zIndex: isActive ? 6 : 4
                      }}
                      title={`${clip.video?.title || 'Clip'} (${offset.duration.toFixed(1)}s) - Cliquez pour sélectionner`}
                    >
                      {/* Left: Badge + Title */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontSize: '8px',
                          fontWeight: 800,
                          padding: '1px 4px',
                          borderRadius: '3px',
                          backgroundColor: isSlide ? 'rgba(139, 92, 246, 0.4)' : isImage ? 'rgba(16, 185, 129, 0.4)' : 'rgba(6, 182, 212, 0.3)',
                          color: isSlide ? '#c4b5fd' : isImage ? '#6ee7b7' : '#7dd3fc'
                        }}>
                          {isSlide ? '📑 Diapo' : isImage ? '🖼️ Image' : '🎬 Vidéo'}
                        </span>
                        <span style={{ fontSize: '9px', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {clip.video?.title || 'Clip'}
                        </span>
                      </div>

                      {/* Right: Duration + Edit for Slide */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.75)', fontFamily: 'monospace' }}>
                          {offset.duration.toFixed(1)}s
                        </span>
                        {isSlide && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditSlideModal(clip);
                            }}
                            style={{ background: 'transparent', border: 'none', color: '#c084fc', cursor: 'pointer', padding: '1px', fontSize: '9px' }}
                            title="Modifier le style de cette diapo"
                          >
                            ⚙️
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Unified Playhead Indicator on Track 1 */}
                {totalDuration > 0 && (
                  <div
                    className="timeline-playhead-line"
                    style={{ left: `${Math.max(0, Math.min(100, (currentTime / safeDur) * 100))}%` }}
                  />
                )}

                {(!project.clips || project.clips.length === 0) && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: '10px', color: 'var(--text-muted)' }}>
                    Aucun clip vidéo. Cliquez sur le « + » d'une vidéo dans le Chutier pour l'ajouter.
                  </div>
                )}
              </div>
            ) : (
              /* Expanded card view for 'filmstrip' and 'compact' modes */
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', flexGrow: 1 }}>
                {(project.clips || []).map((clip, idx) => {
                  const offset = clipTimelineOffsets.get(clip.id) || { start: 0, end: 10, duration: 10 };
                  const cacheKey = `${clip.id}_${clip.startTrim}_${clip.endTrim}_${clip.playbackSpeed || 1}`;
                  const filmstripFrames = clipFilmstrips[cacheKey] || clipFilmstrips[clip.id] || [];
                  const isSlide = clip.type === 'slide';
                  const isImage = clip.type === 'image';
                  const isActive = currentTime >= offset.start && currentTime <= offset.end;

                  return (
                    <div key={clip.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          padding: '6px 8px',
                          backgroundColor: isSlide
                            ? (isActive ? 'rgba(139, 92, 246, 0.25)' : 'rgba(139, 92, 246, 0.12)')
                            : isImage
                              ? (isActive ? 'rgba(16, 185, 129, 0.22)' : 'rgba(16, 185, 129, 0.1)')
                              : isActive
                                ? 'rgba(6, 182, 212, 0.15)'
                                : (clip.playbackSpeed || 1.0) > 1 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255,255,255,0.04)',
                          border: isActive
                            ? '2px solid #38bdf8'
                            : isSlide
                              ? '1px solid rgba(139, 92, 246, 0.5)'
                              : isImage
                                ? '1px solid rgba(16, 185, 129, 0.45)'
                                : (clip.playbackSpeed || 1.0) > 1 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-color)',
                          boxShadow: isActive ? '0 0 10px rgba(56, 189, 248, 0.6)' : 'none',
                          borderRadius: '6px',
                          minWidth: timelineViewMode === 'filmstrip' ? '300px' : '185px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {/* Top Row: Title + Badges + Edit/Delete */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                            {isSlide && (
                              <span style={{
                                fontSize: '8px',
                                fontWeight: 800,
                                color: '#c4b5fd',
                                backgroundColor: 'rgba(139, 92, 246, 0.3)',
                                padding: '1px 4px',
                                borderRadius: '3px',
                                border: '1px solid #8b5cf6'
                              }}>
                                📑 Diapo Titre
                              </span>
                            )}
                            {isImage && (
                              <span style={{
                                fontSize: '8px',
                                fontWeight: 800,
                                color: '#6ee7b7',
                                backgroundColor: 'rgba(16, 185, 129, 0.3)',
                                padding: '1px 4px',
                                borderRadius: '3px',
                                border: '1px solid #10b981'
                              }}>
                                🖼️ Diapo Image
                              </span>
                            )}
                            {(clip.playbackSpeed || 1.0) > 1 && !isSlide && !isImage && (
                              <span style={{
                                fontSize: '8px',
                                fontWeight: 800,
                                color: '#fde68a',
                                backgroundColor: 'rgba(245, 158, 11, 0.3)',
                                padding: '1px 4px',
                                borderRadius: '3px',
                                border: '1px solid #f59e0b'
                              }}>
                                ⏩ {clip.playbackSpeed}x
                              </span>
                            )}
                            <span style={{ fontSize: '10px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }} title={clip.video?.title || 'Clip'}>
                              {clip.video?.title || 'Clip'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: isSlide ? '#c4b5fd' : isImage ? '#6ee7b7' : (clip.playbackSpeed || 1.0) > 1 ? '#fde68a' : 'var(--text-secondary)', fontSize: '9px', fontWeight: 600 }}>
                              {((((clip.endTrim ?? 10) - (clip.startTrim ?? 0)) / (clip.playbackSpeed || 1.0))).toFixed(1)}s
                            </span>
                            {isSlide && (
                              <button
                                style={{ background: 'transparent', border: 'none', color: '#c084fc', cursor: 'pointer', padding: 0, fontSize: '10px' }}
                                onClick={() => openEditSlideModal(clip)}
                                title="Modifier les réglages de cette diapositive"
                              >
                                ⚙️
                              </button>
                            )}
                            <button
                              style={{ background: 'transparent', border: 'none', color: '#fb7185', cursor: 'pointer', padding: 0 }}
                              onClick={() => removeClipFromTimeline(clip.id)}
                              title="Supprimer ce clip"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>

                        {/* Filmstrip Sequential Thumbnails View */}
                        {timelineViewMode === 'filmstrip' && (
                          <div style={{
                            display: 'flex',
                            gap: '4px',
                            backgroundColor: '#060a12',
                            padding: '4px',
                            borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            overflowX: 'auto',
                            position: 'relative'
                          }}>
                            {filmstripFrames.length > 0 ? (
                              filmstripFrames.map((frame, fIdx) => {
                                const nextTime = filmstripFrames[fIdx + 1]?.timelineTime ?? offset.end;
                                const isFrameActive = currentTime >= frame.timelineTime && currentTime < nextTime;

                                return (
                                  <div
                                    key={frame.id}
                                    className="filmstrip-thumb-card"
                                    onClick={() => handleSeek(frame.timelineTime)}
                                    style={{
                                      position: 'relative',
                                      width: '90px',
                                      height: '52px',
                                      borderRadius: '4px',
                                      overflow: 'hidden',
                                      cursor: 'pointer',
                                      flexShrink: 0,
                                      border: isFrameActive ? '2px solid #8b5cf6' : '1px solid rgba(255,255,255,0.1)',
                                      boxShadow: isFrameActive ? '0 0 8px rgba(139, 92, 246, 0.8)' : 'none'
                                    }}
                                    title={`Cliquer pour aller à ${frame.formattedTime}`}
                                  >
                                    <img
                                      src={frame.dataUrl}
                                      alt=""
                                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    />

                                    <div style={{
                                      position: 'absolute',
                                      bottom: '2px',
                                      left: '2px',
                                      background: 'rgba(0,0,0,0.75)',
                                      padding: '1px 3px',
                                      borderRadius: '3px',
                                      fontSize: '8px',
                                      fontFamily: 'monospace',
                                      color: isFrameActive ? '#c4b5fd' : '#ffffff',
                                      fontWeight: 600
                                    }}>
                                      {frame.formattedTime}
                                    </div>

                                    {/* Hover Quick Insertion Buttons */}
                                    <div className="filmstrip-hover-bar">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); openAddTitleAtTime(frame.timelineTime); }}
                                        title="Ajouter un Titre à ce moment"
                                      >
                                        🔤
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); openAddImageAtTime(frame.timelineTime); }}
                                        title="Ajouter un Logo à ce moment"
                                      >
                                        🖼️
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); openAddZoomAtTime(frame.timelineTime); }}
                                        title="Ajouter un Zoom à ce moment"
                                      >
                                        🔍
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); openAddChapterAtTime(frame.timelineTime); }}
                                        title="Ajouter un Chapitre à ce moment"
                                      >
                                        🔖
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div style={{ padding: '12px', fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center', width: '100%' }}>
                                Génération des photogrammes...
                              </div>
                            )}
                          </div>
                        )}

                        {/* Controls Row */}
                        {(isSlide || isImage) ? (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)' }}>
                              <span>{isSlide ? '📑 Diapositive Titre' : '🖼️ Image Diaporama'}</span>
                              <span>Pos : {offset.start.toFixed(1)}s</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', marginTop: '1px' }}>
                              <div style={{ display: 'flex', gap: '3px' }}>
                                <button
                                  className="btn-toolbar"
                                  style={{ padding: '2px 4px', fontSize: '9px' }}
                                  disabled={idx === 0}
                                  onClick={() => moveClip(idx, 'left')}
                                  title="Déplacer vers la gauche"
                                >
                                  ◀
                                </button>
                                <button
                                  className="btn-toolbar"
                                  style={{ padding: '2px 4px', fontSize: '9px' }}
                                  disabled={idx === project.clips.length - 1}
                                  onClick={() => moveClip(idx, 'right')}
                                  title="Déplacer vers la droite"
                                >
                                  ▶
                                </button>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '9px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Durée :</span>
                                <input
                                  type="number"
                                  min={0.5}
                                  max={60}
                                  step={0.5}
                                  value={Math.round((clip.endTrim - clip.startTrim) * 10) / 10}
                                  onChange={(e) => updateSlideOrImageDuration(clip.id, parseFloat(e.target.value) || 4)}
                                  style={{ width: '42px', fontSize: '9px', padding: '1px 3px' }}
                                  className="form-input"
                                  title="Durée de la diapositive en secondes"
                                />
                                <span style={{ color: 'var(--text-muted)' }}>s</span>
                              </div>

                              {isSlide && (
                                <button
                                  className="btn-toolbar"
                                  style={{ padding: '2px 5px', fontSize: '9px', color: '#c084fc', borderColor: 'rgba(192, 132, 252, 0.45)', display: 'flex', alignItems: 'center', gap: '2px' }}
                                  onClick={() => openEditSlideModal(clip)}
                                  title="Modifier le texte, couleur et style de la diapo"
                                >
                                  ⚙️ Style
                                </button>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)' }}>
                              <span>Rognage : {clip.startTrim.toFixed(1)}s - {clip.endTrim.toFixed(1)}s</span>
                              <span>Pos : {offset.start.toFixed(1)}s</span>
                            </div>

                            <div style={{ display: 'flex', gap: '4px', marginTop: '1px' }}>
                              <button
                                className="btn-toolbar"
                                style={{ padding: '2px 4px', fontSize: '9px' }}
                                disabled={idx === 0}
                                onClick={() => moveClip(idx, 'left')}
                                title="Déplacer vers la gauche"
                              >
                                ◀
                              </button>
                              <button
                                className="btn-toolbar"
                                style={{ padding: '2px 4px', fontSize: '9px' }}
                                disabled={idx === project.clips.length - 1}
                                onClick={() => moveClip(idx, 'right')}
                                title="Déplacer vers la droite"
                              >
                                ▶
                              </button>
                              <input
                                type="number"
                                min={0}
                                max={clip.endTrim - 0.5}
                                step={0.5}
                                value={clip.startTrim}
                                onChange={(e) => updateClipTrim(clip.id, parseFloat(e.target.value) || 0, clip.endTrim)}
                                style={{ width: '44px', fontSize: '9px', padding: '1px 3px' }}
                                className="form-input"
                                title="Rognage début (s)"
                              />
                              <input
                                type="number"
                                min={clip.startTrim + 0.5}
                                max={clip.video?.duration || 999}
                                step={0.5}
                                value={clip.endTrim}
                                onChange={(e) => updateClipTrim(clip.id, clip.startTrim, parseFloat(e.target.value) || 10)}
                                style={{ width: '44px', fontSize: '9px', padding: '1px 3px' }}
                                className="form-input"
                                title="Rognage fin (s)"
                              />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                              <select
                                value={clip.playbackSpeed || 1.0}
                                onChange={(e) => updateClipSpeed(clip.id, parseFloat(e.target.value))}
                                style={{
                                  fontSize: '9px',
                                  padding: '1px 3px',
                                  borderRadius: '3px',
                                  backgroundColor: (clip.playbackSpeed || 1.0) > 1 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(15, 23, 42, 0.7)',
                                  color: (clip.playbackSpeed || 1.0) > 1 ? '#fde68a' : 'var(--text-secondary)',
                                  border: (clip.playbackSpeed || 1.0) > 1 ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                                  cursor: 'pointer'
                                }}
                                title="Vitesse de lecture / Avance Rapide"
                              >
                                <option value="1">1x Normal</option>
                                <option value="2">2x</option>
                                <option value="4">4x</option>
                                <option value="8">8x</option>
                                <option value="16">16x</option>
                              </select>

                              <button
                                className="btn-toolbar"
                                style={{ padding: '1px 5px', fontSize: '9px', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)', display: 'flex', alignItems: 'center', gap: '3px' }}
                                onClick={() => splitAndFastForward(clip.id, 4)}
                                title="Isoler et accélérer en 4x le temps de chargement au milieu de ce clip"
                              >
                                <FastForward size={9} /> 4x
                              </button>

                              <button
                                className="btn-toolbar"
                                style={{ padding: '1px 5px', fontSize: '9px', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)', display: 'flex', alignItems: 'center', gap: '3px' }}
                                onClick={() => setSilenceRemoverClip(clip)}
                                title="Supprimer automatiquement les blancs et pauses de ce clip"
                              >
                                <Scissors size={9} /> Silences
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Transition Selector between clips */}
                      {idx < project.clips.length - 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          <select
                            value={clip.transitionToNext}
                            onChange={(e) => updateClipTransition(clip.id, e.target.value, clip.transitionDuration)}
                            style={{ fontSize: '9px', padding: '2px 3px', backgroundColor: 'rgba(15, 23, 42, 0.8)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '3px' }}
                            title="Transition vers le clip suivant"
                          >
                            <option value="none">Coupe (Cut)</option>
                            <option value="crossfade">Fondu (Crossfade)</option>
                            <option value="fade-black">Fondu au Noir</option>
                            <option value="slide">Glissement (Slide)</option>
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}

                {project.clips.length === 0 && (
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Aucun clip vidéo. Cliquez sur le « + » d'une vidéo dans le Chutier pour l'ajouter.
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Dedicated Clip Inspector for Spatial View */}
          {timelineViewMode === 'spatial' && activeInspectorClip && (
            (() => {
              const clip = activeInspectorClip;
              const idx = (project.clips || []).findIndex(c => c.id === clip.id);
              const offset = clipTimelineOffsets.get(clip.id) || { start: 0, end: 10, duration: 10 };
              const isSlide = clip.type === 'slide';
              const isImage = clip.type === 'image';
              const cacheKey = `${clip.id}_${clip.startTrim}_${clip.endTrim}_${clip.playbackSpeed || 1}`;
              const filmstripFrames = clipFilmstrips[cacheKey] || clipFilmstrips[clip.id] || [];

              return (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  backgroundColor: 'rgba(15, 23, 42, 0.7)',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '6px 10px',
                  marginTop: '2px'
                }}>
                  {/* Top line: Info + Move / Delete / Transitions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 800,
                        padding: '1px 5px',
                        borderRadius: '3px',
                        backgroundColor: isSlide ? 'rgba(139, 92, 246, 0.35)' : isImage ? 'rgba(16, 185, 129, 0.35)' : 'rgba(6, 182, 212, 0.25)',
                        color: isSlide ? '#c4b5fd' : isImage ? '#6ee7b7' : '#7dd3fc',
                        border: `1px solid ${isSlide ? '#8b5cf6' : isImage ? '#10b981' : '#06b6d4'}`
                      }}>
                        {isSlide ? '📑 Diapo Titre' : isImage ? '🖼️ Diapo Image' : `🎬 Clip #${idx + 1}`}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                        {clip.video?.title || 'Clip'}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        ({(offset?.start ?? 0).toFixed(1)}s - {(offset?.end ?? 10).toFixed(1)}s | Durée : {(offset?.duration ?? 10).toFixed(1)}s)
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        className="btn-toolbar"
                        style={{ padding: '2px 5px', fontSize: '9px' }}
                        disabled={idx === 0}
                        onClick={() => moveClip(idx, 'left')}
                        title="Déplacer vers la gauche"
                      >
                        ◀
                      </button>
                      <button
                        type="button"
                        className="btn-toolbar"
                        style={{ padding: '2px 5px', fontSize: '9px' }}
                        disabled={idx === (project.clips || []).length - 1}
                        onClick={() => moveClip(idx, 'right')}
                        title="Déplacer vers la droite"
                      >
                        ▶
                      </button>

                      {idx < (project.clips || []).length - 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '6px' }}>
                          <span style={{ fontSize: '9px', color: '#38bdf8' }}>Transition :</span>
                          <select
                            value={clip.transitionToNext}
                            onChange={(e) => updateClipTransition(clip.id, e.target.value, clip.transitionDuration)}
                            style={{ fontSize: '9px', padding: '1px 4px', backgroundColor: 'rgba(15, 23, 42, 0.85)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '3px' }}
                            title="Transition vers le clip suivant"
                          >
                            <option value="none">Coupe (Cut)</option>
                            <option value="crossfade">Fondu (Crossfade)</option>
                            <option value="fade-black">Fondu au Noir</option>
                            <option value="slide">Glissement (Slide)</option>
                          </select>
                        </div>
                      )}

                      <button
                        type="button"
                        style={{ background: 'transparent', border: 'none', color: '#fb7185', cursor: 'pointer', padding: '2px 4px', marginLeft: '6px' }}
                        onClick={() => removeClipFromTimeline(clip.id)}
                        title="Supprimer ce clip de la timeline"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Bottom line: Editing tools */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '4px' }}>
                    {(isSlide || isImage) ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Durée :</span>
                          <button
                            type="button"
                            className="btn-toolbar"
                            style={{ padding: '1px 5px', fontSize: '9px' }}
                            onClick={() => updateSlideOrImageDuration(clip.id, Math.max(0.5, (clip.endTrim - clip.startTrim) - 1))}
                            title="Diminuer d'une seconde"
                          >
                            -1s
                          </button>
                          <input
                            type="number"
                            min={0.5}
                            max={60}
                            step={0.5}
                            value={Math.round((clip.endTrim - clip.startTrim) * 10) / 10}
                            onChange={(e) => updateSlideOrImageDuration(clip.id, parseFloat(e.target.value) || 4)}
                            style={{ width: '45px', fontSize: '10px', padding: '1px 3px', textAlign: 'center' }}
                            className="form-input"
                          />
                          <button
                            type="button"
                            className="btn-toolbar"
                            style={{ padding: '1px 5px', fontSize: '9px' }}
                            onClick={() => updateSlideOrImageDuration(clip.id, (clip.endTrim - clip.startTrim) + 1)}
                            title="Augmenter d'une seconde"
                          >
                            +1s
                          </button>
                        </div>

                        {isSlide && (
                          <button
                            type="button"
                            className="btn-toolbar"
                            style={{ padding: '2px 8px', fontSize: '10px', color: '#c084fc', borderColor: 'rgba(192, 132, 252, 0.45)', display: 'flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => openEditSlideModal(clip)}
                            title="Modifier le texte, couleur et style de la diapo"
                          >
                            ⚙️ Modifier Style & Contenu
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {/* Trims */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Rognage :</span>
                          <input
                            type="number"
                            min={0}
                            max={clip.endTrim - 0.5}
                            step={0.5}
                            value={clip.startTrim}
                            onChange={(e) => updateClipTrim(clip.id, parseFloat(e.target.value) || 0, clip.endTrim)}
                            style={{ width: '46px', fontSize: '10px', padding: '1px 3px', textAlign: 'center' }}
                            className="form-input"
                            title="Rognage début (s)"
                          />
                          <span style={{ color: 'var(--text-muted)' }}>à</span>
                          <input
                            type="number"
                            min={clip.startTrim + 0.5}
                            max={clip.video?.duration || 999}
                            step={0.5}
                            value={clip.endTrim}
                            onChange={(e) => updateClipTrim(clip.id, clip.startTrim, parseFloat(e.target.value) || 10)}
                            style={{ width: '46px', fontSize: '10px', padding: '1px 3px', textAlign: 'center' }}
                            className="form-input"
                            title="Rognage fin (s)"
                          />
                          <span style={{ color: 'var(--text-muted)' }}>s</span>
                        </div>

                        {/* Speed */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Vitesse :</span>
                          <select
                            value={clip.playbackSpeed || 1.0}
                            onChange={(e) => updateClipSpeed(clip.id, parseFloat(e.target.value))}
                            style={{
                              fontSize: '10px',
                              padding: '1px 4px',
                              borderRadius: '3px',
                              backgroundColor: (clip.playbackSpeed || 1.0) > 1 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(15, 23, 42, 0.7)',
                              color: (clip.playbackSpeed || 1.0) > 1 ? '#fde68a' : 'var(--text-secondary)',
                              border: (clip.playbackSpeed || 1.0) > 1 ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                              cursor: 'pointer'
                            }}
                            title="Vitesse de lecture / Avance Rapide"
                          >
                            <option value="1">1x Normal</option>
                            <option value="2">2x</option>
                            <option value="4">4x</option>
                            <option value="8">8x</option>
                            <option value="16">16x</option>
                          </select>
                          <button
                            type="button"
                            className="btn-toolbar"
                            style={{ padding: '1px 5px', fontSize: '9px', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)', display: 'flex', alignItems: 'center', gap: '3px' }}
                            onClick={() => splitAndFastForward(clip.id, 4)}
                            title="Isoler et accélérer en 4x le temps de chargement au milieu de ce clip"
                          >
                            <FastForward size={9} /> 4x
                          </button>
                        </div>

                        {/* Silence remover */}
                        <button
                          type="button"
                          className="btn-toolbar"
                          style={{ padding: '2px 6px', fontSize: '10px', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => setSilenceRemoverClip(clip)}
                          title="Supprimer automatiquement les blancs et pauses de ce clip"
                        >
                          <Scissors size={10} /> Supprimer les Silences
                        </button>
                      </div>
                    )}

                    {/* Preview Thumbnails Reel for this clip */}
                    {filmstripFrames.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        {filmstripFrames.slice(0, 5).map((f) => (
                          <div
                            key={f.id}
                            onClick={() => handleSeek(f.timelineTime)}
                            style={{
                              width: '42px',
                              height: '24px',
                              borderRadius: '2px',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              border: Math.abs(currentTime - f.timelineTime) < 1.5 ? '1.5px solid #38bdf8' : '1px solid rgba(255,255,255,0.15)',
                              boxShadow: Math.abs(currentTime - f.timelineTime) < 1.5 ? '0 0 6px rgba(56,189,248,0.8)' : 'none'
                            }}
                            title={`Cliquer pour aller à ${f.formattedTime}`}
                          >
                            <img src={f.dataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </div>

        {/* Track 2: Interactive Spatial Voiceover (Microphone) Lane */}
        <SpatialTrackLane
          label="Voix Off (Micro)"
          icon={<Mic size={11} color="#f43f5e" />}
          labelColor="#f43f5e"
          items={(project.voiceovers || []).map(vo => ({
            id: vo.id,
            startTime: vo.startTime,
            duration: vo.duration,
            label: vo.label || 'Voix Off',
            sublabel: `Vol: ${Math.round((vo.volume ?? 1) * 100)}%`
          }))}
          totalDuration={totalDuration}
          currentTime={currentTime}
          emptyMessage="Aucun enregistrement vocal. Cliquez sur « 🔴 Voix Off » pour enregistrer votre micro."
          theme={{
            bg: 'rgba(244, 63, 94, 0.28)',
            border: '#f43f5e',
            text: '#ffffff',
            badgeColor: '#fda4af'
          }}
          onUpdateTiming={updateVoiceoverTiming}
          onSeek={handleSeek}
          onEdit={(id) => {
            const vo = (project.voiceovers || []).find(x => x.id === id);
            if (vo) openEditVoiceoverModal(vo);
          }}
          onDelete={removeVoiceover}
          onAddQuick={() => {
            if (isRecordingVoiceover) {
              stopVoiceoverRecording();
            } else {
              startVoiceoverRecording();
            }
          }}
        />

        {/* Track 3: Interactive Spatial Titles Lane */}
        <SpatialTrackLane
          label="Titres"
          icon={<Type size={11} color="#c084fc" />}
          labelColor="#c084fc"
          items={(project.titles || []).map(t => ({
            id: t.id,
            startTime: t.startTime,
            duration: t.duration,
            label: t.text,
            sublabel: t.subtitle
          }))}
          totalDuration={totalDuration}
          currentTime={currentTime}
          emptyMessage="Aucun titre. Cliquez sur « + Titre » pour en placer un sur la vidéo."
          theme={{
            bg: 'rgba(139, 92, 246, 0.28)',
            border: '#8b5cf6',
            text: '#ffffff',
            badgeColor: '#c084fc'
          }}
          onUpdateTiming={updateTitleTiming}
          onSeek={handleSeek}
          onEdit={(id) => {
            const t = (project.titles || []).find(x => x.id === id);
            if (t) openEditTitleModal(t);
          }}
          onDelete={removeTitle}
          onAddQuick={() => openAddTitleAtTime(currentTime)}
        />

        {/* Track 3: Interactive Spatial Images & Logos Lane */}
        <SpatialTrackLane
          label="Images & Logos"
          icon={<ImageIcon size={11} color="#10b981" />}
          labelColor="#10b981"
          items={(project.images || []).map(img => ({
            id: img.id,
            startTime: img.startTime,
            duration: img.duration,
            label: img.name,
            thumbnailUrl: img.dataUrl
          }))}
          totalDuration={totalDuration}
          currentTime={currentTime}
          emptyMessage="Aucune image ou logo. Ouvrez l'onglet « Images » dans le Chutier pour en ajouter."
          theme={{
            bg: 'rgba(16, 185, 129, 0.25)',
            border: '#10b981',
            text: '#ffffff',
            badgeColor: '#a7f3d0'
          }}
          onUpdateTiming={updateImageTiming}
          onSeek={handleSeek}
          onEdit={(id) => {
            const img = (project.images || []).find(x => x.id === id);
            if (img) openEditImageOverlayModal(img);
          }}
          onDelete={removeImageOverlay}
          onAddQuick={() => openAddImageAtTime(currentTime)}
        />

        {/* Track 4: Interactive Spatial Zooms Lane */}
        <SpatialTrackLane
          label="Zooms Focus"
          icon={<ZoomIn size={11} color="#f59e0b" />}
          labelColor="#f59e0b"
          items={(project.zooms || []).map(z => ({
            id: z.id,
            startTime: z.startTime,
            duration: z.duration,
            label: `${z.scale}x ${z.label || 'Zoom'}`
          }))}
          totalDuration={totalDuration}
          currentTime={currentTime}
          emptyMessage="Aucun zoom actif. Cliquez sur « + Zoom » dans la barre de contrôle pour cibler une zone clé."
          theme={{
            bg: 'rgba(245, 158, 11, 0.22)',
            border: '#f59e0b',
            text: '#ffffff',
            badgeColor: '#fde68a'
          }}
          onUpdateTiming={updateZoomTiming}
          onSeek={handleSeek}
          onEdit={(id) => {
            const z = (project.zooms || []).find(x => x.id === id);
            if (z) openEditZoomModal(z);
          }}
          onDelete={removeZoom}
          onAddQuick={() => openAddZoomAtTime(currentTime)}
        />

        {/* Track 5: Background Music & Audio Ducking */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(0,0,0,0.25)', padding: '6px 8px', borderRadius: '5px' }}>
          <span style={{ fontSize: '10px', width: '160px', minWidth: '160px', maxWidth: '160px', flexShrink: 0, color: '#38bdf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', boxSizing: 'border-box', paddingRight: '8px' }}>
            <Music size={11} />
            Musique de Fond
          </span>

          {project.backgroundMusic ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexGrow: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.4)', padding: '3px 8px', borderRadius: '4px' }}>
                <Headphones size={12} color="#38bdf8" />
                <span style={{ fontSize: '10px', fontWeight: 600, color: '#38bdf8' }}>{project.backgroundMusic.title}</span>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>({project.backgroundMusic.isPreset ? 'Ambiance' : 'Fichier'})</span>
                <button
                  onClick={handleRemoveBackgroundMusic}
                  style={{ background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer', padding: '0 2px' }}
                  title="Retirer la musique de fond"
                >
                  <X size={11} />
                </button>
              </div>

              {/* Volume Slider with fine tuning */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {project.backgroundMusic.volume === 0 ? <VolumeX size={12} color="#94a3b8" /> : <Volume2 size={12} color="#38bdf8" />}
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', width: '68px' }}>
                  Volume ({Math.round(project.backgroundMusic.volume * 100)}%) :
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={project.backgroundMusic.volume}
                  onChange={(e) => handleUpdateMusicVolume(parseFloat(e.target.value))}
                  style={{ width: '90px', accentColor: '#38bdf8', cursor: 'pointer' }}
                  title="Réglez le volume de la musique (recommandé 10-20% pour ne pas masquer la voix)"
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: (project.backgroundMusic.autoDucking !== false) ? '#38bdf8' : 'var(--text-muted)', cursor: 'pointer', marginLeft: 'auto' }}>
                <input
                  type="checkbox"
                  checked={project.backgroundMusic.autoDucking !== false}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setProject(prev => prev.backgroundMusic ? {
                      ...prev,
                      backgroundMusic: {
                        ...prev.backgroundMusic,
                        autoDucking: checked
                      }
                    } : prev);
                  }}
                  style={{ accentColor: '#38bdf8', cursor: 'pointer' }}
                />
                <span title="Baisse automatiquement la musique de fond à 20% dès qu'une personne parle ou qu'un son vidéo est présent">
                  Auto-Ducking intelligent
                </span>
              </label>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                Aucune musique de fond active.
              </span>
              <button
                onClick={() => setChutierTab('audio')}
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  color: '#38bdf8',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={10} />
                <span>Choisir une musique dans le Chutier</span>
              </button>
            </div>
          )}
        </div>

        {/* Track 6: YouTube Chapters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(0,0,0,0.25)', padding: '5px 8px', borderRadius: '5px' }}>
          <span style={{ fontSize: '10px', width: '105px', flexShrink: 0, color: '#38bdf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ListTree size={11} color="#38bdf8" />
            Chapitres ({(project.chapters || []).length})
          </span>
          <div style={{ display: 'flex', gap: '6px', flexGrow: 1, overflowX: 'auto', alignItems: 'center' }}>
            {(project.chapters || []).map((chap) => (
              <div
                key={chap.id}
                onClick={() => handleSeek(chap.time)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 8px',
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid #38bdf8',
                  borderRadius: '4px',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
                title={`Cliquer pour aller à ${formatTime(chap.time)}`}
              >
                <Bookmark size={10} color="#38bdf8" />
                <span style={{ fontWeight: 700, color: '#bae6fd', fontFamily: 'monospace' }}>{formatTime(chap.time)}</span>
                <span style={{ color: '#ffffff', maxWidth: '120px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{chap.title}</span>
                <button
                  style={{ background: 'transparent', border: 'none', color: '#fb7185', cursor: 'pointer', padding: 0 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveChapter(chap.id);
                  }}
                  title="Supprimer ce chapitre"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
            {(!project.chapters || project.chapters.length === 0) && (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                Aucun chapitre défini. Cliquez sur « 📑 Chapitres » dans la barre de contrôle pour les générer automatiquement.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Saved Projects Modal */}
      {isProjectListModalOpen && (
        <div className="modal-overlay" onClick={() => setIsProjectListModalOpen(false)}>
          <div className="glass-panel modal-content" style={{ maxWidth: '500px', padding: '16px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FolderOpen size={16} color="#c084fc" />
                Mes Projets de Montage ({savedProjects.length})
              </h3>
              <button className="close-btn" onClick={() => setIsProjectListModalOpen(false)}>
                <X size={15} />
              </button>
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {savedProjects.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{p.title}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                      {p.clipCount} clip(s) • ~{formatTime(p.totalDuration)} • {new Date(p.date).toLocaleDateString()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn-primary"
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                      onClick={() => handleLoadProject(p)}
                    >
                      Ouvrir
                    </button>
                    <button
                      className="btn-toolbar"
                      style={{ padding: '3px 6px', color: '#fb7185' }}
                      onClick={() => handleDeleteSavedProject(p.id)}
                      title="Supprimer ce projet"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}

              {savedProjects.length === 0 && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                  Aucun projet enregistré. Cliquez sur « Enregistrer » pour sauvegarder votre montage actuel.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Title / Text Modal */}
      {isTitleModalOpen && (
        <div className="modal-overlay" onClick={() => setIsTitleModalOpen(false)}>
          <div className="glass-panel modal-content" style={{ maxWidth: '400px', padding: '14px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '14px' }}>Ajouter un Titre / Carton</h3>
              <button className="close-btn" onClick={() => setIsTitleModalOpen(false)}>
                <X size={15} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Texte principal</label>
                <input
                  type="text"
                  className="form-input"
                  value={titleForm.text}
                  onChange={(e) => setTitleForm({ ...titleForm, text: e.target.value })}
                  style={{ width: '100%', fontSize: '12px', padding: '4px 6px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Sous-titre (optionnel)</label>
                <input
                  type="text"
                  className="form-input"
                  value={titleForm.subtitle || ''}
                  onChange={(e) => setTitleForm({ ...titleForm, subtitle: e.target.value })}
                  style={{ width: '100%', fontSize: '12px', padding: '4px 6px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Début (s)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    className="form-input"
                    value={titleForm.startTime}
                    onChange={(e) => setTitleForm({ ...titleForm, startTime: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', fontSize: '11px', padding: '3px 5px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Durée (s)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    step={0.5}
                    className="form-input"
                    value={titleForm.duration}
                    onChange={(e) => setTitleForm({ ...titleForm, duration: parseFloat(e.target.value) || 3 })}
                    style={{ width: '100%', fontSize: '11px', padding: '3px 5px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Disposition</label>
                <select
                  className="form-input"
                  value={titleForm.style}
                  onChange={(e) => setTitleForm({ ...titleForm, style: e.target.value as any })}
                  style={{ width: '100%', fontSize: '11px', padding: '3px 5px' }}
                >
                  <option value="lowerthird">Bandeau inférieur (Lower Third)</option>
                  <option value="intro">Plein écran (Intro / Chapitre)</option>
                  <option value="outro">Plein écran (Outro / Fin)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '6px' }}>
                <button className="action-btn" onClick={() => setIsTitleModalOpen(false)}>Annuler</button>
                <button className="btn-primary" onClick={handleSaveTitle}>Valider le titre</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Zoom Modal */}
      {isZoomModalOpen && (
        <div className="modal-overlay" onClick={() => setIsZoomModalOpen(false)}>
          <div className="glass-panel modal-content" style={{ maxWidth: '420px', padding: '16px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b' }}>
                <ZoomIn size={16} />
                Zoom Dynamique (Effet Studio)
              </h3>
              <button className="close-btn" onClick={() => setIsZoomModalOpen(false)}>
                <X size={15} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Nom / Annotation (optionnel)</label>
                <input
                  type="text"
                  className="form-input"
                  value={zoomForm.label || ''}
                  onChange={(e) => setZoomForm({ ...zoomForm, label: e.target.value })}
                  placeholder="ex: Focus sur le bouton, Détail du code..."
                  style={{ width: '100%', fontSize: '12px', padding: '4px 6px' }}
                />
              </div>

              {/* Zoom Scale Selector */}
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Facteur d'agrandissement</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[1.5, 2.0, 2.5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setZoomForm({ ...zoomForm, scale: s })}
                      style={{
                        flex: 1,
                        padding: '5px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: zoomForm.scale === s ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.05)',
                        border: zoomForm.scale === s ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                        color: zoomForm.scale === s ? '#fde68a' : 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {/* 3x3 Target Zone Selector */}
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Zone cible du focus (Point d'ancrage)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', backgroundColor: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '6px' }}>
                  {[
                    { name: 'Haut Gauche', x: 0.2, y: 0.2 },
                    { name: 'Haut Centre', x: 0.5, y: 0.2 },
                    { name: 'Haut Droite', x: 0.8, y: 0.2 },
                    { name: 'Gauche', x: 0.2, y: 0.5 },
                    { name: 'Centre', x: 0.5, y: 0.5 },
                    { name: 'Droite', x: 0.8, y: 0.5 },
                    { name: 'Bas Gauche', x: 0.2, y: 0.8 },
                    { name: 'Bas Centre', x: 0.5, y: 0.8 },
                    { name: 'Bas Droite', x: 0.8, y: 0.8 }
                  ].map((pos) => {
                    const isSelected = Math.abs(zoomForm.originX - pos.x) < 0.1 && Math.abs(zoomForm.originY - pos.y) < 0.1;
                    return (
                      <button
                        key={pos.name}
                        type="button"
                        onClick={() => setZoomForm({ ...zoomForm, originX: pos.x, originY: pos.y })}
                        style={{
                          padding: '6px 4px',
                          fontSize: '10px',
                          borderRadius: '4px',
                          backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255,255,255,0.03)',
                          border: isSelected ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)',
                          color: isSelected ? '#fde68a' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                      >
                        <Crosshair size={10} color={isSelected ? '#f59e0b' : '#64748b'} />
                        <span>{pos.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Range */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Début (s)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    className="form-input"
                    value={zoomForm.startTime}
                    onChange={(e) => setZoomForm({ ...zoomForm, startTime: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', fontSize: '11px', padding: '3px 5px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Durée (s)</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    step={0.5}
                    className="form-input"
                    value={zoomForm.duration}
                    onChange={(e) => setZoomForm({ ...zoomForm, duration: parseFloat(e.target.value) || 3 })}
                    style={{ width: '100%', fontSize: '11px', padding: '3px 5px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '6px' }}>
                <button className="action-btn" onClick={() => setIsZoomModalOpen(false)}>Annuler</button>
                <button className="btn-primary" onClick={handleSaveZoom} style={{ backgroundColor: '#f59e0b', color: '#000000', fontWeight: 600 }}>
                  Appliquer le Zoom
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image & Logo Overlay Modal */}
      {isImageModalOpen && (
        <div className="modal-overlay" onClick={() => setIsImageModalOpen(false)}>
          <div className="glass-panel modal-content" style={{ maxWidth: '460px', padding: '16px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399' }}>
                <ImageIcon size={16} />
                {imageModalMode === 'add' ? 'Superposer un Logo / Filigrane' : 'Modifier le Logo'}
              </h3>
              <button className="close-btn" onClick={() => setIsImageModalOpen(false)}>
                <X size={15} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              {/* Live Mini Frame Preview */}
              <div style={{
                position: 'relative',
                width: '100%',
                height: '130px',
                backgroundColor: '#0a0f1d',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.1)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundImage: 'repeating-conic-gradient(rgba(255,255,255,0.03) 0% 25%, transparent 0% 50%) 50% / 12px 12px'
              }}>
                <div style={{
                  position: 'absolute',
                  inset: '8px',
                  border: '1px dashed rgba(255,255,255,0.12)',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(255,255,255,0.25)',
                  fontSize: '11px',
                  userSelect: 'none'
                }}>
                  Écran Vidéo
                </div>

                {imageForm.dataUrl && (
                  <img
                    src={imageForm.dataUrl}
                    alt=""
                    style={{
                      position: 'absolute',
                      maxWidth: `${imageForm.scale * 100}%`,
                      maxHeight: `${imageForm.scale * 100}%`,
                      opacity: imageForm.opacity,
                      boxShadow: imageForm.hasShadow ? '0 4px 14px rgba(0,0,0,0.85)' : 'none',
                      borderRadius: `${imageForm.borderRadius || 0}px`,
                      objectFit: 'contain',
                      pointerEvents: 'none',
                      transition: 'all 0.1s ease',
                      ...(imageForm.position === 'top-left' ? { top: '12px', left: '12px' } :
                         imageForm.position === 'top-right' ? { top: '12px', right: '12px' } :
                         imageForm.position === 'bottom-left' ? { bottom: '12px', left: '12px' } :
                         imageForm.position === 'bottom-right' ? { bottom: '12px', right: '12px' } :
                         imageForm.position === 'center' ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' } :
                         { top: `${imageForm.y * 100}%`, left: `${imageForm.x * 100}%`, transform: 'translate(-50%, -50%)' })
                    }}
                  />
                )}
              </div>

              {/* Logo Title Input */}
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Nom du logo / filigrane</label>
                <input
                  type="text"
                  className="form-input"
                  value={imageForm.name}
                  onChange={(e) => setImageForm({ ...imageForm, name: e.target.value })}
                  placeholder="ex: Logo Entreprise, Filigrane YouTube..."
                  style={{ width: '100%', fontSize: '12px', padding: '4px 6px' }}
                />
              </div>

              {/* Position Presets */}
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Position à l'écran
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                  {[
                    { id: 'top-left', label: '↖ Haut Gauche' },
                    { id: 'top-right', label: '↗ Haut Droite' },
                    { id: 'center', label: '🎯 Centre' },
                    { id: 'bottom-left', label: '↙ Bas Gauche' },
                    { id: 'bottom-right', label: '↘ Bas Droite' },
                    { id: 'custom', label: '🕹️ Libre (X,Y)' }
                  ].map((p) => {
                    const isSelected = imageForm.position === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setImageForm({ ...imageForm, position: p.id as ImagePositionPreset })}
                        style={{
                          padding: '5px 4px',
                          fontSize: '10px',
                          borderRadius: '4px',
                          backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.04)',
                          border: isSelected ? '1px solid #10b981' : '1px solid var(--border-color)',
                          color: isSelected ? '#34d399' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontWeight: isSelected ? 600 : 400
                        }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Coordinates if custom chosen */}
              {imageForm.position === 'custom' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: 'rgba(0,0,0,0.25)', padding: '6px', borderRadius: '4px' }}>
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Axe X ({Math.round(imageForm.x * 100)}%)</label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={imageForm.x}
                      onChange={(e) => setImageForm({ ...imageForm, x: parseFloat(e.target.value) })}
                      style={{ width: '100%', accentColor: '#10b981' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Axe Y ({Math.round(imageForm.y * 100)}%)</label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={imageForm.y}
                      onChange={(e) => setImageForm({ ...imageForm, y: parseFloat(e.target.value) })}
                      style={{ width: '100%', accentColor: '#10b981' }}
                    />
                  </div>
                </div>
              )}

              {/* Sliders: Scale & Opacity */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Taille / Échelle</span>
                    <span style={{ color: '#34d399', fontWeight: 600 }}>{Math.round(imageForm.scale * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min={0.05}
                    max={0.5}
                    step={0.01}
                    value={imageForm.scale}
                    onChange={(e) => setImageForm({ ...imageForm, scale: parseFloat(e.target.value) })}
                    style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Opacité</span>
                    <span style={{ color: '#34d399', fontWeight: 600 }}>{Math.round(imageForm.opacity * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={imageForm.opacity}
                    onChange={(e) => setImageForm({ ...imageForm, opacity: parseFloat(e.target.value) })}
                    style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {/* Shadow & Rounded corners */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={imageForm.hasShadow ?? true}
                    onChange={(e) => setImageForm({ ...imageForm, hasShadow: e.target.checked })}
                    style={{ accentColor: '#10b981', cursor: 'pointer' }}
                  />
                  <span>Ombre portée (Drop shadow)</span>
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Coins arrondis :</span>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={imageForm.borderRadius || 0}
                    onChange={(e) => setImageForm({ ...imageForm, borderRadius: parseInt(e.target.value) || 0 })}
                    style={{ width: '45px', fontSize: '11px', padding: '2px 4px' }}
                    className="form-input"
                  />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>px</span>
                </div>
              </div>

              {/* Timing settings */}
              <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '8px', borderRadius: '5px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: isPermanentOverlay ? '#34d399' : 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isPermanentOverlay}
                    onChange={(e) => setIsPermanentOverlay(e.target.checked)}
                    style={{ accentColor: '#10b981', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: isPermanentOverlay ? 600 : 400 }}>
                    Afficher pendant toute la vidéo (Watermark permanent)
                  </span>
                </label>

                {!isPermanentOverlay && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Apparition à (s)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        className="form-input"
                        value={imageForm.startTime}
                        onChange={(e) => setImageForm({ ...imageForm, startTime: parseFloat(e.target.value) || 0 })}
                        style={{ width: '100%', fontSize: '11px', padding: '3px 5px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Durée d'affichage (s)</label>
                      <input
                        type="number"
                        min={0.5}
                        step={0.5}
                        className="form-input"
                        value={imageForm.duration}
                        onChange={(e) => setImageForm({ ...imageForm, duration: parseFloat(e.target.value) || 5 })}
                        style={{ width: '100%', fontSize: '11px', padding: '3px 5px' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '6px' }}>
                <button className="action-btn" onClick={() => setIsImageModalOpen(false)}>Annuler</button>
                <button
                  className="btn-primary"
                  onClick={handleSaveImageOverlay}
                  style={{ backgroundColor: '#10b981', color: '#042f2e', fontWeight: 600 }}
                >
                  {imageModalMode === 'add' ? 'Ajouter à la vidéo' : 'Enregistrer les modifications'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* YouTube Chapters Modal */}
      {isChaptersModalOpen && (
        <div className="modal-overlay" onClick={() => setIsChaptersModalOpen(false)}>
          <div className="glass-panel modal-content" style={{ maxWidth: '560px', padding: '16px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8' }}>
                <ListTree size={16} />
                Chapitres YouTube & Table des Matières
              </h3>
              <button className="close-btn" onClick={() => setIsChaptersModalOpen(false)}>
                <X size={15} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              {/* Quick Auto-Generation Bar */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <button
                  className="btn-toolbar"
                  onClick={handleAutoGenerateChaptersFromClips}
                  style={{ fontSize: '11px', padding: '4px 8px', color: '#06b6d4', borderColor: 'rgba(6, 182, 212, 0.4)' }}
                  title="Créer un chapitre au début de chaque clip vidéo"
                >
                  ⚡ Détecter depuis les clips ({(project.clips || []).length})
                </button>

                <button
                  className="btn-toolbar"
                  onClick={handleAutoGenerateChaptersFromTitles}
                  style={{ fontSize: '11px', padding: '4px 8px', color: '#c084fc', borderColor: 'rgba(192, 132, 252, 0.4)' }}
                  title="Créer des chapitres à partir des titres textuels"
                >
                  🔤 Détecter depuis les titres ({(project.titles || []).length})
                </button>

                <button
                  className="btn-toolbar"
                  onClick={handleAddChapterAtCurrentTime}
                  style={{ fontSize: '11px', padding: '4px 8px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                  title="Ajouter un nouveau marqueur de chapitre à la position actuelle de lecture"
                >
                  ➕ Ajouter à {formatTime(currentTime)}
                </button>
              </div>

              {/* YouTube Rules Compliance Badge */}
              <div style={{
                fontSize: '10px',
                padding: '6px 10px',
                borderRadius: '5px',
                backgroundColor: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'var(--text-secondary)'
              }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ color: (project.chapters || []).length >= 3 ? '#34d399' : '#f59e0b' }}>
                    {(project.chapters || []).length >= 3 ? '✓' : '⚠️'} Min. 3 chapitres ({(project.chapters || []).length})
                  </span>
                  <span style={{ color: '#34d399' }}>
                    ✓ Démarre à 00:00 (Auto)
                  </span>
                  <span style={{ color: '#94a3b8' }}>
                    ℹ️ Min. 10s par chapitre
                  </span>
                </div>
              </div>

              {/* Editable Chapters List */}
              <div style={{
                maxHeight: '180px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                padding: '4px',
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.06)'
              }}>
                {(project.chapters || []).map((chap, idx) => (
                  <div
                    key={chap.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '4px 8px',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      borderRadius: '4px',
                      border: '1px solid rgba(255,255,255,0.06)'
                    }}
                  >
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#38bdf8', width: '22px' }}>
                      #{idx + 1}
                    </span>

                    {/* Time Input in seconds */}
                    <input
                      type="number"
                      min={0}
                      max={totalDuration || 9999}
                      step={0.5}
                      value={chap.time}
                      onChange={(e) => handleUpdateChapter(chap.id, parseFloat(e.target.value) || 0, chap.title)}
                      style={{ width: '55px', fontSize: '11px', padding: '2px 4px', textAlign: 'center' }}
                      className="form-input"
                      title="Temps en secondes"
                    />

                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      ({formatTime(chap.time)})
                    </span>

                    {/* Chapter Title Input */}
                    <input
                      type="text"
                      value={chap.title}
                      onChange={(e) => handleUpdateChapter(chap.id, chap.time, e.target.value)}
                      placeholder="Nom du chapitre..."
                      style={{ flexGrow: 1, fontSize: '11px', padding: '2px 6px' }}
                      className="form-input"
                    />

                    {/* Jump button */}
                    <button
                      className="btn-toolbar"
                      onClick={() => handleSeek(chap.time)}
                      style={{ padding: '2px 5px', fontSize: '10px' }}
                      title="Aller à ce point dans la vidéo"
                    >
                      🎯
                    </button>

                    {/* Delete button */}
                    <button
                      style={{ background: 'transparent', border: 'none', color: '#fb7185', cursor: 'pointer', padding: '2px' }}
                      onClick={() => handleRemoveChapter(chap.id)}
                      title="Supprimer ce chapitre"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}

                {(!project.chapters || project.chapters.length === 0) && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                    Aucun chapitre défini. Cliquez ci-dessus sur « ⚡ Détecter depuis les clips » ou « ➕ Ajouter à l'instant actuel ».
                  </div>
                )}
              </div>

              {/* Formatted Text Box for Copy/Paste */}
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Texte formaté pour la description YouTube :</span>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Format officiel avec minutages</span>
                </label>
                <textarea
                  readOnly
                  rows={4}
                  value={formatYouTubeChapters(project.chapters || [])}
                  style={{
                    width: '100%',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    padding: '6px 8px',
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    color: '#e2e8f0',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    resize: 'none'
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <button
                  className="btn-toolbar"
                  onClick={handleDownloadYouTubeChapters}
                  style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Télécharger la liste des chapitres en fichier .txt"
                >
                  <Download size={12} />
                  <span>Télécharger .txt</span>
                </button>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="action-btn" onClick={() => setIsChaptersModalOpen(false)}>Fermer</button>
                  <button
                    className="btn-primary"
                    onClick={handleCopyYouTubeChapters}
                    style={{
                      backgroundColor: copiedChapters ? '#10b981' : '#38bdf8',
                      color: '#000000',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    {copiedChapters ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedChapters ? 'Copié dans le presse-papier !' : 'Copier pour YouTube'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GIF Export Modal */}
      {gifModalVideo && (
        <GifExportModal
          video={gifModalVideo}
          onClose={() => setGifModalVideo(null)}
          onSavedToLibrary={loadLibraryAndProjects}
        />
      )}

      {/* Device Frame Modal */}
      {frameModalVideo && (
        <DeviceFrameModal
          video={frameModalVideo}
          onClose={() => setFrameModalVideo(null)}
          onSavedToLibrary={loadLibraryAndProjects}
        />
      )}

      {/* Subtitles Studio Modal */}
      {subtitlesModalVideo && (
        <SubtitlesStudioModal
          video={subtitlesModalVideo}
          onClose={() => setSubtitlesModalVideo(null)}
          onSavedToLibrary={loadLibraryAndProjects}
        />
      )}

      {/* Voice Generator Modal */}
      {isVoiceModalOpen && (
        <VoiceGeneratorModal
          onClose={() => setIsVoiceModalOpen(false)}
          onGenerated={(title, blob) => {
            const newAudio = {
              id: `voice_${Date.now()}`,
              title,
              blob,
              url: URL.createObjectURL(blob)
            };
            setCustomAudios(prev => [newAudio, ...prev]);
            setProject(prev => ({
              ...prev,
              backgroundMusic: {
                id: newAudio.id,
                title: newAudio.title,
                blob: newAudio.blob,
                volume: 0.85, // Higher default volume for speech voiceovers
                loop: false,
                isPreset: false
              }
            }));
            setIsVoiceModalOpen(false);
          }}
        />
      )}

      {/* Silence Remover for a Timeline Clip */}
      {silenceRemoverClip && (
        <SilenceRemoverModal
          video={silenceRemoverClip.video}
          onClose={() => setSilenceRemoverClip(null)}
          onApplySegments={(segments) => handleApplySilenceSegmentsToClip(silenceRemoverClip.id, segments)}
        />
      )}

      {/* Silence Remover for a Library Video */}
      {silenceRemoverLibraryVideo && (
        <SilenceRemoverModal
          video={silenceRemoverLibraryVideo}
          onClose={() => setSilenceRemoverLibraryVideo(null)}
          onApplySegments={(segments) => handleApplySilenceSegmentsToLibraryVideo(silenceRemoverLibraryVideo, segments)}
        />
      )}

      {/* Step-by-Step Tutorial Maker Modal */}
      {isTutorialMakerOpen && (exportedBlob || project.clips[0]?.video.blob) && (
        <TutorialMakerModal
          videoBlob={exportedBlob || project.clips[0]?.video.blob}
          videoTitle={projectName}
          onClose={() => setIsTutorialMakerOpen(false)}
        />
      )}

      {/* Slide / Title Card Editor Modal */}
      <SlideEditorModal
        isOpen={isSlideModalOpen}
        mode={slideModalMode}
        initialForm={slideForm}
        initialPosition={slideInsertPosition}
        libraryImages={libraryImages}
        onSave={(savedForm, pos) => {
          handleSaveSlideClip(savedForm, pos);
        }}
        onClose={() => setIsSlideModalOpen(false)}
      />

      {/* Image Slide Picker Modal */}
      <ImageSlidePickerModal
        isOpen={isImageSlidePickerOpen}
        libraryImages={libraryImages}
        initialPosition={imageSlideInsertPosition}
        onSelectImage={(media, dur, pos) => {
          handleAddImageAsClip(media, dur, pos);
        }}
        onImportNewImage={() => {
          setChutierTab('images');
          imageFileInputRef.current?.click();
        }}
        onClose={() => setIsImageSlidePickerOpen(false)}
      />

      {/* Video Picker Modal */}
      <VideoPickerModal
        isOpen={isVideoPickerOpen}
        libraryVideos={libraryVideos}
        initialPosition={videoInsertPosition}
        onSelectVideo={(video, pos) => {
          addClipToTimeline(video, pos);
        }}
        onImportNewVideo={() => {
          setChutierTab('videos');
          videoFileInputRef.current?.click();
        }}
        onClose={() => setIsVideoPickerOpen(false)}
      />

      {/* Voiceover Properties Modal */}
      {isVoiceoverModalOpen && voiceoverForm && (
        <div className="modal-overlay" onClick={() => setIsVoiceoverModalOpen(false)}>
          <div className="glass-panel modal-content" style={{ maxWidth: '420px', padding: '16px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', color: '#f43f5e' }}>
                <Mic size={15} />
                <span>Modifier l'Enregistrement Vocal</span>
              </h3>
              <button className="close-btn" onClick={() => setIsVoiceoverModalOpen(false)}>
                <X size={15} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Nom / Titre du clip vocal</label>
                <input
                  type="text"
                  className="form-input"
                  value={voiceoverForm.label}
                  onChange={(e) => setVoiceoverForm({ ...voiceoverForm, label: e.target.value })}
                  style={{ width: '100%', fontSize: '12px', padding: '4px 6px', marginTop: '3px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Position Début (s)</label>
                  <input
                    type="number"
                    disabled
                    value={voiceoverForm.startTime}
                    style={{ width: '100%', fontSize: '11px', padding: '3px 5px', opacity: 0.7, cursor: 'not-allowed', marginTop: '3px' }}
                    className="form-input"
                    title="Déplacez le clip directement sur la piste chronologique pour changer sa position"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Durée (s)</label>
                  <input
                    type="number"
                    disabled
                    value={voiceoverForm.duration}
                    style={{ width: '100%', fontSize: '11px', padding: '3px 5px', opacity: 0.7, cursor: 'not-allowed', marginTop: '3px' }}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Volume de la voix</label>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#f43f5e' }}>{Math.round(voiceoverForm.volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={voiceoverForm.volume}
                  onChange={(e) => setVoiceoverForm({ ...voiceoverForm, volume: parseFloat(e.target.value) })}
                  style={{ width: '100%', accentColor: '#f43f5e', cursor: 'pointer' }}
                />
              </div>

              {voiceoverForm.url && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Pré-écoute du clip vocal :</label>
                  <audio controls src={voiceoverForm.url} style={{ width: '100%', height: '32px' }} />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '8px' }}>
                <button className="action-btn" onClick={() => setIsVoiceoverModalOpen(false)}>Annuler</button>
                <button
                  className="btn-primary"
                  onClick={handleSaveVoiceoverForm}
                  style={{ backgroundColor: '#f43f5e', color: '#ffffff', fontWeight: 600 }}
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
