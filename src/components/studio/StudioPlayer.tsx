import React from 'react';
import { 
  Film, Maximize2, Minimize2, Play, Pause, Scissors, Mic, 
  Type, ZoomIn, Image as ImageIcon, ListTree, Sparkles, Check, 
  Layers, BookOpen, Download 
} from 'lucide-react';

export interface StudioPlayerProps {
  previewContainerRef: React.RefObject<HTMLDivElement | null>;
  previewCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  previewSize: 'compact' | 'standard' | 'large';
  previewHeight: number;
  updatePreviewSize: (size: 'compact' | 'standard' | 'large') => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  projectName: string;
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  togglePlay: () => void;
  handleSeek: (time: number) => void;
  handleSplitAtPlayhead: () => void;
  canSplitAtPlayhead: boolean;
  isRecordingVoiceover: boolean;
  startVoiceoverRecording: () => void;
  stopVoiceoverRecording: () => void;
  isExporting: boolean;
  exportProgress: number;
  exportStatus: string;
  exportFormat: 'mp4' | 'webm';
  setExportFormat: (format: 'mp4' | 'webm') => void;
  exportEngine?: 'auto' | 'turbo' | 'studio';
  setExportEngine?: (engine: 'auto' | 'turbo' | 'studio') => void;
  isEligibleForTurbo?: boolean;
  exportCurrentSec: number;
  handleExportProject: () => void;
  handleCancelExport: () => void;
  exportedBlob: Blob | null;
  handleDownloadExported: () => void;
  isDownloaded?: boolean;
  formatTime: (secs: number) => string;
  hasClips: boolean;
  onOpenAddTitleModal: () => void;
  onOpenAddSlideModal: () => void;
  onOpenAddZoomModal: () => void;
  onOpenAddImageOverlayModal: () => void;
  onOpenChaptersModal: () => void;
  onOpenSubtitlesModal: () => void;
  onOpenFrameModal: () => void;
  onOpenGifModal: () => void;
  onOpenTutorialMaker: () => void;
  chaptersCount: number;
  activeOverlays: {
    hasTitle: boolean;
    hasZoom: boolean;
    hasImage: boolean;
  };
}

export function StudioPlayer({
  previewContainerRef,
  previewCanvasRef,
  previewSize,
  previewHeight,
  updatePreviewSize,
  isFullscreen,
  toggleFullscreen,
  projectName,
  currentTime,
  totalDuration,
  isPlaying,
  togglePlay,
  handleSeek,
  handleSplitAtPlayhead,
  canSplitAtPlayhead,
  isRecordingVoiceover,
  startVoiceoverRecording,
  stopVoiceoverRecording,
  isExporting,
  exportProgress,
  exportStatus,
  exportFormat,
  setExportFormat,
  exportEngine = 'auto',
  setExportEngine,
  isEligibleForTurbo = false,
  exportCurrentSec,
  handleExportProject,
  handleCancelExport,
  exportedBlob,
  handleDownloadExported,
  isDownloaded = false,
  formatTime,
  hasClips,
  onOpenAddTitleModal,
  onOpenAddSlideModal,
  onOpenAddZoomModal,
  onOpenAddImageOverlayModal,
  onOpenChaptersModal,
  onOpenSubtitlesModal,
  onOpenFrameModal,
  onOpenGifModal,
  onOpenTutorialMaker,
  chaptersCount,
  activeOverlays
}: StudioPlayerProps) {
  return (
    <div 
      ref={previewContainerRef}
      className={`glass-panel editor-monitor-panel ${isFullscreen ? 'is-fullscreen' : ''}`}
      style={{ 
        padding: isFullscreen ? '16px 24px' : '10px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '6px', 
        height: isFullscreen ? undefined : `${previewHeight}px`,
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

              {/* Progress Bar */}
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
                <span style={{ fontSize: '9px', color: exportStatus.includes('Turbo') || exportStatus.includes('FFmpeg') ? '#c084fc' : '#64748b' }}>
                  {exportStatus.includes('Turbo') || exportStatus.includes('FFmpeg') ? '⚡ Rendu Turbo FFmpeg ultra-rapide' : '🎨 Rendu direct image par image'}
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
                onClick={handleSplitAtPlayhead}
                disabled={!canSplitAtPlayhead}
                className="btn-toolbar"
                style={{
                  padding: '5px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: canSplitAtPlayhead ? '#fb7185' : 'var(--text-muted)',
                  borderColor: canSplitAtPlayhead ? 'rgba(244, 63, 94, 0.45)' : 'rgba(255, 255, 255, 0.1)',
                  backgroundColor: canSplitAtPlayhead ? 'rgba(244, 63, 94, 0.15)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  opacity: canSplitAtPlayhead ? 1 : 0.4,
                  cursor: canSplitAtPlayhead ? 'pointer' : 'not-allowed'
                }}
                title={canSplitAtPlayhead ? "Couper le clip à la tête de lecture (Touche C ou S)" : "Placez la tête de lecture sur un clip pour le couper"}
              >
                <Scissors size={12} color={canSplitAtPlayhead ? '#fb7185' : 'currentColor'} />
                <span>Couper (C)</span>
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
                {activeOverlays.hasTitle && (
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(192, 132, 252, 0.2)', color: '#c084fc', border: '1px solid rgba(192, 132, 252, 0.4)', fontWeight: 600 }}>
                    🔤 Titre actif
                  </span>
                )}
                {activeOverlays.hasZoom && (
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)', fontWeight: 600 }}>
                    🔍 Zoom actif
                  </span>
                )}
                {activeOverlays.hasImage && (
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', fontWeight: 600 }}>
                    🖼️ Logo actif
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                [Espace] Lecture • [C] Couper • [Suppr] Supprimer • [← →] Saut 1s • [Échap] Quitter
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
              onClick={handleSplitAtPlayhead}
              disabled={!canSplitAtPlayhead}
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                color: canSplitAtPlayhead ? '#fb7185' : 'var(--text-muted)',
                borderColor: canSplitAtPlayhead ? 'rgba(244, 63, 94, 0.45)' : 'rgba(255, 255, 255, 0.1)',
                backgroundColor: canSplitAtPlayhead ? 'rgba(244, 63, 94, 0.12)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 600,
                opacity: canSplitAtPlayhead ? 1 : 0.45,
                cursor: canSplitAtPlayhead ? 'pointer' : 'not-allowed'
              }}
              title={canSplitAtPlayhead ? "Couper le clip à la tête de lecture (Raccourci : C ou S)" : "Placez la tête de lecture sur un clip pour le scinder"}
            >
              <Scissors size={12} color={canSplitAtPlayhead ? '#fb7185' : 'currentColor'} />
              <span>Couper (C)</span>
            </button>

            <button
              className="btn-toolbar"
              onClick={onOpenAddTitleModal}
              style={{ fontSize: '11px', padding: '3px 8px' }}
              title="Ajouter un titre en superposition sur la vidéo"
            >
              <Type size={12} color="#c084fc" />
              <span>+ Titre</span>
            </button>

            <button
              className="btn-toolbar"
              onClick={onOpenAddSlideModal}
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
              onClick={onOpenAddZoomModal}
              style={{ fontSize: '11px', padding: '3px 8px', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)' }}
              title="Ajouter un zoom dynamique / focus sur une zone de l'écran"
            >
              <ZoomIn size={12} />
              <span>+ Zoom</span>
            </button>

            <button
              className="btn-toolbar"
              onClick={onOpenAddImageOverlayModal}
              style={{ fontSize: '11px', padding: '3px 8px', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.4)' }}
              title="Ajouter un logo ou une image en superposition sur la vidéo"
            >
              <ImageIcon size={12} color="#10b981" />
              <span>+ Logo / Image</span>
            </button>

            <button
              className="btn-toolbar"
              onClick={onOpenChaptersModal}
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
              <span>📑 Chapitres ({chaptersCount})</span>
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

            {setExportEngine && (
              <select
                value={exportEngine}
                onChange={(e) => setExportEngine(e.target.value as 'auto' | 'turbo' | 'studio')}
                style={{
                  fontSize: '11px',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  color: exportEngine === 'turbo' || (exportEngine === 'auto' && isEligibleForTurbo) ? '#c084fc' : '#94a3b8',
                  border: exportEngine === 'turbo' || (exportEngine === 'auto' && isEligibleForTurbo) ? '1px solid rgba(192, 132, 252, 0.5)' : '1px solid var(--border-color)',
                  cursor: 'pointer'
                }}
                title="Moteur de rendu : Turbo FFmpeg (ultra-rapide direct) ou Studio Canvas"
              >
                <option value="auto">Moteur : Auto {isEligibleForTurbo ? '⚡ Turbo' : '🎨 Studio'}</option>
                <option value="turbo">⚡ Forcer Turbo FFmpeg</option>
                <option value="studio">🎨 Forcer Studio Canvas</option>
              </select>
            )}

            <button
              className="btn-primary"
              onClick={handleExportProject}
              disabled={isExporting || !hasClips}
              style={{ fontSize: '11px', padding: '3px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              {isExporting ? <Sparkles size={12} className="spinning" /> : <Check size={12} />}
              <span>{isExporting ? `Exportation (${exportProgress}%)` : `Exporter (${exportFormat.toUpperCase()})`}</span>
            </button>

            {exportedBlob && (
              <>
                <button 
                  className="btn-secondary" 
                  onClick={onOpenSubtitlesModal} 
                  style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px', color: '#fde047', borderColor: 'rgba(253, 224, 71, 0.4)' }}
                  title="Générer des sous-titres et captions dynamiques pour ce montage"
                >
                  <Type size={12} />
                  <span>Sous-titres</span>
                </button>

                <button 
                  className="btn-secondary" 
                  onClick={onOpenFrameModal} 
                  style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                  title="Ajouter un habillage gradient, cadre macOS et formats TikTok/YouTube/LinkedIn"
                >
                  <Layers size={12} />
                  <span>Habillage</span>
                </button>

                <button 
                  className="btn-secondary" 
                  onClick={onOpenGifModal} 
                  style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px', color: '#c084fc', borderColor: 'rgba(192, 132, 252, 0.4)' }}
                  title="Générer un GIF animé à partir de ce montage"
                >
                  <Sparkles size={12} />
                  <span>Créer un GIF</span>
                </button>

                <button 
                  className="btn-secondary" 
                  onClick={onOpenTutorialMaker} 
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
                    padding: '3px 12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    backgroundColor: isDownloaded ? '#059669' : '#10b981',
                    borderColor: isDownloaded ? '#34d399' : '#10b981',
                    boxShadow: isDownloaded ? '0 0 16px rgba(16, 185, 129, 0.65)' : '0 0 10px rgba(16, 185, 129, 0.35)',
                    transition: 'all 0.22s ease',
                    transform: isDownloaded ? 'scale(1.02)' : 'none'
                  }}
                  title="Enregistrer ce fichier vidéo sur votre ordinateur"
                >
                  {isDownloaded ? <Check size={13} /> : <Download size={12} />}
                  <span>
                    {isDownloaded 
                      ? `✓ Téléchargé (${exportedBlob.type.includes('mp4') ? 'MP4' : 'WebM'}) !` 
                      : `Télécharger (${exportedBlob.type.includes('mp4') ? 'MP4' : 'WebM'})`}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
