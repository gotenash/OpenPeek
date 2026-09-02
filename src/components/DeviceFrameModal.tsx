import { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Play, 
  Pause, 
  Download, 
  Layers, 
  Check, 
  Smartphone, 
  Monitor, 
  Square, 
  Sliders,
  Film
} from 'lucide-react';
import { type SavedVideo, saveRecording } from '../utils/db';
import { 
  BACKGROUND_THEMES, 
  type FrameAspectRatio, 
  type BackgroundThemeKey, 
  type WindowChromeStyle, 
  type ShadowIntensity, 
  type FrameOptions,
  calculateFrameDimensions,
  drawFramedVideo,
  renderFramedVideo,
  renderFramedGif
} from '../utils/frameRenderer';

interface DeviceFrameModalProps {
  video: SavedVideo;
  onClose: () => void;
  onSavedToLibrary?: () => void;
}

export function DeviceFrameModal({ video, onClose, onSavedToLibrary }: DeviceFrameModalProps) {
  const [aspectRatio, setAspectRatio] = useState<FrameAspectRatio>('16:9');
  const [theme, setTheme] = useState<BackgroundThemeKey>('aurora');
  const [chromeStyle, setChromeStyle] = useState<WindowChromeStyle>('macos');
  const [windowTitle, setWindowTitle] = useState(video.title || 'OpenPeek Video');
  const [padding, setPadding] = useState(50);
  const [borderRadius, setBorderRadius] = useState(16);
  const [shadowIntensity, setShadowIntensity] = useState<ShadowIntensity>('deep');

  const [isPlaying, setIsPlaying] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'video' | 'gif'>('video');
  const [exportProgress, setExportProgress] = useState(0);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Set up video element
  useEffect(() => {
    const v = document.createElement('video');
    v.src = URL.createObjectURL(video.blob);
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.autoplay = true;
    v.play().catch(() => {});
    videoRef.current = v;

    return () => {
      v.pause();
      URL.revokeObjectURL(v.src);
      videoRef.current = null;
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [video.blob]);

  // Live Canvas Rendering Loop
  useEffect(() => {
    const v = videoRef.current;
    const canvas = previewCanvasRef.current;
    if (!canvas || !v) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isMounted = true;

    const renderLoop = () => {
      if (!isMounted) return;

      const origW = v.videoWidth || 1280;
      const origH = v.videoHeight || 720;

      const frameOptions: FrameOptions = {
        aspectRatio,
        theme,
        chromeStyle,
        windowTitle,
        padding,
        borderRadius,
        shadowIntensity
      };

      const dims = calculateFrameDimensions(origW, origH, aspectRatio, padding, chromeStyle);

      if (canvas.width !== dims.canvasWidth || canvas.height !== dims.canvasHeight) {
        canvas.width = dims.canvasWidth;
        canvas.height = dims.canvasHeight;
      }

      if (v.readyState >= 2) {
        drawFramedVideo(ctx, v, dims, frameOptions);
      }

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animationFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isMounted = false;
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [aspectRatio, theme, chromeStyle, windowTitle, padding, borderRadius, shadowIntensity]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const handleExportVideo = async () => {
    setIsExporting(true);
    setExportType('video');
    setExportProgress(0);
    setExportedBlob(null);
    setSavedSuccess(false);

    abortControllerRef.current = new AbortController();

    try {
      const blob = await renderFramedVideo(
        video.blob,
        {
          aspectRatio,
          theme,
          chromeStyle,
          windowTitle,
          padding,
          borderRadius,
          shadowIntensity
        },
        (p) => setExportProgress(p),
        abortControllerRef.current.signal
      );
      setExportedBlob(blob);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        alert("Erreur lors de l'exportation vidéo.");
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportGif = async () => {
    setIsExporting(true);
    setExportType('gif');
    setExportProgress(0);
    setExportedBlob(null);
    setSavedSuccess(false);

    abortControllerRef.current = new AbortController();

    try {
      const blob = await renderFramedGif(
        video.blob,
        {
          aspectRatio,
          theme,
          chromeStyle,
          windowTitle,
          padding,
          borderRadius,
          shadowIntensity
        },
        { fps: 12, speed: 1.0, maxColors: 256 },
        (p) => setExportProgress(p),
        abortControllerRef.current.signal
      );
      setExportedBlob(blob);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        alert("Erreur lors de l'exportation GIF.");
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = () => {
    if (!exportedBlob) return;
    const url = URL.createObjectURL(exportedBlob);
    const a = document.createElement('a');
    a.href = url;
    const ext = exportType === 'gif' ? 'gif' : 'webm';
    const cleanTitle = (windowTitle || 'mockup').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `${cleanTitle}_framed.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveToLibrary = async () => {
    if (!exportedBlob) return;
    try {
      const canvas = previewCanvasRef.current;
      const thumb = canvas ? canvas.toDataURL('image/jpeg', 0.8) : '';
      await saveRecording({
        id: crypto.randomUUID ? crypto.randomUUID() : `frame_${Date.now()}`,
        title: `${windowTitle} (Habillage)`,
        blob: exportedBlob,
        thumbnail: thumb,
        duration: video.duration || 10,
        size: exportedBlob.size,
        date: new Date().toISOString()
      });
      setSavedSuccess(true);
      onSavedToLibrary?.();
    } catch (e) {
      alert("Erreur lors de la sauvegarde.");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ padding: '12px' }}>
      <div 
        className="glass-panel modal-content" 
        style={{ 
          maxWidth: '920px', 
          width: '98%', 
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
              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Layers size={16} />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '16px', margin: 0 }}>Habillage & Cadres Réseaux Sociaux</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                Sublimez votre capture avec des dégradés mesh, cadres macOS et ratios adaptés (Reels, YouTube, LinkedIn).
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} disabled={isExporting}>
            <X size={18} />
          </button>
        </div>

        {/* Top Preview Canvas */}
        <div style={{
          position: 'relative',
          height: '240px',
          maxHeight: '240px',
          backgroundColor: '#0a0a0f',
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border-color)'
        }}>
          <canvas 
            ref={previewCanvasRef} 
            style={{ 
              maxHeight: '100%', 
              maxWidth: '100%', 
              objectFit: 'contain',
              borderRadius: '4px'
            }} 
          />

          <button
            onClick={togglePlay}
            style={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: '2px' }} />}
          </button>
        </div>

        {/* Aspect Ratio Presets Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Format & Réseau Cible :
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
            <button
              className={`btn-toolbar ${aspectRatio === '16:9' ? 'active' : ''}`}
              onClick={() => setAspectRatio('16:9')}
              style={{ padding: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
            >
              <Monitor size={13} />
              <span>16:9 (YouTube)</span>
            </button>

            <button
              className={`btn-toolbar ${aspectRatio === '9:16' ? 'active' : ''}`}
              onClick={() => setAspectRatio('9:16')}
              style={{ padding: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
            >
              <Smartphone size={13} />
              <span>9:16 (TikTok / Reels)</span>
            </button>

            <button
              className={`btn-toolbar ${aspectRatio === '1:1' ? 'active' : ''}`}
              onClick={() => setAspectRatio('1:1')}
              style={{ padding: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
            >
              <Square size={13} />
              <span>1:1 (Twitter / Post)</span>
            </button>

            <button
              className={`btn-toolbar ${aspectRatio === '4:5' ? 'active' : ''}`}
              onClick={() => setAspectRatio('4:5')}
              style={{ padding: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
            >
              <Square size={13} />
              <span>4:5 (Instagram)</span>
            </button>

            <button
              className={`btn-toolbar ${aspectRatio === 'auto' ? 'active' : ''}`}
              onClick={() => setAspectRatio('auto')}
              style={{ padding: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
            >
              <Sliders size={13} />
              <span>Auto (Original)</span>
            </button>
          </div>
        </div>

        {/* Theme & Chrome Selection Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
          {/* Background Gradient Themes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Fond d'Arrière-Plan (Gradient Canvas) :
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
              {(Object.keys(BACKGROUND_THEMES) as BackgroundThemeKey[]).map((key) => {
                const t = BACKGROUND_THEMES[key];
                const isSel = theme === key;
                return (
                  <button
                    key={key}
                    onClick={() => setTheme(key)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      backgroundColor: isSel ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255,255,255,0.03)',
                      border: isSel ? '1px solid #8b5cf6' : '1px solid var(--border-color)',
                      color: isSel ? '#ffffff' : 'var(--text-secondary)',
                      fontSize: '11px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span 
                      style={{ 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '50%', 
                        background: `linear-gradient(135deg, ${t.gradient[0]}, ${t.gradient[1]})`,
                        flexShrink: 0 
                      }} 
                    />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Window Chrome & Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Style du Cadre & En-tête :
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { id: 'macos', label: '🍎 macOS' },
                { id: 'windows', label: '🪟 Windows' },
                { id: 'minimal', label: '✨ Minimal' }
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setChromeStyle(c.id as WindowChromeStyle)}
                  style={{
                    flex: 1,
                    padding: '6px 4px',
                    borderRadius: '6px',
                    backgroundColor: chromeStyle === c.id ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255,255,255,0.03)',
                    border: chromeStyle === c.id ? '1px solid #8b5cf6' : '1px solid var(--border-color)',
                    color: chromeStyle === c.id ? '#ffffff' : 'var(--text-secondary)',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {chromeStyle !== 'minimal' && (
              <div style={{ marginTop: '4px' }}>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Titre de la fenêtre :</label>
                <input
                  type="text"
                  className="form-input"
                  value={windowTitle}
                  onChange={(e) => setWindowTitle(e.target.value)}
                  style={{ padding: '3px 8px', fontSize: '11px', width: '100%', marginTop: '2px' }}
                  placeholder="Titre de la fenêtre"
                />
              </div>
            )}
          </div>
        </div>

        {/* Fine Tuning Sliders */}
        <div style={{ 
          padding: '8px 12px', 
          borderRadius: '8px', 
          backgroundColor: 'rgba(0,0,0,0.25)', 
          border: '1px solid var(--border-color)',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)' }}>
              <span>Marge (Padding) :</span>
              <strong style={{ color: 'var(--text-primary)' }}>{padding}px</strong>
            </div>
            <input 
              type="range" 
              min={10} 
              max={100} 
              step={5} 
              value={padding}
              onChange={(e) => setPadding(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#8b5cf6' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)' }}>
              <span>Coins arrondis :</span>
              <strong style={{ color: 'var(--text-primary)' }}>{borderRadius}px</strong>
            </div>
            <input 
              type="range" 
              min={0} 
              max={32} 
              step={2} 
              value={borderRadius}
              onChange={(e) => setBorderRadius(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#8b5cf6' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)' }}>
              <span>Ombre 3D :</span>
              <strong style={{ color: 'var(--text-primary)' }}>{shadowIntensity}</strong>
            </div>
            <select
              value={shadowIntensity}
              onChange={(e) => setShadowIntensity(e.target.value as ShadowIntensity)}
              className="form-input"
              style={{ padding: '2px 6px', fontSize: '10px', width: '100%', marginTop: '2px' }}
            >
              <option value="none">Sans ombre</option>
              <option value="soft">Douce</option>
              <option value="medium">Moyenne</option>
              <option value="deep">Profonde</option>
              <option value="glow">Halo Néon</option>
            </select>
          </div>
        </div>

        {/* Progress Display */}
        {isExporting && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 12px', borderRadius: '6px', backgroundColor: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>Rendu {exportType.toUpperCase()} en cours...</span>
              <span>{exportProgress}%</span>
            </div>
            <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${exportProgress}%`, background: 'linear-gradient(90deg, #ec4899, #8b5cf6)', transition: 'width 0.1s linear' }} />
            </div>
          </div>
        )}

        {/* Modal Controls Footer */}
        <div className="modal-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
          <button className="action-btn" style={{ padding: '5px 12px', fontSize: '12px' }} onClick={onClose} disabled={isExporting}>
            Fermer
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            {exportedBlob ? (
              <>
                <button
                  className="btn-secondary"
                  onClick={handleSaveToLibrary}
                  disabled={savedSuccess}
                  style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {savedSuccess ? <Check size={14} color="#4ade80" /> : <Layers size={14} />}
                  <span>{savedSuccess ? 'Enregistré' : 'Sauvegarder'}</span>
                </button>

                <button
                  className="btn-primary"
                  onClick={handleDownload}
                  style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={14} />
                  <span>Télécharger {exportType.toUpperCase()}</span>
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn-secondary"
                  onClick={handleExportGif}
                  disabled={isExporting}
                  style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#c084fc' }}
                >
                  <Film size={14} />
                  <span>Exporter en GIF</span>
                </button>

                <button
                  className="btn-primary"
                  onClick={handleExportVideo}
                  disabled={isExporting}
                  style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {isExporting ? <Sparkles size={14} className="spinning" /> : <Sparkles size={14} />}
                  <span>Exporter en Vidéo</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
