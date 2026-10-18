import { ShieldAlert, Trash2 } from 'lucide-react';

interface RecorderBlurPanelProps {
  recorder: any;
}

export function RecorderBlurPanel({ recorder }: RecorderBlurPanelProps) {
  const { blurMasks, addBlurMask, clearBlurMasks } = recorder;

  return (
    <div className="glass-panel zoom-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ShieldAlert size={16} color="#c084fc" />
        <span style={{ fontSize: '13px', fontWeight: 600 }}>Confidentialité (Flou Permanent)</span>
        {blurMasks && blurMasks.length > 0 && (
          <span className="shortcut-badge" style={{ backgroundColor: 'rgba(139, 92, 246, 0.25)', color: '#c084fc' }}>
            {blurMasks.length} {blurMasks.length === 1 ? 'zone active' : 'zones actives'}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <button
          className="btn-toolbar"
          onClick={() => {
            addBlurMask({
              id: Math.random(),
              x: 0,
              y: 0.94,
              width: 1.0,
              height: 0.06
            });
          }}
          title="Masquer la barre des tâches Windows (horloge & icônes)"
          style={{ fontSize: '11px', padding: '3px 8px' }}
        >
          <span>+ Barre des tâches</span>
        </button>

        <button
          className="btn-toolbar"
          onClick={() => {
            addBlurMask({
              id: Math.random(),
              x: 0,
              y: 0,
              width: 1.0,
              height: 0.08
            });
          }}
          title="Masquer la barre d'URL et les onglets du navigateur"
          style={{ fontSize: '11px', padding: '3px 8px' }}
        >
          <span>+ Barre d'URL</span>
        </button>

        <button
          className="btn-toolbar"
          onClick={() => {
            addBlurMask({
              id: Math.random(),
              x: 0.2,
              y: 0.35,
              width: 0.6,
              height: 0.25
            });
          }}
          title="Poser un rectangle de flou permanent au centre de l'écran"
          style={{ fontSize: '11px', padding: '3px 8px', color: '#c084fc' }}
        >
          <ShieldAlert size={13} />
          <span>+ Zone Centre</span>
        </button>

        {blurMasks && blurMasks.length > 0 && (
          <button
            className="btn-toolbar"
            onClick={clearBlurMasks}
            title="Supprimer tous les flous de confidentialité"
            style={{ color: '#fb7185', fontSize: '11px', padding: '3px 8px' }}
          >
            <Trash2 size={13} />
            <span>Effacer flous ({blurMasks.length})</span>
          </button>
        )}
      </div>
    </div>
  );
}
