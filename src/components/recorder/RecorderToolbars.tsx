import React from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Sparkles, 
  Target, 
  Pencil, 
  ArrowUpRight, 
  Square, 
  Highlighter, 
  Trash2, 
  Video 
} from 'lucide-react';
import type { RecorderOptions } from '../../hooks/useRecorder';

interface RecorderToolbarsProps {
  options: RecorderOptions;
  setOptions: React.Dispatch<React.SetStateAction<RecorderOptions>>;
  recorder: any;
}

const DRAW_COLORS = [
  { hex: '#f43f5e', name: 'Rouge Néon' },
  { hex: '#a855f7', name: 'Violet' },
  { hex: '#06b6d4', name: 'Cyan' },
  { hex: '#eab308', name: 'Jaune Fluo' },
  { hex: '#10b981', name: 'Vert' }
];

export function RecorderToolbars({ options, setOptions, recorder }: RecorderToolbarsProps) {
  const {
    isRecording,
    isZoomed,
    isSpotlight,
    zoomFactor,
    isAutoZoomEnabled,
    toggleAutoZoom,
    toggleZoom,
    setZoomFactor,
    toggleSpotlight,
    setWebcamSize,
    isDrawingMode,
    drawTool,
    drawColor,
    isAutoFade,
    toggleDrawingMode,
    setDrawTool,
    setDrawColor,
    setIsAutoFade,
    clearDrawings,
    hasSecondaryCam,
    isSecondaryCamRecording,
    toggleSecondaryCamRecording
  } = recorder;

  if (!isRecording) return null;

  return (
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
              {DRAW_COLORS.map((col) => (
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

      {/* Secondary Camera (B-Roll) Toolbar if enabled */}
      {(options.enableSecondaryCam || hasSecondaryCam) && (
        <div className="glass-panel zoom-toolbar" style={{ borderColor: isSecondaryCamRecording ? '#ef4444' : 'rgba(56, 189, 248, 0.3)', flexWrap: 'wrap' }}>
          <button 
            className={`btn-toolbar ${isSecondaryCamRecording ? 'active' : ''}`}
            onClick={toggleSecondaryCamRecording}
            title={`Basculer la Caméra Secondaire B-Roll (${options.secondaryCamShortcut || 'F10'} ou Alt+B). Enregistre un plan plein écran qui apparaîtra sur la Piste V2 du studio.`}
            style={isSecondaryCamRecording ? {
              backgroundColor: 'rgba(239, 68, 68, 0.25)',
              borderColor: '#ef4444',
              color: '#f87171'
            } : {
              borderColor: 'rgba(56, 189, 248, 0.4)',
              color: '#38bdf8'
            }}
          >
            <Video size={16} />
            <span>{isSecondaryCamRecording ? '🔴 Plan B-Roll V2 en cours' : '📹 Caméra B-Roll (Iriun / USB)'}</span>
            <span className="shortcut-badge" style={{ backgroundColor: isSecondaryCamRecording ? 'rgba(239, 68, 68, 0.4)' : 'rgba(56, 189, 248, 0.2)', color: isSecondaryCamRecording ? '#fff' : '#38bdf8' }}>
              {options.secondaryCamShortcut || 'F10'} / Alt+B
            </span>
          </button>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {isSecondaryCamRecording 
              ? 'Plan en cours : sera placé automatiquement en plein écran sur la Piste V2 du Studio'
              : 'Appuyez sur ' + (options.secondaryCamShortcut || 'F10') + ' pour filmer un objet ou document en plein écran'}
          </span>
        </div>
      )}
    </div>
  );
}
