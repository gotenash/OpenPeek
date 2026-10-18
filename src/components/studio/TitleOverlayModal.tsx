import React from 'react';
import { Type, X } from 'lucide-react';
import type { TimelineTitle } from '../../utils/videoCompositor';

export interface TitleFormData {
  id?: string;
  text: string;
  subtitle?: string;
  style: TimelineTitle['style'];
  animation: TimelineTitle['animation'];
  startTime: number;
  duration: number;
  fontSize: number;
  textColor: string;
}

export interface TitleOverlayModalProps {
  isOpen: boolean;
  titleForm: TitleFormData;
  setTitleForm: React.Dispatch<React.SetStateAction<TitleFormData>>;
  onSaveTitle: () => void;
  onClose: () => void;
}

export function TitleOverlayModal({
  isOpen,
  titleForm,
  setTitleForm,
  onSaveTitle,
  onClose
}: TitleOverlayModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-panel modal-content" style={{ maxWidth: '440px', padding: '16px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', color: '#c084fc' }}>
            <Type size={16} />
            {titleForm.id ? 'Modifier le Titre / Carton' : 'Ajouter un Titre / Carton'}
          </h3>
          <button className="close-btn" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Texte principal</label>
            <input
              type="text"
              className="form-input"
              value={titleForm.text}
              onChange={(e) => setTitleForm({ ...titleForm, text: e.target.value })}
              placeholder="ex: Bienvenue sur le tutoriel, Étape 1..."
              style={{ width: '100%', fontSize: '12px', padding: '5px 8px', fontWeight: 600 }}
              autoFocus
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Sous-titre (optionnel)</label>
            <input
              type="text"
              className="form-input"
              value={titleForm.subtitle || ''}
              onChange={(e) => setTitleForm({ ...titleForm, subtitle: e.target.value })}
              placeholder="ex: Sous-titre ou explication secondaire..."
              style={{ width: '100%', fontSize: '12px', padding: '5px 8px' }}
            />
          </div>

          {/* Disposition / Style de Titre */}
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
              Style de disposition
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
              {[
                { id: 'lowerthird', label: '🎬 Bandeau Inférieur', desc: 'Bas-gauche + barre violette (safe webcam)' },
                { id: 'pill', label: '💊 Pilule Screen Studio', desc: 'Capsule moderne + puce lumineuse' },
                { id: 'badge', label: '🏷️ Encart Haut-Gauche', desc: 'Badge tag pour astuce / raccourci' },
                { id: 'center-card', label: '🔲 Cartouche Glass', desc: 'Boîte centrale avec flou & glow' },
                { id: 'cinema', label: '🎞️ Cinéma Épuré', desc: 'Dégradé d\'ambiance sans boîte' },
                { id: 'intro', label: '🚀 Plein Écran Intro', desc: 'Carton d\'ouverture de vidéo' },
                { id: 'outro', label: '🏁 Plein Écran Outro', desc: 'Carton de fin & remerciements' }
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setTitleForm({ ...titleForm, style: st.id as any })}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    backgroundColor: titleForm.style === st.id ? 'rgba(192, 132, 252, 0.22)' : 'rgba(255,255,255,0.04)',
                    border: titleForm.style === st.id ? '1.5px solid #c084fc' : '1px solid rgba(255,255,255,0.1)',
                    color: titleForm.style === st.id ? '#ffffff' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontWeight: 700, color: titleForm.style === st.id ? '#c084fc' : '#ffffff' }}>{st.label}</span>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', lineHeight: '1.2' }}>{st.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Forme d'Apparition / Animation */}
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
              Forme d'apparition (Animation)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px' }}>
              {[
                { id: 'slide-up', label: '⬆️ Gliss. Haut', desc: 'Montée fluide' },
                { id: 'slide-left', label: '➡️ Gliss. Gauche', desc: 'Arrivée latérale' },
                { id: 'zoom-in', label: '🔍 Zoom Avant', desc: 'Échelle progressive' },
                { id: 'pop-bounce', label: '💥 Rebond Pop', desc: 'Effet punchy & spring' },
                { id: 'typewriter', label: '⌨️ Écriture', desc: 'Lettre par lettre' },
                { id: 'fade', label: '🌫️ Fondu Doux', desc: 'Par transparence' }
              ].map((an) => (
                <button
                  key={an.id}
                  type="button"
                  onClick={() => setTitleForm({ ...titleForm, animation: an.id as any })}
                  style={{
                    padding: '5px 6px',
                    borderRadius: '5px',
                    fontSize: '10px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1px',
                    backgroundColor: (titleForm.animation || 'slide-up') === an.id ? 'rgba(56, 189, 248, 0.22)' : 'rgba(255,255,255,0.04)',
                    border: (titleForm.animation || 'slide-up') === an.id ? '1.5px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                    color: (titleForm.animation || 'slide-up') === an.id ? '#ffffff' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontWeight: 700, color: (titleForm.animation || 'slide-up') === an.id ? '#38bdf8' : '#ffffff' }}>{an.label}</span>
                  <span style={{ fontSize: '8.5px', color: 'var(--text-muted)' }}>{an.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Timing & Police */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Début (s)</label>
              <input
                type="number"
                min={0}
                step={0.5}
                className="form-input"
                value={titleForm.startTime}
                onChange={(e) => setTitleForm({ ...titleForm, startTime: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', fontSize: '11px', padding: '4px 6px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Durée (s)</label>
              <input
                type="number"
                min={0.5}
                max={30}
                step={0.5}
                className="form-input"
                value={titleForm.duration}
                onChange={(e) => setTitleForm({ ...titleForm, duration: parseFloat(e.target.value) || 3 })}
                style={{ width: '100%', fontSize: '11px', padding: '4px 6px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Taille texte</label>
              <select
                className="form-input"
                value={titleForm.fontSize}
                onChange={(e) => setTitleForm({ ...titleForm, fontSize: parseInt(e.target.value, 10) || 28 })}
                style={{ width: '100%', fontSize: '11px', padding: '4px 6px' }}
              >
                <option value={22}>22px (Discret)</option>
                <option value={28}>28px (Standard)</option>
                <option value={36}>36px (Moyen)</option>
                <option value={44}>44px (Grand)</option>
              </select>
            </div>
          </div>

          {/* Couleurs rapides */}
          <div>
            <label style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>Couleur du texte</label>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {['#ffffff', '#fde68a', '#38bdf8', '#c084fc', '#34d399', '#f87171'].map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setTitleForm({ ...titleForm, textColor: col })}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: col,
                    border: titleForm.textColor === col ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                    boxShadow: titleForm.textColor === col ? '0 0 6px rgba(255,255,255,0.8)' : 'none',
                    cursor: 'pointer'
                  }}
                />
              ))}
              <input
                type="color"
                value={titleForm.textColor || '#ffffff'}
                onChange={(e) => setTitleForm({ ...titleForm, textColor: e.target.value })}
                style={{ width: '22px', height: '22px', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                title="Choisir une couleur personnalisée"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
            <button className="action-btn" onClick={onClose}>Annuler</button>
            <button className="btn-primary" onClick={onSaveTitle} style={{ padding: '6px 16px', fontWeight: 700 }}>
              Valider le titre
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
