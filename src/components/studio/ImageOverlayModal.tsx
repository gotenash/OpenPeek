import React from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import type { ImagePositionPreset } from '../../utils/videoCompositor';

export interface ImageFormData {
  id?: string;
  name: string;
  dataUrl: string;
  position: ImagePositionPreset;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  hasShadow?: boolean;
  borderRadius?: number;
  startTime: number;
  duration: number;
}

export interface ImageOverlayModalProps {
  isOpen: boolean;
  imageModalMode: 'add' | 'edit';
  imageForm: ImageFormData;
  setImageForm: React.Dispatch<React.SetStateAction<ImageFormData>>;
  isPermanentOverlay: boolean;
  setIsPermanentOverlay: React.Dispatch<React.SetStateAction<boolean>>;
  onSaveImageOverlay: () => void;
  onClose: () => void;
}

export function ImageOverlayModal({
  isOpen,
  imageModalMode,
  imageForm,
  setImageForm,
  isPermanentOverlay,
  setIsPermanentOverlay,
  onSaveImageOverlay,
  onClose
}: ImageOverlayModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-panel modal-content" style={{ maxWidth: '460px', padding: '16px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399' }}>
            <ImageIcon size={16} />
            {imageModalMode === 'add' ? 'Superposer un Logo / Filigrane' : 'Modifier le Logo'}
          </h3>
          <button className="close-btn" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
          {/* Live Mini Frame Preview */}
          <div style={{
            position: 'relative',
            width: '100%',
            height: '130px',
            backgroundColor: '#0a0f1d',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.1)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: 'repeating-conic-gradient(rgba(255,255,255,0.03) 0% 25%, transparent 0% 50%) 50% / 12px 12px'
          }}>
            <div style={{
              position: 'absolute',
              inset: '8px',
              border: '1px dashed rgba(255,255,255,0.12)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.25)',
              fontSize: '11px',
              userSelect: 'none'
            }}>
              Écran Vidéo
            </div>

            {imageForm.dataUrl && (
              <img
                src={imageForm.dataUrl}
                alt=""
                style={{
                  position: 'absolute',
                  maxWidth: `${imageForm.scale * 100}%`,
                  maxHeight: `${imageForm.scale * 100}%`,
                  opacity: imageForm.opacity,
                  boxShadow: imageForm.hasShadow ? '0 4px 14px rgba(0,0,0,0.85)' : 'none',
                  borderRadius: `${imageForm.borderRadius || 0}px`,
                  objectFit: 'contain',
                  pointerEvents: 'none',
                  transition: 'all 0.1s ease',
                  ...(imageForm.position === 'top-left' ? { top: '12px', left: '12px' } :
                     imageForm.position === 'top-right' ? { top: '12px', right: '12px' } :
                     imageForm.position === 'bottom-left' ? { bottom: '12px', left: '12px' } :
                     imageForm.position === 'bottom-right' ? { bottom: '12px', right: '12px' } :
                     imageForm.position === 'center' ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' } :
                     { top: `${imageForm.y * 100}%`, left: `${imageForm.x * 100}%`, transform: 'translate(-50%, -50%)' })
                }}
              />
            )}
          </div>

          {/* Logo Title Input */}
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Nom du logo / filigrane</label>
            <input
              type="text"
              className="form-input"
              value={imageForm.name}
              onChange={(e) => setImageForm({ ...imageForm, name: e.target.value })}
              placeholder="ex: Logo Entreprise, Filigrane YouTube..."
              style={{ width: '100%', fontSize: '12px', padding: '4px 6px' }}
            />
          </div>

          {/* Position Presets */}
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
              Position à l'écran
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
              {[
                { id: 'top-left', label: '↖ Haut Gauche' },
                { id: 'top-right', label: '↗ Haut Droite' },
                { id: 'center', label: '🎯 Centre' },
                { id: 'bottom-left', label: '↙ Bas Gauche' },
                { id: 'bottom-right', label: '↘ Bas Droite' },
                { id: 'custom', label: '🕹️ Libre (X,Y)' }
              ].map((p) => {
                const isSelected = imageForm.position === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setImageForm({ ...imageForm, position: p.id as ImagePositionPreset })}
                    style={{
                      padding: '5px 4px',
                      fontSize: '10px',
                      borderRadius: '4px',
                      backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.04)',
                      border: isSelected ? '1px solid #10b981' : '1px solid var(--border-color)',
                      color: isSelected ? '#34d399' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontWeight: isSelected ? 600 : 400
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Coordinates if custom chosen */}
          {imageForm.position === 'custom' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: 'rgba(0,0,0,0.25)', padding: '6px', borderRadius: '4px' }}>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Axe X ({Math.round(imageForm.x * 100)}%)</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={imageForm.x}
                  onChange={(e) => setImageForm({ ...imageForm, x: parseFloat(e.target.value) })}
                  style={{ width: '100%', accentColor: '#10b981' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Axe Y ({Math.round(imageForm.y * 100)}%)</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={imageForm.y}
                  onChange={(e) => setImageForm({ ...imageForm, y: parseFloat(e.target.value) })}
                  style={{ width: '100%', accentColor: '#10b981' }}
                />
              </div>
            </div>
          )}

          {/* Sliders: Scale & Opacity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Taille / Échelle</span>
                <span style={{ color: '#34d399', fontWeight: 600 }}>{Math.round(imageForm.scale * 100)}%</span>
              </label>
              <input
                type="range"
                min={0.05}
                max={0.5}
                step={0.01}
                value={imageForm.scale}
                onChange={(e) => setImageForm({ ...imageForm, scale: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Opacité</span>
                <span style={{ color: '#34d399', fontWeight: 600 }}>{Math.round(imageForm.opacity * 100)}%</span>
              </label>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={imageForm.opacity}
                onChange={(e) => setImageForm({ ...imageForm, opacity: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Shadow & Rounded corners */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={imageForm.hasShadow ?? true}
                onChange={(e) => setImageForm({ ...imageForm, hasShadow: e.target.checked })}
                style={{ accentColor: '#10b981', cursor: 'pointer' }}
              />
              <span>Ombre portée (Drop shadow)</span>
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Coins arrondis :</span>
              <input
                type="number"
                min={0}
                max={50}
                value={imageForm.borderRadius || 0}
                onChange={(e) => setImageForm({ ...imageForm, borderRadius: parseInt(e.target.value) || 0 })}
                style={{ width: '45px', fontSize: '11px', padding: '2px 4px' }}
                className="form-input"
              />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>px</span>
            </div>
          </div>

          {/* Timing settings */}
          <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '8px', borderRadius: '5px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: isPermanentOverlay ? '#34d399' : 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isPermanentOverlay}
                onChange={(e) => setIsPermanentOverlay(e.target.checked)}
                style={{ accentColor: '#10b981', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: isPermanentOverlay ? 600 : 400 }}>
                Afficher pendant toute la vidéo (Watermark permanent)
              </span>
            </label>

            {!isPermanentOverlay && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Apparition à (s)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    className="form-input"
                    value={imageForm.startTime}
                    onChange={(e) => setImageForm({ ...imageForm, startTime: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', fontSize: '11px', padding: '3px 5px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Durée d'affichage (s)</label>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    className="form-input"
                    value={imageForm.duration}
                    onChange={(e) => setImageForm({ ...imageForm, duration: parseFloat(e.target.value) || 5 })}
                    style={{ width: '100%', fontSize: '11px', padding: '3px 5px' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '6px' }}>
            <button className="action-btn" onClick={onClose}>Annuler</button>
            <button
              className="btn-primary"
              onClick={onSaveImageOverlay}
              style={{ backgroundColor: '#10b981', color: '#042f2e', fontWeight: 600 }}
            >
              {imageModalMode === 'add' ? 'Ajouter à la vidéo' : 'Enregistrer les modifications'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
