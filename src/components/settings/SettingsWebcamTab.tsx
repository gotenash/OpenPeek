import React, { useEffect, useState, useRef } from 'react';
import { Camera, Video } from 'lucide-react';
import type { RecorderOptions } from '../../hooks/useRecorder';
import { webcamSegmenter } from '../../utils/webcamSegmenter';

interface SettingsWebcamTabProps {
  options: RecorderOptions;
  setOptions: React.Dispatch<React.SetStateAction<RecorderOptions>>;
  handleSelect: (key: keyof RecorderOptions, value: any) => void;
  handleCheckbox: (key: keyof RecorderOptions) => void;
  cams: MediaDeviceInfo[];
  isRecording?: boolean;
}

export function SettingsWebcamTab({
  options,
  setOptions,
  handleSelect,
  handleCheckbox,
  cams,
  isRecording = false
}: SettingsWebcamTabProps) {
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [secondaryPreviewStream, setSecondaryPreviewStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const secondaryVideoRef = useRef<HTMLVideoElement | null>(null);
  const customBgFileInputRef = useRef<HTMLInputElement | null>(null);

  // Webcam live preview management
  useEffect(() => {
    let active = true;
    let streamToCleanup: MediaStream | null = null;

    async function startPreview() {
      if (document.hidden || !options.showWebcam || !options.selectedCamId || isRecording) {
        setPreviewStream(null);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: options.selectedCamId,
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });
        
        if (active) {
          setPreviewStream(stream);
          streamToCleanup = stream;
        } else {
          stream.getTracks().forEach(t => t.stop());
        }
      } catch (err) {
        console.warn('Failed to start webcam preview:', err);
      }
    }

    startPreview();

    return () => {
      active = false;
      if (streamToCleanup) {
        streamToCleanup.getTracks().forEach(t => t.stop());
      }
    };
  }, [options.showWebcam, options.selectedCamId, isRecording]);

  // Secondary Webcam live preview management
  useEffect(() => {
    let active = true;
    let streamToCleanup: MediaStream | null = null;

    async function startSecondaryPreview() {
      if (document.hidden || !options.enableSecondaryCam || !options.selectedSecondaryCamId || isRecording) {
        setSecondaryPreviewStream(null);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { ideal: options.selectedSecondaryCamId },
            width: { ideal: 640 },
            height: { ideal: 360 }
          }
        });
        
        if (active) {
          setSecondaryPreviewStream(stream);
          streamToCleanup = stream;
          if (secondaryVideoRef.current) {
            secondaryVideoRef.current.srcObject = stream;
            secondaryVideoRef.current.play().catch(() => {});
          }
        } else {
          stream.getTracks().forEach(t => t.stop());
        }
      } catch (err) {
        console.warn('Failed to start secondary webcam preview:', err);
      }
    }

    startSecondaryPreview();

    return () => {
      active = false;
      if (streamToCleanup) {
        streamToCleanup.getTracks().forEach(t => t.stop());
      }
    };
  }, [options.enableSecondaryCam, options.selectedSecondaryCamId, isRecording]);

  useEffect(() => {
    if (videoRef.current) {
      if (videoRef.current.srcObject !== previewStream) {
        videoRef.current.srcObject = previewStream;
        if (previewStream) {
          videoRef.current.play().catch((err) => {
            console.warn('Error playing preview video:', err);
          });
        }
      }
    }
  }, [previewStream]);

  // Live segmentation preview render loop
  useEffect(() => {
    if (!previewStream || !options.webcamBackgroundEffect || options.webcamBackgroundEffect === 'none') {
      return;
    }

    let animId: number;
    let isMounted = true;

    const render = () => {
      if (!isMounted) return;

      const video = videoRef.current;
      const canvas = previewCanvasRef.current;

      const effect = options.webcamBackgroundEffect;
      if (!effect || effect === 'none') return;

      if (video && video.readyState >= 2 && canvas) {
        const processed = webcamSegmenter.processFrame(
          video, 
          effect,
          options.webcamVirtualBg || 'transparent',
          options.webcamCustomBgImage
        );
        const source = processed || video;
        const sw = (source as any).videoWidth || (source as any).width;
        const sh = (source as any).videoHeight || (source as any).height;

        if (sw > 0 && sw !== undefined && sh > 0 && sh !== undefined) {
          if (canvas.width !== sw || canvas.height !== sh) {
            canvas.width = sw;
            canvas.height = sh;
          }
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(source as any, 0, 0);
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      isMounted = false;
      cancelAnimationFrame(animId);
    };
  }, [previewStream, options.webcamBackgroundEffect, options.webcamVirtualBg, options.webcamCustomBgImage]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div className="glass-panel settings-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h2 className="settings-card-title" style={{ fontSize: '15px', marginBottom: '4px' }}>
          <Camera size={18} className="logo-icon-inline" style={{ verticalAlign: 'middle', marginRight: '8px' }} />
          Incrustation Caméra (Facecam)
        </h2>

        <div className="form-group">
          <label className="form-checkbox-row" style={{ cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              className="form-checkbox" 
              checked={options.showWebcam}
              onChange={() => handleCheckbox('showWebcam')}
            />
            <span className="form-label" style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>
              Activer la Facecam incrustée
            </span>
          </label>
          <p className="form-help" style={{ marginLeft: '26px', marginTop: '2px', fontSize: '11px' }}>
            Incruste votre caméra dans un cercle élégant déplaçable et redimensionnable en direct.
          </p>
        </div>

        {options.showWebcam && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '12px' }}>Périphérique Caméra</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Camera size={16} color="#06b6d4" />
                  <select 
                    className="form-select" 
                    style={{ flexGrow: 1, padding: '6px 10px', fontSize: '13px' }}
                    value={options.selectedCamId} 
                    onChange={(e) => handleSelect('selectedCamId', e.target.value)}
                  >
                    {cams.map(cam => (
                      <option key={cam.deviceId} value={cam.deviceId}>
                        {cam.label || `Caméra (${cam.deviceId.slice(0, 8)}...)`}
                      </option>
                    ))}
                    {cams.length === 0 && <option value="">Aucune caméra détectée</option>}
                  </select>
                </div>
              </div>

              {/* Webcam Studio: Shapes */}
              <div>
                <label className="form-label" style={{ fontSize: '12px' }}>Forme de la Facecam</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { id: 'circle', label: 'Cercle' },
                    { id: 'squircle', label: 'Squircle (iOS)' },
                    { id: 'rect', label: 'Rectangle (16:9)' }
                  ].map((shape) => (
                    <button
                      key={shape.id}
                      type="button"
                      className="btn-toolbar"
                      onClick={() => handleSelect('webcamShape', shape.id)}
                      style={{
                        flex: 1,
                        fontSize: '11px',
                        padding: '6px 8px',
                        justifyContent: 'center',
                        backgroundColor: (options.webcamShape || 'circle') === shape.id ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255,255,255,0.04)',
                        borderColor: (options.webcamShape || 'circle') === shape.id ? '#8b5cf6' : 'var(--border-color)',
                        color: (options.webcamShape || 'circle') === shape.id ? '#c084fc' : 'var(--text-secondary)'
                      }}
                    >
                      {shape.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Webcam Studio: Halo Neon Colors */}
              <div>
                <label className="form-label" style={{ fontSize: '12px' }}>Couleur du Halo Néon</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {[
                    { hex: '#8b5cf6', name: 'Violet Électrique' },
                    { hex: '#06b6d4', name: 'Cyan Néon' },
                    { hex: '#ec4899', name: 'Rose Fluo' },
                    { hex: '#10b981', name: 'Émeraude' },
                    { hex: '#eab308', name: 'Jaune Or' },
                    { hex: '#ffffff', name: 'Blanc Pur' },
                    { hex: 'none', name: 'Sans bordure' }
                  ].map((col) => (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => handleSelect('webcamHaloColor', col.hex)}
                      title={col.name}
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        backgroundColor: col.hex === 'none' ? '#1e293b' : col.hex,
                        border: (options.webcamHaloColor || '#8b5cf6') === col.hex ? '2px solid #ffffff' : '2px solid transparent',
                        transform: (options.webcamHaloColor || '#8b5cf6') === col.hex ? 'scale(1.2)' : 'scale(1.0)',
                        boxShadow: col.hex !== 'none' && (options.webcamHaloColor || '#8b5cf6') === col.hex ? `0 0 10px ${col.hex}` : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        color: '#ffffff'
                      }}
                    >
                      {col.hex === 'none' && '✕'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Webcam Studio: Background Blur & AI Segmentation */}
              <div>
                <label className="form-label" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Arrière-plan de la Facecam</span>
                  <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', backgroundColor: 'rgba(139, 92, 246, 0.25)', color: '#c084fc', fontWeight: 600 }}>
                    IA Locale (MediaPipe)
                  </span>
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { id: 'none', label: 'Normal' },
                    { id: 'blur-light', label: 'Flou subtil' },
                    { id: 'blur-heavy', label: 'Flou intense' },
                    { id: 'remove', label: 'Détourage' }
                  ].map((eff) => (
                    <button
                      key={eff.id}
                      type="button"
                      className="btn-toolbar"
                      onClick={() => handleSelect('webcamBackgroundEffect', eff.id)}
                      style={{
                        flex: 1,
                        fontSize: '11px',
                        padding: '6px 4px',
                        justifyContent: 'center',
                        backgroundColor: (options.webcamBackgroundEffect || 'none') === eff.id ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255,255,255,0.04)',
                        borderColor: (options.webcamBackgroundEffect || 'none') === eff.id ? '#8b5cf6' : 'var(--border-color)',
                        color: (options.webcamBackgroundEffect || 'none') === eff.id ? '#c084fc' : 'var(--text-secondary)'
                      }}
                    >
                      {eff.label}
                    </button>
                  ))}
                </div>

                {/* When "Détourage" is selected: Virtual Background Selection */}
                {options.webcamBackgroundEffect === 'remove' && (
                  <div style={{
                    marginTop: '8px',
                    padding: '10px 12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label" style={{ fontSize: '11px', margin: 0, fontWeight: 600, color: '#c084fc' }}>
                        🎨 Fond du Détourage
                      </label>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {(options.webcamVirtualBg === 'custom' && options.webcamCustomBgImage) ? 'Image active' : ''}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {[
                        { id: 'transparent', label: '🪟 Transparent', bg: 'repeating-conic-gradient(#334155 0% 25%, #1e293b 0% 50%) 50% / 8px 8px' },
                        { id: 'greenscreen', label: '🟩 Vert Chroma', bg: '#00ff00' },
                        { id: 'studio-dark', label: '🌌 Studio Sombre', bg: 'linear-gradient(135deg, #1e1b4b, #0f172a)' },
                        { id: 'neon-purple', label: '🔮 Cyber Neon', bg: 'linear-gradient(135deg, #3b0764, #18052e)' },
                        { id: 'slate-clean', label: '🏢 Slate Moderne', bg: 'linear-gradient(135deg, #1e293b, #334155)' },
                        { id: 'warm-sunset', label: '🌅 Sunset', bg: 'linear-gradient(135deg, #451a03, #1c1917)' },
                        { id: 'emerald', label: '🌲 Émeraude', bg: 'linear-gradient(135deg, #064e3b, #022c22)' },
                        { id: 'custom', label: '🖼️ Image Perso', bg: options.webcamCustomBgImage ? `url(${options.webcamCustomBgImage}) center/cover` : 'rgba(255,255,255,0.08)' }
                      ].map((bgItem) => {
                        const isSelected = (options.webcamVirtualBg || 'transparent') === bgItem.id;
                        return (
                          <button
                            key={bgItem.id}
                            type="button"
                            className="btn-toolbar"
                            onClick={() => {
                              handleSelect('webcamVirtualBg', bgItem.id);
                              if (bgItem.id === 'custom' && !options.webcamCustomBgImage) {
                                customBgFileInputRef.current?.click();
                              }
                            }}
                            style={{
                              fontSize: '10px',
                              padding: '5px 4px',
                              justifyContent: 'center',
                              position: 'relative',
                              backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255,255,255,0.03)',
                              borderColor: isSelected ? '#8b5cf6' : 'var(--border-color)',
                              color: isSelected ? '#e9d5ff' : 'var(--text-secondary)',
                              borderRadius: '6px',
                              overflow: 'hidden'
                            }}
                          >
                            <span style={{ 
                              display: 'inline-block', 
                              width: '10px', 
                              height: '10px', 
                              borderRadius: '50%', 
                              background: bgItem.bg, 
                              marginRight: '4px',
                              flexShrink: 0,
                              border: '1px solid rgba(255,255,255,0.2)'
                            }} />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {bgItem.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Hidden File Input for Custom Background Image */}
                    <input 
                      ref={customBgFileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (reader.result) {
                              setOptions(prev => ({
                                ...prev,
                                webcamVirtualBg: 'custom',
                                webcamCustomBgImage: reader.result as string
                              }));
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />

                    {options.webcamVirtualBg === 'custom' && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                        <button
                          type="button"
                          className="btn-toolbar"
                          onClick={() => customBgFileInputRef.current?.click()}
                          style={{ flex: 1, fontSize: '10px', padding: '4px 8px', justifyContent: 'center' }}
                        >
                          {options.webcamCustomBgImage ? '🔄 Changer d\'image...' : '📁 Choisir une image locale...'}
                        </button>
                        {options.webcamCustomBgImage && (
                          <button
                            type="button"
                            className="btn-toolbar"
                            onClick={() => {
                              setOptions(prev => ({
                                ...prev,
                                webcamVirtualBg: 'transparent',
                                webcamCustomBgImage: ''
                              }));
                            }}
                            style={{ fontSize: '10px', padding: '4px 8px', color: '#f87171' }}
                            title="Supprimer l'image"
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Toggles: Mirror Mode & Neon Glow */}
              <div style={{ display: 'flex', gap: '14px', paddingTop: '4px' }}>
                <label className="form-checkbox-row" style={{ cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    className="form-checkbox" 
                    checked={options.webcamMirrorMode !== false}
                    onChange={() => handleCheckbox('webcamMirrorMode')}
                  />
                  <span className="form-label" style={{ margin: 0, fontSize: '11px', fontWeight: 600 }}>
                    🪞 Mode Miroir
                  </span>
                </label>

                <label className="form-checkbox-row" style={{ cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    className="form-checkbox" 
                    checked={options.webcamGlow !== false}
                    onChange={() => handleCheckbox('webcamGlow')}
                  />
                  <span className="form-label" style={{ margin: 0, fontSize: '11px', fontWeight: 600 }}>
                    ✨ Halo Lumineux (Glow)
                  </span>
                </label>
              </div>
            </div>

            {/* Webcam Live Test Box with Dynamic Studio Shape and Halo */}
            <div style={{ 
              borderRadius: (options.webcamShape === 'squircle') ? '24px' : (options.webcamShape === 'rect') ? '12px' : '50%', 
              overflow: 'hidden', 
              position: 'relative',
              border: (options.webcamHaloColor === 'none') ? 'none' : `3px solid ${options.webcamHaloColor || '#8b5cf6'}`, 
              background: (options.webcamBackgroundEffect === 'remove' && (options.webcamVirtualBg === 'transparent' || !options.webcamVirtualBg))
                ? 'repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 50% / 16px 16px'
                : '#0a0a0a',
              width: (options.webcamShape === 'rect') ? '200px' : '160px',
              height: (options.webcamShape === 'rect') ? '112px' : '160px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: (options.webcamHaloColor !== 'none' && options.webcamGlow !== false) ? `0 0 20px ${(options.webcamHaloColor || '#8b5cf6')}60` : 'none',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              {previewStream ? (
                <>
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover', 
                      transform: (options.webcamMirrorMode !== false) ? 'scaleX(-1)' : 'none',
                      display: (options.webcamBackgroundEffect && options.webcamBackgroundEffect !== 'none') ? 'none' : 'block'
                    }}
                  />
                  <canvas
                    ref={previewCanvasRef}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: (options.webcamMirrorMode !== false) ? 'scaleX(-1)' : 'none',
                      display: (options.webcamBackgroundEffect && options.webcamBackgroundEffect !== 'none') ? 'block' : 'none'
                    }}
                  />
                  {options.webcamBackgroundEffect && options.webcamBackgroundEffect !== 'none' && (
                    <div style={{
                      position: 'absolute',
                      bottom: '6px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: 'rgba(15, 23, 42, 0.85)',
                      backdropFilter: 'blur(4px)',
                      border: '1px solid rgba(139, 92, 246, 0.4)',
                      borderRadius: '4px',
                      padding: '1px 6px',
                      fontSize: '9px',
                      color: '#c084fc',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      zIndex: 2
                    }}>
                      {options.webcamBackgroundEffect === 'blur-light' ? '✨ Flou subtil' : 
                       options.webcamBackgroundEffect === 'blur-heavy' ? '✨ Flou intense' : 
                       options.webcamVirtualBg === 'greenscreen' ? '🟩 Vert Chroma' :
                       options.webcamVirtualBg === 'studio-dark' ? '🌌 Studio Sombre' :
                       options.webcamVirtualBg === 'neon-purple' ? '🔮 Cyber Neon' :
                       options.webcamVirtualBg === 'slate-clean' ? '🏢 Slate' :
                       options.webcamVirtualBg === 'warm-sunset' ? '🌅 Sunset' :
                       options.webcamVirtualBg === 'emerald' ? '🌲 Émeraude' :
                       options.webcamVirtualBg === 'custom' ? '🖼️ Image Perso' : '✂️ Détourage'}
                    </div>
                  )}
                </>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>
                  Aperçu caméra
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Card 2: Caméra Secondaire (B-Roll / Iriun Webcam) */}
      <div className="glass-panel settings-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="settings-card-title" style={{ fontSize: '15px', margin: 0 }}>
            <Video size={18} className="logo-icon-inline" style={{ verticalAlign: 'middle', marginRight: '8px', color: '#a855f7' }} />
            Caméra Secondaire B-Roll (Iriun Webcam, USB, etc.)
          </h2>
          <span style={{ fontSize: '10px', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
            Piste V2 Auto
          </span>
        </div>

        <div className="form-group">
          <label className="form-checkbox-row" style={{ cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              className="form-checkbox" 
              checked={Boolean(options.enableSecondaryCam)}
              onChange={() => handleCheckbox('enableSecondaryCam')}
            />
            <span className="form-label" style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>
              Activer la Caméra Secondaire (Prise de vue B-Roll)
            </span>
          </label>
          <p className="form-help" style={{ marginLeft: '26px', marginTop: '2px', fontSize: '11px' }}>
            Idéal pour filmer un smartphone (Iriun Webcam, DroidCam), un objet, un appareil physique ou un document. S'active en direct pendant la capture et se place automatiquement en plein écran sur la Piste V2 du Studio de Montage.
          </p>
        </div>

        {options.enableSecondaryCam && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '12px' }}>Périphérique Caméra Secondaire (B-Roll)</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Video size={16} color="#a855f7" />
                  <select 
                    className="form-select" 
                    style={{ flexGrow: 1, padding: '6px 10px', fontSize: '13px' }}
                    value={options.selectedSecondaryCamId || ''} 
                    onChange={(e) => handleSelect('selectedSecondaryCamId', e.target.value)}
                  >
                    <option value="">Sélectionner une caméra...</option>
                    {cams.map(cam => (
                      <option key={cam.deviceId} value={cam.deviceId}>
                        {cam.label || `Caméra (${cam.deviceId.slice(0, 8)}...)`}
                        {cam.label?.toLowerCase().includes('iriun') ? ' 📱 (Iriun Phone)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Option audio mixage */}
              <label className="form-checkbox-row" style={{ cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  className="form-checkbox" 
                  checked={options.secondaryCamAudio !== false}
                  onChange={() => handleCheckbox('secondaryCamAudio')}
                />
                <span className="form-label" style={{ margin: 0, fontSize: '12px', fontWeight: 600 }}>
                  🎙️ Capturer l'audio de la caméra secondaire (pour mixage au montage)
                </span>
              </label>

              {/* Raccourci activation */}
              <div>
                <label className="form-label" style={{ fontSize: '12px' }}>Raccourci d'activation en direct</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    className="form-select"
                    style={{ width: '150px', padding: '5px 10px', fontSize: '12px' }}
                    value={options.secondaryCamShortcut || 'F10'}
                    onChange={(e) => handleSelect('secondaryCamShortcut', e.target.value)}
                  >
                    <option value="F10">Touche F10</option>
                    <option value="F8">Touche F8</option>
                    <option value="F11">Touche F11</option>
                    <option value="KeyB">Alt + B</option>
                  </select>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Déclenche et coupe la prise de vue B-Roll pendant l'enregistrement.
                  </span>
                </div>
              </div>

              <div style={{
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '11px',
                color: '#e9d5ff',
                lineHeight: '1.4'
              }}>
                💡 <strong>Comment ça marche ?</strong> Dès que vous appuyez sur le raccourci, une fenêtre flottante de retour visuel s'ouvre pour vous aider à cadrer. Le clip vidéo sera automatiquement calé sur la Piste V2 du Studio de Montage en plein écran !
              </div>
            </div>

            {/* Live Preview of Secondary Camera */}
            <div style={{
              borderRadius: '8px',
              overflow: 'hidden',
              position: 'relative',
              border: '2px solid rgba(168, 85, 247, 0.5)',
              background: '#0a0a0a',
              width: '200px',
              height: '125px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(168, 85, 247, 0.25)'
            }}>
              {secondaryPreviewStream ? (
                <video
                  ref={secondaryVideoRef}
                  muted
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>
                  {options.selectedSecondaryCamId ? 'Chargement caméra 2...' : 'Sélectionnez une caméra'}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
