import { Keyboard, ZoomIn, Languages } from 'lucide-react';
import type { RecorderOptions } from '../../hooks/useRecorder';
import { useI18n } from '../../i18n/I18nContext';

interface SettingsShortcutsTabProps {
  options: RecorderOptions;
  handleSelect: (key: keyof RecorderOptions, value: any) => void;
  handleCheckbox: (key: keyof RecorderOptions) => void;
}

export function SettingsShortcutsTab({
  options,
  handleSelect,
  handleCheckbox
}: SettingsShortcutsTabProps) {
  const { t, language, setLanguage } = useI18n();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div className="glass-panel settings-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 className="settings-card-title" style={{ fontSize: '15px', marginBottom: '4px' }}>
          <Keyboard size={18} className="logo-icon-inline" style={{ verticalAlign: 'middle', marginRight: '8px' }} />
          {t('settings.shortcuts.title')}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8' }}>🎬 {t('settings.shortcuts.record')}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('settings.shortcuts.recordDesc')}</span>
            </div>
            <span className="shortcut-badge" style={{ fontSize: '11px', padding: '4px 8px', borderColor: '#38bdf8', color: '#38bdf8' }}>F6 / Alt + R</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fde047' }}>⏸️ {t('settings.shortcuts.pause')}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('settings.shortcuts.pauseDesc')}</span>
            </div>
            <span className="shortcut-badge" style={{ fontSize: '11px', padding: '4px 8px', borderColor: '#fde047', color: '#fde047' }}>F7 / Alt + P</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>🔍 {t('settings.shortcuts.zoom')}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('settings.shortcuts.zoomDesc')}</span>
            </div>
            <span className="shortcut-badge" style={{ fontSize: '11px', padding: '4px 8px' }}>F9 / Alt + Z</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>✏️ {t('settings.shortcuts.draw')}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('settings.shortcuts.drawDesc')}</span>
            </div>
            <span className="shortcut-badge" style={{ fontSize: '11px', padding: '4px 8px' }}>F8 / Alt + D</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>🧹 {t('settings.shortcuts.clear')}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('settings.shortcuts.clearDesc')}</span>
            </div>
            <span className="shortcut-badge" style={{ fontSize: '11px', padding: '4px 8px' }}>F10 / Alt + C</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>❌ {t('settings.shortcuts.exitDraw')}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('settings.shortcuts.exitDrawDesc')}</span>
            </div>
            <span className="shortcut-badge" style={{ fontSize: '11px', padding: '4px 8px' }}>Esc</span>
          </div>
        </div>
      </div>

      {/* Zoom Indicators & Feedback (Single Monitor UX Helper) */}
      <div className="glass-panel settings-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <h2 className="settings-card-title" style={{ fontSize: '15px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ZoomIn size={18} className="logo-icon-inline" color="#38bdf8" />
            <span>{t('settings.zoomFeedback.title')}</span>
          </h2>
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>
            {t('settings.zoomFeedback.subtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Option 1: Sound Feedback */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={options.zoomSoundFeedback !== false}
              onChange={() => handleCheckbox('zoomSoundFeedback')}
              style={{ marginTop: '2px', accentColor: 'var(--primary)' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                🔊 {t('settings.zoomFeedback.sound')}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {t('settings.zoomFeedback.soundDesc')}
              </span>
            </div>
          </label>

          {/* Option 2: Floating Toast */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={options.zoomToastFeedback !== false}
              onChange={() => handleCheckbox('zoomToastFeedback')}
              style={{ marginTop: '2px', accentColor: 'var(--primary)' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                🏷️ {t('settings.zoomFeedback.toast')}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {t('settings.zoomFeedback.toastDesc')}
              </span>
            </div>
          </label>

          {/* Option 3: Persistent Corner Indicator */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={options.zoomCornerIndicator !== false}
              onChange={() => handleCheckbox('zoomCornerIndicator')}
              style={{ marginTop: '2px', accentColor: 'var(--primary)' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                📌 {t('settings.zoomFeedback.corner')}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {t('settings.zoomFeedback.cornerDesc')}
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Keystroke Visualizer HUD Card */}
      <div className="glass-panel settings-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <h2 className="settings-card-title" style={{ fontSize: '15px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Keyboard size={18} className="logo-icon-inline" color="#38bdf8" />
            <span>{t('settings.keystrokeHUD.title')}</span>
          </h2>
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>
            {t('settings.keystrokeHUD.subtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={options.enableKeystrokeHUD !== false}
              onChange={() => handleCheckbox('enableKeystrokeHUD')}
              style={{ marginTop: '2px', accentColor: '#38bdf8' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#38bdf8' }}>
                ⌨️ {t('settings.keystrokeHUD.enable')}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {t('settings.keystrokeHUD.enableHelp')}
              </span>
            </div>
          </label>

          {options.enableKeystrokeHUD !== false && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginLeft: '28px' }}>
              <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>
                {t('settings.keystrokeHUD.positionTitle')}
              </label>
              <select 
                className="form-select" 
                value={options.keystrokeHUDPosition || 'bottom-center'} 
                onChange={(e) => handleSelect('keystrokeHUDPosition', e.target.value)}
                style={{ padding: '8px 12px', fontSize: '12px', maxWidth: '320px' }}
              >
                <option value="bottom-center">{t('settings.keystrokeHUD.posBottomCenter')}</option>
                <option value="bottom-left">{t('settings.keystrokeHUD.posBottomLeft')}</option>
                <option value="bottom-right">{t('settings.keystrokeHUD.posBottomRight')}</option>
                <option value="top-right">{t('settings.keystrokeHUD.posTopRight')}</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Interface Language Card */}
      <div className="glass-panel settings-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Languages size={20} className="logo-icon-inline" />
          <div>
            <span style={{ fontSize: '14px', fontWeight: 700 }}>{t('settings.language.title')}</span>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>Switch between French and English instantly</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setLanguage('fr')}
            className="btn-toolbar"
            style={{
              padding: '6px 14px',
              backgroundColor: language === 'fr' ? 'var(--primary)' : 'rgba(255,255,255,0.04)',
              color: language === 'fr' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: language === 'fr' ? 700 : 500
            }}
          >
            {t('settings.language.french')}
          </button>

          <button
            type="button"
            onClick={() => setLanguage('en')}
            className="btn-toolbar"
            style={{
              padding: '6px 14px',
              backgroundColor: language === 'en' ? 'var(--primary)' : 'rgba(255,255,255,0.04)',
              color: language === 'en' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: language === 'en' ? 700 : 500
            }}
          >
            {t('settings.language.english')}
          </button>
        </div>
      </div>
    </div>
  );
}
