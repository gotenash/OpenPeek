import React from 'react';
import { Mic, X } from 'lucide-react';

export interface VoiceoverFormData {
  id?: string;
  label: string;
  startTime: number;
  duration: number;
  volume: number;
  url?: string;
}

export interface VoiceoverModalProps {
  isOpen: boolean;
  voiceoverForm: VoiceoverFormData | null;
  setVoiceoverForm: React.Dispatch<React.SetStateAction<VoiceoverFormData | null>>;
  onSaveVoiceover: () => void;
  onClose: () => void;
}

export function VoiceoverModal({
  isOpen,
  voiceoverForm,
  setVoiceoverForm,
  onSaveVoiceover,
  onClose
}: VoiceoverModalProps) {
  if (!isOpen || !voiceoverForm) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-panel modal-content" style={{ maxWidth: '420px', padding: '16px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', color: '#f43f5e' }}>
            <Mic size={15} />
            <span>Modifier l'Enregistrement Vocal</span>
          </h3>
          <button className="close-btn" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Nom / Titre du clip vocal</label>
            <input
              type="text"
              className="form-input"
              value={voiceoverForm.label}
              onChange={(e) => setVoiceoverForm({ ...voiceoverForm, label: e.target.value })}
              style={{ width: '100%', fontSize: '12px', padding: '4px 6px', marginTop: '3px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Position Début (s)</label>
              <input
                type="number"
                disabled
                value={voiceoverForm.startTime}
                style={{ width: '100%', fontSize: '11px', padding: '3px 5px', opacity: 0.7, cursor: 'not-allowed', marginTop: '3px' }}
                className="form-input"
                title="Déplacez le clip directement sur la piste chronologique pour changer sa position"
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Durée (s)</label>
              <input
                type="number"
                disabled
                value={voiceoverForm.duration}
                style={{ width: '100%', fontSize: '11px', padding: '3px 5px', opacity: 0.7, cursor: 'not-allowed', marginTop: '3px' }}
                className="form-input"
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Volume de la voix</label>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#f43f5e' }}>{Math.round(voiceoverForm.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={voiceoverForm.volume}
              onChange={(e) => setVoiceoverForm({ ...voiceoverForm, volume: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: '#f43f5e', cursor: 'pointer' }}
            />
          </div>

          {voiceoverForm.url && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Pré-écoute du clip vocal :</label>
              <audio controls src={voiceoverForm.url} style={{ width: '100%', height: '32px' }} />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '8px' }}>
            <button className="action-btn" onClick={onClose}>Annuler</button>
            <button
              className="btn-primary"
              onClick={onSaveVoiceover}
              style={{ backgroundColor: '#f43f5e', color: '#ffffff', fontWeight: 600 }}
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
