import React from 'react';
import { ZoomIn, X, Crosshair } from 'lucide-react';

export interface ZoomFormData {
  id?: string;
  label?: string;
  scale: number;
  originX: number;
  originY: number;
  startTime: number;
  duration: number;
}

export interface ZoomEffectModalProps {
  isOpen: boolean;
  zoomForm: ZoomFormData;
  setZoomForm: React.Dispatch<React.SetStateAction<ZoomFormData>>;
  onSaveZoom: () => void;
  onClose: () => void;
}

export function ZoomEffectModal({
  isOpen,
  zoomForm,
  setZoomForm,
  onSaveZoom,
  onClose
}: ZoomEffectModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-panel modal-content" style={{ maxWidth: '420px', padding: '16px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b' }}>
            <ZoomIn size={16} />
            Zoom Dynamique (Effet Studio)
          </h3>
          <button className="close-btn" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Nom / Annotation (optionnel)</label>
            <input
              type="text"
              className="form-input"
              value={zoomForm.label || ''}
              onChange={(e) => setZoomForm({ ...zoomForm, label: e.target.value })}
              placeholder="ex: Focus sur le bouton, Détail du code..."
              style={{ width: '100%', fontSize: '12px', padding: '4px 6px' }}
            />
          </div>

          {/* Zoom Scale Selector */}
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Facteur d'agrandissement</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[1.5, 2.0, 2.5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setZoomForm({ ...zoomForm, scale: s })}
                  style={{
                    flex: 1,
                    padding: '5px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: zoomForm.scale === s ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.05)',
                    border: zoomForm.scale === s ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                    color: zoomForm.scale === s ? '#fde68a' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* 3x3 Target Zone Selector */}
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
              Zone cible du focus (Point d'ancrage)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', backgroundColor: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '6px' }}>
              {[
                { name: 'Haut Gauche', x: 0.2, y: 0.2 },
                { name: 'Haut Centre', x: 0.5, y: 0.2 },
                { name: 'Haut Droite', x: 0.8, y: 0.2 },
                { name: 'Gauche', x: 0.2, y: 0.5 },
                { name: 'Centre', x: 0.5, y: 0.5 },
                { name: 'Droite', x: 0.8, y: 0.5 },
                { name: 'Bas Gauche', x: 0.2, y: 0.8 },
                { name: 'Bas Centre', x: 0.5, y: 0.8 },
                { name: 'Bas Droite', x: 0.8, y: 0.8 }
              ].map((pos) => {
                const isSelected = Math.abs(zoomForm.originX - pos.x) < 0.1 && Math.abs(zoomForm.originY - pos.y) < 0.1;
                return (
                  <button
                    key={pos.name}
                    type="button"
                    onClick={() => setZoomForm({ ...zoomForm, originX: pos.x, originY: pos.y })}
                    style={{
                      padding: '6px 4px',
                      fontSize: '10px',
                      borderRadius: '4px',
                      backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255,255,255,0.03)',
                      border: isSelected ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)',
                      color: isSelected ? '#fde68a' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                  >
                    <Crosshair size={10} color={isSelected ? '#f59e0b' : '#64748b'} />
                    <span>{pos.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Range */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Début (s)</label>
              <input
                type="number"
                min={0}
                step={0.5}
                className="form-input"
                value={zoomForm.startTime}
                onChange={(e) => setZoomForm({ ...zoomForm, startTime: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', fontSize: '11px', padding: '3px 5px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Durée (s)</label>
              <input
                type="number"
                min={1}
                max={30}
                step={0.5}
                className="form-input"
                value={zoomForm.duration}
                onChange={(e) => setZoomForm({ ...zoomForm, duration: parseFloat(e.target.value) || 3 })}
                style={{ width: '100%', fontSize: '11px', padding: '3px 5px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '6px' }}>
            <button className="action-btn" onClick={onClose}>Annuler</button>
            <button className="btn-primary" onClick={onSaveZoom} style={{ backgroundColor: '#f59e0b', color: '#000000', fontWeight: 600 }}>
              Appliquer le Zoom
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
