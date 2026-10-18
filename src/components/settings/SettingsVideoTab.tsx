import { Monitor } from 'lucide-react';
import type { RecorderOptions } from '../../hooks/useRecorder';
import { useI18n } from '../../i18n/I18nContext';
import { SettingsCinematicEffects } from './SettingsCinematicEffects';

interface SettingsVideoTabProps {
  options: RecorderOptions;
  handleSelect: (key: keyof RecorderOptions, value: any) => void;
  handleCheckbox: (key: keyof RecorderOptions) => void;
  systemMonitors: Array<{ id: string; name: string; is_primary: boolean; width: number; height: number }>;
  showRestartNotice: boolean;
  setShowRestartNotice: (show: boolean) => void;
}

export function SettingsVideoTab({
  options,
  handleSelect,
  handleCheckbox,
  systemMonitors,
  showRestartNotice,
  setShowRestartNotice
}: SettingsVideoTabProps) {
  const { t } = useI18n();

  return (
    <div className="glass-panel settings-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <h2 className="settings-card-title" style={{ fontSize: '15px', marginBottom: '4px' }}>
        <Monitor size={18} className="logo-icon-inline" style={{ verticalAlign: 'middle', marginRight: '8px' }} />
        {t('settings.video.title')}
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div className="form-group">
          <label className="form-label" style={{ fontSize: '12px' }}>Résolution de Capture</label>
          <select 
            className="form-select" 
            value={options.resolution} 
            onChange={(e) => handleSelect('resolution', e.target.value)}
            style={{ padding: '6px 10px', fontSize: '13px' }}
          >
            <option value="720p">720p (HD - 1280x720)</option>
            <option value="1080p">1080p (Full HD - 1920x1080)</option>
            <option value="4k">4K (Ultra HD - 3840x2160)</option>
          </select>
          <p className="form-help" style={{ fontSize: '11px' }}>1080p recommandé pour la clarté des tutoriels de code.</p>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontSize: '12px' }}>Fréquence d'Images (FPS)</label>
          <select 
            className="form-select" 
            value={options.frameRate} 
            onChange={(e) => handleSelect('frameRate', Number(e.target.value))}
            style={{ padding: '6px 10px', fontSize: '13px' }}
          >
            <option value="30">30 FPS (Standard pour tutoriels)</option>
            <option value="60">60 FPS (Ultra fluide - Idéal pour le jeu / animations)</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" style={{ fontSize: '12px' }}>Format / Codec d'Encodage</label>
        <select 
          className="form-select" 
          value={options.codec} 
          onChange={(e) => handleSelect('codec', e.target.value)}
          style={{ padding: '6px 10px', fontSize: '13px' }}
        >
          <option value="video/webm;codecs=h264">WebM (Codec H.264 - Accélération matérielle GPU, ultra léger et fluide)</option>
          <option value="video/webm;codecs=vp9">WebM (Codec VP9 - Haute qualité logicielle)</option>
          <option value="video/webm;codecs=vp8">WebM (Codec VP8 - Compatibilité universelle)</option>
        </select>
      </div>

      {/* Capture Surface Preference */}
      <div className="form-group" style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
        <label className="form-label" style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Monitor size={14} />
          <span>{t('settings.video.captureSourceTitle')}</span>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={() => handleSelect('captureSourcePreference', 'screen')}
            className="btn-toolbar"
            style={{
              fontSize: '11px',
              padding: '8px 10px',
              justifyContent: 'center',
              backgroundColor: (options.captureSourcePreference || 'screen') === 'screen' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.04)',
              borderColor: (options.captureSourcePreference || 'screen') === 'screen' ? '#38bdf8' : 'var(--border-color)',
              color: (options.captureSourcePreference || 'screen') === 'screen' ? '#38bdf8' : 'var(--text-secondary)',
              fontWeight: (options.captureSourcePreference || 'screen') === 'screen' ? 700 : 500
            }}
          >
            {t('settings.video.screenDirect')}
          </button>

          <button
            type="button"
            onClick={() => handleSelect('captureSourcePreference', 'window')}
            className="btn-toolbar"
            style={{
              fontSize: '11px',
              padding: '8px 10px',
              justifyContent: 'center',
              backgroundColor: options.captureSourcePreference === 'window' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.04)',
              borderColor: options.captureSourcePreference === 'window' ? '#38bdf8' : 'var(--border-color)',
              color: options.captureSourcePreference === 'window' ? '#38bdf8' : 'var(--text-secondary)',
              fontWeight: options.captureSourcePreference === 'window' ? 700 : 500
            }}
          >
            {t('settings.video.windowDirect')}
          </button>
        </div>
        <p className="form-help" style={{ marginTop: '6px', fontSize: '11px' }}>
          {(options.captureSourcePreference || 'screen') === 'screen'
            ? t('settings.video.captureSourceHelpScreen')
            : t('settings.video.captureSourceHelpWindow')}
        </p>
      </div>

      {/* Multi-Monitor / Screen Selection */}
      <div className="form-group" style={{ padding: '12px 14px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.06)', border: '1px solid rgba(56, 189, 248, 0.25)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <label className="form-label" style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
            <Monitor size={16} />
            <span>{t('settings.video.monitorsTitle')}</span>
          </label>
          {systemMonitors.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {systemMonitors.map((m, idx) => (
                <span 
                  key={m.id || idx}
                  style={{ 
                    fontSize: '10px', 
                    padding: '2px 8px', 
                    borderRadius: '4px', 
                    background: m.is_primary ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    border: m.is_primary ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--border-color)',
                    color: m.is_primary ? '#38bdf8' : 'var(--text-secondary)'
                  }}
                >
                  Écran {idx + 1}: {m.width}×{m.height} {m.is_primary ? `(${t('settings.video.monitorPrimary')})` : ''}
                </span>
              ))}
            </div>
          )}
        </div>
        
        <p className="form-help" style={{ fontSize: '11px', margin: 0 }}>
          {t('settings.video.monitorsSubtitle')}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: systemMonitors.length >= 2 ? '1fr 1fr 1fr' : '1fr 1fr', gap: '8px' }}>
          {/* Option 1: Interactive Picker */}
          <button
            type="button"
            onClick={() => {
              handleSelect('selectedMonitorId', 'prompt');
              import('@tauri-apps/api/core').then(({ invoke }) => {
                invoke('save_screen_preference', { preference: 'prompt' }).catch(() => {});
              }).catch(() => {});
              setShowRestartNotice(true);
            }}
            className="btn-toolbar"
            style={{
              fontSize: '11px',
              padding: '10px 8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              textAlign: 'center',
              backgroundColor: (options.selectedMonitorId || 'prompt') === 'prompt' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.04)',
              borderColor: (options.selectedMonitorId || 'prompt') === 'prompt' ? '#38bdf8' : 'var(--border-color)',
              color: (options.selectedMonitorId || 'prompt') === 'prompt' ? '#38bdf8' : 'var(--text-secondary)',
              fontWeight: (options.selectedMonitorId || 'prompt') === 'prompt' ? 700 : 500
            }}
          >
            <span>{t('settings.video.monitorPrompt')}</span>
          </button>

          {/* Option 2: Screen 1 */}
          <button
            type="button"
            onClick={() => {
              handleSelect('selectedMonitorId', 'screen1');
              import('@tauri-apps/api/core').then(({ invoke }) => {
                invoke('save_screen_preference', { preference: 'screen1' }).catch(() => {});
              }).catch(() => {});
              setShowRestartNotice(true);
            }}
            className="btn-toolbar"
            style={{
              fontSize: '11px',
              padding: '10px 8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              textAlign: 'center',
              backgroundColor: options.selectedMonitorId === 'screen1' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.04)',
              borderColor: options.selectedMonitorId === 'screen1' ? '#38bdf8' : 'var(--border-color)',
              color: options.selectedMonitorId === 'screen1' ? '#38bdf8' : 'var(--text-secondary)',
              fontWeight: options.selectedMonitorId === 'screen1' ? 700 : 500
            }}
          >
            <span>{t('settings.video.monitorScreen1')}</span>
            {systemMonitors[0] && (
              <span style={{ fontSize: '10px', opacity: 0.8 }}>({systemMonitors[0].width}×{systemMonitors[0].height})</span>
            )}
          </button>

          {/* Option 3: Screen 2 (if present) */}
          {systemMonitors.length >= 2 && (
            <button
              type="button"
              onClick={() => {
                handleSelect('selectedMonitorId', 'screen2');
                import('@tauri-apps/api/core').then(({ invoke }) => {
                  invoke('save_screen_preference', { preference: 'screen2' }).catch(() => {});
                }).catch(() => {});
                setShowRestartNotice(true);
              }}
              className="btn-toolbar"
              style={{
                fontSize: '11px',
                padding: '10px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                textAlign: 'center',
                backgroundColor: options.selectedMonitorId === 'screen2' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.04)',
                borderColor: options.selectedMonitorId === 'screen2' ? '#38bdf8' : 'var(--border-color)',
                color: options.selectedMonitorId === 'screen2' ? '#38bdf8' : 'var(--text-secondary)',
                fontWeight: options.selectedMonitorId === 'screen2' ? 700 : 500
              }}
            >
              <span>{t('settings.video.monitorScreen2')}</span>
              {systemMonitors[1] && (
                <span style={{ fontSize: '10px', opacity: 0.8 }}>({systemMonitors[1].width}×{systemMonitors[1].height})</span>
              )}
            </button>
          )}
        </div>

        <p className="form-help" style={{ fontSize: '11px', margin: 0 }}>
          {(options.selectedMonitorId || 'prompt') === 'prompt' 
            ? t('settings.video.monitorPromptDesc')
            : options.selectedMonitorId === 'screen2'
            ? `Cible directement le second moniteur (${systemMonitors[1]?.width || 1920}×${systemMonitors[1]?.height || 1080}) sans boîte de dialogue.`
            : `Cible directement le premier moniteur (${systemMonitors[0]?.width || 1366}×${systemMonitors[0]?.height || 768}) sans boîte de dialogue.`
          }
        </p>

        {showRestartNotice && (
          <div style={{
            marginTop: '4px',
            padding: '8px 12px',
            borderRadius: '6px',
            background: 'rgba(234, 179, 8, 0.12)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            color: '#fde047',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>ℹ️ {t('settings.video.restartNotice')}</span>
          </div>
        )}
      </div>

      <div className="form-group" style={{ paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
        <label className="form-checkbox-row" style={{ cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            className="form-checkbox" 
            checked={options.showMouseClicks}
            onChange={() => handleCheckbox('showMouseClicks')}
          />
          <span className="form-label" style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>
            {t('settings.video.clickRipples')}
          </span>
        </label>
        <p className="form-help" style={{ marginLeft: '26px', marginTop: '2px', fontSize: '11px' }}>
          {t('settings.video.clickRipplesHelp')}
        </p>
      </div>

      <SettingsCinematicEffects
        options={options}
        handleSelect={handleSelect}
        handleCheckbox={handleCheckbox}
      />
    </div>
  );
}
