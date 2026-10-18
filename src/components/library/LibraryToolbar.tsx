import React from 'react';
import { 
  Folder, 
  FolderOpen, 
  FolderPlus, 
  Upload, 
  Film, 
  Image as ImageIcon, 
  Music, 
  Search, 
  X, 
  Edit2, 
  Trash2 
} from 'lucide-react';
import type { MediaProject, MediaType } from '../../utils/db';

interface LibraryToolbarProps {
  mediaListCount: number;
  videoCount: number;
  imageCount: number;
  audioCount: number;
  unassignedCount: number;
  projects: MediaProject[];
  selectedProjectId: string | 'all' | 'unassigned';
  onSelectProjectId: (id: string | 'all' | 'unassigned') => void;
  mediaTypeFilter: MediaType | 'all';
  onMediaTypeFilter: (type: MediaType | 'all') => void;
  searchQuery: string;
  onSearchQuery: (query: string) => void;
  sortBy: 'date-desc' | 'date-asc' | 'title-asc' | 'size-desc';
  onSortBy: (sort: 'date-desc' | 'date-asc' | 'title-asc' | 'size-desc') => void;
  onOpenNewProject: () => void;
  onOpenEditProject: (project: MediaProject, e: React.MouseEvent) => void;
  onDeleteProject: (project: MediaProject, e: React.MouseEvent) => void;
  onTriggerImport: () => void;
}

export function LibraryToolbar({
  mediaListCount,
  videoCount,
  imageCount,
  audioCount,
  unassignedCount,
  projects,
  selectedProjectId,
  onSelectProjectId,
  mediaTypeFilter,
  onMediaTypeFilter,
  searchQuery,
  onSearchQuery,
  sortBy,
  onSortBy,
  onOpenNewProject,
  onOpenEditProject,
  onDeleteProject,
  onTriggerImport
}: LibraryToolbarProps) {
  return (
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
            onClick={() => onSelectProjectId('all')}
          >
            <span>Tous les médias</span>
            <span className="project-pill-badge">{mediaListCount}</span>
          </button>

          {/* Non classés */}
          <button
            className={`project-pill ${selectedProjectId === 'unassigned' ? 'active' : ''}`}
            onClick={() => onSelectProjectId('unassigned')}
          >
            <FolderOpen size={13} style={{ opacity: 0.7 }} />
            <span>Non classés</span>
            <span className="project-pill-badge">{unassignedCount}</span>
          </button>

          {/* User Projects */}
          {projects.map((proj) => {
            const isSelected = selectedProjectId === proj.id;
            return (
              <div key={proj.id} className="project-pill-wrapper">
                <button
                  className={`project-pill ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectProjectId(proj.id)}
                  style={{
                    borderColor: isSelected ? proj.color : 'transparent',
                    background: isSelected ? `${proj.color}25` : undefined
                  }}
                >
                  <span className="project-color-dot" style={{ backgroundColor: proj.color }} />
                  <span className="project-pill-name">{proj.name}</span>
                </button>

                <div className="project-pill-actions">
                  <button 
                    className="project-action-btn" 
                    title="Modifier le projet"
                    onClick={(e) => onOpenEditProject(proj, e)}
                  >
                    <Edit2 size={11} />
                  </button>
                  <button 
                    className="project-action-btn delete" 
                    title="Supprimer le projet"
                    onClick={(e) => onDeleteProject(proj, e)}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* New Project Button */}
          <button className="btn-add-project" onClick={onOpenNewProject}>
            <FolderPlus size={14} />
            <span>Nouveau Projet</span>
          </button>
        </div>

        {/* Import Button */}
        <button 
          className="btn-primary" 
          onClick={onTriggerImport}
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
            onClick={() => onMediaTypeFilter('all')}
          >
            <span>Tous</span>
            <span className="tab-count">{mediaListCount}</span>
          </button>

          <button 
            className={`media-type-tab video ${mediaTypeFilter === 'video' ? 'active' : ''}`}
            onClick={() => onMediaTypeFilter('video')}
          >
            <Film size={14} />
            <span>Vidéos</span>
            <span className="tab-count">{videoCount}</span>
          </button>

          <button 
            className={`media-type-tab image ${mediaTypeFilter === 'image' ? 'active' : ''}`}
            onClick={() => onMediaTypeFilter('image')}
          >
            <ImageIcon size={14} />
            <span>Images</span>
            <span className="tab-count">{imageCount}</span>
          </button>

          <button 
            className={`media-type-tab audio ${mediaTypeFilter === 'audio' ? 'active' : ''}`}
            onClick={() => onMediaTypeFilter('audio')}
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
              onChange={(e) => onSearchQuery(e.target.value)}
              className="library-search-input"
            />
            {searchQuery && (
              <button className="search-clear-btn" onClick={() => onSearchQuery('')}>
                <X size={13} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <select 
              className="library-sort-select"
              value={sortBy}
              onChange={(e) => onSortBy(e.target.value as any)}
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
  );
}
