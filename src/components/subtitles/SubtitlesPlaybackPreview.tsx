import React from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface SubtitlesPlaybackPreviewProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isPlaying: boolean;
  onTogglePlay: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  currentTime: number;
  videoDuration: number;
}

export function SubtitlesPlaybackPreview({
  canvasRef,
  isPlaying,
  onTogglePlay,
  isMuted,
  onToggleMute,
  volume,
  onVolumeChange,
  currentTime,
  videoDuration
}: SubtitlesPlaybackPreviewProps) {
  return (
    <div style={{
      position: 'relative',
      height: '260px',
      maxHeight: '260px',
      backgroundColor: '#0a0a0f',
      borderRadius: '8px',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid var(--border-color)'
    }}>
      <canvas 
        ref={canvasRef} 
        style={{ 
          maxHeight: '100%', 
          maxWidth: '100%', 
          objectFit: 'contain', 
          borderRadius: '4px' 
        }} 
      />

      {/* Left Controls: Play/Pause & Sound */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: '4px 8px',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <button
          onClick={onTogglePlay}
          style={{
            background: 'none',
            border: 'none',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: '2px'
          }}
          title={isPlaying ? 'Pause' : 'Lecture'}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>

        <button
          onClick={onToggleMute}
          style={{
            background: 'none',
            border: 'none',
            color: isMuted ? '#f87171' : '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: '2px'
          }}
          title={isMuted ? 'Activer le son' : 'Couper le son'}
        >
          {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>

        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={isMuted ? 0 : volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          style={{ width: '50px', accentColor: '#38bdf8', cursor: 'pointer' }}
          title={`Volume : ${Math.round((isMuted ? 0 : volume) * 100)}%`}
        />
      </div>

      {/* Time Badge */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        padding: '4px 8px',
        borderRadius: '4px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        fontSize: '11px',
        color: 'var(--text-secondary)'
      }}>
        {currentTime.toFixed(1)}s / {videoDuration.toFixed(1)}s
      </div>
    </div>
  );
}
