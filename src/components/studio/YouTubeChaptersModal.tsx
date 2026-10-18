import { ListTree, X, Download, Copy, Check } from 'lucide-react';
import type { TimelineChapter } from '../../utils/videoCompositor';

export interface YouTubeChaptersModalProps {
  isOpen: boolean;
  chapters: TimelineChapter[];
  totalDuration: number;
  currentTime: number;
  clipsCount: number;
  titlesCount: number;
  copiedChapters: boolean;
  formatTime: (secs: number) => string;
  formatYouTubeChapters: (chapters: TimelineChapter[]) => string;
  onAutoGenerateFromClips: () => void;
  onAutoGenerateFromTitles: () => void;
  onAddChapterAtCurrentTime: () => void;
  onUpdateChapter: (id: string, time: number, title: string) => void;
  onRemoveChapter: (id: string) => void;
  onSeek: (time: number) => void;
  onDownloadChapters: () => void;
  onCopyChapters: () => void;
  onClose: () => void;
}

export function YouTubeChaptersModal({
  isOpen,
  chapters,
  totalDuration,
  currentTime,
  clipsCount,
  titlesCount,
  copiedChapters,
  formatTime,
  formatYouTubeChapters,
  onAutoGenerateFromClips,
  onAutoGenerateFromTitles,
  onAddChapterAtCurrentTime,
  onUpdateChapter,
  onRemoveChapter,
  onSeek,
  onDownloadChapters,
  onCopyChapters,
  onClose
}: YouTubeChaptersModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-panel modal-content" style={{ maxWidth: '560px', padding: '16px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8' }}>
            <ListTree size={16} />
            Chapitres YouTube & Table des Matières
          </h3>
          <button className="close-btn" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
          {/* Quick Auto-Generation Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <button
              className="btn-toolbar"
              onClick={onAutoGenerateFromClips}
              style={{ fontSize: '11px', padding: '4px 8px', color: '#06b6d4', borderColor: 'rgba(6, 182, 212, 0.4)' }}
              title="Créer un chapitre au début de chaque clip vidéo"
            >
              ⚡ Détecter depuis les clips ({clipsCount})
            </button>

            <button
              className="btn-toolbar"
              onClick={onAutoGenerateFromTitles}
              style={{ fontSize: '11px', padding: '4px 8px', color: '#c084fc', borderColor: 'rgba(192, 132, 252, 0.4)' }}
              title="Créer des chapitres à partir des titres textuels"
            >
              🔤 Détecter depuis les titres ({titlesCount})
            </button>

            <button
              className="btn-toolbar"
              onClick={onAddChapterAtCurrentTime}
              style={{ fontSize: '11px', padding: '4px 8px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' }}
              title="Ajouter un nouveau marqueur de chapitre à la position actuelle de lecture"
            >
              ➕ Ajouter à {formatTime(currentTime)}
            </button>
          </div>

          {/* YouTube Rules Compliance Badge */}
          <div style={{
            fontSize: '10px',
            padding: '6px 10px',
            borderRadius: '5px',
            backgroundColor: 'rgba(0,0,0,0.3)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ color: chapters.length >= 3 ? '#34d399' : '#f59e0b' }}>
                {chapters.length >= 3 ? '✓' : '⚠️'} Min. 3 chapitres ({chapters.length})
              </span>
              <span style={{ color: '#34d399' }}>
                ✓ Démarre à 00:00 (Auto)
              </span>
              <span style={{ color: '#94a3b8' }}>
                ℹ️ Min. 10s par chapitre
              </span>
            </div>
          </div>

          {/* Editable Chapters List */}
          <div style={{
            maxHeight: '180px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            padding: '4px',
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            {chapters.map((chap, idx) => (
              <div
                key={chap.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 8px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderRadius: '4px',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}
              >
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#38bdf8', width: '22px' }}>
                  #{idx + 1}
                </span>

                {/* Time Input in seconds */}
                <input
                  type="number"
                  min={0}
                  max={totalDuration || 9999}
                  step={0.5}
                  value={chap.time}
                  onChange={(e) => onUpdateChapter(chap.id, parseFloat(e.target.value) || 0, chap.title)}
                  style={{ width: '55px', fontSize: '11px', padding: '2px 4px', textAlign: 'center' }}
                  className="form-input"
                  title="Temps en secondes"
                />

                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  ({formatTime(chap.time)})
                </span>

                {/* Chapter Title Input */}
                <input
                  type="text"
                  value={chap.title}
                  onChange={(e) => onUpdateChapter(chap.id, chap.time, e.target.value)}
                  placeholder="Nom du chapitre..."
                  style={{ flexGrow: 1, fontSize: '11px', padding: '2px 6px' }}
                  className="form-input"
                />

                {/* Jump button */}
                <button
                  className="btn-toolbar"
                  onClick={() => onSeek(chap.time)}
                  style={{ padding: '2px 5px', fontSize: '10px' }}
                  title="Aller à ce point dans la vidéo"
                >
                  🎯
                </button>

                {/* Delete button */}
                <button
                  style={{ background: 'transparent', border: 'none', color: '#fb7185', cursor: 'pointer', padding: '2px' }}
                  onClick={() => onRemoveChapter(chap.id)}
                  title="Supprimer ce chapitre"
                >
                  <X size={12} />
                </button>
              </div>
            ))}

            {chapters.length === 0 && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                Aucun chapitre défini. Cliquez ci-dessus sur « ⚡ Détecter depuis les clips » ou « ➕ Ajouter à l'instant actuel ».
              </div>
            )}
          </div>

          {/* Formatted Text Box for Copy/Paste */}
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Texte formaté pour la description YouTube :</span>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Format officiel avec minutages</span>
            </label>
            <textarea
              readOnly
              rows={4}
              value={formatYouTubeChapters(chapters)}
              style={{
                width: '100%',
                fontSize: '11px',
                fontFamily: 'monospace',
                padding: '6px 8px',
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                color: '#e2e8f0',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                resize: 'none'
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <button
              className="btn-toolbar"
              onClick={onDownloadChapters}
              style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Télécharger la liste des chapitres en fichier .txt"
            >
              <Download size={12} />
              <span>Télécharger .txt</span>
            </button>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="action-btn" onClick={onClose}>Fermer</button>
              <button
                className="btn-primary"
                onClick={onCopyChapters}
                style={{
                  backgroundColor: copiedChapters ? '#10b981' : '#38bdf8',
                  color: '#000000',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                {copiedChapters ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedChapters ? 'Copié dans le presse-papier !' : 'Copier pour YouTube'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
