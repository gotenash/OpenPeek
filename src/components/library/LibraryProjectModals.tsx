import { useState, useEffect } from 'react';
import { X, FolderOpen, FolderPlus } from 'lucide-react';
import type { SavedMedia, MediaProject } from '../../utils/db';

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

interface LibraryProjectModalsProps {
  isProjectModalOpen: boolean;
  editingProject: MediaProject | null;
  onCloseProjectModal: () => void;
  onSaveProject: (project: { id?: string; name: string; color: string; description?: string }) => void;
  assignMedia: SavedMedia | null;
  onCloseAssignModal: () => void;
  onAssignMediaToProject: (mediaId: string, projectId: string | null) => void;
  projects: MediaProject[];
  onOpenNewProjectFromAssign: () => void;
}

export function LibraryProjectModals({
  isProjectModalOpen,
  editingProject,
  onCloseProjectModal,
  onSaveProject,
  assignMedia,
  onCloseAssignModal,
  onAssignMediaToProject,
  projects,
  onOpenNewProjectFromAssign
}: LibraryProjectModalsProps) {
  const [projectNameInput, setProjectNameInput] = useState('');
  const [projectColorInput, setProjectColorInput] = useState('#8b5cf6');
  const [projectDescInput, setProjectDescInput] = useState('');

  useEffect(() => {
    if (editingProject) {
      setProjectNameInput(editingProject.name);
      setProjectColorInput(editingProject.color);
      setProjectDescInput(editingProject.description || '');
    } else {
      setProjectNameInput('');
      setProjectColorInput(PROJECT_PRESET_COLORS[0]);
      setProjectDescInput('');
    }
  }, [editingProject, isProjectModalOpen]);

  const handleSave = () => {
    if (!projectNameInput.trim()) return;
    onSaveProject({
      id: editingProject?.id,
      name: projectNameInput.trim(),
      color: projectColorInput,
      description: projectDescInput.trim() || undefined
    });
  };

  return (
    <>
      {/* Create / Edit Project Modal */}
      {isProjectModalOpen && (
        <div className="modal-overlay" onClick={onCloseProjectModal}>
          <div className="glass-panel project-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingProject ? 'Modifier le projet' : 'Créer un nouveau projet'}
              </h3>
              <button className="close-btn" onClick={onCloseProjectModal}>
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
              <button className="btn-secondary" onClick={onCloseProjectModal}>
                Annuler
              </button>
              <button 
                className="btn-primary" 
                onClick={handleSave} 
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
        <div className="modal-overlay" onClick={onCloseAssignModal}>
          <div className="glass-panel assign-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Classer "{assignMedia.title}"</h3>
              <button className="close-btn" onClick={onCloseAssignModal}>
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
                onClick={() => onAssignMediaToProject(assignMedia.id, null)}
              >
                <FolderOpen size={16} />
                <span>Non classé (Général)</span>
              </button>

              {projects.map((p) => (
                <button
                  key={p.id}
                  className={`assign-project-item ${assignMedia.projectId === p.id ? 'selected' : ''}`}
                  onClick={() => onAssignMediaToProject(assignMedia.id, p.id)}
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
                  onCloseAssignModal();
                  onOpenNewProjectFromAssign();
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FolderPlus size={14} />
                <span>Créer un projet</span>
              </button>
              <button className="btn-secondary" onClick={onCloseAssignModal}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
