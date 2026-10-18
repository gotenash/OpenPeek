import React from 'react';
import {
  FileText,
  Check,
  Save,
  FolderOpen,
  RefreshCw,
  Download,
  Upload
} from 'lucide-react';
import type { SavedProject } from '../../utils/db';

export interface StudioTopBarProps {
  projectName: string;
  setProjectName: (name: string) => void;
  saveSuccessMsg: string | null;
  handleSaveProject: () => void;
  setIsProjectListModalOpen: (open: boolean) => void;
  savedProjects: SavedProject[];
  handleNewProject: () => void;
  handleExportProjectFile: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function StudioTopBar({
  projectName,
  setProjectName,
  saveSuccessMsg,
  handleSaveProject,
  setIsProjectListModalOpen,
  savedProjects,
  handleNewProject,
  handleExportProjectFile,
  fileInputRef
}: StudioTopBarProps) {
  return (
    <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <FileText size={16} color="#c084fc" />
        <input
          type="text"
          className="form-input"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          style={{ width: '220px', padding: '4px 8px', fontSize: '13px', fontWeight: 600 }}
          placeholder="Nom du projet"
        />
        {saveSuccessMsg && (
          <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Check size={12} /> {saveSuccessMsg}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          className="btn-primary"
          onClick={handleSaveProject}
          style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}
          title="Enregistrer ce montage dans votre base locale"
        >
          <Save size={13} />
          <span>Enregistrer</span>
        </button>

        <button
          className="btn-secondary"
          onClick={() => setIsProjectListModalOpen(true)}
          style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}
          title="Ouvrir un projet enregistré"
        >
          <FolderOpen size={13} />
          <span>Mes Projets ({savedProjects.length})</span>
        </button>

        <button
          className="btn-toolbar"
          onClick={handleNewProject}
          style={{ padding: '4px 8px', fontSize: '11px' }}
          title="Démarrer un nouveau projet vierge"
        >
          <RefreshCw size={12} />
          <span>Nouveau</span>
        </button>

        <button
          className="btn-toolbar"
          onClick={handleExportProjectFile}
          style={{ padding: '4px 8px', fontSize: '11px' }}
          title="Exporter le fichier projet (.captproj) sur votre PC"
        >
          <Download size={12} />
          <span>Export .captproj</span>
        </button>

        <button
          className="btn-toolbar"
          onClick={() => fileInputRef.current?.click()}
          style={{ padding: '4px 8px', fontSize: '11px' }}
          title="Importer un fichier projet (.captproj) depuis votre PC"
        >
          <Upload size={12} />
          <span>Importer</span>
        </button>
      </div>
    </div>
  );
}
