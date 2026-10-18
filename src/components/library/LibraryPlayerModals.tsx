import { useState } from 'react';
import { 
  X, 
  Download, 
  Clock, 
  Scissors, 
  Type, 
  ShieldAlert, 
  Layers, 
  Sparkles, 
  Music 
} from 'lucide-react';
import type { SavedMedia } from '../../utils/db';

interface LibraryPlayerModalsProps {
  activeVideo: SavedMedia | null;
  activeImage: SavedMedia | null;
  activeAudio: SavedMedia | null;
  onCloseVideo: () => void;
  onCloseImage: () => void;
  onCloseAudio: () => void;
  onDownload: (media: SavedMedia) => void;
  onOpenTrimmer: (video: SavedMedia) => void;
  onOpenSubtitles: (video: SavedMedia) => void;
  onOpenRedact: (video: SavedMedia) => void;
  onOpenFrame: (video: SavedMedia) => void;
  onOpenGif: (video: SavedMedia) => void;
}

export function LibraryPlayerModals({
  activeVideo,
  activeImage,
  activeAudio,
  onCloseVideo,
  onCloseImage,
  onCloseAudio,
  onDownload,
  onOpenTrimmer,
  onOpenSubtitles,
  onOpenRedact,
  onOpenFrame,
  onOpenGif
}: LibraryPlayerModalsProps) {
  const [playbackRate, setPlaybackRate] = useState(1);

  const formatDuration = (totalSeconds: number) => {
    if (!totalSeconds || totalSeconds <= 0) return '00:00';
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Octets';
    const k = 1024;
    const dm = 1;
    const sizes = ['Octets', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <>
      {/* Video Player Modal */}
      {activeVideo && (
        <div className="modal-overlay" onClick={onCloseVideo}>
          <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{activeVideo.title}</h3>
              <button className="close-btn" onClick={onCloseVideo}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-player-container">
              <video
                key={activeVideo.id}
                src={URL.createObjectURL(activeVideo.blob)}
                className="modal-player"
                controls
                autoPlay
                ref={(el) => {
                  if (el) el.playbackRate = playbackRate;
                }}
              />
            </div>

            <div className="modal-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <Clock size={16} />
                  Vitesse :
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      className={`btn-secondary`}
                      style={{ 
                        padding: '4px 8px', 
                        fontSize: '12px',
                        background: playbackRate === rate ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                        borderColor: playbackRate === rate ? 'var(--primary)' : 'var(--border-color)',
                        color: playbackRate === rate ? 'white' : 'var(--text-primary)'
                      }}
                      onClick={() => {
                        setPlaybackRate(rate);
                        const videoEl = document.querySelector('.modal-player') as HTMLVideoElement;
                        if (videoEl) videoEl.playbackRate = rate;
                      }}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    const v = activeVideo;
                    onCloseVideo();
                    onOpenTrimmer(v);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Scissors size={15} />
                  <span>Rogner</span>
                </button>

                <button
                  className="btn-secondary"
                  onClick={() => {
                    const v = activeVideo;
                    onCloseVideo();
                    onOpenSubtitles(v);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fde047', borderColor: 'rgba(253, 224, 71, 0.4)' }}
                >
                  <Type size={15} />
                  <span>Sous-titres</span>
                </button>

                <button
                  className="btn-secondary"
                  onClick={() => {
                    const v = activeVideo;
                    onCloseVideo();
                    onOpenRedact(v);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f43f5e', borderColor: 'rgba(244, 63, 94, 0.4)' }}
                >
                  <ShieldAlert size={15} />
                  <span>Auto-Redact</span>
                </button>

                <button
                  className="btn-secondary"
                  onClick={() => {
                    const v = activeVideo;
                    onCloseVideo();
                    onOpenFrame(v);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                >
                  <Layers size={15} />
                  <span>Cadre</span>
                </button>

                <button
                  className="btn-secondary"
                  onClick={() => {
                    const v = activeVideo;
                    onCloseVideo();
                    onOpenGif(v);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c084fc', borderColor: 'rgba(192, 132, 252, 0.4)' }}
                >
                  <Sparkles size={15} />
                  <span>Créer un GIF</span>
                </button>

                <button className="btn-primary" onClick={() => onDownload(activeVideo)}>
                  <Download size={16} /> Télécharger
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {activeImage && (
        <div className="modal-overlay" onClick={onCloseImage}>
          <div className="glass-panel image-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="media-type-badge image">🖼️ IMAGE</span>
                <h3 className="modal-title">{activeImage.title}</h3>
              </div>
              <button className="close-btn" onClick={onCloseImage}>
                <X size={20} />
              </button>
            </div>

            <div className="image-lightbox-body">
              <img 
                src={URL.createObjectURL(activeImage.blob)} 
                alt={activeImage.title} 
                className="image-lightbox-preview" 
              />
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {activeImage.width && activeImage.height && `${activeImage.width} × ${activeImage.height} px • `}
                {formatSize(activeImage.size)}
              </div>
              <button className="btn-primary" onClick={() => onDownload(activeImage)}>
                <Download size={15} /> Télécharger l'image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audio Player Modal */}
      {activeAudio && (
        <div className="modal-overlay" onClick={onCloseAudio}>
          <div className="glass-panel audio-player-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="media-type-badge audio">🎵 AUDIO</span>
                <h3 className="modal-title">{activeAudio.title}</h3>
              </div>
              <button className="close-btn" onClick={onCloseAudio}>
                <X size={20} />
              </button>
            </div>

            <div className="audio-modal-body">
              <div className="audio-visual-circle">
                <Music size={44} className="audio-spin-icon" />
              </div>
              <h4 style={{ margin: '14px 0 4px 0', fontSize: '16px' }}>{activeAudio.title}</h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                Durée : {formatDuration(activeAudio.duration || 0)} • {formatSize(activeAudio.size)}
              </p>

              <audio 
                src={URL.createObjectURL(activeAudio.blob)} 
                controls 
                autoPlay 
                className="audio-html-player" 
              />
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 20px' }}>
              <button className="btn-primary" onClick={() => onDownload(activeAudio)}>
                <Download size={15} /> Télécharger l'audio
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
