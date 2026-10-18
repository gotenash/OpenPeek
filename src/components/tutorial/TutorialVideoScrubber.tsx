import React from 'react';
import { Play, Pause, Camera } from 'lucide-react';
import type { TutorialMetadata } from './tutorialExporter';

interface TutorialVideoScrubberProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoUrl: string;
  onLoadedMetadata: () => void;
  onTimeUpdate: () => void;
  currentTime: number;
  videoDuration: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSeekRelative: (offset: number) => void;
  onCaptureFrame: () => void;
  isCapturing: boolean;
  meta: TutorialMetadata;
  onMetaChange: (meta: TutorialMetadata) => void;
}

export function TutorialVideoScrubber({
  videoRef,
  videoUrl,
  onLoadedMetadata,
  onTimeUpdate,
  currentTime,
  videoDuration,
  isPlaying,
  onTogglePlay,
  onSeek,
  onSeekRelative,
  onCaptureFrame,
  isCapturing,
  meta,
  onMetaChange
}: TutorialVideoScrubberProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      minHeight: 0,
      overflowY: 'auto',
      paddingRight: '6px'
    }}>
      {/* Video Player Card */}
      <div style={{
        background: '#000000',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        position: 'relative'
      }}>
        <video
          ref={videoRef}
          src={videoUrl}
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={onTimeUpdate}
          style={{ width: '100%', aspectRatio: '16/9', display: 'block', objectFit: 'contain' }}
          onClick={onTogglePlay}
        />

        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(6px)',
          padding: '3px 8px',
          borderRadius: '6px',
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#ffffff'
        }}>
          {formatTime(currentTime)} / {formatTime(videoDuration)}
        </div>
      </div>

      {/* Scrubber & Player Controls */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        padding: '10px 12px',
        borderRadius: '10px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <input
          type="range"
          min={0}
          max={videoDuration || 1}
          step={0.1}
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              onClick={() => onSeekRelative(-5)}
              className="btn-control-secondary"
              style={{ padding: '4px 8px', fontSize: '11px' }}
              title="Reculer de 5 secondes"
            >
              -5s
            </button>
            <button
              type="button"
              onClick={() => onSeekRelative(-1)}
              className="btn-control-secondary"
              style={{ padding: '4px 8px', fontSize: '11px' }}
              title="Reculer de 1 seconde"
            >
              -1s
            </button>
          </div>

          <button
            type="button"
            onClick={onTogglePlay}
            style={{
              background: 'var(--primary)',
              border: 'none',
              color: '#ffffff',
              padding: '6px 16px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
            <span>{isPlaying ? 'Pause' : 'Lecture'}</span>
          </button>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              onClick={() => onSeekRelative(1)}
              className="btn-control-secondary"
              style={{ padding: '4px 8px', fontSize: '11px' }}
              title="Avancer de 1 seconde"
            >
              +1s
            </button>
            <button
              type="button"
              onClick={() => onSeekRelative(5)}
              className="btn-control-secondary"
              style={{ padding: '4px 8px', fontSize: '11px' }}
              title="Avancer de 5 secondes"
            >
              +5s
            </button>
          </div>
        </div>
      </div>

      {/* Big Capture Step Button */}
      <button
        type="button"
        onClick={onCaptureFrame}
        disabled={isCapturing}
        style={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
          border: 'none',
          color: '#ffffff',
          padding: '12px',
          borderRadius: '10px',
          fontSize: '14px',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: '0 4px 16px rgba(139, 92, 246, 0.4)',
          transition: 'transform 0.1s ease',
          opacity: isCapturing ? 0.7 : 1
        }}
      >
        <Camera size={18} />
        <span>📸 Capturer cette étape ({formatTime(currentTime)})</span>
      </button>

      {/* Tutorial Meta Info Settings */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '10px',
        border: '1px solid var(--border-color)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
          Métadonnées du Guide
        </span>

        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Titre du tutoriel</label>
          <input
            type="text"
            value={meta.title}
            onChange={(e) => onMetaChange({ ...meta, title: e.target.value })}
            style={{
              width: '100%',
              padding: '6px 10px',
              fontSize: '12px',
              borderRadius: '6px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--border-color)',
              color: '#ffffff'
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Auteur</label>
            <input
              type="text"
              value={meta.author}
              onChange={(e) => onMetaChange({ ...meta, author: e.target.value })}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '12px',
                borderRadius: '6px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-color)',
                color: '#ffffff'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Durée estimée</label>
            <input
              type="text"
              value={meta.estimatedTime}
              onChange={(e) => onMetaChange({ ...meta, estimatedTime: e.target.value })}
              placeholder="ex: 5 min"
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '12px',
                borderRadius: '6px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-color)',
                color: '#ffffff'
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Niveau</label>
          <select
            value={meta.difficulty}
            onChange={(e) => onMetaChange({ ...meta, difficulty: e.target.value as any })}
            style={{
              width: '100%',
              padding: '6px 10px',
              fontSize: '12px',
              borderRadius: '6px',
              background: '#1a1e2d',
              border: '1px solid var(--border-color)',
              color: '#ffffff'
            }}
          >
            <option value="Débutant">🌱 Débutant</option>
            <option value="Intermédiaire">⚡ Intermédiaire</option>
            <option value="Avancé">🔥 Avancé</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Introduction / Objectifs</label>
          <textarea
            rows={2}
            value={meta.intro}
            onChange={(e) => onMetaChange({ ...meta, intro: e.target.value })}
            placeholder="Présentez le but de ce tutoriel..."
            style={{
              width: '100%',
              padding: '6px 10px',
              fontSize: '12px',
              borderRadius: '6px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--border-color)',
              color: '#ffffff',
              resize: 'none'
            }}
          />
        </div>
      </div>
    </div>
  );
}
