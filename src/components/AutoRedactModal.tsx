import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  ShieldAlert, 
  ShieldCheck, 
  Sparkles, 
  Play, 
  Pause, 
  Download, 
  Plus, 
  Trash2, 
  Check, 
  Lock, 
  Key, 
  Mail, 
  CreditCard, 
  Globe
} from 'lucide-react';
import { type SavedVideo, saveRecording } from '../utils/db';
import type { BlurMask } from '../hooks/useRecorder';
import { 
  type DetectedSecret, 
  type BlurStyle, 
  PRIVACY_HOTSPOTS, 
  scanVideoForSecrets, 
  drawRedactionMasks, 
  renderRedactedVideo 
} from '../utils/autoRedact';

interface AutoRedactModalProps {
  video: SavedVideo;
  onClose: () => void;
  onSavedToLibrary?: () => void;
}

export function AutoRedactModal({ video, onClose, onSavedToLibrary }: AutoRedactModalProps) {
  const [masks, setMasks] = useState<BlurMask[]>([]);
  const [detectedSecrets, setDetectedSecrets] = useState<DetectedSecret[]>([]);
  const [blurStyle, setBlurStyle] = useState<BlurStyle>('pixelate');
  const [customKeywordInput, setCustomKeywordInput] = useState('');
  const [customKeywords, setCustomKeywords] = useState<string[]>([]);
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanCompleted, setScanCompleted] = useState(false);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [isDrawingMask, setIsDrawingMask] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDrawRect, setCurrentDrawRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number>(0);
  const offscreenCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const abortControllerRef = useRef<AbortController | null>(null);

  // Setup video element
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

  // Live Canvas Rendering Loop with Blur Masks
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

      if (canvas.width !== origW || canvas.height !== origH) {
        canvas.width = origW;
        canvas.height = origH;
      }

      if (v.readyState >= 2) {
        ctx.drawImage(v, 0, 0, origW, origH);

        // Draw all active masks
        drawRedactionMasks(ctx, canvas, masks, blurStyle, offscreenCanvasRef.current);

        // Draw temporary dragging bounding box if currently drawing
        if (currentDrawRect) {
          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.fillStyle = 'rgba(236, 72, 153, 0.2)';
          const rx = currentDrawRect.x * origW;
          const ry = currentDrawRect.y * origH;
          const rw = currentDrawRect.w * origW;
          const rh = currentDrawRect.h * origH;
          ctx.fillRect(rx, ry, rw, rh);
          ctx.strokeRect(rx, ry, rw, rh);
          ctx.setLineDash([]);
        }
      }

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animationFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isMounted = false;
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [masks, blurStyle, currentDrawRect]);

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

  // Launch Automatic Secrets Scan
  const handleStartScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanCompleted(false);

    abortControllerRef.current = new AbortController();

    try {
      const detected = await scanVideoForSecrets(
        video.blob,
        customKeywords,
        video.duration || 10,
        (p) => setScanProgress(p),
        abortControllerRef.current.signal
      );

      setDetectedSecrets(detected);
      setScanCompleted(true);

      // Auto-populate masks from detected secrets
      const newMasks = detected.filter(d => d.enabled).map(d => d.mask);
      setMasks(prev => [...prev, ...newMasks]);
    } catch (err: any) {
      console.error("Auto-redact scan error:", err);
      if (err?.name !== 'AbortError') {
        alert(`Erreur lors du scan automatique : ${err?.message || 'format de vidéo incompatible'}`);
      }
    } finally {
      setIsScanning(false);
    }
  };

  const toggleDetectedSecret = (id: string) => {
    setDetectedSecrets(prev => {
      const updated = prev.map(s => {
        if (s.id === id) {
          const nextState = !s.enabled;
          if (nextState) {
            setMasks(m => [...m, s.mask]);
          } else {
            setMasks(m => m.filter(mask => mask.id !== s.mask.id));
          }
          return { ...s, enabled: nextState };
        }
        return s;
      });
      return updated;
    });
  };

  const addHotspotPreset = (preset: typeof PRIVACY_HOTSPOTS[0]) => {
    const newMask: BlurMask = {
      id: Math.random(),
      ...preset.mask
    };
    setMasks(prev => [...prev, newMask]);
  };

  const removeMask = (id: number) => {
    setMasks(prev => prev.filter(m => m.id !== id));
  };

  const clearAllMasks = () => {
    setMasks([]);
    setDetectedSecrets(prev => prev.map(s => ({ ...s, enabled: false })));
  };

  const handleAddCustomKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customKeywordInput.trim()) return;
    if (!customKeywords.includes(customKeywordInput.trim())) {
      setCustomKeywords(prev => [...prev, customKeywordInput.trim()]);
    }
    setCustomKeywordInput('');
  };

  // Canvas Mouse Draw Interactions for Manual Mask Creation
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    setIsDrawingMask(true);
    setDrawStart({ x, y });
    setCurrentDrawRect({ x, y, w: 0, h: 0 });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMask || !drawStart) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const currentY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const minX = Math.min(drawStart.x, currentX);
    const minY = Math.min(drawStart.y, currentY);
    const w = Math.abs(currentX - drawStart.x);
    const h = Math.abs(currentY - drawStart.y);

    setCurrentDrawRect({ x: minX, y: minY, w, h });
  };

  const handleCanvasMouseUp = () => {
    if (isDrawingMask && currentDrawRect && currentDrawRect.w > 0.01 && currentDrawRect.h > 0.01) {
      const newMask: BlurMask = {
        id: Math.random(),
        x: currentDrawRect.x,
        y: currentDrawRect.y,
        width: currentDrawRect.w,
        height: currentDrawRect.h
      };
      setMasks(prev => [...prev, newMask]);
    }
    setIsDrawingMask(false);
    setDrawStart(null);
    setCurrentDrawRect(null);
  };

  // Video Export Execution
  const handleExportRedactedVideo = async () => {
    if (masks.length === 0) {
      alert("Ajoutez au moins une zone de flou avant d'exporter.");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportedBlob(null);
    setSavedSuccess(false);

    abortControllerRef.current = new AbortController();

    try {
      const blob = await renderRedactedVideo(
        video.blob,
        masks,
        blurStyle,
        video.duration || 10,
        (p) => setExportProgress(p),
        abortControllerRef.current.signal
      );
      setExportedBlob(blob);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        alert("Erreur lors de l'anonymisation de la vidéo.");
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
    const cleanTitle = (video.title || 'video').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `${cleanTitle}_redacted.webm`;
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
        id: crypto.randomUUID ? crypto.randomUUID() : `redact_${Date.now()}`,
        title: `${video.title} (Anonymisé)`,
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'apikey': return <Key size={13} color="#f43f5e" />;
      case 'email': return <Mail size={13} color="#38bdf8" />;
      case 'creditcard': return <CreditCard size={13} color="#eab308" />;
      case 'ip': return <Globe size={13} color="#a855f7" />;
      default: return <Lock size={13} color="#ec4899" />;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ padding: '12px' }}>
      <div 
        className="glass-panel modal-content" 
        style={{ 
          maxWidth: '960px', 
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
              background: 'linear-gradient(135deg, #f43f5e, #8b5cf6)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <ShieldAlert size={16} />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '16px', margin: 0 }}>
                Floutage Automatique des Données Sensibles (Auto-Redact)
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                Détectez et masquez instantanément clés API, tokens, emails, cartes bancaires et zones confidentielles.
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} disabled={isExporting || isScanning}>
            <X size={18} />
          </button>
        </div>

        {/* Video Canvas Preview & Drag Drawing Area */}
        <div style={{
          position: 'relative',
          height: '270px',
          maxHeight: '270px',
          backgroundColor: '#0a0a0f',
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border-color)',
          cursor: 'crosshair'
        }}>
          <canvas 
            ref={previewCanvasRef} 
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            style={{ 
              maxHeight: '100%', 
              maxWidth: '100%', 
              objectFit: 'contain',
              borderRadius: '4px'
            }} 
          />

          {/* Transport button */}
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

          {/* Overlay badge for drawing */}
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            fontSize: '11px',
            color: '#c084fc',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <Plus size={12} />
            <span>Glissez pour tracer une zone de flou</span>
          </div>
        </div>

        {/* Scan Bar & Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.1), rgba(139, 92, 246, 0.1))',
          border: '1px solid rgba(244, 63, 94, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="btn-primary"
              onClick={handleStartScan}
              disabled={isScanning || isExporting}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                background: 'linear-gradient(135deg, #f43f5e, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isScanning ? <Sparkles size={14} className="spinning" /> : <Sparkles size={14} />}
              <span>{isScanning ? `Scan IA en cours (${scanProgress}%)...` : 'Scanner les secrets (Auto-Redact)'}</span>
            </button>

            {scanCompleted && (
              <span style={{ fontSize: '12px', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={14} />
                <span>{detectedSecrets.length} élément(s) détecté(s)</span>
              </span>
            )}
          </div>

          {/* Blur Style Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Style :</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[
                { id: 'pixelate', label: '🔲 Mosaïque' },
                { id: 'frosted', label: '🌫️ Dépoli' },
                { id: 'blackout', label: '⬛ Censure' }
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setBlurStyle(s.id as BlurStyle)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    backgroundColor: blurStyle === s.id ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255,255,255,0.05)',
                    border: blurStyle === s.id ? '1px solid #8b5cf6' : '1px solid var(--border-color)',
                    color: blurStyle === s.id ? '#ffffff' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Hotspots & Detected Secrets Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '12px' }}>
          {/* Left Column: Detected Secrets List & Custom Keywords */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Éléments Détectés ({detectedSecrets.length}) :
              </span>
              {masks.length > 0 && (
                <button 
                  onClick={clearAllMasks} 
                  style={{ background: 'none', border: 'none', color: '#fb7185', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                >
                  <Trash2 size={12} />
                  <span>Tout effacer ({masks.length})</span>
                </button>
              )}
            </div>

            <div style={{ 
              maxHeight: '130px', 
              overflowY: 'auto', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '4px',
              padding: '6px',
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '6px',
              border: '1px solid var(--border-color)'
            }}>
              {detectedSecrets.map((secret) => (
                <div 
                  key={secret.id}
                  onClick={() => toggleDetectedSecret(secret.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: secret.enabled ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255,255,255,0.02)',
                    border: secret.enabled ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {getCategoryIcon(secret.category)}
                    <span style={{ fontWeight: 600, color: secret.enabled ? '#ffffff' : 'var(--text-muted)' }}>{secret.label}</span>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '10px' }}>
                    {secret.sampleText}
                  </span>
                </div>
              ))}

              {detectedSecrets.length === 0 && (
                <div style={{ textAlign: 'center', padding: '16px 8px', color: 'var(--text-muted)', fontSize: '11px' }}>
                  Cliquez sur "Scanner les secrets" ou tracez manuellement une zone sur la vidéo.
                </div>
              )}
            </div>

            {/* Custom Keywords input */}
            <form onSubmit={handleAddCustomKeyword} style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                className="form-input"
                value={customKeywordInput}
                onChange={(e) => setCustomKeywordInput(e.target.value)}
                placeholder="Mot confidentiel spécifique (ex: nom de client, IP...)"
                style={{ flexGrow: 1, padding: '4px 8px', fontSize: '11px' }}
              />
              <button type="submit" className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>
                + Ajouter
              </button>
            </form>
          </div>

          {/* Right Column: Quick Screen Hotspots & Active Masks count */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Préréglages de Zones Sensibles (Hotspots) :
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {PRIVACY_HOTSPOTS.map((hotspot) => (
                <button
                  key={hotspot.id}
                  onClick={() => addHotspotPreset(hotspot)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '11px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}
                  title={hotspot.description}
                >
                  <span style={{ fontWeight: 600, fontSize: '11px' }}>{hotspot.name}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>+ Ajouter zone</span>
                </button>
              ))}
            </div>

            {/* Active Masks count badge & Individual Mask List */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 10px',
              borderRadius: '6px',
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              fontSize: '11px'
            }}>
              <span>🛡️ Total zones actives de flou :</span>
              <strong style={{ color: '#c084fc' }}>{masks.length} zone(s)</strong>
            </div>

            {masks.length > 0 && (
              <div style={{ 
                maxHeight: '75px', 
                overflowY: 'auto', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '3px' 
              }}>
                {masks.map((mask, idx) => (
                  <div 
                    key={mask.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '2px 6px', 
                      borderRadius: '4px', 
                      backgroundColor: 'rgba(255,255,255,0.03)', 
                      fontSize: '10px',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    <span>Zone #{idx + 1} ({Math.round(mask.width * 100)}% x {Math.round(mask.height * 100)}%)</span>
                    <button 
                      onClick={() => removeMask(mask.id)}
                      style={{ background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer', padding: '0 2px' }}
                      title="Supprimer cette zone"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Progress Display */}
        {isExporting && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 12px', borderRadius: '6px', backgroundColor: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>Génération de la vidéo anonymisée en cours...</span>
              <span>{exportProgress}%</span>
            </div>
            <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${exportProgress}%`, background: 'linear-gradient(90deg, #f43f5e, #8b5cf6)', transition: 'width 0.1s linear' }} />
            </div>
          </div>
        )}

        {/* Footer Actions */}
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
                  {savedSuccess ? <Check size={14} color="#4ade80" /> : <ShieldCheck size={14} />}
                  <span>{savedSuccess ? 'Enregistré' : 'Sauvegarder'}</span>
                </button>

                <button
                  className="btn-primary"
                  onClick={handleDownload}
                  style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={14} />
                  <span>Télécharger la vidéo anonymisée</span>
                </button>
              </>
            ) : (
              <button
                className="btn-primary"
                onClick={handleExportRedactedVideo}
                disabled={isExporting || masks.length === 0}
                style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #f43f5e, #8b5cf6)' }}
              >
                {isExporting ? <Sparkles size={14} className="spinning" /> : <ShieldAlert size={14} />}
                <span>Appliquer le floutage & Exporter</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
