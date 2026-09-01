import React, { useEffect, useState } from 'react';
import type { RecorderOptions } from '../hooks/useRecorder';
import { Camera, Mic, ShieldAlert, Monitor, Volume2, Keyboard } from 'lucide-react';

interface SettingsPanelProps {
  options: RecorderOptions;
  setOptions: React.Dispatch<React.SetStateAction<RecorderOptions>>;
  isRecording?: boolean;
}

type SettingsTab = 'video' | 'audio' | 'webcam' | 'shortcuts';

export function SettingsPanel({ options, setOptions, isRecording = false }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('video');
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [permissionError, setPermissionError] = useState(false);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const optionsRef = React.useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    let debounceTimer: number | null = null;

    async function loadDevices() {
      try {
        let devices = await navigator.mediaDevices.enumerateDevices();
        let audioDevices = devices.filter(d => d.kind === 'audioinput');
        let videoDevices = devices.filter(d => d.kind === 'videoinput');
        
        if ((videoDevices.length === 0 || videoDevices.every(d => d.label === '')) && !isRecording) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            stream.getTracks().forEach(t => t.stop());
            devices = await navigator.mediaDevices.enumerateDevices();
            audioDevices = devices.filter(d => d.kind === 'audioinput');
            videoDevices = devices.filter(d => d.kind === 'videoinput');
          } catch (e) {
            try {
              const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
              vStream.getTracks().forEach(t => t.stop());
              devices = await navigator.mediaDevices.enumerateDevices();
              videoDevices = devices.filter(d => d.kind === 'videoinput');
            } catch (err) {}
          }
        }

        setMics(audioDevices);
        setCams(videoDevices);
        
        if (audioDevices.length > 0) {
          if (!optionsRef.current.selectedMicId || !audioDevices.some(d => d.deviceId === optionsRef.current.selectedMicId)) {
            setOptions(prev => ({ ...prev, selectedMicId: audioDevices[0].deviceId }));
          }
        }
        if (videoDevices.length > 0) {
          if (!optionsRef.current.selectedCamId || !videoDevices.some(d => d.deviceId === optionsRef.current.selectedCamId)) {
            setOptions(prev => ({ ...prev, selectedCamId: videoDevices[0].deviceId }));
          }
        }
      } catch (err) {
        console.error('Error listing hardware devices:', err);
        setPermissionError(true);
      }
    }

    loadDevices();
    
    const handleDeviceChange = () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        loadDevices();
      }, 500);
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [isRecording]);

  // Webcam live preview management
  useEffect(() => {
    let active = true;
    let streamToCleanup: MediaStream | null = null;

    async function startPreview() {
      if (document.hidden || !options.showWebcam || !options.selectedCamId || isRecording || activeTab !== 'webcam') {
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
  }, [options.showWebcam, options.selectedCamId, isRecording, activeTab]);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);

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

  const handleCheckbox = (key: keyof RecorderOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] } as any));
  };

  const handleSelect = (key: keyof RecorderOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '780px', margin: '0 auto', width: '100%' }}>
      {/* Settings Navigation Tabs */}
      <div className="glass-panel" style={{ display: 'flex', padding: '4px', gap: '4px', borderRadius: '10px' }}>
        <button
          className={`nav-item ${activeTab === 'video' ? 'active' : ''}`}
          style={{ flex: 1, justifyContent: 'center', padding: '8px 12px', fontSize: '13px', borderRadius: '8px' }}
          onClick={() => setActiveTab('video')}
        >
          <Monitor size={16} />
          <span>Vidéo & Qualité</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'audio' ? 'active' : ''}`}
          style={{ flex: 1, justifyContent: 'center', padding: '8px 12px', fontSize: '13px', borderRadius: '8px' }}
          onClick={() => setActiveTab('audio')}
        >
          <Volume2 size={16} />
          <span>Audio & Micro</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'webcam' ? 'active' : ''}`}
          style={{ flex: 1, justifyContent: 'center', padding: '8px 12px', fontSize: '13px', borderRadius: '8px' }}
          onClick={() => setActiveTab('webcam')}
        >
          <Camera size={16} />
          <span>Webcam (Facecam)</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'shortcuts' ? 'active' : ''}`}
          style={{ flex: 1, justifyContent: 'center', padding: '8px 12px', fontSize: '13px', borderRadius: '8px' }}
          onClick={() => setActiveTab('shortcuts')}
        >
          <Keyboard size={16} />
          <span>Raccourcis Clavier</span>
        </button>
      </div>

      {/* Tab 1: Video & Encoding */}
      {activeTab === 'video' && (
        <div className="glass-panel settings-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h2 className="settings-card-title" style={{ fontSize: '15px', marginBottom: '4px' }}>
            <Monitor size={18} className="logo-icon-inline" style={{ verticalAlign: 'middle', marginRight: '8px' }} />
            Paramètres de Résolution & Codec Vidéo
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px' }}>Résolution de Capture</label>
              <select 
                className="form-select" 
                value={options.resolution} 
                onChange={(e) => handleSelect('resolution', e.target.value)}
                style={{ padding: '6px 10px', fontSize: '13px' }}
              >
                <option value="720p">720p (HD - 1280x720)</option>
                <option value="1080p">1080p (Full HD - 1920x1080)</option>
                <option value="4k">4K (Ultra HD - 3840x2160)</option>
              </select>
              <p className="form-help" style={{ fontSize: '11px' }}>1080p recommandé pour la clarté des tutoriels de code.</p>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px' }}>Fréquence d'Images (FPS)</label>
              <select 
                className="form-select" 
                value={options.frameRate} 
                onChange={(e) => handleSelect('frameRate', Number(e.target.value))}
                style={{ padding: '6px 10px', fontSize: '13px' }}
              >
                <option value="30">30 FPS (Standard pour tutoriels)</option>
                <option value="60">60 FPS (Ultra fluide - Idéal pour le jeu / animations)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '12px' }}>Format / Codec d'Encodage</label>
            <select 
              className="form-select" 
              value={options.codec} 
              onChange={(e) => handleSelect('codec', e.target.value)}
              style={{ padding: '6px 10px', fontSize: '13px' }}
            >
              <option value="video/webm;codecs=vp9">WebM (Codec VP9 - Haute qualité, fichier léger optimisé)</option>
              <option value="video/webm;codecs=vp8">WebM (Codec VP8 - Compatibilité maximale)</option>
              <option value="video/webm;codecs=h264">WebM (Codec H.264 - Encodage matériel rapide)</option>
            </select>
          </div>

          <div className="form-group" style={{ paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
            <label className="form-checkbox-row" style={{ cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                className="form-checkbox" 
                checked={options.showMouseClicks}
                onChange={() => handleCheckbox('showMouseClicks')}
              />
              <span className="form-label" style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>
                Ondes lumineuses aux clics de souris (Click Ripples)
              </span>
            </label>
            <p className="form-help" style={{ marginLeft: '26px', marginTop: '2px', fontSize: '11px' }}>
              Anime un cercle néon sous le curseur à chaque clic pour mettre en valeur vos actions.
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Audio & Microphone */}
      {activeTab === 'audio' && (
        <div className="glass-panel settings-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h2 className="settings-card-title" style={{ fontSize: '15px', marginBottom: '4px' }}>
            <Volume2 size={18} className="logo-icon-inline" style={{ verticalAlign: 'middle', marginRight: '8px' }} />
            Configuration des Sources Audio
          </h2>

          {permissionError && (
            <div style={{ display: 'flex', gap: '8px', padding: '10px', background: 'rgba(244,63,94,0.1)', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.3)', fontSize: '12px', color: '#fb7185' }}>
              <ShieldAlert size={16} style={{ flexShrink: 0 }} />
              <span>Accès microphone bloqué. Veuillez accorder l'autorisation dans les paramètres système.</span>
            </div>
          )}

          <div className="form-group" style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
            <label className="form-checkbox-row" style={{ cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                className="form-checkbox" 
                checked={options.recordMic}
                onChange={() => handleCheckbox('recordMic')}
              />
              <span className="form-label" style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>
                Enregistrer la Voix (Microphone)
              </span>
            </label>
            
            {options.recordMic && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', marginLeft: '26px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Mic size={16} color="#c084fc" />
                  <select 
                    className="form-select" 
                    style={{ flexGrow: 1, padding: '6px 10px', fontSize: '13px' }}
                    value={options.selectedMicId} 
                    onChange={(e) => handleSelect('selectedMicId', e.target.value)}
                  >
                    {mics.map(mic => (
                      <option key={mic.deviceId} value={mic.deviceId}>
                        {mic.label || `Microphone (${mic.deviceId.slice(0, 8)}...)`}
                      </option>
                    ))}
                    {mics.length === 0 && <option value="">Aucun microphone détecté</option>}
                  </select>
                </div>

                {/* DSP Features */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                  <label className="form-checkbox-row" style={{ cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      className="form-checkbox" 
                      checked={options.enableNoiseSuppression !== false}
                      onChange={() => handleCheckbox('enableNoiseSuppression')}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="form-label" style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#38bdf8' }}>
                        🛡️ Réducteur de Bruit Intelligent (Anti-Rumble & Souffle)
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        Filtre passe-haut (85 Hz) et suppression active des bruits de ventilateurs et de frottements.
                      </span>
                    </div>
                  </label>

                  <label className="form-checkbox-row" style={{ cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      className="form-checkbox" 
                      checked={options.enableVocalEnhancer !== false}
                      onChange={() => handleCheckbox('enableVocalEnhancer')}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="form-label" style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#c084fc' }}>
                        ✨ Microphone Enhancer (Égaliseur Vocal & Compresseur Studio)
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        Clarté vocale renforcée (+3.5 dB à 3.2 kHz) et compresseur dynamique pour un rendu podcast / radio.
                      </span>
                    </div>
                  </label>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', width: '130px' }}>
                      🎚️ Volume Micro : {Math.round((options.micGain || 1.15) * 100)}%
                    </span>
                    <input
                      type="range"
                      min={0.8}
                      max={2.0}
                      step={0.05}
                      value={options.micGain !== undefined ? options.micGain : 1.15}
                      onChange={(e) => handleSelect('micGain', parseFloat(e.target.value))}
                      style={{ flexGrow: 1, accentColor: '#8b5cf6', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="form-group" style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
            <label className="form-checkbox-row" style={{ cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                className="form-checkbox" 
                checked={options.recordSystemAudio}
                onChange={() => handleCheckbox('recordSystemAudio')}
              />
              <span className="form-label" style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>
                Enregistrer le Son Système (Bureau / Applications)
              </span>
            </label>
            <p className="form-help" style={{ marginLeft: '26px', marginTop: '4px', fontSize: '11px' }}>
              Mixe automatiquement les sons émis par vos applications, vidéos et jeux pendant la capture.
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: Webcam & Facecam */}
      {activeTab === 'webcam' && (
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
                border: (options.webcamHaloColor === 'none') ? 'none' : `3px solid ${options.webcamHaloColor || '#8b5cf6'}`, 
                backgroundColor: '#0a0a0a',
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
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover', 
                      transform: (options.webcamMirrorMode !== false) ? 'scaleX(-1)' : 'none' 
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>
                    Aperçu caméra
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Shortcuts Cheatsheet */}
      {activeTab === 'shortcuts' && (
        <div className="glass-panel settings-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 className="settings-card-title" style={{ fontSize: '15px', marginBottom: '4px' }}>
            <Keyboard size={18} className="logo-icon-inline" style={{ verticalAlign: 'middle', marginRight: '8px' }} />
            Raccourcis Clavier Globaux (Actifs partout sur Windows)
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Zoom Dynamique</span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Zoome instantanément sur la souris</span>
              </div>
              <span className="shortcut-badge" style={{ fontSize: '11px', padding: '4px 8px' }}>F9 / Alt + Z</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Feutre & Dessin</span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Fige l'écran pour annoter / flécher</span>
              </div>
              <span className="shortcut-badge" style={{ fontSize: '11px', padding: '4px 8px' }}>F8 / Alt + D</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Effacer les Dessins</span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Supprime tous les traits tracés</span>
              </div>
              <span className="shortcut-badge" style={{ fontSize: '11px', padding: '4px 8px' }}>F10 / Alt + C</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Quitter le Feutre</span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Reprend le tutoriel interactif</span>
              </div>
              <span className="shortcut-badge" style={{ fontSize: '11px', padding: '4px 8px' }}>Échap</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
