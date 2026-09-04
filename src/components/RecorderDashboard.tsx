import React, { useEffect, useRef, useState } from 'react';
import type { RecorderOptions } from '../hooks/useRecorder';
import { useI18n } from '../i18n/I18nContext';
import { 
  Play, 
  Pause, 
  Square, 
  Video, 
  Mic, 
  Volume2, 
  ZoomIn, 
  ZoomOut, 
  Target, 
  MousePointer,
  Pencil,
  ArrowUpRight,
  Highlighter,
  ShieldAlert,
  Trash2,
  Sparkles,
  Eye,
  EyeOff,
  Wand2,
  Keyboard,
  Monitor
} from 'lucide-react';

interface RecorderDashboardProps {
  options: RecorderOptions;
  setOptions: React.Dispatch<React.SetStateAction<RecorderOptions>>;
  recorder: any; // Return type of useRecorder
}

export function RecorderDashboard({ options, setOptions, recorder }: RecorderDashboardProps) {
  const { t } = useI18n();
  const [systemMonitors, setSystemMonitors] = useState<Array<{ id: string; name: string; is_primary: boolean; width: number; height: number }>>([]);

  useEffect(() => {
    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke<Array<{ id: string; name: string; is_primary: boolean; width: number; height: number }>>('get_system_monitors')
        .then((monitors) => {
          if (monitors && monitors.length > 0) {
            setSystemMonitors(monitors);
          }
        })
        .catch(() => {});
    }).catch(() => {});
  }, []);

  const handleSelectMonitor = (pref: string) => {
    setOptions(prev => ({ ...prev, selectedMonitorId: pref }));
    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke('save_screen_preference', { preference: pref }).catch(() => {});
      invoke('set_active_capture_monitor', { monitorId: pref }).catch(() => {});
    }).catch(() => {});
  };
  const {
    isRecording,
    isPaused,
    isPreviewing,
    recordingTime,
    micLevel,
    countdown,
    cancelCountdown,
    startScreenPreview,
    stopScreenPreview,
    isZoomed,
    isSpotlight,
    zoomFactor,
    isAutoZoomEnabled,
    toggleAutoZoom,
    toggleZoom,
    setZoomCenter,
    setZoomFactor,
    toggleSpotlight,
    // Live Drawing API
    isDrawingMode,
    drawTool,
    drawColor,
    isAutoFade,
    toggleDrawingMode,
    setDrawTool,
    setDrawColor,
    setIsAutoFade,
    clearDrawings,
    startDrawingStroke,
    updateDrawingStroke,
    endDrawingStroke,
    canvas: recorderCanvas,
    analyserNode,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    updateWebcamPosition,
    setWebcamSize
  } = recorder;

  const canvasMountRef = useRef<HTMLDivElement>(null);
  const visualizerCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);
  const isDrawingStrokeActiveRef = useRef(false);

  // 1. Render the live composite canvas inside a dedicated mounting wrapper
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (mount && recorderCanvas) {
      if (!mount.contains(recorderCanvas)) {
        mount.innerHTML = '';
        recorderCanvas.style.width = '100%';
        recorderCanvas.style.height = '100%';
        recorderCanvas.style.objectFit = 'contain';
        recorderCanvas.className = 'preview-video';
        mount.appendChild(recorderCanvas);
      }
    }
  }, [recorderCanvas]);

  // 2. Audio Visualizer for Mic Activity
  useEffect(() => {
    if (!visualizerCanvasRef.current || !analyserNode || !isRecording || isPaused) return;

    const canvas = visualizerCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationId = requestAnimationFrame(render);
      analyserNode.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Render glowing audio bars
      const barWidth = (canvas.width / 32) - 2;
      let x = 0;

      for (let i = 0; i < 32; i++) {
        const barHeight = (dataArray[i * 2] / 255) * canvas.height;
        
        // Gradient color for audio activity
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#8b5cf6');
        gradient.addColorStop(1, '#ec4899');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 2;
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [analyserNode, isRecording, isPaused]);

  // 3. Mouse interactions on canvas (Drawing vs Webcam dragging)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isRecording) return;
    if (!canvasMountRef.current || !recorderCanvas) return;
    const canvasElement = canvasMountRef.current.querySelector('canvas');
    if (!canvasElement) return;

    const rect = canvasElement.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    if (isDrawingMode) {
      isDrawingStrokeActiveRef.current = true;
      startDrawingStroke(clickX, clickY);
      return;
    }

    if (options.showWebcam) {
      isDraggingRef.current = true;
      handleDrag(e);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isRecording) return;
    if (!canvasMountRef.current || !recorderCanvas) return;
    const canvasElement = canvasMountRef.current.querySelector('canvas');
    if (!canvasElement) return;

    const rect = canvasElement.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    if (isDrawingMode && isDrawingStrokeActiveRef.current) {
      updateDrawingStroke(clickX, clickY);
      return;
    }

    if (isDraggingRef.current) {
      handleDrag(e);
    }
  };

  const handleMouseUpOrLeave = () => {
    if (isDrawingMode && isDrawingStrokeActiveRef.current) {
      isDrawingStrokeActiveRef.current = false;
      endDrawingStroke();
    }
    isDraggingRef.current = false;
  };

  const handleDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasMountRef.current || !recorderCanvas) return;
    const canvasElement = canvasMountRef.current.querySelector('canvas');
    if (!canvasElement) return;

    const rect = canvasElement.getBoundingClientRect();
    updateWebcamPosition(e.clientX, e.clientY, rect);
  };

  // 4. Double-click on preview to center zoom dynamically
  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isRecording || isDrawingMode) return;
    if (!canvasMountRef.current) return;
    const canvasElement = canvasMountRef.current.querySelector('canvas');
    if (!canvasElement) return;

    const rect = canvasElement.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    setZoomCenter(clickX, clickY);
  };

  // Format Elapsed Time (HH:MM:SS)
  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [
      hrs > 0 ? String(hrs).padStart(2, '0') : null,
      String(mins).padStart(2, '0'),
      String(secs).padStart(2, '0')
    ].filter(Boolean).join(':');
  };

  return (
    <div className="dashboard-grid">
      {/* Left side: Live Preview & Live Drawing/Webcam */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div 
          className="preview-container" 
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onDoubleClick={handlePreviewClick}
          title={isRecording ? (isDrawingMode ? "Dessinez directement sur la vidéo avec la souris !" : "Double-cliquez sur une zone pour y centrer le Zoom direct !") : ""}
          style={{ cursor: isRecording ? (isDrawingMode ? 'crosshair' : (options.showWebcam ? 'move' : 'pointer')) : 'default' }}
        >
          {/* Canvas dedicated mount container */}
          <div 
            ref={canvasMountRef} 
            style={{ 
              width: '100%', 
              height: '100%', 
              display: (isRecording || isPreviewing || countdown !== null) ? 'block' : 'none' 
            }} 
          />

          {isPreviewing && !isRecording && (
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid #06b6d4',
              boxShadow: '0 0 12px rgba(6, 182, 212, 0.4)',
              zIndex: 10,
              fontSize: '12px',
              color: '#38bdf8',
              fontWeight: 600,
              pointerEvents: 'none'
            }}>
              <Eye size={14} />
              <span>Aperçu de Cadrage Actif • Déplacez et dimensionnez vos flous</span>
            </div>
          )}

          {isRecording && isDrawingMode && (
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              border: `1px solid ${drawColor}`,
              boxShadow: `0 0 12px ${drawColor}40`,
              zIndex: 10,
              fontSize: '12px',
              color: '#ffffff',
              fontWeight: 500,
              pointerEvents: 'none'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: drawColor, boxShadow: `0 0 6px ${drawColor}` }} />
              <span>Feutre Actif (dessinez n'importe où à l'écran)</span>
            </div>
          )}

          {/* Interactive Draggable & Resizable Privacy Blur Masks on Live Preview */}
          {recorder.blurMasks && recorder.blurMasks.map((mask: any) => (
            <div
              key={mask.id}
              style={{
                position: 'absolute',
                left: `${mask.x * 100}%`,
                top: `${mask.y * 100}%`,
                width: `${mask.width * 100}%`,
                height: `${mask.height * 100}%`,
                border: '2px dashed #c084fc',
                backgroundColor: 'rgba(139, 92, 246, 0.22)',
                borderRadius: '4px',
                cursor: 'move',
                zIndex: 25,
                boxShadow: '0 0 12px rgba(139, 92, 246, 0.45)'
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                const startClientX = e.clientX;
                const startClientY = e.clientY;
                const startMaskX = mask.x;
                const startMaskY = mask.y;
                const containerRect = canvasMountRef.current?.getBoundingClientRect();
                if (!containerRect) return;

                const handleMove = (moveEvent: MouseEvent) => {
                  const dx = (moveEvent.clientX - startClientX) / containerRect.width;
                  const dy = (moveEvent.clientY - startClientY) / containerRect.height;
                  const newX = Math.max(0, Math.min(1 - mask.width, startMaskX + dx));
                  const newY = Math.max(0, Math.min(1 - mask.height, startMaskY + dy));
                  recorder.updateBlurMask(mask.id, { x: newX, y: newY });
                };

                const handleUp = () => {
                  window.removeEventListener('mousemove', handleMove);
                  window.removeEventListener('mouseup', handleUp);
                };

                window.addEventListener('mousemove', handleMove);
                window.addEventListener('mouseup', handleUp);
              }}
            >
              {/* Delete button badge */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  recorder.removeBlurMask(mask.id);
                }}
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: '#f43f5e',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
                }}
                title="Supprimer cette zone de flou"
              >
                ✕
              </button>

              {/* Resize handle */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '-4px',
                  right: '-4px',
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#06b6d4',
                  borderRadius: '2px',
                  cursor: 'nwse-resize',
                  boxShadow: '0 0 6px rgba(6, 182, 212, 0.8)'
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  const startClientX = e.clientX;
                  const startClientY = e.clientY;
                  const startMaskW = mask.width;
                  const startMaskH = mask.height;
                  const containerRect = canvasMountRef.current?.getBoundingClientRect();
                  if (!containerRect) return;

                  const handleResize = (moveEvent: MouseEvent) => {
                    const dx = (moveEvent.clientX - startClientX) / containerRect.width;
                    const dy = (moveEvent.clientY - startClientY) / containerRect.height;
                    const newW = Math.max(0.05, Math.min(1 - mask.x, startMaskW + dx));
                    const newH = Math.max(0.05, Math.min(1 - mask.y, startMaskH + dy));
                    recorder.updateBlurMask(mask.id, { width: newW, height: newH });
                  };

                  const handleUp = () => {
                    window.removeEventListener('mousemove', handleResize);
                    window.removeEventListener('mouseup', handleUp);
                  };

                  window.addEventListener('mousemove', handleResize);
                  window.addEventListener('mouseup', handleUp);
                }}
              />
            </div>
          ))}

          {!isRecording && !isPreviewing && countdown === null && (
            <div className="no-preview-placeholder">
              <Video size={48} />
              <span>Aucun enregistrement en cours. Cliquez sur Aperçu pour cadrer ou sur REC.</span>
            </div>
          )}

          {countdown !== null && (
            <div className="countdown-overlay">
              <div className="countdown-content">
                <div className="countdown-number-circle">
                  <span key={countdown} className="countdown-number">{countdown}</span>
                </div>
                <p className="countdown-title">Démarrage dans {countdown}s...</p>
                <p className="countdown-subtitle">La capture se lance sur votre écran complet</p>
                <button className="btn-secondary" onClick={cancelCountdown} style={{ marginTop: '12px', fontSize: '13px', padding: '6px 16px' }}>
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live Toolbars during active recording: Zoom & Drawing Toolbars */}
        {isRecording && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Zoom Controls */}
            <div className="glass-panel zoom-toolbar">
              <button 
                className={`btn-toolbar ${isZoomed ? 'active' : ''}`}
                onClick={() => toggleZoom()}
                title="Activer/Désactiver le Zoom dynamique (Alt + Z ou F9)"
              >
                {isZoomed ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
                <span>{isZoomed ? 'Dézoomer' : 'Zoomer'}</span>
                <span className="shortcut-badge">Alt + Z / F9</span>
              </button>

              <button
                className={`btn-toolbar ${isAutoZoomEnabled ? 'active' : ''}`}
                onClick={() => {
                  toggleAutoZoom();
                  setOptions(prev => ({ ...prev, enableAutoZoom: !isAutoZoomEnabled }));
                }}
                title="Activer/Désactiver l'Auto-Zoom cinématique intelligent au clic"
                style={isAutoZoomEnabled ? { backgroundColor: 'rgba(139, 92, 246, 0.25)', borderColor: '#8b5cf6', color: '#c084fc' } : {}}
              >
                <Sparkles size={16} />
                <span>Auto-Zoom {isAutoZoomEnabled ? 'Actif' : ''}</span>
                <span className="shortcut-badge" style={{ backgroundColor: isAutoZoomEnabled ? 'rgba(139, 92, 246, 0.4)' : '' }}>Auto</span>
              </button>

              <div className="zoom-factor-group">
                {[1.5, 1.75, 2.0, 2.5].map((factor) => (
                  <button
                    key={factor}
                    className={`btn-factor ${zoomFactor === factor ? 'selected' : ''}`}
                    onClick={() => setZoomFactor(factor)}
                    title={`Niveau de zoom ${factor}x`}
                  >
                    {factor}x
                  </button>
                ))}
              </div>

              <button 
                className={`btn-toolbar ${isSpotlight ? 'active' : ''}`}
                onClick={toggleSpotlight}
                title="Activer l'effet Projecteur (Spotlight) sur la zone ciblée"
              >
                <Target size={16} />
                <span>Projecteur</span>
              </button>

              {/* Webcam Size slider if webcam is active */}
              {options.showWebcam && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid var(--border-color)', paddingLeft: '12px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Taille Cam :</span>
                  <input 
                    type="range" 
                    min="0.04" 
                    max="0.15" 
                    step="0.01" 
                    defaultValue="0.08"
                    className="thickness-slider"
                    onChange={(e) => setWebcamSize(parseFloat(e.target.value))}
                  />
                </div>
              )}
            </div>

            {/* Live Annotation / Drawing Toolbar */}
            <div className="glass-panel zoom-toolbar" style={{ flexWrap: 'wrap' }}>
              <button 
                className={`btn-toolbar ${isDrawingMode ? 'active' : ''}`}
                onClick={toggleDrawingMode}
                title="Activer/Désactiver le Feutre en direct (Alt + D ou F8)"
              >
                <Pencil size={16} />
                <span>{isDrawingMode ? 'Feutre Actif' : 'Feutre'}</span>
                <span className="shortcut-badge">Alt + D / F8</span>
              </button>

              {isDrawingMode && (
                <>
                  <div className="zoom-factor-group">
                    <button
                      className={`btn-factor ${drawTool === 'pen' ? 'selected' : ''}`}
                      onClick={() => setDrawTool('pen')}
                      title="Feutre à main levée"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className={`btn-factor ${drawTool === 'arrow' ? 'selected' : ''}`}
                      onClick={() => setDrawTool('arrow')}
                      title="Flèche directionnelle"
                    >
                      <ArrowUpRight size={14} />
                    </button>
                    <button
                      className={`btn-factor ${drawTool === 'rect' ? 'selected' : ''}`}
                      onClick={() => setDrawTool('rect')}
                      title="Rectangle d'encadrement"
                    >
                      <Square size={14} />
                    </button>
                    <button
                      className={`btn-factor ${drawTool === 'highlighter' ? 'selected' : ''}`}
                      onClick={() => setDrawTool('highlighter')}
                      title="Surligneur translucide"
                    >
                      <Highlighter size={14} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '1px solid var(--border-color)', paddingLeft: '10px' }}>
                    {[
                      { hex: '#f43f5e', name: 'Rouge Néon' },
                      { hex: '#a855f7', name: 'Violet' },
                      { hex: '#06b6d4', name: 'Cyan' },
                      { hex: '#eab308', name: 'Jaune Fluo' },
                      { hex: '#10b981', name: 'Vert' }
                    ].map((col) => (
                      <button
                        key={col.hex}
                        onClick={() => setDrawColor(col.hex)}
                        title={col.name}
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: col.hex,
                          border: drawColor === col.hex ? '2px solid #ffffff' : '2px solid transparent',
                          transform: drawColor === col.hex ? 'scale(1.2)' : 'scale(1.0)',
                          transition: 'all 0.15s ease',
                          cursor: 'pointer',
                          boxShadow: drawColor === col.hex ? `0 0 8px ${col.hex}` : 'none'
                        }}
                      />
                    ))}
                  </div>

                  <button 
                    className={`btn-toolbar ${isAutoFade ? 'active' : ''}`}
                    onClick={() => setIsAutoFade(!isAutoFade)}
                    title="Encre éphémère : les traits s'effacent automatiquement après 3.5 secondes"
                  >
                    <Sparkles size={14} />
                    <span>Auto-fade (3s)</span>
                  </button>

                  <button 
                    className="btn-toolbar"
                    onClick={clearDrawings}
                    title="Effacer tous les dessins à l'écran (Alt + C ou F10)"
                    style={{ color: '#fb7185' }}
                  >
                    <Trash2 size={14} />
                    <span>Effacer</span>
                    <span className="shortcut-badge">Alt + C / F10</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Dedicated Privacy Blur Mask Panel */}
        <div className="glass-panel zoom-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={16} color="#c084fc" />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Confidentialité (Flou Permanent)</span>
            {recorder.blurMasks && recorder.blurMasks.length > 0 && (
              <span className="shortcut-badge" style={{ backgroundColor: 'rgba(139, 92, 246, 0.25)', color: '#c084fc' }}>
                {recorder.blurMasks.length} {recorder.blurMasks.length === 1 ? 'zone active' : 'zones actives'}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="btn-toolbar"
              onClick={() => {
                recorder.addBlurMask({
                  id: Math.random(),
                  x: 0,
                  y: 0.94,
                  width: 1.0,
                  height: 0.06
                });
              }}
              title="Masquer la barre des tâches Windows (horloge & icônes)"
              style={{ fontSize: '11px', padding: '3px 8px' }}
            >
              <span>+ Barre des tâches</span>
            </button>

            <button
              className="btn-toolbar"
              onClick={() => {
                recorder.addBlurMask({
                  id: Math.random(),
                  x: 0,
                  y: 0,
                  width: 1.0,
                  height: 0.08
                });
              }}
              title="Masquer la barre d'URL et les onglets du navigateur"
              style={{ fontSize: '11px', padding: '3px 8px' }}
            >
              <span>+ Barre d'URL</span>
            </button>

            <button
              className="btn-toolbar"
              onClick={() => {
                recorder.addBlurMask({
                  id: Math.random(),
                  x: 0.2,
                  y: 0.35,
                  width: 0.6,
                  height: 0.25
                });
              }}
              title="Poser un rectangle de flou permanent au centre de l'écran"
              style={{ fontSize: '11px', padding: '3px 8px', color: '#c084fc' }}
            >
              <ShieldAlert size={13} />
              <span>+ Zone Centre</span>
            </button>

            {recorder.blurMasks && recorder.blurMasks.length > 0 && (
              <button
                className="btn-toolbar"
                onClick={recorder.clearBlurMasks}
                title="Supprimer tous les flous de confidentialité"
                style={{ color: '#fb7185', fontSize: '11px', padding: '3px 8px' }}
              >
                <Trash2 size={13} />
                <span>Effacer flous ({recorder.blurMasks.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Control Deck */}
      <div className="glass-panel control-deck">
        <div className="deck-glow" />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="deck-title">
            {t('dashboard.sources')}
          </h2>
          {countdown !== null ? (
            <span className="status-pill recording" style={{ animation: 'pulse-red 1s infinite ease-in-out' }}>
              {t('dashboard.countdownStarting')}...
            </span>
          ) : isRecording ? (
            <span className={`status-pill ${isPaused ? 'paused' : 'recording'}`}>
              {isPaused ? t('dashboard.paused') : t('dashboard.recording')}
            </span>
          ) : isPreviewing ? (
            <span className="status-pill ready" style={{ backgroundColor: 'rgba(6, 182, 212, 0.2)', color: '#38bdf8', borderColor: '#06b6d4' }}>
              {t('dashboard.previewOn')}
            </span>
          ) : (
            <span className="status-pill ready">{t('dashboard.ready')}</span>
          )}
        </div>

        {/* Selected parameters list */}
        <div className="sources-grid">
          <div className={`source-card ${options.recordMic ? 'selected' : ''}`} onClick={() => !isRecording && countdown === null && setOptions(prev => ({ ...prev, recordMic: !prev.recordMic }))}>
            <div className="source-card-icon">
              <Mic size={20} />
            </div>
            <div className="source-card-title">{t('dashboard.recordMic')}</div>
          </div>

          <div className={`source-card ${options.recordSystemAudio ? 'selected' : ''}`} onClick={() => !isRecording && countdown === null && setOptions(prev => ({ ...prev, recordSystemAudio: !prev.recordSystemAudio }))}>
            <div className="source-card-icon">
              <Volume2 size={20} />
            </div>
            <div className="source-card-title">{t('dashboard.recordSystem')}</div>
          </div>

          <div className={`source-card ${options.showWebcam ? 'selected' : ''}`} onClick={() => !isRecording && countdown === null && setOptions(prev => ({ ...prev, showWebcam: !prev.showWebcam }))}>
            <div className="source-card-icon">
              <Video size={20} />
            </div>
            <div className="source-card-title">{t('dashboard.webcam')}</div>
          </div>

          <div className={`source-card ${options.showMouseClicks ? 'selected' : ''}`} onClick={() => !isRecording && countdown === null && setOptions(prev => ({ ...prev, showMouseClicks: !prev.showMouseClicks }))}>
            <div className="source-card-icon">
              <MousePointer size={20} />
            </div>
            <div className="source-card-title">{t('dashboard.clicks')}</div>
          </div>

          <div className={`source-card ${options.enableAutoZoom ? 'selected' : ''}`} onClick={() => {
            if (!isRecording && countdown === null) {
              setOptions(prev => ({ ...prev, enableAutoZoom: !prev.enableAutoZoom }));
            }
          }} title={t('settings.video.autoZoomHelp')}>
            <div className="source-card-icon">
              <Sparkles size={20} />
            </div>
            <div className="source-card-title">{t('dashboard.autoZoom')}</div>
          </div>

          <div className={`source-card ${options.enableCinematicCursor !== false ? 'selected' : ''}`} onClick={() => {
            if (!isRecording && countdown === null) {
              setOptions(prev => ({ ...prev, enableCinematicCursor: prev.enableCinematicCursor === false }));
            }
          }} title={t('settings.video.cinematicCursorHelp')}>
            <div className="source-card-icon">
              <Wand2 size={20} />
            </div>
            <div className="source-card-title">{t('dashboard.smoothCursor')}</div>
          </div>

          <div className={`source-card ${options.enableKeystrokeHUD !== false ? 'selected' : ''}`} onClick={() => {
            if (!isRecording && countdown === null) {
              setOptions(prev => ({ ...prev, enableKeystrokeHUD: prev.enableKeystrokeHUD === false }));
            }
          }} title={t('settings.keystrokeHUD.enableHelp')}>
            <div className="source-card-icon">
              <Keyboard size={20} />
            </div>
            <div className="source-card-title">{t('dashboard.keystrokes')}</div>
          </div>
        </div>

        {/* Screen / Monitor Selection (Below Sources de capture) */}
        <div style={{
          marginTop: '10px',
          padding: '10px 12px',
          borderRadius: '10px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(56, 189, 248, 0.22)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Monitor size={14} color="#38bdf8" />
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {t('dashboard.screenSelectTitle')}
              </span>
            </div>
            {systemMonitors.length > 1 && (
              <span style={{
                fontSize: '10px',
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                padding: '1px 6px',
                borderRadius: '8px',
                fontWeight: 600
              }}>
                {systemMonitors.length} {t('dashboard.detectedScreens')}
              </span>
            )}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: systemMonitors.length >= 2 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
            gap: '6px'
          }}>
            {/* 1: Interactive Picker */}
            <button
              type="button"
              disabled={isRecording || countdown !== null}
              onClick={() => handleSelectMonitor('prompt')}
              style={{
                padding: '6px 4px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: (options.selectedMonitorId || 'prompt') === 'prompt' ? 700 : 500,
                backgroundColor: (options.selectedMonitorId || 'prompt') === 'prompt' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                border: (options.selectedMonitorId || 'prompt') === 'prompt' ? '1px solid #38bdf8' : '1px solid var(--border-color)',
                color: (options.selectedMonitorId || 'prompt') === 'prompt' ? '#38bdf8' : 'var(--text-secondary)',
                cursor: (isRecording || countdown !== null) ? 'not-allowed' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                transition: 'all 0.15s ease'
              }}
              title="Affiche le sélecteur natif avec miniatures en direct des écrans et fenêtres"
            >
              <span>{t('dashboard.screenSelectPrompt')}</span>
              <span style={{ fontSize: '9px', opacity: 0.75 }}>{t('dashboard.screenSelectPromptDesc')}</span>
            </button>

            {/* 2: Screen 1 */}
            <button
              type="button"
              disabled={isRecording || countdown !== null}
              onClick={() => handleSelectMonitor('screen1')}
              style={{
                padding: '6px 4px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: options.selectedMonitorId === 'screen1' ? 700 : 500,
                backgroundColor: options.selectedMonitorId === 'screen1' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                border: options.selectedMonitorId === 'screen1' ? '1px solid #38bdf8' : '1px solid var(--border-color)',
                color: options.selectedMonitorId === 'screen1' ? '#38bdf8' : 'var(--text-secondary)',
                cursor: (isRecording || countdown !== null) ? 'not-allowed' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                transition: 'all 0.15s ease'
              }}
              title={systemMonitors[0] ? `Écran 1: ${systemMonitors[0].width}×${systemMonitors[0].height}` : 'Écran 1'}
            >
              <span>{t('dashboard.screenSelect1')}</span>
              <span style={{ fontSize: '9px', opacity: 0.75 }}>
                {systemMonitors[0] ? `${systemMonitors[0].width}×${systemMonitors[0].height}` : 'Principal'}
              </span>
            </button>

            {/* 3: Screen 2 (if 2+ monitors) */}
            {systemMonitors.length >= 2 && (
              <button
                type="button"
                disabled={isRecording || countdown !== null}
                onClick={() => handleSelectMonitor('screen2')}
                style={{
                  padding: '6px 4px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: options.selectedMonitorId === 'screen2' ? 700 : 500,
                  backgroundColor: options.selectedMonitorId === 'screen2' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                  border: options.selectedMonitorId === 'screen2' ? '1px solid #38bdf8' : '1px solid var(--border-color)',
                  color: options.selectedMonitorId === 'screen2' ? '#38bdf8' : 'var(--text-secondary)',
                  cursor: (isRecording || countdown !== null) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  transition: 'all 0.15s ease'
                }}
                title={systemMonitors[1] ? `Écran 2: ${systemMonitors[1].width}×${systemMonitors[1].height}` : 'Écran 2'}
              >
                <span>{t('dashboard.screenSelect2')}</span>
                <span style={{ fontSize: '9px', opacity: 0.75 }}>
                  {systemMonitors[1] ? `${systemMonitors[1].width}×${systemMonitors[1].height}` : 'Secondaire'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Trigger Button section */}
        <div className="action-section">
          {countdown !== null ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div className="countdown-badge-inline">
                <span>{countdown}</span>
              </div>
              <button className="btn-secondary" onClick={cancelCountdown} style={{ fontSize: '12px' }}>
                Annuler
              </button>
            </div>
          ) : !isRecording ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <button className="rec-btn" onClick={startRecording} title={t('dashboard.startBtn')}>
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'white', boxShadow: '0 0 8px rgba(255,255,255,0.7)' }} />
              </button>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '1.5px', textTransform: 'uppercase', textShadow: '0 0 8px var(--accent-glow)' }}>
                {t('dashboard.startBtn')}
              </span>

              <button
                className="btn-secondary"
                onClick={isPreviewing ? stopScreenPreview : startScreenPreview}
                style={{
                  fontSize: '11px',
                  padding: '5px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '4px',
                  backgroundColor: isPreviewing ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255,255,255,0.06)',
                  borderColor: isPreviewing ? '#06b6d4' : 'var(--border-color)',
                  color: isPreviewing ? '#38bdf8' : 'var(--text-primary)'
                }}
                title="Affiche l'écran en direct pour cadrer et positionner les zones de flou sans enregistrer"
              >
                {isPreviewing ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{isPreviewing ? t('dashboard.previewOff') : t('dashboard.previewOn')}</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div className="rec-timer">
                {formatTime(recordingTime)}
              </div>

              <div className="rec-controls-row">
                {isPaused ? (
                  <button className="control-icon-btn active" onClick={resumeRecording} title="Reprendre l'enregistrement">
                    <Play size={20} fill="white" />
                  </button>
                ) : (
                  <button className="control-icon-btn" onClick={pauseRecording} title="Mettre en pause l'enregistrement">
                    <Pause size={20} />
                  </button>
                )}

                <button className="control-icon-btn stop" onClick={stopRecording} title="Arrêter et sauvegarder l'enregistrement">
                  <Square size={20} fill="currentColor" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Real-time audio visualizer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Niveau d'Entrée Audio</span>
          <div className="waveform-container">
            <canvas ref={visualizerCanvasRef} width={300} height={60} className="waveform-canvas" />
            <span className="visualizer-label">
              {options.recordMic ? 'Microactif' : 'Micro désactivé'}
            </span>
          </div>

          {options.recordMic && isRecording && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <div style={{ flexGrow: 1, height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${micLevel * 100}%`, height: '100%', background: 'var(--success)', transition: 'width 0.1s' }} />
              </div>
              <span>{Math.round(micLevel * 100)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
