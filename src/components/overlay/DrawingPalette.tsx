import { Pencil, ArrowUpRight, Square, Highlighter, Trash2, X, Sparkles } from 'lucide-react';
import type { DrawTool } from '../../hooks/useRecorder';

interface DrawingPaletteProps {
  tool: DrawTool;
  color: string;
  isAutoFade: boolean;
  isSmoothing: boolean;
  onToolChange: (tool: DrawTool) => void;
  onColorChange: (color: string) => void;
  onToggleAutoFade: () => void;
  onToggleSmoothing: () => void;
  onClear: () => void;
  onClose: () => void;
}

const PALETTE_COLORS = [
  { hex: '#f43f5e', name: 'Rouge Néon' },
  { hex: '#a855f7', name: 'Violet' },
  { hex: '#06b6d4', name: 'Cyan' },
  { hex: '#eab308', name: 'Jaune Fluo' },
  { hex: '#10b981', name: 'Vert' }
];

export function DrawingPalette({
  tool,
  color,
  isAutoFade,
  isSmoothing,
  onToolChange,
  onColorChange,
  onToggleAutoFade,
  onToggleSmoothing,
  onClear,
  onClose
}: DrawingPaletteProps) {
  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 16px',
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(16px)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(139, 92, 246, 0.3)',
        zIndex: 99999,
        cursor: 'default',
        pointerEvents: 'auto'
      }}
    >
      {/* Tools */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={() => onToolChange('pen')}
          title="Feutre à main levée"
          style={{
            padding: '6px 10px',
            borderRadius: '8px',
            backgroundColor: tool === 'pen' ? '#8b5cf6' : 'transparent',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Pencil size={15} />
        </button>
        <button
          onClick={() => onToolChange('arrow')}
          title="Flèche"
          style={{
            padding: '6px 10px',
            borderRadius: '8px',
            backgroundColor: tool === 'arrow' ? '#8b5cf6' : 'transparent',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ArrowUpRight size={15} />
        </button>
        <button
          onClick={() => onToolChange('rect')}
          title="Rectangle"
          style={{
            padding: '6px 10px',
            borderRadius: '8px',
            backgroundColor: tool === 'rect' ? '#8b5cf6' : 'transparent',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Square size={15} />
        </button>
        <button
          onClick={() => onToolChange('highlighter')}
          title="Surligneur"
          style={{
            padding: '6px 10px',
            borderRadius: '8px',
            backgroundColor: tool === 'highlighter' ? '#8b5cf6' : 'transparent',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Highlighter size={15} />
        </button>
      </div>

      {/* Colors */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: '12px' }}>
        {PALETTE_COLORS.map((c) => (
          <button
            key={c.hex}
            onClick={() => onColorChange(c.hex)}
            title={c.name}
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              backgroundColor: c.hex,
              border: color === c.hex ? '2px solid #ffffff' : '2px solid transparent',
              transform: color === c.hex ? 'scale(1.2)' : 'scale(1)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          />
        ))}
      </div>

      {/* Auto-fade */}
      <button
        onClick={onToggleAutoFade}
        title="Auto-fade 3s"
        style={{
          padding: '6px 10px',
          borderRadius: '8px',
          backgroundColor: isAutoFade ? 'rgba(139, 92, 246, 0.25)' : 'transparent',
          color: isAutoFade ? '#c084fc' : 'rgba(255,255,255,0.6)',
          border: isAutoFade ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px'
        }}
      >
        <Sparkles size={14} />
        <span>Auto-fade</span>
      </button>

      {/* Lissage Intelligent */}
      <button
        onClick={onToggleSmoothing}
        title={isSmoothing ? "Lissage intelligent actif (courbes fluides et douces)" : "Lissage désactivé"}
        style={{
          padding: '6px 10px',
          borderRadius: '8px',
          backgroundColor: isSmoothing ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
          color: isSmoothing ? '#38bdf8' : 'rgba(255,255,255,0.6)',
          border: isSmoothing ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          fontWeight: isSmoothing ? 600 : 400
        }}
      >
        <Sparkles size={14} />
        <span>Lissage</span>
      </button>

      {/* Clear button */}
      <button
        onClick={onClear}
        title="Effacer (F10)"
        style={{
          padding: '6px 10px',
          borderRadius: '8px',
          backgroundColor: 'transparent',
          color: '#fb7185',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '12px'
        }}
      >
        <Trash2 size={14} />
        <span>Effacer</span>
      </button>

      {/* Close Overlay */}
      <button
        onClick={onClose}
        title="Quitter le mode Feutre (Echap ou F8)"
        style={{
          padding: '6px 10px',
          borderRadius: '8px',
          backgroundColor: 'rgba(244, 63, 94, 0.2)',
          color: '#fb7185',
          border: '1px solid rgba(244, 63, 94, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '12px',
          fontWeight: 600
        }}
      >
        <X size={14} />
        <span>Fermer (Echap)</span>
      </button>
    </div>
  );
}
