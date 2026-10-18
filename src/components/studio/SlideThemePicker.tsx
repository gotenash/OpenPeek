export const SLIDE_COLOR_PRESETS = [
  { name: 'Nuit Bleutée', bg: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', text: '#ffffff', sub: '#94a3b8' },
  { name: 'Cyber Violet', bg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)', text: '#ffffff', sub: '#c4b5fd' },
  { name: 'Océan Cyan', bg: 'linear-gradient(135deg, #0f172a 0%, #0369a1 100%)', text: '#ffffff', sub: '#7dd3fc' },
  { name: 'Émeraude Sombre', bg: 'linear-gradient(135deg, #062419 0%, #065f46 100%)', text: '#ffffff', sub: '#6ee7b7' },
  { name: 'Ambre Chaud', bg: 'linear-gradient(135deg, #241402 0%, #78350f 100%)', text: '#ffffff', sub: '#fcd34d' },
  { name: 'Rouge Cinéma', bg: 'linear-gradient(135deg, #2a0808 0%, #881337 100%)', text: '#ffffff', sub: '#fda4af' },
  { name: 'Noir Pur', bg: '#09090b', text: '#ffffff', sub: '#a1a1aa' }
];

interface SlideThemePickerProps {
  currentBgColor: string;
  onSelectTheme: (preset: { bg: string; text: string; sub: string }) => void;
}

export function SlideThemePicker({ currentBgColor, onSelectTheme }: SlideThemePickerProps) {
  return (
    <div>
      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px', display: 'block' }}>
        Thème & Ambiance de couleur
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(85px, 1fr))', gap: '6px' }}>
        {SLIDE_COLOR_PRESETS.map((p) => {
          const isSelected = currentBgColor === p.bg;
          return (
            <button
              key={p.name}
              type="button"
              onClick={() => onSelectTheme({ bg: p.bg, text: p.text, sub: p.sub })}
              style={{
                padding: '6px 4px',
                borderRadius: '5px',
                background: p.bg,
                border: isSelected ? '2px solid #8b5cf6' : '1px solid rgba(255,255,255,0.15)',
                boxShadow: isSelected ? '0 0 10px rgba(139, 92, 246, 0.8)' : 'none',
                color: p.text,
                fontSize: '9px',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{p.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
