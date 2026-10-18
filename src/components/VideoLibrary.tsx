import React, { useEffect, useState, useRef } from 'react';
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
import { Upload } from 'lucide-react';
import { LibraryToolbar } from './library/LibraryToolbar';
import { LibraryMediaCard } from './library/LibraryMediaCard';
import { LibraryPlayerModals } from './library/LibraryPlayerModals';
import { LibraryProjectModals } from './library/LibraryProjectModals';
import { LibraryActionModals } from './library/LibraryActionModals';

interface VideoLibraryProps {
  refreshTrigger: number;
}

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

  // Quick project assign modal
  const [assignMedia, setAssignMedia] = useState<SavedMedia | null>(null);

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  const handleRename = async (id: string, newTitle: string) => {
    await renameMedia(id, newTitle);
    loadData();
  };

  const openNewProjectModal = () => {
    setEditingProject(null);
    setIsProjectModalOpen(true);
  };

  const openEditProjectModal = (proj: MediaProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(proj);
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = async (projData: { id?: string; name: string; color: string; description?: string }) => {
    const projectToSave: MediaProject = {
      id: projData.id || `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: projData.name,
      color: projData.color,
      description: projData.description,
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

  // Filter media list
  const filteredMedia = mediaList.filter((item) => {
    if (selectedProjectId === 'unassigned') {
      if (item.projectId) return false;
    } else if (selectedProjectId !== 'all') {
      if (item.projectId !== selectedProjectId) return false;
    }

    if (mediaTypeFilter !== 'all' && item.type !== mediaTypeFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = item.title.toLowerCase().includes(q);
      const proj = projects.find(p => p.id === item.projectId);
      const matchesProject = proj ? proj.name.toLowerCase().includes(q) : false;
      if (!matchesTitle && !matchesProject) return false;
    }

    return true;
  });

  filteredMedia.sort((a, b) => {
    if (sortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sortBy === 'title-asc') return a.title.localeCompare(b.title);
    if (sortBy === 'size-desc') return b.size - a.size;
    return 0;
  });

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

      {/* Toolbar (Projects & Filter & Search) */}
      <LibraryToolbar
        mediaListCount={mediaList.length}
        videoCount={videoCount}
        imageCount={imageCount}
        audioCount={audioCount}
        unassignedCount={unassignedCount}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProjectId={setSelectedProjectId}
        mediaTypeFilter={mediaTypeFilter}
        onMediaTypeFilter={setMediaTypeFilter}
        searchQuery={searchQuery}
        onSearchQuery={setSearchQuery}
        sortBy={sortBy}
        onSortBy={setSortBy}
        onOpenNewProject={openNewProjectModal}
        onOpenEditProject={openEditProjectModal}
        onDeleteProject={handleDeleteProject}
        onTriggerImport={() => fileInputRef.current?.click()}
      />

      {/* Media Grid */}
      <div className="library-grid">
        {filteredMedia.map((media) => (
          <LibraryMediaCard
            key={media.id}
            media={media}
            associatedProject={projects.find(p => p.id === media.projectId)}
            onPlayMedia={(m) => {
              if (m.type === 'video') setActiveVideo(m);
              else if (m.type === 'image') setActiveImage(m);
              else if (m.type === 'audio') setActiveAudio(m);
            }}
            onDownload={handleDownload}
            onDelete={handleDeleteMedia}
            onRename={handleRename}
            onAssignProject={setAssignMedia}
            onTrim={setTrimmingVideo}
            onSubtitles={setSubtitlesModalVideo}
            onRedact={setRedactModalVideo}
            onFrame={setFrameModalVideo}
            onGif={setGifModalVideo}
            onTutorial={setTutorialModalMedia}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredMedia.length === 0 && (
        <div className="glass-panel empty-state">
          <div className="empty-state-icon"><Upload size={36} style={{ color: 'var(--primary)' }} /></div>
          <h3>Aucun média correspondant</h3>
          <p>{mediaList.length === 0 ? 'Importez vos vidéos, musiques ou images ou commencez un enregistrement.' : 'Aucun média ne correspond aux filtres et à la recherche actuels.'}</p>
          <div style={{ marginTop: '16px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button className="btn-primary" onClick={() => fileInputRef.current?.click()}><Upload size={15} /><span>Importer un fichier</span></button>
            {selectedProjectId !== 'all' && (
              <button className="btn-secondary" onClick={() => setSelectedProjectId('all')}><span>Afficher tous les médias</span></button>
            )}
          </div>
        </div>
      )}

      {/* Player Modals (Video, Image, Audio) */}
      <LibraryPlayerModals
        activeVideo={activeVideo}
        activeImage={activeImage}
        activeAudio={activeAudio}
        onCloseVideo={() => setActiveVideo(null)}
        onCloseImage={() => setActiveImage(null)}
        onCloseAudio={() => setActiveAudio(null)}
        onDownload={handleDownload}
        onOpenTrimmer={setTrimmingVideo}
        onOpenSubtitles={setSubtitlesModalVideo}
        onOpenRedact={setRedactModalVideo}
        onOpenFrame={setFrameModalVideo}
        onOpenGif={setGifModalVideo}
      />

      {/* Project Modals (Create/Edit Project, Assign Media) */}
      <LibraryProjectModals
        isProjectModalOpen={isProjectModalOpen}
        editingProject={editingProject}
        onCloseProjectModal={() => setIsProjectModalOpen(false)}
        onSaveProject={handleSaveProject}
        assignMedia={assignMedia}
        onCloseAssignModal={() => setAssignMedia(null)}
        onAssignMediaToProject={handleAssignProject}
        projects={projects}
        onOpenNewProjectFromAssign={openNewProjectModal}
      />

      {/* Specialized Tool Modals */}
      <LibraryActionModals
        trimmingVideo={trimmingVideo}
        onCloseTrimmer={() => setTrimmingVideo(null)}
        gifModalVideo={gifModalVideo}
        onCloseGif={() => setGifModalVideo(null)}
        frameModalVideo={frameModalVideo}
        onCloseFrame={() => setFrameModalVideo(null)}
        redactModalVideo={redactModalVideo}
        onCloseRedact={() => setRedactModalVideo(null)}
        subtitlesModalVideo={subtitlesModalVideo}
        onCloseSubtitles={() => setSubtitlesModalVideo(null)}
        tutorialModalMedia={tutorialModalMedia}
        onCloseTutorial={() => setTutorialModalMedia(null)}
        onDataRefresh={loadData}
      />
    </div>
  );
}
