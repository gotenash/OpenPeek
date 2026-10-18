import { Camera, Clock, RefreshCw, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import type { TutorialStep } from './tutorialExporter';

interface TutorialStepEditorProps {
  steps: TutorialStep[];
  selectedStepId: string | null;
  onSelectStepId: (id: string) => void;
  onSeek: (time: number) => void;
  onCaptureCurrentFrame: (stepId: string) => void;
  onMoveStep: (index: number, direction: 'up' | 'down') => void;
  onRemoveStep: (id: string) => void;
  onUpdateStep: (id: string, updates: Partial<TutorialStep>) => void;
}

export function TutorialStepEditor({
  steps,
  selectedStepId,
  onSelectStepId,
  onSeek,
  onCaptureCurrentFrame,
  onMoveStep,
  onRemoveStep,
  onUpdateStep
}: TutorialStepEditorProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      background: 'rgba(0,0,0,0.2)',
      borderRadius: '12px',
      border: '1px solid var(--border-color)',
      padding: '14px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
          Étapes du Guide ({steps.length})
        </span>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Glissez dans la vidéo à gauche et capturez chaque moment clé
        </span>
      </div>

      {steps.length === 0 ? (
        <div style={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          color: 'var(--text-muted)',
          padding: '40px 20px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(139, 92, 246, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)'
          }}>
            <Camera size={30} />
          </div>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', margin: '0 0 6px 0' }}>
              Aucune étape capturée pour l'instant
            </p>
            <p style={{ fontSize: '13px', margin: 0, maxWidth: '400px' }}>
              Positionnez la tête de lecture dans le lecteur à gauche et cliquez sur <strong>"Capturer cette étape"</strong> pour illustrer votre guide pas-à-pas.
            </p>
          </div>
        </div>
      ) : (
        <div style={{
          flexGrow: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          paddingRight: '6px'
        }}>
          {steps.map((step, idx) => {
            const isSelected = selectedStepId === step.id;
            return (
              <div
                key={step.id}
                style={{
                  background: isSelected ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255,255,255,0.03)',
                  border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'all 0.15s ease'
                }}
                onClick={() => onSelectStepId(step.id)}
              >
                {/* Step Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px'
                    }}>
                      Étape {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSeek(step.time);
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: 'none',
                        color: '#38bdf8',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Se caler sur ce moment dans la vidéo"
                    >
                      <Clock size={11} />
                      {step.formattedTime}
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCaptureCurrentFrame(step.id);
                      }}
                      className="control-icon-btn"
                      style={{ width: '26px', height: '26px' }}
                      title="Remplacer la capture par la position actuelle du lecteur"
                    >
                      <RefreshCw size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveStep(idx, 'up');
                      }}
                      disabled={idx === 0}
                      className="control-icon-btn"
                      style={{ width: '26px', height: '26px', opacity: idx === 0 ? 0.3 : 1 }}
                      title="Déplacer vers le haut"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveStep(idx, 'down');
                      }}
                      disabled={idx === steps.length - 1}
                      className="control-icon-btn"
                      style={{ width: '26px', height: '26px', opacity: idx === steps.length - 1 ? 0.3 : 1 }}
                      title="Déplacer vers le bas"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveStep(step.id);
                      }}
                      className="control-icon-btn delete"
                      style={{ width: '26px', height: '26px' }}
                      title="Supprimer cette étape"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Step Card Content */}
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '12px' }}>
                  <img
                    src={step.imageUrl}
                    alt={step.title}
                    style={{
                      width: '100%',
                      aspectRatio: '16/9',
                      objectFit: 'cover',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      display: 'block'
                    }}
                  />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <input
                      type="text"
                      value={step.title}
                      onChange={(e) => onUpdateStep(step.id, { title: e.target.value })}
                      placeholder="Titre de l'étape (ex: Cliquer sur le menu Préférences)"
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: '#ffffff'
                      }}
                    />
                    <textarea
                      rows={2}
                      value={step.description}
                      onChange={(e) => onUpdateStep(step.id, { description: e.target.value })}
                      placeholder="Instructions détaillées..."
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        fontSize: '12px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--text-secondary)',
                        resize: 'none'
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#38bdf8' }}>💡 Astuce :</span>
                      <input
                        type="text"
                        value={step.tip || ''}
                        onChange={(e) => onUpdateStep(step.id, { tip: e.target.value })}
                        placeholder="Conseil ou raccourci facultatif..."
                        style={{
                          flexGrow: 1,
                          padding: '4px 8px',
                          fontSize: '11px',
                          background: 'rgba(56, 189, 248, 0.05)',
                          border: '1px solid rgba(56, 189, 248, 0.2)',
                          borderRadius: '4px',
                          color: '#7dd3fc'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
