import { useState, useEffect } from 'react';
import { X, Check, Film, Upload } from 'lucide-react';
import type { SavedVideo } from '../../utils/db';

export interface VideoPickerModalProps {
  isOpen: boolean;
  libraryVideos: SavedVideo[];
  initialPosition?: 'start' | 'current' | 'end';
  onSelectVideo: (video: SavedVideo, position: 'start' | 'current' | 'end') => void;
  onImportNewVideo: () => void;
  onClose: () => void;
}

export function VideoPickerModal({
  isOpen,
  libraryVideos,
  initialPosition = 'current',
  onSelectVideo,
  onImportNewVideo,
  onClose
}: VideoPickerModalProps) {
  const [selectedVideoId, setSelectedVideoId] = useState<string>(libraryVideos[0]?.id || '');
  const [insertPos, setInsertPos] = useState<'start' | 'current' | 'end'>(initialPosition);

  useEffect(() => {
    if (isOpen) {
      setInsertPos(initialPosition);
      if (libraryVideos.length > 0 && !selectedVideoId) {
        setSelectedVideoId(libraryVideos[0].id);
      }
    }
  }, [isOpen, initialPosition, libraryVideos]);

  if (!isOpen) return null;

  const formatDur = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleConfirm = () => {
    const v = libraryVideos.find(x => x.id === selectedVideoId) || libraryVideos[0];
    if (!v) {
      alert("Veuillez sélectionner une vidéo ou en importer une nouvelle.");
      return;
    }
    onSelectVideo(v, insertPos);
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={onClose}>
      <div
        className="glass-panel"
        style={{
          width: '540px',
          maxWidth: '92vw',
          padding: '18px',
          border: '1px solid rgba(6, 182, 212, 0.45)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.85), 0 0 35px rgba(6, 182, 212, 0.25)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ marginBottom: '12px' }}>
          <h3 className="modal-title" style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8' }}>
            <Film size={16} />
            <span>Insérer une Vidéo sur la Piste Principale</span>
          </h3>
          <button className="close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Sélectionnez une vidéo ou importez-en une depuis votre PC :
            </span>
            <button
              type="button"
              className="btn-toolbar"
              onClick={onImportNewVideo}
              style={{ fontSize: '10px', padding: '3px 8px', color: '#38bdf8', borderColor: '#06b6d4' }}
            >
              <Upload size={11} />
              <span>+ Importer depuis PC</span>
            </button>
          </div>

          {/* Videos Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '8px',
            maxHeight: '220px',
            overflowY: 'auto',
            backgroundColor: 'rgba(0,0,0,0.3)',
            padding: '8px',
            borderRadius: '6px'
          }}>
            {libraryVideos.map((v) => {
              const isSelected = v.id === selectedVideoId;
              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVideoId(v.id)}
                  style={{
                    position: 'relative',
                    aspectRatio: '16/9',
                    borderRadius: '5px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: isSelected ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                    boxShadow: isSelected ? '0 0 10px rgba(56, 189, 248, 0.7)' : 'none',
                    backgroundColor: '#050811'
                  }}
                >
                  {v.thumbnail ? (
                    <img
                      src={v.thumbnail}
                      alt={v.title}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                      <Film size={24} />
                    </div>
                  )}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    insetInline: 0,
                    backgroundColor: 'rgba(0,0,0,0.75)',
                    padding: '2px 4px',
                    fontSize: '8px',
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.title}</span>
                    <span style={{ fontFamily: 'monospace', color: '#38bdf8', fontSize: '8px', flexShrink: 0 }}>
                      {formatDur(v.duration || 0)}
                    </span>
                  </div>
                </div>
              );
            })}
            {libraryVideos.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
                Aucune vidéo enregistrée. Cliquez sur « + Importer depuis PC » ci-dessus.
              </div>
            )}
          </div>

          {/* Position Selector */}
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Emplacement d'insertion sur la piste vidéo
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {[
                { key: 'start', label: 'Au tout début (Intro)', desc: 'Avant la première vidéo' },
                { key: 'current', label: 'À la tête de lecture', desc: 'Position actuelle' },
                { key: 'end', label: 'À la fin', desc: 'Après toutes les vidéos' }
              ].map((pos) => (
                <button
                  key={pos.key}
                  type="button"
                  onClick={() => setInsertPos(pos.key as any)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '5px',
                    border: insertPos === pos.key ? '1.5px solid #38bdf8' : '1px solid var(--border-color)',
                    backgroundColor: insertPos === pos.key ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255,255,255,0.02)',
                    color: insertPos === pos.key ? '#ffffff' : 'var(--text-secondary)',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 600 }}>{pos.label}</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{pos.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
            <button type="button" className="action-btn" onClick={onClose}>
              Annuler
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleConfirm}
              style={{ backgroundColor: '#06b6d4', borderColor: '#06b6d4', color: '#000000', fontWeight: 700 }}
              disabled={libraryVideos.length === 0}
            >
              <Check size={14} />
              <span>Insérer la Vidéo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
