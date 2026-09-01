import { useEffect, useState } from 'react';
import { getAllRecordings, deleteRecording, renameRecording, type SavedVideo } from '../utils/db';
import { Play, Trash2, Download, Edit2, Film, Calendar, HardDrive, Check, X, Clock, Scissors } from 'lucide-react';
import { VideoTrimmerModal } from './VideoTrimmerModal';

interface VideoLibraryProps {
  refreshTrigger: number;
}

export function VideoLibrary({ refreshTrigger }: VideoLibraryProps) {
  const [recordings, setRecordings] = useState<SavedVideo[]>([]);
  const [activeVideo, setActiveVideo] = useState<SavedVideo | null>(null);
  const [trimmingVideo, setTrimmingVideo] = useState<SavedVideo | null>(null);
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
                <button className="action-btn" onClick={() => setActiveVideo(video)}>
                  <Play size={14} fill="currentColor" /> Play
                </button>
                <button className="action-btn" onClick={() => setTrimmingVideo(video)} title="Rogner le début ou la fin de la vidéo">
                  <Scissors size={14} /> Rogner
                </button>
                <button className="action-btn download" onClick={() => handleDownload(video)}>
                  <Download size={14} /> Télécharger
                </button>
                <button className="action-btn delete" onClick={() => handleDelete(video.id)}>
                  <Trash2 size={14} /> Supprimer
                </button>
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
                  <span>Rogner la vidéo</span>
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
    </div>
  );
}
