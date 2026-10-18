import React, { useRef, useEffect } from 'react';
import { Eye, Video } from 'lucide-react';
import type { RecorderOptions } from '../../hooks/useRecorder';

interface RecorderLivePreviewProps {
  options: RecorderOptions;
  recorder: any;
  canvasMountRef: React.RefObject<HTMLDivElement | null>;
}

export function RecorderLivePreview({ options, recorder, canvasMountRef }: RecorderLivePreviewProps) {
  const isDraggingRef = useRef(false);
  const isDrawingStrokeActiveRef = useRef(false);

  const {
    isRecording,
    isPreviewing,
    countdown,
    cancelCountdown,
    isDrawingMode,
    drawColor,
    canvas: recorderCanvas,
    startDrawingStroke,
    updateDrawingStroke,
    endDrawingStroke,
    updateWebcamPosition,
    setZoomCenter
  } = recorder;

  // Render the live composite canvas inside dedicated mounting wrapper
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
  }, [recorderCanvas, canvasMountRef]);

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

  return (
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
  );
}
