import { useState } from 'react';
import { 
  Play, 
  Trash2, 
  Download, 
  Edit2, 
  Film, 
  Calendar, 
  Check, 
  X, 
  Scissors, 
  Sparkles, 
  Layers, 
  ShieldAlert, 
  Type, 
  FolderPlus, 
  Music, 
  Image as ImageIcon, 
  Volume2, 
  Maximize2,
  BookOpen
} from 'lucide-react';
import type { SavedMedia, MediaProject } from '../../utils/db';

interface LibraryMediaCardProps {
  media: SavedMedia;
  associatedProject?: MediaProject;
  onPlayMedia: (media: SavedMedia) => void;
  onDownload: (media: SavedMedia) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onAssignProject: (media: SavedMedia) => void;
  onTrim: (media: SavedMedia) => void;
  onSubtitles: (media: SavedMedia) => void;
  onRedact: (media: SavedMedia) => void;
  onFrame: (media: SavedMedia) => void;
  onGif: (media: SavedMedia) => void;
  onTutorial: (media: SavedMedia) => void;
}

export function LibraryMediaCard({
  media,
  associatedProject,
  onPlayMedia,
  onDownload,
  onDelete,
  onRename,
  onAssignProject,
  onTrim,
  onSubtitles,
  onRedact,
  onFrame,
  onGif,
  onTutorial
}: LibraryMediaCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(media.title);

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

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const saveRename = () => {
    if (editTitle.trim()) {
      onRename(media.id, editTitle.trim());
      setIsEditing(false);
    }
  };

  return (
    <div className="glass-panel video-card media-card">
      {/* Media Thumbnail / Preview Container */}
      <div 
        className="video-thumbnail-container" 
        onClick={() => onPlayMedia(media)}
      >
        {media.thumbnail ? (
          <img src={media.thumbnail} alt={media.title} className="video-thumbnail" />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            {media.type === 'image' && <ImageIcon size={36} />}
            {media.type === 'audio' && <Music size={36} />}
            {media.type === 'video' && <Film size={36} />}
          </div>
        )}

        {/* Media Type Badge in Top Left */}
        <span className={`media-type-badge ${media.type}`}>
          {media.type === 'video' && <>📹 VIDÉO</>}
          {media.type === 'image' && <>🖼️ IMAGE</>}
          {media.type === 'audio' && <>🎵 AUDIO</>}
        </span>

        {/* Duration Badge in Bottom Right */}
        {(media.duration || 0) > 0 && (
          <span className="video-duration">
            {formatDuration(media.duration || 0)}
          </span>
        )}

        {/* Dimensions Badge if image */}
        {media.type === 'image' && media.width && media.height && (
          <span className="video-duration" style={{ background: 'rgba(15, 23, 42, 0.85)' }}>
            {media.width} × {media.height}
          </span>
        )}
      </div>

      {/* Card Information */}
      <div className="video-card-info">
        {/* Title and Rename */}
        {isEditing ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              className="form-input"
              style={{ flexGrow: 1, padding: '4px 8px', fontSize: '14px' }}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              autoFocus
            />
            <button className="control-icon-btn" style={{ width: '30px', height: '30px' }} onClick={saveRename}>
              <Check size={14} style={{ color: 'var(--success)' }} />
            </button>
            <button className="control-icon-btn" style={{ width: '30px', height: '30px' }} onClick={() => setIsEditing(false)}>
              <X size={14} style={{ color: 'var(--accent)' }} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <span className="video-card-title" title={media.title}>
              {media.title}
            </span>
            <button 
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              onClick={() => {
                setEditTitle(media.title);
                setIsEditing(true);
              }}
              title="Renommer l'élément"
            >
              <Edit2 size={13} />
            </button>
          </div>
        )}

        {/* Project Tag & Date */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
          {associatedProject ? (
            <span 
              className="media-project-tag"
              style={{ borderColor: `${associatedProject.color}50`, color: associatedProject.color, background: `${associatedProject.color}15` }}
              onClick={() => onAssignProject(media)}
              title="Changer de projet"
            >
              <span className="project-color-dot" style={{ backgroundColor: associatedProject.color, width: '6px', height: '6px' }} />
              {associatedProject.name}
            </span>
          ) : (
            <button 
              className="btn-assign-quick" 
              onClick={() => onAssignProject(media)}
              title="Classer dans un projet"
            >
              <FolderPlus size={11} />
              <span>Classer</span>
            </button>
          )}

          <span style={{ color: 'var(--text-muted)' }}>
            {formatSize(media.size)}
          </span>
        </div>

        <div className="video-card-meta">
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={12} />
            {formatDate(media.date)}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="video-card-actions">
          <div className="video-card-main-actions">
            <button 
              className="btn-card-play" 
              onClick={() => onPlayMedia(media)}
            >
              {media.type === 'video' && <><Play size={13} fill="currentColor" /><span>Lire</span></>}
              {media.type === 'image' && <><Maximize2 size={13} /><span>Aperçu</span></>}
              {media.type === 'audio' && <><Volume2 size={13} /><span>Écouter</span></>}
            </button>

            <button 
              className="btn-card-icon download" 
              onClick={() => onDownload(media)} 
              title="Télécharger le fichier"
            >
              <Download size={14} />
            </button>

            <button 
              className="btn-card-icon delete" 
              onClick={() => onDelete(media.id)} 
              title="Supprimer cet élément"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Video-Specific Tools */}
          {media.type === 'video' && (
            <div className="video-card-tools-grid">
              <button 
                className="video-card-tool-btn trim" 
                onClick={() => onTrim(media)} 
                title="Rogner les extrémités"
              >
                <Scissors size={13} />
                <span>Rogner</span>
              </button>

              <button 
                className="video-card-tool-btn subtitles" 
                onClick={() => onSubtitles(media)} 
                title="Sous-titres & Captions TikTok"
              >
                <Type size={13} />
                <span>Sous-titres</span>
              </button>

              <button 
                className="video-card-tool-btn redact" 
                onClick={() => onRedact(media)} 
                title="Flouter les secrets (Auto-Redact)"
              >
                <ShieldAlert size={13} />
                <span>Flouter</span>
              </button>

              <button 
                className="video-card-tool-btn frame" 
                onClick={() => onFrame(media)} 
                title="Cadre & Formats réseaux (9:16, 16:9)"
              >
                <Layers size={13} />
                <span>Cadre</span>
              </button>

              <button 
                className="video-card-tool-btn gif" 
                onClick={() => onGif(media)} 
                title="Créer un GIF animé"
              >
                <Sparkles size={13} />
                <span>GIF</span>
              </button>

              <button 
                className="video-card-tool-btn guide" 
                onClick={() => onTutorial(media)} 
                title="Créer un Guide Pas-à-Pas (Markdown, HTML, PDF)"
              >
                <BookOpen size={13} />
                <span>Guide</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
