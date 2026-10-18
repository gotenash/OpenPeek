import { useState, useEffect } from 'react';
import { X, Check, Image as ImageIcon, Upload } from 'lucide-react';
import type { SavedMedia } from '../../utils/db';

export interface ImageSlidePickerModalProps {
  isOpen: boolean;
  libraryImages: SavedMedia[];
  initialPosition: 'start' | 'current' | 'end';
  onSelectImage: (media: SavedMedia, duration: number, position: 'start' | 'current' | 'end') => void;
  onImportNewImage: () => void;
  onClose: () => void;
}

export function ImageSlidePickerModal({
  isOpen,
  libraryImages,
  initialPosition,
  onSelectImage,
  onImportNewImage,
  onClose
}: ImageSlidePickerModalProps) {
  const [selectedImageId, setSelectedImageId] = useState<string>(libraryImages[0]?.id || '');
  const [duration, setDuration] = useState<number>(5);
  const [position, setPosition] = useState<'start' | 'current' | 'end'>(initialPosition);

  useEffect(() => {
    if (libraryImages.length > 0 && !selectedImageId) {
      setSelectedImageId(libraryImages[0].id);
    }
  }, [libraryImages]);

  if (!isOpen) return null;

  const selectedMedia = libraryImages.find(img => img.id === selectedImageId);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1050 }}>
      <div
        className="glass-panel modal-content"
        style={{
          maxWidth: '560px',
          width: '92%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '18px',
          border: '1px solid rgba(16, 185, 129, 0.45)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.85), 0 0 35px rgba(16, 185, 129, 0.25)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ marginBottom: '12px' }}>
          <h3 className="modal-title" style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399' }}>
            <ImageIcon size={16} />
            <span>Insérer une Image sur la Piste Vidéo</span>
          </h3>
          <button className="close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Sélectionnez une image de votre bibliothèque ou importez-en une nouvelle :
            </span>
            <button
              type="button"
              className="btn-toolbar"
              onClick={onImportNewImage}
              style={{ fontSize: '10px', padding: '3px 8px', color: '#34d399', borderColor: '#10b981' }}
            >
              <Upload size={11} />
              <span>+ Importer</span>
            </button>
          </div>

          {/* Images Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
            gap: '8px',
            maxHeight: '200px',
            overflowY: 'auto',
            backgroundColor: 'rgba(0,0,0,0.3)',
            padding: '8px',
            borderRadius: '6px'
          }}>
            {libraryImages.map((img) => {
              const isSelected = img.id === selectedImageId;
              return (
                <div
                  key={img.id}
                  onClick={() => setSelectedImageId(img.id)}
                  style={{
                    position: 'relative',
                    aspectRatio: '16/9',
                    borderRadius: '5px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: isSelected ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                    boxShadow: isSelected ? '0 0 10px rgba(16, 185, 129, 0.7)' : 'none',
                    backgroundColor: '#050811'
                  }}
                >
                  <img
                    src={img.thumbnail || (img.blob ? URL.createObjectURL(img.blob) : '')}
                    alt={img.title}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    insetInline: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    padding: '2px 4px',
                    fontSize: '8px',
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {img.title}
                  </div>
                </div>
              );
            })}
            {libraryImages.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                Aucune image enregistrée. Cliquez sur "+ Importer" pour ajouter une image JPG ou PNG.
              </div>
            )}
          </div>

          {/* Duration Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Durée d'affichage à l'écran :
            </label>
            <input
              type="number"
              min={1}
              max={60}
              step={0.5}
              value={duration}
              onChange={(e) => setDuration(parseFloat(e.target.value) || 5)}
              className="form-input"
              style={{ width: '60px', fontSize: '11px', padding: '3px 6px' }}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>secondes</span>
          </div>

          {/* Position Selector */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
              Emplacement sur la piste vidéo
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { key: 'start', label: 'Au tout début (Intro)', desc: 'Avant la première vidéo' },
                { key: 'current', label: 'Au curseur actuel', desc: 'À la position de lecture' },
                { key: 'end', label: 'À la fin', desc: 'Après toutes les vidéos' }
              ].map((item) => {
                const isSelected = position === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setPosition(item.key as any)}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: '6px',
                      backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.03)',
                      border: isSelected ? '1px solid #10b981' : '1px solid var(--border-color)',
                      color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: isSelected ? '#6ee7b7' : '#ffffff' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                      {item.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions Bottom Bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button className="action-btn" type="button" onClick={onClose}>
              Annuler
            </button>
            <button
              className="btn-primary"
              type="button"
              disabled={!selectedMedia}
              onClick={() => {
                if (selectedMedia) {
                  onSelectImage(selectedMedia, duration, position);
                }
              }}
              style={{
                backgroundColor: '#10b981',
                borderColor: '#10b981',
                padding: '6px 16px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Check size={14} />
              <span>Insérer la Diapositive Image</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
