import { MousePointer, Sparkles } from 'lucide-react';
import type { RecorderOptions } from '../../hooks/useRecorder';
import { useI18n } from '../../i18n/I18nContext';

interface SettingsCinematicEffectsProps {
  options: RecorderOptions;
  handleSelect: (key: keyof RecorderOptions, value: any) => void;
  handleCheckbox: (key: keyof RecorderOptions) => void;
}

export function SettingsCinematicEffects({
  options,
  handleSelect,
  handleCheckbox
}: SettingsCinematicEffectsProps) {
  const { t } = useI18n();

  return (
    <>
      {/* Feature: Auto-Zoom Cinématique */}
      <div className="form-group" style={{ padding: '12px 14px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <label className="form-checkbox-row" style={{ cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            className="form-checkbox" 
            checked={Boolean(options.enableAutoZoom)}
            onChange={() => handleCheckbox('enableAutoZoom')}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="form-label" style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={15} />
              Auto-Zoom Cinématique Intelligent (Screen Studio Effect)
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Zoome automatiquement et de manière fluide vers vos actions à chaque clic de souris, puis revient en vue globale.
            </span>
          </div>
        </label>

        {options.enableAutoZoom && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginLeft: '26px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                <span>Grossissement :</span>
                <strong style={{ color: 'var(--text-primary)' }}>{options.autoZoomFactor || 1.75}x</strong>
              </div>
              <input
                type="range"
                min={1.3}
                max={2.5}
                step={0.05}
                value={options.autoZoomFactor || 1.75}
                onChange={(e) => handleSelect('autoZoomFactor', parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#8b5cf6' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                <span>Durée de maintien :</span>
                <strong style={{ color: 'var(--text-primary)' }}>{options.autoZoomDuration || 2.8}s</strong>
              </div>
              <input
                type="range"
                min={1.0}
                max={5.0}
                step={0.2}
                value={options.autoZoomDuration || 2.8}
                onChange={(e) => handleSelect('autoZoomDuration', parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#8b5cf6' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Feature: Cinematic Smoothed Vector Cursor (Screen Studio Effect) */}
      <div className="form-group" style={{ padding: '12px 14px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <label className="form-checkbox-row" style={{ cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            className="form-checkbox" 
            checked={options.enableCinematicCursor !== false}
            onChange={() => handleCheckbox('enableCinematicCursor')}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="form-label" style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MousePointer size={15} />
              {t('settings.video.cinematicCursorTitle')}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {t('settings.video.cinematicCursorHelp')}
            </span>
          </div>
        </label>

        {options.enableCinematicCursor !== false && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginLeft: '26px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>
                {t('settings.video.cursorSizeTitle')}
              </label>
              <select 
                className="form-select" 
                value={options.cursorSize || 'large'} 
                onChange={(e) => handleSelect('cursorSize', e.target.value)}
                style={{ padding: '6px 10px', fontSize: '12px' }}
              >
                <option value="normal">{t('settings.video.cursorSizeNormal')}</option>
                <option value="large">{t('settings.video.cursorSizeLarge')}</option>
                <option value="xlarge">{t('settings.video.cursorSizeXLarge')}</option>
              </select>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>
                {t('settings.video.cursorSmoothingTitle')}
              </label>
              <select 
                className="form-select" 
                value={options.cursorSmoothingSpeed || 'cinematic'} 
                onChange={(e) => handleSelect('cursorSmoothingSpeed', e.target.value)}
                style={{ padding: '6px 10px', fontSize: '12px' }}
              >
                <option value="cinematic">{t('settings.video.cursorSmoothingCinematic')}</option>
                <option value="smooth">{t('settings.video.cursorSmoothingSmooth')}</option>
                <option value="direct">{t('settings.video.cursorSmoothingDirect')}</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
