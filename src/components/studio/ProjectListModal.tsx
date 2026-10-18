import { FolderOpen, X, Trash2 } from 'lucide-react';
import type { SavedProject } from '../../utils/db';

export interface ProjectListModalProps {
  isOpen: boolean;
  savedProjects: SavedProject[];
  formatTime: (secs: number) => string;
  onLoadProject: (project: SavedProject) => void;
  onDeleteProject: (projectId: string) => void;
  onClose: () => void;
}

export function ProjectListModal({
  isOpen,
  savedProjects,
  formatTime,
  onLoadProject,
  onDeleteProject,
  onClose
}: ProjectListModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-panel modal-content" style={{ maxWidth: '500px', padding: '16px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FolderOpen size={16} color="#c084fc" />
            Mes Projets de Montage ({savedProjects.length})
          </h3>
          <button className="close-btn" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
          {savedProjects.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 10px',
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>{p.title}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                  {p.clipCount} clip(s) • ~{formatTime(p.totalDuration)} • {new Date(p.date).toLocaleDateString()}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className="btn-primary"
                  style={{ padding: '3px 8px', fontSize: '11px' }}
                  onClick={() => onLoadProject(p)}
                >
                  Ouvrir
                </button>
                <button
                  className="btn-toolbar"
                  style={{ padding: '3px 6px', color: '#fb7185' }}
                  onClick={() => onDeleteProject(p.id)}
                  title="Supprimer ce projet"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}

          {savedProjects.length === 0 && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
              Aucun projet enregistré. Cliquez sur « Enregistrer » pour sauvegarder votre montage actuel.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
