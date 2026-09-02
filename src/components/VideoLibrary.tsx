import { useEffect, useState } from 'react';
import { getAllRecordings, deleteRecording, renameRecording, type SavedVideo } from '../utils/db';
import { Play, Trash2, Download, Edit2, Film, Calendar, HardDrive, Check, X, Clock, Scissors, Sparkles, Layers, ShieldAlert, Type } from 'lucide-react';
import { VideoTrimmerModal } from './VideoTrimmerModal';
import { GifExportModal } from './GifExportModal';
import { DeviceFrameModal } from './DeviceFrameModal';
import { AutoRedactModal } from './AutoRedactModal';
import { SubtitlesStudioModal } from './SubtitlesStudioModal';

interface VideoLibraryProps {
  refreshTrigger: number;
}

export function VideoLibrary({ refreshTrigger }: VideoLibraryProps) {
  const [recordings, setRecordings] = useState<SavedVideo[]>([]);
  const [activeVideo, setActiveVideo] = useState<SavedVideo | null>(null);
  const [trimmingVideo, setTrimmingVideo] = useState<SavedVideo | null>(null);
  const [gifModalVideo, setGifModalVideo] = useState<SavedVideo | null>(null);
  const [frameModalVideo, setFrameModalVideo] = useState<SavedVideo | null>(null);
  const [redactModalVideo, setRedactModalVideo] = useState<SavedVideo | null>(null);
  const [subtitlesModalVideo, setSubtitlesModalVideo] = useState<SavedVideo | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [playbackRate, setPlaybackRate] = useState(1);

  const loadRecordings = async () => {
    const list = await getAllRecordings();
    setRecordings(list);
  };

  useEffect(() => {
    loadRecordings();
  }, [refreshTrigger]);

  const handleDelete = async (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer cet enregistrement ?')) {
      await deleteRecording(id);
      loadRecordings();
    }
  };

  const handleDownload = (video: SavedVideo) => {
    const url = URL.createObjectURL(video.blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Determine extension from MIME type
    let extension = 'webm';
    if (video.blob.type.includes('mp4')) {
      extension = 'mp4';
    }
    
    // Cleanup title for filename
    const cleanTitle = video.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `${cleanTitle}.${extension}`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const startEditing = (video: SavedVideo) => {
    setEditingId(video.id);
    setEditTitle(video.title);
  };

  const saveRename = async (id: string) => {
    if (editTitle.trim()) {
      await renameRecording(id, editTitle.trim());
      setEditingId(null);
      loadRecordings();
    }
  };

  // Helper formats
  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['octets', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <div className="library-grid">
        {recordings.map((video) => (
          <div key={video.id} className="glass-panel video-card">
            <div className="video-thumbnail-container" onClick={() => setActiveVideo(video)}>
              {video.thumbnail ? (
                <img src={video.thumbnail} alt={video.title} className="video-thumbnail" />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  <Film size={32} />
                </div>
              )}
              <span className="video-duration">
                {formatDuration(video.duration)}
              </span>
            </div>

            <div className="video-card-info">
              {editingId === video.id ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ flexGrow: 1, padding: '4px 8px', fontSize: '14px' }}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                  <button className="control-icon-btn" style={{ width: '32px', height: '32px' }} onClick={() => saveRename(video.id)}>
                    <Check size={14} style={{ color: 'var(--success)' }} />
                  </button>
                  <button className="control-icon-btn" style={{ width: '32px', height: '32px' }} onClick={() => setEditingId(null)}>
                    <X size={14} style={{ color: 'var(--accent)' }} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span className="video-card-title" title={video.title}>
                    {video.title}
                  </span>
                  <button 
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    onClick={() => startEditing(video)}
                    title="Renommer la vidéo"
                  >
                    <Edit2 size={13} />
                  </button>
                </div>
              )}

              <div className="video-card-meta">
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={12} />
                  {formatDate(video.date)}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <HardDrive size={12} />
                  {formatSize(video.size)}
                </span>
              </div>

              <div className="video-card-actions">
                <div className="video-card-main-actions">
                  <button className="btn-card-play" onClick={() => setActiveVideo(video)}>
                    <Play size={13} fill="currentColor" />
                    <span>Lire</span>
                  </button>

                  <button 
                    className="btn-card-icon download" 
                    onClick={() => handleDownload(video)} 
                    title="Télécharger la vidéo (WebM)"
                  >
                    <Download size={14} />
                  </button>

                  <button 
                    className="btn-card-icon delete" 
                    onClick={() => handleDelete(video.id)} 
                    title="Supprimer la vidéo"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="video-card-tools-grid">
                  <button 
                    className="video-card-tool-btn trim" 
                    onClick={() => setTrimmingVideo(video)} 
                    title="Rogner les extrémités"
                  >
                    <Scissors size={13} />
                    <span>Rogner</span>
                  </button>

                  <button 
                    className="video-card-tool-btn subtitles" 
                    onClick={() => setSubtitlesModalVideo(video)} 
                    title="Sous-titres & Captions TikTok"
                  >
                    <Type size={13} />
                    <span>Sous-titres</span>
                  </button>

                  <button 
                    className="video-card-tool-btn redact" 
                    onClick={() => setRedactModalVideo(video)} 
                    title="Flouter les secrets (Auto-Redact)"
                  >
                    <ShieldAlert size={13} />
                    <span>Flouter</span>
                  </button>

                  <button 
                    className="video-card-tool-btn frame" 
                    onClick={() => setFrameModalVideo(video)} 
                    title="Cadre & Formats réseaux (9:16, 16:9)"
                  >
                    <Layers size={13} />
                    <span>Cadre</span>
                  </button>

                  <button 
                    className="video-card-tool-btn gif" 
                    onClick={() => setGifModalVideo(video)} 
                    title="Créer un GIF animé"
                  >
                    <Sparkles size={13} />
                    <span>GIF</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {recordings.length === 0 && (
        <div className="glass-panel empty-state">
          <div className="empty-state-icon">
            <Film size={32} />
          </div>
          <h3>Aucun enregistrement trouvé</h3>
          <p>Démarrer une capture dans le Tableau de Bord pour enregistrer votre premier tutoriel.</p>
        </div>
      )}

      {/* Video Player Modal overlay */}
      {activeVideo && (
        <div className="modal-overlay" onClick={() => setActiveVideo(null)}>
          <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{activeVideo.title}</h3>
              <button className="close-btn" onClick={() => setActiveVideo(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-player-container">
              <video
                key={activeVideo.id} // force re-render when video changes
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

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    const v = activeVideo;
                    setActiveVideo(null);
                    setTrimmingVideo(v);
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
                    setActiveVideo(null);
                    setSubtitlesModalVideo(v);
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
                    setActiveVideo(null);
                    setRedactModalVideo(v);
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
                    setActiveVideo(null);
                    setFrameModalVideo(v);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                >
                  <Layers size={15} />
                  <span>Habillage & Réseaux</span>
                </button>

                <button
                  className="btn-secondary"
                  onClick={() => {
                    const v = activeVideo;
                    setActiveVideo(null);
                    setGifModalVideo(v);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c084fc', borderColor: 'rgba(192, 132, 252, 0.4)' }}
                >
                  <Sparkles size={15} />
                  <span>Créer un GIF</span>
                </button>

                <button className="btn-primary" onClick={() => handleDownload(activeVideo)}>
                  <Download size={16} /> Télécharger
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Trimmer Modal */}
      {trimmingVideo && (
        <VideoTrimmerModal
          video={trimmingVideo}
          onClose={() => setTrimmingVideo(null)}
          onTrimComplete={() => {
            loadRecordings();
          }}
        />
      )}

      {/* GIF Generator Modal */}
      {gifModalVideo && (
        <GifExportModal
          video={gifModalVideo}
          onClose={() => setGifModalVideo(null)}
          onSavedToLibrary={() => {
            loadRecordings();
          }}
        />
      )}

      {/* Device Frame & Gradient Canvas Modal */}
      {frameModalVideo && (
        <DeviceFrameModal
          video={frameModalVideo}
          onClose={() => setFrameModalVideo(null)}
          onSavedToLibrary={() => {
            loadRecordings();
          }}
        />
      )}

      {/* Auto-Redact Modal */}
      {redactModalVideo && (
        <AutoRedactModal
          video={redactModalVideo}
          onClose={() => setRedactModalVideo(null)}
          onSavedToLibrary={() => {
            loadRecordings();
          }}
        />
      )}

      {/* Subtitles Studio Modal */}
      {subtitlesModalVideo && (
        <SubtitlesStudioModal
          video={subtitlesModalVideo}
          onClose={() => setSubtitlesModalVideo(null)}
          onSavedToLibrary={() => {
            loadRecordings();
          }}
        />
      )}
    </div>
  );
}
