import { Volume2, ShieldAlert, Mic } from 'lucide-react';
import type { RecorderOptions } from '../../hooks/useRecorder';

interface SettingsAudioTabProps {
  options: RecorderOptions;
  handleSelect: (key: keyof RecorderOptions, value: any) => void;
  handleCheckbox: (key: keyof RecorderOptions) => void;
  mics: MediaDeviceInfo[];
  permissionError: boolean;
}

export function SettingsAudioTab({
  options,
  handleSelect,
  handleCheckbox,
  mics,
  permissionError
}: SettingsAudioTabProps) {
  return (
    <div className="glass-panel settings-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <h2 className="settings-card-title" style={{ fontSize: '15px', marginBottom: '4px' }}>
        <Volume2 size={18} className="logo-icon-inline" style={{ verticalAlign: 'middle', marginRight: '8px' }} />
        Configuration des Sources Audio
      </h2>

      {permissionError && (
        <div style={{ display: 'flex', gap: '8px', padding: '10px', background: 'rgba(244,63,94,0.1)', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.3)', fontSize: '12px', color: '#fb7185' }}>
          <ShieldAlert size={16} style={{ flexShrink: 0 }} />
          <span>Accès microphone bloqué. Veuillez accorder l'autorisation dans les paramètres système.</span>
        </div>
      )}

      <div className="form-group" style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
        <label className="form-checkbox-row" style={{ cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            className="form-checkbox" 
            checked={options.recordMic}
            onChange={() => handleCheckbox('recordMic')}
          />
          <span className="form-label" style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>
            Enregistrer la Voix (Microphone)
          </span>
        </label>
        
        {options.recordMic && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', marginLeft: '26px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Mic size={16} color="#c084fc" />
              <select 
                className="form-select" 
                style={{ flexGrow: 1, padding: '6px 10px', fontSize: '13px' }}
                value={options.selectedMicId} 
                onChange={(e) => handleSelect('selectedMicId', e.target.value)}
              >
                {mics.map(mic => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || `Microphone (${mic.deviceId.slice(0, 8)}...)`}
                  </option>
                ))}
                {mics.length === 0 && <option value="">Aucun microphone détecté</option>}
              </select>
            </div>

            {/* DSP Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
              <label className="form-checkbox-row" style={{ cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  className="form-checkbox" 
                  checked={options.enableNoiseSuppression !== false}
                  onChange={() => handleCheckbox('enableNoiseSuppression')}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="form-label" style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#38bdf8' }}>
                    🛡️ Réducteur de Bruit Intelligent (Anti-Rumble & Souffle)
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    Filtre passe-haut (85 Hz) et suppression active des bruits de ventilateurs et de frottements.
                  </span>
                </div>
              </label>

              <label className="form-checkbox-row" style={{ cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  className="form-checkbox" 
                  checked={options.enableVocalEnhancer !== false}
                  onChange={() => handleCheckbox('enableVocalEnhancer')}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="form-label" style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#c084fc' }}>
                    ✨ Microphone Enhancer (Égaliseur Vocal & Compresseur Studio)
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    Clarté vocale renforcée (+3.5 dB à 3.2 kHz) et compresseur dynamique pour un rendu podcast / radio.
                  </span>
                </div>
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', width: '130px' }}>
                  🎚️ Volume Micro : {Math.round((options.micGain || 1.15) * 100)}%
                </span>
                <input
                  type="range"
                  min={0.8}
                  max={2.0}
                  step={0.05}
                  value={options.micGain !== undefined ? options.micGain : 1.15}
                  onChange={(e) => handleSelect('micGain', parseFloat(e.target.value))}
                  style={{ flexGrow: 1, accentColor: '#8b5cf6', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="form-group" style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
        <label className="form-checkbox-row" style={{ cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            className="form-checkbox" 
            checked={options.recordSystemAudio}
            onChange={() => handleCheckbox('recordSystemAudio')}
          />
          <span className="form-label" style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>
            Enregistrer le Son Système (Bureau / Applications)
          </span>
        </label>
        <p className="form-help" style={{ marginLeft: '26px', marginTop: '4px', fontSize: '11px' }}>
          Mixe automatiquement les sons émis par vos applications, vidéos et jeux pendant la capture.
        </p>
      </div>
    </div>
  );
}
