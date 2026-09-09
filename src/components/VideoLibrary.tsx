import { useEffect, useState, useRef } from 'react';
import { 
  getAllMedia, 
  deleteMedia, 
  renameMedia, 
  updateMediaProject, 
  getAllMediaProjects, 
  saveMediaProject, 
  deleteMediaProject, 
  type SavedMedia, 
  type MediaProject,
  type MediaType 
} from '../utils/db';
import { importMediaFiles } from '../utils/mediaImporter';
import { 
  Play, 
  Trash2, 
  Download, 
  Edit2, 
  Film, 
  Calendar, 
  Check, 
  X, 
  Clock, 
  Scissors, 
  Sparkles, 
  Layers, 
  ShieldAlert, 
  Type, 
  Folder, 
  FolderPlus, 
  Music, 
  Image as ImageIcon, 
  Upload, 
  Search, 
  Volume2, 
  Maximize2,
  FolderOpen,
  BookOpen
} from 'lucide-react';
import { VideoTrimmerModal } from './VideoTrimmerModal';
import { GifExportModal } from './GifExportModal';
import { DeviceFrameModal } from './DeviceFrameModal';
import { AutoRedactModal } from './AutoRedactModal';
import { SubtitlesStudioModal } from './SubtitlesStudioModal';
import { TutorialMakerModal } from './TutorialMakerModal';

interface VideoLibraryProps {
  refreshTrigger: number;
}

const PROJECT_PRESET_COLORS = [
  '#8b5cf6', // Violet
  '#3b82f6', // Bleu
  '#06b6d4', // Cyan
  '#10b981', // Émeraude
  '#f59e0b', // Ambre
  '#ec4899', // Rose
  '#f43f5e', // Rouge
  '#64748b'  // Ardoise
];

export function VideoLibrary({ refreshTrigger }: VideoLibraryProps) {
  const [mediaList, setMediaList] = useState<SavedMedia[]>([]);
  const [projects, setProjects] = useState<MediaProject[]>([]);
  
  // Filters & selection
  const [selectedProjectId, setSelectedProjectId] = useState<string | 'all' | 'unassigned'>('all');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<MediaType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'title-asc' | 'size-desc'>('date-desc');

  // Drag & drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [importStatus, setImportStatus] = useState<{ current: number; total: number; filename: string } | null>(null);

  // Modals state
  const [activeVideo, setActiveVideo] = useState<SavedMedia | null>(null);
  const [activeImage, setActiveImage] = useState<SavedMedia | null>(null);
  const [activeAudio, setActiveAudio] = useState<SavedMedia | null>(null);
  
  const [trimmingVideo, setTrimmingVideo] = useState<SavedMedia | null>(null);
  const [gifModalVideo, setGifModalVideo] = useState<SavedMedia | null>(null);
  const [frameModalVideo, setFrameModalVideo] = useState<SavedMedia | null>(null);
  const [redactModalVideo, setRedactModalVideo] = useState<SavedMedia | null>(null);
  const [subtitlesModalVideo, setSubtitlesModalVideo] = useState<SavedMedia | null>(null);
  const [tutorialModalMedia, setTutorialModalMedia] = useState<SavedMedia | null>(null);
  
  // Project management modal
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<MediaProject | null>(null);
  const [projectNameInput, setProjectNameInput] = useState('');
  const [projectColorInput, setProjectColorInput] = useState('#8b5cf6');
  const [projectDescInput, setProjectDescInput] = useState('');

  // Quick project assign modal
  const [assignMedia, setAssignMedia] = useState<SavedMedia | null>(null);

  // In-card title editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [playbackRate, setPlaybackRate] = useState(1);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    const [mediaItems, projectItems] = await Promise.all([
      getAllMedia(),
      getAllMediaProjects()
    ]);
    setMediaList(mediaItems);
    setProjects(projectItems);
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  // Handle file import
  const handleFileImport = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    
    // Assign to active project if one is specifically selected
    const targetProjectId = selectedProjectId !== 'all' && selectedProjectId !== 'unassigned' ? selectedProjectId : null;

    setImportStatus({ current: 0, total: files.length, filename: 'Initialisation...' });
    try {
      await importMediaFiles(files, targetProjectId, (current, total, filename) => {
        setImportStatus({ current, total, filename });
      });
      await loadData();
    } catch (err) {
      console.error('Erreur lors de l\'import des médias:', err);
    } finally {
      setTimeout(() => setImportStatus(null), 1200);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only reset if left the outer container
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFileImport(e.dataTransfer.files);
    }
  };

  // Media deletions and renaming
  const handleDeleteMedia = async (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer cet élément de la bibliothèque ?')) {
      await deleteMedia(id);
      loadData();
    }
  };

  const handleDownload = (media: SavedMedia) => {
    const url = URL.createObjectURL(media.blob);
    const a = document.createElement('a');
    a.href = url;
    
    let extension = 'webm';
    if (media.type === 'image') {
      extension = media.mimeType?.includes('png') ? 'png' : media.mimeType?.includes('webp') ? 'webp' : 'jpg';
    } else if (media.type === 'audio') {
      extension = media.mimeType?.includes('mp3') ? 'mp3' : media.mimeType?.includes('wav') ? 'wav' : 'm4a';
    } else {
      extension = media.blob.type.includes('mp4') ? 'mp4' : 'webm';
    }
    
    const cleanTitle = media.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `${cleanTitle}.${extension}`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const startEditing = (media: SavedMedia) => {
    setEditingId(media.id);
    setEditTitle(media.title);
  };

  const saveRename = async (id: string) => {
    if (editTitle.trim()) {
      await renameMedia(id, editTitle.trim());
      setEditingId(null);
      loadData();
    }
  };

  // Project management
  const openNewProjectModal = () => {
    setEditingProject(null);
    setProjectNameInput('');
    setProjectColorInput(PROJECT_PRESET_COLORS[0]);
    setProjectDescInput('');
    setIsProjectModalOpen(true);
  };

  const openEditProjectModal = (proj: MediaProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(proj);
    setProjectNameInput(proj.name);
    setProjectColorInput(proj.color);
    setProjectDescInput(proj.description || '');
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = async () => {
    if (!projectNameInput.trim()) return;

    const projectToSave: MediaProject = {
      id: editingProject ? editingProject.id : `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: projectNameInput.trim(),
      color: projectColorInput,
      description: projectDescInput.trim() || undefined,
      date: editingProject ? editingProject.date : new Date().toISOString()
    };

    await saveMediaProject(projectToSave);
    setIsProjectModalOpen(false);
    await loadData();
    setSelectedProjectId(projectToSave.id);
  };

  const handleDeleteProject = async (proj: MediaProject, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Voulez-vous supprimer le projet "${proj.name}" ? (Les médias seront conservés dans "Non classés")`)) {
      await deleteMediaProject(proj.id, true);
      if (selectedProjectId === proj.id) {
        setSelectedProjectId('all');
      }
      loadData();
    }
  };

  const handleAssignProject = async (mediaId: string, projectId: string | null) => {
    await updateMediaProject(mediaId, projectId);
    setAssignMedia(null);
    loadData();
  };

  // Helper formats
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

  // Filter media list
  const filteredMedia = mediaList.filter((item) => {
    // Project filter
    if (selectedProjectId === 'unassigned') {
      if (item.projectId) return false;
    } else if (selectedProjectId !== 'all') {
      if (item.projectId !== selectedProjectId) return false;
    }

    // Media type filter
    if (mediaTypeFilter !== 'all' && item.type !== mediaTypeFilter) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = item.title.toLowerCase().includes(q);
      const proj = projects.find(p => p.id === item.projectId);
      const matchesProject = proj ? proj.name.toLowerCase().includes(q) : false;
      if (!matchesTitle && !matchesProject) return false;
    }

    return true;
  });

  // Sort filtered media
  filteredMedia.sort((a, b) => {
    if (sortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sortBy === 'title-asc') return a.title.localeCompare(b.title);
    if (sortBy === 'size-desc') return b.size - a.size;
    return 0;
  });

  // Counts
  const videoCount = mediaList.filter(m => m.type === 'video').length;
  const imageCount = mediaList.filter(m => m.type === 'image').length;
  const audioCount = mediaList.filter(m => m.type === 'audio').length;
  const unassignedCount = mediaList.filter(m => !m.projectId).length;

  return (
    <div 
      className={`library-wrapper ${isDraggingOver ? 'drag-over-active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ position: 'relative', minHeight: '80vh' }}
    >
      {/* Hidden file input for import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        multiple 
        accept="video/*,image/*,audio/*,.mkv,.avi,.mov,.mp4,.webm,.flac,.wav,.mp3,.aac,.ogg,.png,.jpg,.jpeg,.webp,.gif,.svg"
        onChange={(e) => {
          if (e.target.files) handleFileImport(e.target.files);
        }}
      />

      {/* Drag & Drop Neon Backdrop Overlay */}
      {isDraggingOver && (
        <div className="library-drag-overlay">
          <div className="library-drag-box">
            <Upload size={54} className="drag-bounce-icon" />
            <h3>Déposez vos fichiers pour les importer</h3>
            <p>Supporte Vidéos (MP4, WebM, MOV), Images (PNG, JPG, WebP, GIF) et Audios (MP3, WAV, M4A)</p>
          </div>
        </div>
      )}

      {/* Import Progress Notification Bar */}
      {importStatus && (
        <div className="import-progress-banner glass-panel">
          <div className="import-progress-spin" />
          <div style={{ flexGrow: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
              <span>Importation de {importStatus.filename}</span>
              <span>{importStatus.current} / {importStatus.total}</span>
            </div>
            <div className="import-progress-track">
              <div 
                className="import-progress-fill" 
                style={{ width: `${Math.round((importStatus.current / importStatus.total) * 100)}%` }} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Projects Bar & Import Action */}
      <div className="glass-panel library-header-panel" style={{ marginBottom: '20px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          
          {/* Projects Navigation Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flexGrow: 1 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '4px' }}>
              <Folder size={16} style={{ color: 'var(--primary)' }} />
              Dossiers & Projets :
            </span>

            {/* Tous */}
            <button
              className={`project-pill ${selectedProjectId === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedProjectId('all')}
            >
              <span>Tous les médias</span>
              <span className="project-pill-badge">{mediaList.length}</span>
            </button>

            {/* Non classés */}
            <button
              className={`project-pill ${selectedProjectId === 'unassigned' ? 'active' : ''}`}
              onClick={() => setSelectedProjectId('unassigned')}
            >
              <FolderOpen size={13} style={{ opacity: 0.7 }} />
              <span>Non classés</span>
              <span className="project-pill-badge">{unassignedCount}</span>
            </button>

            {/* User Projects */}
            {projects.map((proj) => {
              const count = mediaList.filter(m => m.projectId === proj.id).length;
              const isSelected = selectedProjectId === proj.id;
              return (
                <div key={proj.id} className="project-pill-wrapper">
                  <button
                    className={`project-pill ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedProjectId(proj.id)}
                    style={{
                      borderColor: isSelected ? proj.color : 'transparent',
                      background: isSelected ? `${proj.color}25` : undefined
                    }}
                  >
                    <span className="project-color-dot" style={{ backgroundColor: proj.color }} />
                    <span className="project-pill-name">{proj.name}</span>
                    <span className="project-pill-badge" style={{ backgroundColor: isSelected ? `${proj.color}50` : undefined }}>
                      {count}
                    </span>
                  </button>

                  <div className="project-pill-actions">
                    <button 
                      className="project-action-btn" 
                      title="Modifier le projet"
                      onClick={(e) => openEditProjectModal(proj, e)}
                    >
                      <Edit2 size={11} />
                    </button>
                    <button 
                      className="project-action-btn delete" 
                      title="Supprimer le projet"
                      onClick={(e) => handleDeleteProject(proj, e)}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* New Project Button */}
            <button className="btn-add-project" onClick={openNewProjectModal}>
              <FolderPlus size={14} />
              <span>Nouveau Projet</span>
            </button>
          </div>

          {/* Import Button */}
          <button 
            className="btn-primary" 
            onClick={() => fileInputRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', borderRadius: '8px', flexShrink: 0 }}
          >
            <Upload size={16} />
            <span>Importer des médias</span>
          </button>
        </div>

        {/* Filters, Search & Sort Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          
          {/* Media Type Tabs */}
          <div className="media-type-tabs">
            <button 
              className={`media-type-tab ${mediaTypeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setMediaTypeFilter('all')}
            >
              <span>Tous</span>
              <span className="tab-count">{mediaList.length}</span>
            </button>

            <button 
              className={`media-type-tab video ${mediaTypeFilter === 'video' ? 'active' : ''}`}
              onClick={() => setMediaTypeFilter('video')}
            >
              <Film size={14} />
              <span>Vidéos</span>
              <span className="tab-count">{videoCount}</span>
            </button>

            <button 
              className={`media-type-tab image ${mediaTypeFilter === 'image' ? 'active' : ''}`}
              onClick={() => setMediaTypeFilter('image')}
            >
              <ImageIcon size={14} />
              <span>Images</span>
              <span className="tab-count">{imageCount}</span>
            </button>

            <button 
              className={`media-type-tab audio ${mediaTypeFilter === 'audio' ? 'active' : ''}`}
              onClick={() => setMediaTypeFilter('audio')}
            >
              <Music size={14} />
              <span>Audios</span>
              <span className="tab-count">{audioCount}</span>
            </button>
          </div>

          {/* Search & Sort Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div className="library-search-box">
              <Search size={15} className="search-icon" />
              <input 
                type="text" 
                placeholder="Rechercher un média ou projet..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="library-search-input"
              />
              {searchQuery && (
                <button className="search-clear-btn" onClick={() => setSearchQuery('')}>
                  <X size={13} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <select 
                className="library-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="date-desc">Plus récents d'abord</option>
                <option value="date-asc">Plus anciens d'abord</option>
                <option value="title-asc">Nom (A-Z)</option>
                <option value="size-desc">Taille décroissante</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Media Grid */}
      <div className="library-grid">
        {filteredMedia.map((media) => {
          const associatedProject = projects.find(p => p.id === media.projectId);

          return (
            <div key={media.id} className="glass-panel video-card media-card">
              
              {/* Media Thumbnail / Preview Container */}
              <div 
                className="video-thumbnail-container" 
                onClick={() => {
                  if (media.type === 'video') setActiveVideo(media);
                  else if (media.type === 'image') setActiveImage(media);
                  else if (media.type === 'audio') setActiveAudio(media);
                }}
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

                {/* Duration Badge in Bottom Right (if video or audio) */}
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
                {editingId === media.id ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ flexGrow: 1, padding: '4px 8px', fontSize: '14px' }}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                    <button className="control-icon-btn" style={{ width: '30px', height: '30px' }} onClick={() => saveRename(media.id)}>
                      <Check size={14} style={{ color: 'var(--success)' }} />
                    </button>
                    <button className="control-icon-btn" style={{ width: '30px', height: '30px' }} onClick={() => setEditingId(null)}>
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
                      onClick={() => startEditing(media)}
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
                      onClick={() => setAssignMedia(media)}
                      title="Changer de projet"
                    >
                      <span className="project-color-dot" style={{ backgroundColor: associatedProject.color, width: '6px', height: '6px' }} />
                      {associatedProject.name}
                    </span>
                  ) : (
                    <button 
                      className="btn-assign-quick" 
                      onClick={() => setAssignMedia(media)}
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
                      onClick={() => {
                        if (media.type === 'video') setActiveVideo(media);
                        else if (media.type === 'image') setActiveImage(media);
                        else if (media.type === 'audio') setActiveAudio(media);
                      }}
                    >
                      {media.type === 'video' && <><Play size={13} fill="currentColor" /><span>Lire</span></>}
                      {media.type === 'image' && <><Maximize2 size={13} /><span>Aperçu</span></>}
                      {media.type === 'audio' && <><Volume2 size={13} /><span>Écouter</span></>}
                    </button>

                    <button 
                      className="btn-card-icon download" 
                      onClick={() => handleDownload(media)} 
                      title="Télécharger le fichier"
                    >
                      <Download size={14} />
                    </button>

                    <button 
                      className="btn-card-icon delete" 
                      onClick={() => handleDeleteMedia(media.id)} 
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
                        onClick={() => setTrimmingVideo(media)} 
                        title="Rogner les extrémités"
                      >
                        <Scissors size={13} />
                        <span>Rogner</span>
                      </button>

                      <button 
                        className="video-card-tool-btn subtitles" 
                        onClick={() => setSubtitlesModalVideo(media)} 
                        title="Sous-titres & Captions TikTok"
                      >
                        <Type size={13} />
                        <span>Sous-titres</span>
                      </button>

                      <button 
                        className="video-card-tool-btn redact" 
                        onClick={() => setRedactModalVideo(media)} 
                        title="Flouter les secrets (Auto-Redact)"
                      >
                        <ShieldAlert size={13} />
                        <span>Flouter</span>
                      </button>

                      <button 
                        className="video-card-tool-btn frame" 
                        onClick={() => setFrameModalVideo(media)} 
                        title="Cadre & Formats réseaux (9:16, 16:9)"
                      >
                        <Layers size={13} />
                        <span>Cadre</span>
                      </button>

                      <button 
                        className="video-card-tool-btn gif" 
                        onClick={() => setGifModalVideo(media)} 
                        title="Créer un GIF animé"
                      >
                        <Sparkles size={13} />
                        <span>GIF</span>
                      </button>

                      <button 
                        className="video-card-tool-btn guide" 
                        onClick={() => setTutorialModalMedia(media)} 
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
        })}
      </div>

      {/* Empty State */}
      {filteredMedia.length === 0 && (
        <div className="glass-panel empty-state">
          <div className="empty-state-icon">
            <Upload size={36} style={{ color: 'var(--primary)' }} />
          </div>
          <h3>Aucun média correspondant</h3>
          <p>
            {mediaList.length === 0
              ? 'Importez vos vidéos, musiques ou images ou commencez un enregistrement.'
              : 'Aucun média ne correspond aux filtres et à la recherche actuels.'}
          </p>
          <div style={{ marginTop: '16px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button className="btn-primary" onClick={() => fileInputRef.current?.click()}>
              <Upload size={15} />
              <span>Importer un fichier</span>
            </button>
            {selectedProjectId !== 'all' && (
              <button className="btn-secondary" onClick={() => setSelectedProjectId('all')}>
                <span>Afficher tous les médias</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Video Player Modal */}
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
                  <span>Cadre</span>
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

      {/* Image Lightbox Modal */}
      {activeImage && (
        <div className="modal-overlay" onClick={() => setActiveImage(null)}>
          <div className="glass-panel image-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="media-type-badge image">🖼️ IMAGE</span>
                <h3 className="modal-title">{activeImage.title}</h3>
              </div>
              <button className="close-btn" onClick={() => setActiveImage(null)}>
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
              <button className="btn-primary" onClick={() => handleDownload(activeImage)}>
                <Download size={15} /> Télécharger l'image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audio Player Modal */}
      {activeAudio && (
        <div className="modal-overlay" onClick={() => setActiveAudio(null)}>
          <div className="glass-panel audio-player-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="media-type-badge audio">🎵 AUDIO</span>
                <h3 className="modal-title">{activeAudio.title}</h3>
              </div>
              <button className="close-btn" onClick={() => setActiveAudio(null)}>
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
              <button className="btn-primary" onClick={() => handleDownload(activeAudio)}>
                <Download size={15} /> Télécharger l'audio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Project Modal */}
      {isProjectModalOpen && (
        <div className="modal-overlay" onClick={() => setIsProjectModalOpen(false)}>
          <div className="glass-panel project-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingProject ? 'Modifier le projet' : 'Créer un nouveau projet'}
              </h3>
              <button className="close-btn" onClick={() => setIsProjectModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Nom du projet / dossier *
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex : Tutoriels Développeur, Podcast, Démo Client..."
                  value={projectNameInput}
                  onChange={(e) => setProjectNameInput(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                  Couleur de l'étiquette
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {PROJECT_PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setProjectColorInput(c)}
                      className={`color-picker-dot ${projectColorInput === c ? 'active' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Description (optionnel)
                </label>
                <textarea 
                  className="form-input" 
                  placeholder="Notes ou contexte pour ce projet..."
                  rows={2}
                  value={projectDescInput}
                  onChange={(e) => setProjectDescInput(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 20px' }}>
              <button className="btn-secondary" onClick={() => setIsProjectModalOpen(false)}>
                Annuler
              </button>
              <button 
                className="btn-primary" 
                onClick={handleSaveProject} 
                disabled={!projectNameInput.trim()}
              >
                {editingProject ? 'Enregistrer les modifications' : 'Créer le projet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Assign to Project Modal */}
      {assignMedia && (
        <div className="modal-overlay" onClick={() => setAssignMedia(null)}>
          <div className="glass-panel assign-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Classer "{assignMedia.title}"</h3>
              <button className="close-btn" onClick={() => setAssignMedia(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
                Sélectionnez le projet dans lequel ranger ce média :
              </p>

              {/* Unassigned option */}
              <button
                className={`assign-project-item ${!assignMedia.projectId ? 'selected' : ''}`}
                onClick={() => handleAssignProject(assignMedia.id, null)}
              >
                <FolderOpen size={16} />
                <span>Non classé (Général)</span>
              </button>

              {projects.map((p) => (
                <button
                  key={p.id}
                  className={`assign-project-item ${assignMedia.projectId === p.id ? 'selected' : ''}`}
                  onClick={() => handleAssignProject(assignMedia.id, p.id)}
                >
                  <span className="project-color-dot" style={{ backgroundColor: p.color }} />
                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                </button>
              ))}

              {projects.length === 0 && (
                <div style={{ textAlign: 'center', padding: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Aucun projet existant.
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px' }}>
              <button 
                className="btn-secondary" 
                onClick={() => {
                  setAssignMedia(null);
                  openNewProjectModal();
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FolderPlus size={14} />
                <span>Créer un projet</span>
              </button>
              <button className="btn-secondary" onClick={() => setAssignMedia(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Tool Modals */}
      {trimmingVideo && (
        <VideoTrimmerModal
          video={trimmingVideo}
          onClose={() => setTrimmingVideo(null)}
          onTrimComplete={() => {
            loadData();
          }}
        />
      )}

      {gifModalVideo && (
        <GifExportModal
          video={gifModalVideo}
          onClose={() => setGifModalVideo(null)}
          onSavedToLibrary={() => {
            loadData();
          }}
        />
      )}

      {frameModalVideo && (
        <DeviceFrameModal
          video={frameModalVideo}
          onClose={() => setFrameModalVideo(null)}
          onSavedToLibrary={() => {
            loadData();
          }}
        />
      )}

      {redactModalVideo && (
        <AutoRedactModal
          video={redactModalVideo}
          onClose={() => setRedactModalVideo(null)}
          onSavedToLibrary={() => {
            loadData();
          }}
        />
      )}

      {subtitlesModalVideo && (
        <SubtitlesStudioModal
          video={subtitlesModalVideo}
          onClose={() => setSubtitlesModalVideo(null)}
          onSavedToLibrary={() => {
            loadData();
          }}
        />
      )}

      {tutorialModalMedia && (
        <TutorialMakerModal
          media={tutorialModalMedia}
          onClose={() => setTutorialModalMedia(null)}
        />
      )}
    </div>
  );
}
