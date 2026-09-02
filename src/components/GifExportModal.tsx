import { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Play, 
  Pause, 
  Download, 
  Copy, 
  RotateCcw, 
  Sliders, 
  Check, 
  Film, 
  Layers, 
  AlertCircle
} from 'lucide-react';
import { 
  type SavedVideo, 
  saveRecording 
} from '../utils/db';
import { 
  generateGifFromVideo, 
  formatFileSize, 
  GIF_PRESETS, 
  type GifPresetKey, 
  type GifProgress, 
  type GifResult 
} from '../utils/gifGenerator';

interface GifExportModalProps {
  video: SavedVideo;
  onClose: () => void;
  onSavedToLibrary?: () => void;
}

export function GifExportModal({ video, onClose, onSavedToLibrary }: GifExportModalProps) {
  const [videoDuration, setVideoDuration] = useState(video.duration || 10);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(Math.min(video.duration || 10, 6)); // Default 6s max for snappy GIFs
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Preset & Configuration
  const [selectedPreset, setSelectedPreset] = useState<GifPresetKey | 'custom'>('balanced');
  const [customWidth, setCustomWidth] = useState(640);
  const [customFps, setCustomFps] = useState(14);
  const [customSpeed, setCustomSpeed] = useState(1.0);
  const [customMaxColors, setCustomMaxColors] = useState(256);
  const [palettePerFrame, setPalettePerFrame] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Generation state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<GifProgress | null>(null);
  const [result, setResult] = useState<GifResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedToLibrarySuccess, setSavedToLibrarySuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrlRef = useRef<string>(URL.createObjectURL(video.blob));
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (videoUrlRef.current) {
        URL.revokeObjectURL(videoUrlRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Update preset parameters when changed
  const handleSelectPreset = (presetKey: GifPresetKey) => {
    setSelectedPreset(presetKey);
    const preset = GIF_PRESETS[presetKey];
    setCustomWidth(preset.width);
    setCustomFps(preset.fps);
    setCustomSpeed(preset.speed);
    setCustomMaxColors(preset.maxColors);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      if (dur && isFinite(dur) && dur > 0) {
        setVideoDuration(dur);
        // Default end time to min(duration, 6 seconds)
        setEndTime(Math.min(dur, 6));
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const t = videoRef.current.currentTime;
      setCurrentTime(t);
      if (t >= endTime) {
        videoRef.current.pause();
        setIsPlaying(false);
        videoRef.current.currentTime = startTime;
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoRef.current.currentTime < startTime || videoRef.current.currentTime >= endTime) {
        videoRef.current.currentTime = startTime;
      }
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const seekTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(videoDuration, time));
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
  };

  const selectedDuration = Math.max(0.1, endTime - startTime);
  const effectiveDuration = selectedDuration / customSpeed;
  const estimatedFrames = Math.round(effectiveDuration * customFps);

  // Generate GIF handler
  const handleGenerateGif = async () => {
    if (startTime >= endTime) {
      setErrorMessage("Le point de début doit être strictement inférieur au point de fin.");
      return;
    }

    if (estimatedFrames > 300) {
      const ok = confirm(`Cet extrait contient ~${estimatedFrames} images. L'encodage peut prendre quelques secondes et générer un fichier plus volumineux. Continuer ?`);
      if (!ok) return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setProgress({
      currentFrame: 0,
      totalFrames: estimatedFrames,
      percentage: 0,
      statusText: "Initialisation du moteur d'encodage..."
    });
    setResult(null);
    setCopied(false);
    setSavedToLibrarySuccess(false);

    abortControllerRef.current = new AbortController();

    try {
      const gifRes = await generateGifFromVideo(
        video.blob,
        {
          startTime,
          endTime,
          fps: customFps,
          width: customWidth,
          speed: customSpeed,
          maxColors: customMaxColors,
          palettePerFrame,
          loop: 0
        },
        (p) => setProgress(p),
        abortControllerRef.current.signal
      );

      setResult(gifRes);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.log("GIF generation aborted");
      } else {
        console.error("GIF error:", err);
        setErrorMessage(err?.message || "Une erreur est survenue lors de la génération du GIF.");
      }
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelEncoding = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsProcessing(false);
    setProgress(null);
  };

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.url;
    const cleanTitle = (video.title || 'animation').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `${cleanTitle}_clip.gif`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyToClipboard = async () => {
    if (!result) return;
    try {
      if (navigator.clipboard && (window as any).ClipboardItem) {
        const item = new ClipboardItem({ 'image/gif': result.blob });
        await navigator.clipboard.write([item]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } else {
        // Fallback
        handleDownload();
      }
    } catch (err) {
      // Fallback: download if clipboard image/gif is not permitted by browser security
      handleDownload();
    }
  };

  const handleSaveToLibrary = async () => {
    if (!result) return;
    try {
      await saveRecording({
        id: crypto.randomUUID ? crypto.randomUUID() : `gif_${Date.now()}`,
        title: `${video.title} (GIF)`,
        blob: result.blob,
        thumbnail: result.url,
        duration: Math.round(result.duration),
        size: result.size,
        date: new Date().toISOString()
      });
      setSavedToLibrarySuccess(true);
      onSavedToLibrary?.();
    } catch (e) {
      alert("Erreur lors de la sauvegarde dans la bibliothèque.");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ padding: '12px' }}>
      <div 
        className="glass-panel modal-content" 
        style={{ 
          maxWidth: '780px', 
          width: '96%', 
          maxHeight: '94vh', 
          overflowY: 'auto', 
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ marginBottom: 0, paddingBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '28px', 
              height: '28px', 
              borderRadius: '6px', 
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Film size={16} />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '16px', margin: 0 }}>Générateur de GIF Animé</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                {video.title}
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} disabled={isProcessing}>
            <X size={18} />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '6px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            fontSize: '12px'
          }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Top Split: Video Player / Result GIF */}
        <div style={{
          position: 'relative',
          height: '210px',
          maxHeight: '210px',
          backgroundColor: '#000000',
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border-color)'
        }}>
          {result ? (
            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img 
                src={result.url} 
                alt="GIF Result" 
                style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
              />
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                fontSize: '11px',
                color: '#c084fc',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Sparkles size={13} />
                <span>GIF Prêt • {formatFileSize(result.size)}</span>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                src={videoUrlRef.current}
                style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onClick={togglePlay}
              />
              <button
                onClick={togglePlay}
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '10px',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }}
              >
                {isPlaying ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: '2px' }} />}
              </button>

              <span style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                padding: '3px 8px',
                borderRadius: '5px',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                fontSize: '11px',
                fontFamily: 'var(--font-display)',
                color: '#ffffff'
              }}>
                {formatTime(currentTime)} / {formatTime(videoDuration)}
              </span>
            </>
          )}
        </div>

        {/* Timeline Range Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ position: 'relative', height: '18px', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '6px', overflow: 'hidden' }}>
            {/* Active Range Highlight */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${(startTime / videoDuration) * 100}%`,
                width: `${((endTime - startTime) / videoDuration) * 100}%`,
                background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.5), rgba(236, 72, 153, 0.5))',
                borderLeft: '3px solid #8b5cf6',
                borderRight: '3px solid #ec4899'
              }}
            />
            {/* Playhead */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${(currentTime / videoDuration) * 100}%`,
                width: '2px',
                backgroundColor: '#ffffff',
                boxShadow: '0 0 6px #ffffff'
              }}
            />
          </div>

          {/* Time Sliders Controls */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#c084fc', fontWeight: 600 }}>🟢 Début (In)</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{formatTime(startTime)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={videoDuration}
                step={0.1}
                value={startTime}
                disabled={isProcessing}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (val < endTime) {
                    setStartTime(val);
                    seekTo(val);
                  }
                }}
                style={{ width: '100%', accentColor: '#8b5cf6', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className="btn-toolbar" style={{ padding: '2px 5px', fontSize: '10px' }} onClick={() => { const v = Math.max(0, startTime - 1); setStartTime(v); seekTo(v); }}>-1s</button>
                <button className="btn-toolbar" style={{ padding: '2px 5px', fontSize: '10px' }} onClick={() => { const v = Math.max(0, startTime - 0.2); setStartTime(v); seekTo(v); }}>-0.2s</button>
                <button className="btn-toolbar" style={{ padding: '2px 5px', fontSize: '10px' }} onClick={() => { const v = Math.min(endTime - 0.2, startTime + 0.2); setStartTime(v); seekTo(v); }}>+0.2s</button>
                <button className="btn-toolbar" style={{ padding: '2px 5px', fontSize: '10px' }} onClick={() => { const v = Math.min(endTime - 0.2, startTime + 1); setStartTime(v); seekTo(v); }}>+1s</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#ec4899', fontWeight: 600 }}>🔴 Fin (Out)</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{formatTime(endTime)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={videoDuration}
                step={0.1}
                value={endTime}
                disabled={isProcessing}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (val > startTime) {
                    setEndTime(val);
                    seekTo(val);
                  }
                }}
                style={{ width: '100%', accentColor: '#ec4899', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className="btn-toolbar" style={{ padding: '2px 5px', fontSize: '10px' }} onClick={() => { const v = Math.max(startTime + 0.2, endTime - 1); setEndTime(v); seekTo(v); }}>-1s</button>
                <button className="btn-toolbar" style={{ padding: '2px 5px', fontSize: '10px' }} onClick={() => { const v = Math.max(startTime + 0.2, endTime - 0.2); setEndTime(v); seekTo(v); }}>-0.2s</button>
                <button className="btn-toolbar" style={{ padding: '2px 5px', fontSize: '10px' }} onClick={() => { const v = Math.min(videoDuration, endTime + 0.2); setEndTime(v); seekTo(v); }}>+0.2s</button>
                <button className="btn-toolbar" style={{ padding: '2px 5px', fontSize: '10px' }} onClick={() => { const v = Math.min(videoDuration, endTime + 1); setEndTime(v); seekTo(v); }}>+1s</button>
              </div>
            </div>
          </div>
        </div>

        {/* Quality Presets Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Préréglage de qualité :
            </span>
            <button 
              className="btn-toolbar" 
              style={{ fontSize: '11px', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Sliders size={12} />
              <span>{showAdvanced ? 'Masquer réglages fins' : 'Réglages avancés'}</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {(Object.keys(GIF_PRESETS) as GifPresetKey[]).map((key) => {
              const preset = GIF_PRESETS[key];
              const isSelected = selectedPreset === key;
              return (
                <button
                  key={key}
                  disabled={isProcessing}
                  onClick={() => handleSelectPreset(key)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.03)',
                    border: isSelected ? '1px solid #8b5cf6' : '1px solid var(--border-color)',
                    color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 600, color: isSelected ? '#c084fc' : 'var(--text-primary)' }}>
                    {preset.label}
                  </span>
                  <span style={{ fontSize: '10px', opacity: 0.75 }}>
                    {preset.width}px • {preset.fps} FPS
                  </span>
                </button>
              );
            })}
          </div>

          {/* Advanced Fine Tuning Panel */}
          {showAdvanced && (
            <div style={{ 
              padding: '10px 14px', 
              borderRadius: '8px', 
              backgroundColor: 'rgba(0,0,0,0.25)', 
              border: '1px solid var(--border-color)',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px'
            }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Largeur (Résolution) :</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{customWidth} px</strong>
                </label>
                <input 
                  type="range" 
                  min={320} 
                  max={1080} 
                  step={20} 
                  value={customWidth}
                  disabled={isProcessing}
                  onChange={(e) => {
                    setCustomWidth(parseInt(e.target.value));
                    setSelectedPreset('custom');
                  }}
                  style={{ width: '100%', accentColor: '#8b5cf6' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Fluidité (FPS) :</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{customFps} FPS</strong>
                </label>
                <input 
                  type="range" 
                  min={5} 
                  max={25} 
                  step={1} 
                  value={customFps}
                  disabled={isProcessing}
                  onChange={(e) => {
                    setCustomFps(parseInt(e.target.value));
                    setSelectedPreset('custom');
                  }}
                  style={{ width: '100%', accentColor: '#8b5cf6' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Vitesse de lecture :</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{customSpeed}x</strong>
                </label>
                <input 
                  type="range" 
                  min={0.5} 
                  max={2.0} 
                  step={0.25} 
                  value={customSpeed}
                  disabled={isProcessing}
                  onChange={(e) => {
                    setCustomSpeed(parseFloat(e.target.value));
                    setSelectedPreset('custom');
                  }}
                  style={{ width: '100%', accentColor: '#8b5cf6' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Palette de couleurs :</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{customMaxColors} couleurs</strong>
                </label>
                <select
                  value={customMaxColors}
                  disabled={isProcessing}
                  onChange={(e) => {
                    setCustomMaxColors(parseInt(e.target.value));
                    setSelectedPreset('custom');
                  }}
                  className="form-input"
                  style={{ padding: '3px 8px', fontSize: '11px', width: '100%', marginTop: '4px' }}
                >
                  <option value={64}>64 couleurs (Poids plume)</option>
                  <option value={128}>128 couleurs (Économique)</option>
                  <option value={256}>256 couleurs (Qualité max)</option>
                </select>
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
                <input
                  type="checkbox"
                  id="palettePerFrameCheck"
                  checked={palettePerFrame}
                  disabled={isProcessing}
                  onChange={(e) => {
                    setPalettePerFrame(e.target.checked);
                    setSelectedPreset('custom');
                  }}
                  style={{ accentColor: '#8b5cf6', cursor: 'pointer' }}
                />
                <label htmlFor="palettePerFrameCheck" style={{ fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Palette adaptative par image (meilleur rendu des dégradés, fichier légèrement plus grand)
                </label>
              </div>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            padding: '6px 12px',
            borderRadius: '6px',
            backgroundColor: 'rgba(255,255,255,0.02)'
          }}>
            <span>Durée sélectionnée : <strong style={{ color: 'var(--text-primary)' }}>{selectedDuration.toFixed(1)}s</strong></span>
            <span>Images à encoder : <strong style={{ color: 'var(--text-primary)' }}>{estimatedFrames} frames</strong></span>
            <span>Résolution : <strong style={{ color: 'var(--text-primary)' }}>{customWidth}px</strong></span>
            <button className="btn-toolbar" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => seekTo(startTime)}>
              <RotateCcw size={11} /> Rejouer
            </button>
          </div>
        </div>

        {/* Progress Display */}
        {isProcessing && progress && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={14} className="spinning" color="#c084fc" />
                <span style={{ fontWeight: 600, color: '#ffffff' }}>{progress.statusText}</span>
              </div>
              <button 
                onClick={handleCancelEncoding}
                style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Annuler
              </button>
            </div>
            <div style={{ height: '7px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div 
                style={{ 
                  height: '100%', 
                  width: `${progress.percentage}%`, 
                  background: 'linear-gradient(90deg, #8b5cf6, #ec4899)', 
                  transition: 'width 0.15s ease' 
                }} 
              />
            </div>
          </div>
        )}

        {/* Modal Controls Footer */}
        <div className="modal-controls" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderTop: '1px solid var(--border-color)', 
          paddingTop: '10px', 
          marginTop: '2px' 
        }}>
          <button 
            className="action-btn" 
            style={{ padding: '6px 14px', fontSize: '12px' }} 
            onClick={onClose} 
            disabled={isProcessing}
          >
            Fermer
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            {result ? (
              <>
                <button
                  className="btn-secondary"
                  onClick={handleCopyToClipboard}
                  style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {copied ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
                  <span>{copied ? 'Copié !' : 'Copier'}</span>
                </button>

                <button
                  className="btn-secondary"
                  onClick={handleSaveToLibrary}
                  disabled={savedToLibrarySuccess}
                  style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {savedToLibrarySuccess ? <Check size={14} color="#4ade80" /> : <Layers size={14} />}
                  <span>{savedToLibrarySuccess ? 'Enregistré' : 'Sauvegarder'}</span>
                </button>

                <button
                  className="btn-primary"
                  onClick={handleDownload}
                  style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={14} />
                  <span>Télécharger .gif</span>
                </button>
              </>
            ) : (
              <button
                className="btn-primary"
                onClick={handleGenerateGif}
                disabled={isProcessing}
                style={{ padding: '7px 18px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {isProcessing ? <Sparkles size={14} className="spinning" /> : <Sparkles size={14} />}
                <span>Générer le GIF</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
