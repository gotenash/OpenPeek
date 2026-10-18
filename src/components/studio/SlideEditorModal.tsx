import { useState, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';
import type { SavedMedia } from '../../utils/db';
import { drawSlideClip } from '../../utils/videoCompositor';
import { SlideThemePicker, SLIDE_COLOR_PRESETS } from './SlideThemePicker';
export { SLIDE_COLOR_PRESETS, SlideThemePicker };

export interface SlideEditorModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  initialForm: {
    title: string;
    subtitle: string;
    bgColor: string;
    textColor: string;
    subtextColor: string;
    fontSize: number;
    duration: number;
    align: 'center' | 'left' | 'right';
    bgImageUrl: string;
    transitionToNext: 'crossfade' | 'none' | 'fade-black' | 'slide';
  };
  initialPosition?: 'start' | 'current' | 'end';
  libraryImages?: SavedMedia[];
  onSave: (form: any, position?: 'start' | 'current' | 'end') => void;
  onClose: () => void;
}

export function SlideEditorModal({
  isOpen,
  mode,
  initialForm,
  initialPosition = 'start',
  libraryImages = [],
  onSave,
  onClose
}: SlideEditorModalProps) {
  const [form, setForm] = useState(initialForm);
  const [position, setPosition] = useState<'start' | 'current' | 'end'>(initialPosition);
  const miniCanvasRef = useRef<HTMLCanvasElement>(null);
  const bgImgElRef = useRef<HTMLImageElement | null>(null);

  // Pre-load background image if selected
  useEffect(() => {
    if (form.bgImageUrl) {
      const img = new Image();
      img.onload = () => {
        bgImgElRef.current = img;
        drawPreview();
      };
      img.src = form.bgImageUrl;
    } else {
      bgImgElRef.current = null;
      drawPreview();
    }
  }, [form.bgImageUrl]);

  const drawPreview = () => {
    const canvas = miniCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawSlideClip(ctx, {
      title: form.title,
      subtitle: form.subtitle,
      bgColor: form.bgColor,
      textColor: form.textColor,
      subtextColor: form.subtextColor,
      fontSize: form.fontSize,
      align: form.align,
      bgImageUrl: form.bgImageUrl,
      bgImageEl: bgImgElRef.current || undefined
    }, canvas.width, canvas.height);
  };

  useEffect(() => {
    drawPreview();
  }, [form]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1050 }}>
      <div
        className="glass-panel modal-content"
        style={{
          maxWidth: '680px',
          width: '94%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '18px',
          border: '1px solid rgba(139, 92, 246, 0.45)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.85), 0 0 35px rgba(139, 92, 246, 0.25)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ marginBottom: '12px' }}>
          <h3 className="modal-title" style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc' }}>
            <span>📑</span>
            <span>{mode === 'add' ? 'Ajouter une Diapositive Titre' : 'Modifier la Diapositive'}</span>
          </h3>
          <button className="close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Live Mini Preview Canvas */}
        <div style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16/9',
          maxHeight: '220px',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#000000',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '14px'
        }}>
          <canvas
            ref={miniCanvasRef}
            width={640}
            height={360}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
          <div style={{
            position: 'absolute',
            bottom: '6px',
            right: '8px',
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '9px',
            color: '#c4b5fd',
            fontFamily: 'monospace',
            fontWeight: 600
          }}>
            Aperçu Direct ({form.duration}s)
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Title & Subtitle Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>
                Titre principal
              </label>
              <input
                type="text"
                className="form-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="ex: Tutoriel Complet : OpenPeek Studio"
                style={{ width: '100%', fontSize: '13px', padding: '6px 10px', fontWeight: 600 }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>
                Sous-titre / Description (optionnel)
              </label>
              <input
                type="text"
                className="form-input"
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                placeholder="ex: Partie 1 : Introduction et prise en main"
                style={{ width: '100%', fontSize: '12px', padding: '5px 8px' }}
              />
            </div>
          </div>

          <SlideThemePicker
            currentBgColor={form.bgColor}
            onSelectTheme={({ bg, text, sub }: { bg: string; text: string; sub: string }) => setForm({
              ...form,
              bgColor: bg,
              textColor: text,
              subtextColor: sub
            })}
          />

          {/* Typography & Alignment Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            {/* Font Size */}
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>
                Taille Titre ({form.fontSize}px)
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[38, 48, 56, 68].map(sz => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setForm({ ...form, fontSize: sz })}
                    style={{
                      flex: 1,
                      padding: '4px 2px',
                      fontSize: '10px',
                      fontWeight: 600,
                      borderRadius: '4px',
                      backgroundColor: form.fontSize === sz ? 'rgba(139, 92, 246, 0.35)' : 'rgba(255,255,255,0.05)',
                      border: form.fontSize === sz ? '1px solid #8b5cf6' : '1px solid var(--border-color)',
                      color: form.fontSize === sz ? '#c4b5fd' : 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Alignment */}
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>
                Alignement
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['center', 'left', 'right'] as const).map(al => (
                  <button
                    key={al}
                    type="button"
                    onClick={() => setForm({ ...form, align: al })}
                    style={{
                      flex: 1,
                      padding: '4px 2px',
                      fontSize: '10px',
                      fontWeight: 600,
                      borderRadius: '4px',
                      backgroundColor: form.align === al ? 'rgba(139, 92, 246, 0.35)' : 'rgba(255,255,255,0.05)',
                      border: form.align === al ? '1px solid #8b5cf6' : '1px solid var(--border-color)',
                      color: form.align === al ? '#c4b5fd' : 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    {al === 'center' ? 'Centré' : al === 'left' ? 'Gauche' : 'Droite'}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>
                Durée (secondes)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                step={0.5}
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: parseFloat(e.target.value) || 4 })}
                className="form-input"
                style={{ width: '100%', fontSize: '11px', padding: '4px 6px' }}
              />
            </div>
          </div>

          {/* Transition & Optional Background Image */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>
                Transition vers le clip suivant
              </label>
              <select
                value={form.transitionToNext}
                onChange={(e) => setForm({ ...form, transitionToNext: e.target.value as any })}
                className="form-input"
                style={{ width: '100%', fontSize: '11px', padding: '4px 6px' }}
              >
                <option value="crossfade">Fondu Enchaîné (Crossfade)</option>
                <option value="fade-black">Fondu au Noir</option>
                <option value="slide">Glissement (Slide)</option>
                <option value="none">Coupe Franche (Cut)</option>
              </select>
            </div>

            {/* Background Image Picker from Library */}
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>
                Image d'arrière-plan (optionnelle)
              </label>
              <select
                value={form.bgImageUrl || ''}
                onChange={(e) => setForm({ ...form, bgImageUrl: e.target.value })}
                className="form-input"
                style={{ width: '100%', fontSize: '11px', padding: '4px 6px' }}
              >
                <option value="">Aucune (Dégradé uniquement)</option>
                {libraryImages.map((img) => (
                  <option key={img.id} value={img.thumbnail || (img.blob ? URL.createObjectURL(img.blob) : '')}>
                    {img.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Placement Position (only when adding a new slide) */}
          {mode === 'add' && (
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                Position d'insertion sur la piste vidéo
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
                        backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255,255,255,0.03)',
                        border: isSelected ? '1px solid #8b5cf6' : '1px solid var(--border-color)',
                        color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 700, color: isSelected ? '#c4b5fd' : '#ffffff' }}>
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
          )}

          {/* Actions Bottom Bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button className="action-btn" type="button" onClick={onClose}>
              Annuler
            </button>
            <button
              className="btn-primary"
              type="button"
              onClick={() => onSave(form, position)}
              style={{
                backgroundColor: '#8b5cf6',
                borderColor: '#8b5cf6',
                padding: '6px 16px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Check size={14} />
              <span>{mode === 'add' ? 'Insérer la Diapositive' : 'Enregistrer les Modifications'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
