import { useState, useRef, useEffect } from 'react';
import { type SavedVideo, saveRecording } from '../utils/db';
import { X, Scissors, Play, Pause, RotateCcw, Check, Download, Sparkles, Layers, Type } from 'lucide-react';
import { GifExportModal } from './GifExportModal';
import { DeviceFrameModal } from './DeviceFrameModal';
import { SubtitlesStudioModal } from './SubtitlesStudioModal';
import { SilenceRemoverModal } from './SilenceRemoverModal';

interface VideoTrimmerModalProps {
  video: SavedVideo;
  onClose: () => void;
  onTrimComplete: () => void;
}

export function VideoTrimmerModal({ video, onClose, onTrimComplete }: VideoTrimmerModalProps) {
  const [videoDuration, setVideoDuration] = useState(video.duration || 10);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(video.duration || 10);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [trimmedBlob, setTrimmedBlob] = useState<Blob | null>(null);
  const [showGifModal, setShowGifModal] = useState(false);
  const [showFrameModal, setShowFrameModal] = useState(false);
  const [showSubtitlesModal, setShowSubtitlesModal] = useState(false);
  const [showSilenceModal, setShowSilenceModal] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrlRef = useRef<string>(URL.createObjectURL(video.blob));

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (videoUrlRef.current) {
        URL.revokeObjectURL(videoUrlRef.current);
      }
    };
  }, []);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      if (dur && isFinite(dur) && dur > 0) {
        setVideoDuration(dur);
        setEndTime(dur);
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

  // Perform client-side video trimming via Canvas & Web Audio / MediaStream recording
  const handleProcessTrim = async () => {
    if (startTime >= endTime) {
      alert('Le point de début doit être inférieur au point de fin.');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      const processVideo = document.createElement('video');
      processVideo.src = videoUrlRef.current;
      processVideo.muted = false;
      processVideo.playsInline = true;

      await new Promise((resolve) => {
        processVideo.onloadedmetadata = resolve;
      });

      const width = processVideo.videoWidth || 1920;
      const height = processVideo.videoHeight || 1080;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      const canvasStream = canvas.captureStream(30);
      
      // Audio capture pipeline
      let combinedStream = canvasStream;
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioCtx.createMediaElementSource(processVideo);
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        source.connect(audioCtx.destination);
        if (dest.stream.getAudioTracks().length > 0) {
          combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...dest.stream.getAudioTracks()
          ]);
        }
      } catch (e) {
        // Fallback video-only stream
      }

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm'
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const durationToProcess = endTime - startTime;

      await new Promise<void>((resolve, reject) => {
        recorder.onstop = () => resolve();
        recorder.onerror = reject;

        processVideo.currentTime = startTime;
        processVideo.onseeked = () => {
          recorder.start(100);
          processVideo.play();

          let animationFrameId: number;
          const drawFrame = () => {
            if (processVideo.currentTime >= endTime || processVideo.ended) {
              cancelAnimationFrame(animationFrameId);
              processVideo.pause();
              recorder.stop();
              return;
            }

            if (ctx) {
              ctx.drawImage(processVideo, 0, 0, width, height);
            }

            const currentElapsed = processVideo.currentTime - startTime;
            const pct = Math.min(100, Math.round((currentElapsed / durationToProcess) * 100));
            setProgress(pct);

            animationFrameId = requestAnimationFrame(drawFrame);
          };

          animationFrameId = requestAnimationFrame(drawFrame);
        };
      });

      const finalBlob = new Blob(chunks, { type: 'video/webm' });
      setTrimmedBlob(finalBlob);
      setProgress(100);

      // Generate thumbnail
      let thumbUrl = '';
      if (ctx) {
        thumbUrl = canvas.toDataURL('image/jpeg', 0.8);
      }

      // Save to IndexedDB
      await saveRecording({
        id: crypto.randomUUID ? crypto.randomUUID() : `vid_${Date.now()}`,
        title: `${video.title} (Extrait)`,
        blob: finalBlob,
        thumbnail: thumbUrl,
        duration: Math.round(durationToProcess),
        size: finalBlob.size,
        date: new Date().toISOString()
      });

      onTrimComplete();
    } catch (err) {
      alert("Erreur lors de la découpe de la vidéo.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadTrimmed = () => {
    if (!trimmedBlob) return;
    const url = URL.createObjectURL(trimmedBlob);
    const a = document.createElement('a');
    a.href = url;
    const cleanTitle = `${video.title}_cut`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `${cleanTitle}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ padding: '12px' }}>
      <div 
        className="glass-panel modal-content" 
        style={{ 
          maxWidth: '720px', 
          width: '95%', 
          maxHeight: '94vh', 
          overflowY: 'auto', 
          padding: '14px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ marginBottom: 0, paddingBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scissors size={18} color="#a855f7" />
            <h3 className="modal-title" style={{ fontSize: '16px' }}>Studio de Découpe : {video.title}</h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Video Player Preview - Compact 180px height */}
        <div 
          className="modal-player-container" 
          style={{ 
            position: 'relative', 
            maxHeight: '190px', 
            height: '190px', 
            backgroundColor: '#000', 
            borderRadius: '8px', 
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
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
        </div>

        {/* Timeline & Dual Sliders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Custom Timeline visual bar */}
          <div style={{ position: 'relative', height: '20px', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '6px', overflow: 'hidden' }}>
            {/* Active cut slice highlight */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${(startTime / videoDuration) * 100}%`,
                width: `${((endTime - startTime) / videoDuration) * 100}%`,
                background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.45), rgba(6, 182, 212, 0.45))',
                borderLeft: '3px solid #8b5cf6',
                borderRight: '3px solid #06b6d4'
              }}
            />

            {/* Current Playhead Scrubber */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${(currentTime / videoDuration) * 100}%`,
                width: '2px',
                backgroundColor: '#ffffff',
                boxShadow: '0 0 8px #ffffff'
              }}
            />
          </div>

          {/* Time Sliders */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Start Time control */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#c084fc', fontWeight: 600 }}>🟢 Début (In)</span>
                <span style={{ fontSize: '13px', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{formatTime(startTime)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={videoDuration}
                step={0.1}
                value={startTime}
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
                <button className="btn-toolbar" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => { const v = Math.max(0, startTime - 1); setStartTime(v); seekTo(v); }}>-1s</button>
                <button className="btn-toolbar" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => { const v = Math.max(0, startTime - 0.2); setStartTime(v); seekTo(v); }}>-0.2s</button>
                <button className="btn-toolbar" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => { const v = Math.min(endTime - 0.5, startTime + 0.2); setStartTime(v); seekTo(v); }}>+0.2s</button>
                <button className="btn-toolbar" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => { const v = Math.min(endTime - 0.5, startTime + 1); setStartTime(v); seekTo(v); }}>+1s</button>
              </div>
            </div>

            {/* End Time control */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#06b6d4', fontWeight: 600 }}>🔴 Fin (Out)</span>
                <span style={{ fontSize: '13px', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{formatTime(endTime)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={videoDuration}
                step={0.1}
                value={endTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (val > startTime) {
                    setEndTime(val);
                    seekTo(val);
                  }
                }}
                style={{ width: '100%', accentColor: '#06b6d4', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className="btn-toolbar" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => { const v = Math.max(startTime + 0.5, endTime - 1); setEndTime(v); seekTo(v); }}>-1s</button>
                <button className="btn-toolbar" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => { const v = Math.max(startTime + 0.5, endTime - 0.2); setEndTime(v); seekTo(v); }}>-0.2s</button>
                <button className="btn-toolbar" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => { const v = Math.min(videoDuration, endTime + 0.2); setEndTime(v); seekTo(v); }}>+0.2s</button>
                <button className="btn-toolbar" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => { const v = Math.min(videoDuration, endTime + 1); setEndTime(v); seekTo(v); }}>+1s</button>
              </div>
            </div>
          </div>

          {/* Duration Summary */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span>Extrait sélectionné : <strong style={{ color: 'var(--text-primary)' }}>{formatTime(Math.max(0, endTime - startTime))}</strong></span>
            <button className="btn-toolbar" style={{ padding: '3px 8px', fontSize: '11px' }} onClick={() => seekTo(startTime)}>
              <RotateCcw size={12} />
              <span>Rejouer début</span>
            </button>
          </div>

          {/* Processing Progress Bar */}
          {isProcessing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span>Découpage et ré-encodage en cours...</span>
                <span>{progress}%</span>
              </div>
              <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)', transition: 'width 0.1s linear' }} />
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="modal-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '4px' }}>
          <button className="action-btn" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={onClose} disabled={isProcessing}>
            Fermer
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn-secondary"
              onClick={() => setShowSilenceModal(true)}
              disabled={isProcessing}
              style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
              title="Détecter et couper les silences"
            >
              <Scissors size={14} />
              <span>Silences</span>
            </button>

            <button
              className="btn-secondary"
              onClick={() => setShowSubtitlesModal(true)}
              disabled={isProcessing}
              style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#fde047', borderColor: 'rgba(253, 224, 71, 0.4)' }}
            >
              <Type size={14} />
              <span>Sous-titres</span>
            </button>

            <button
              className="btn-secondary"
              onClick={() => setShowFrameModal(true)}
              disabled={isProcessing}
              style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
            >
              <Layers size={14} />
              <span>Habillage & Cadre</span>
            </button>

            <button
              className="btn-secondary"
              onClick={() => setShowGifModal(true)}
              disabled={isProcessing}
              style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#c084fc', borderColor: 'rgba(192, 132, 252, 0.4)' }}
            >
              <Sparkles size={14} />
              <span>Exporter en GIF</span>
            </button>

            {trimmedBlob && (
              <button className="btn-secondary" onClick={handleDownloadTrimmed} style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Download size={14} />
                <span>Télécharger</span>
              </button>
            )}

            <button
              className="btn-primary"
              onClick={handleProcessTrim}
              disabled={isProcessing}
              style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {isProcessing ? <Sparkles size={14} className="spinning" /> : <Check size={14} />}
              <span>{trimmedBlob ? 'Ré-enregistrer' : 'Sauvegarder extrait découpé'}</span>
            </button>
          </div>
        </div>
      </div>

      {showGifModal && (
        <GifExportModal
          video={video}
          onClose={() => setShowGifModal(false)}
          onSavedToLibrary={() => {
            onTrimComplete();
          }}
        />
      )}

      {showFrameModal && (
        <DeviceFrameModal
          video={video}
          onClose={() => setShowFrameModal(false)}
          onSavedToLibrary={() => {
            onTrimComplete();
          }}
        />
      )}

      {showSubtitlesModal && (
        <SubtitlesStudioModal
          video={video}
          onClose={() => setShowSubtitlesModal(false)}
          onSavedToLibrary={() => {
            onTrimComplete();
          }}
        />
      )}

      {showSilenceModal && (
        <SilenceRemoverModal
          video={video}
          onClose={() => setShowSilenceModal(false)}
          onApplySegments={(segments) => {
            if (segments.length > 0) {
              setStartTime(segments[0].start);
              setEndTime(segments[segments.length - 1].end);
              seekTo(segments[0].start);
            }
            setShowSilenceModal(false);
          }}
        />
      )}
    </div>
  );
}
