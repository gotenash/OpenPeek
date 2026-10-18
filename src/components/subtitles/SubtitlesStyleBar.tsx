import { 
  type SubtitleStyleKey, 
  type SubtitlePosition, 
  type WordAnimationType,
  SUBTITLE_PRESETS 
} from '../../utils/subtitlesEngine';

interface SubtitlesStyleBarProps {
  selectedStyle: SubtitleStyleKey;
  onSelectStyle: (style: SubtitleStyleKey) => void;
  position: SubtitlePosition;
  onPositionChange: (pos: SubtitlePosition) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  wordAnimation: WordAnimationType;
  onWordAnimationChange: (anim: WordAnimationType) => void;
}

export function SubtitlesStyleBar({
  selectedStyle,
  onSelectStyle,
  position,
  onPositionChange,
  fontSize,
  onFontSizeChange,
  wordAnimation,
  onWordAnimationChange
}: SubtitlesStyleBarProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
      {/* Caption Style Selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Style Visuel d'Incrustation :
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
          {(Object.keys(SUBTITLE_PRESETS) as SubtitleStyleKey[]).map((key) => {
            const p = SUBTITLE_PRESETS[key];
            const isSel = selectedStyle === key;
            return (
              <button
                key={key}
                onClick={() => {
                  onSelectStyle(key);
                  if (p.defaultOptions.wordAnimation) {
                    onWordAnimationChange(p.defaultOptions.wordAnimation);
                  }
                }}
                style={{
                  padding: '6px 8px',
                  borderRadius: '6px',
                  backgroundColor: isSel ? 'rgba(253, 224, 71, 0.2)' : 'rgba(255,255,255,0.03)',
                  border: isSel ? '1px solid #fde047' : '1px solid var(--border-color)',
                  color: isSel ? '#fde047' : 'var(--text-secondary)',
                  fontSize: '11px',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 600 }}>{p.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Position, Size & Animation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Position, Taille & Animation :
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { id: 'bottom', label: '⬇️ Bas' },
            { id: 'middle', label: '⏺️ Milieu' },
            { id: 'top', label: '⬆️ Haut' }
          ].map((pos) => (
            <button
              key={pos.id}
              onClick={() => onPositionChange(pos.id as SubtitlePosition)}
              style={{
                flex: 1,
                padding: '4px 6px',
                borderRadius: '6px',
                fontSize: '11px',
                backgroundColor: position === pos.id ? 'rgba(253, 224, 71, 0.2)' : 'rgba(255,255,255,0.03)',
                border: position === pos.id ? '1px solid #fde047' : '1px solid var(--border-color)',
                color: position === pos.id ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              {pos.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', width: '70px' }}>Taille ({fontSize}px) :</span>
          <input
            type="range"
            min={24}
            max={64}
            step={2}
            value={fontSize}
            onChange={(e) => onFontSizeChange(parseInt(e.target.value))}
            style={{ flexGrow: 1, accentColor: '#fde047' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', width: '70px' }}>Animation :</span>
          <select
            value={wordAnimation}
            onChange={(e) => onWordAnimationChange(e.target.value as WordAnimationType)}
            className="form-input"
            style={{ flexGrow: 1, padding: '3px 6px', fontSize: '10px', color: '#fde047', borderColor: 'rgba(253, 224, 71, 0.4)' }}
          >
            <option value="pop">💥 Pop Élastique (CapCut / Hormozi)</option>
            <option value="bounce">🏀 Rebond Dynamique (Bounce)</option>
            <option value="zoom">🔍 Zoom Accentuation</option>
            <option value="none">⏹️ Standard (Fixe)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
