import type { TutorialStep, TutorialMetadata } from './tutorialExporter';

interface TutorialPreviewTabProps {
  meta: TutorialMetadata;
  steps: TutorialStep[];
}

export function TutorialPreviewTab({ meta, steps }: TutorialPreviewTabProps) {
  return (
    <div style={{
      flexGrow: 1,
      minHeight: 0,
      overflowY: 'auto',
      background: 'rgba(0,0,0,0.3)',
      borderRadius: '12px',
      border: '1px solid var(--border-color)',
      padding: '28px',
      marginTop: '16px'
    }}>
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        {/* Document Header */}
        <div style={{
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '20px',
          marginBottom: '24px'
        }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 800,
            color: '#ffffff',
            marginBottom: '10px',
            background: 'linear-gradient(135deg, #c4b5fd 0%, #38bdf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {meta.title}
          </h1>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span style={{
              background: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              color: '#c4b5fd',
              padding: '3px 10px',
              borderRadius: '12px',
              fontWeight: 600
            }}>
              ⏱️ {meta.estimatedTime}
            </span>
            <span style={{
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              padding: '3px 10px',
              borderRadius: '12px',
              fontWeight: 600
            }}>
              🎯 {meta.difficulty}
            </span>
            <span>👤 Auteur : <strong>{meta.author}</strong></span>
            <span>📅 {new Date().toLocaleDateString('fr-FR')}</span>
          </div>

          {meta.intro && (
            <div style={{
              marginTop: '16px',
              background: 'rgba(255,255,255,0.03)',
              borderLeft: '4px solid var(--primary)',
              padding: '12px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              color: 'var(--text-secondary)'
            }}>
              {meta.intro}
            </div>
          )}
        </div>

        {/* Steps Document List */}
        {steps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            Revenez à l'onglet "Édition" pour capturer vos premières étapes.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {steps.map((step, idx) => (
              <div
                key={step.id}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <span style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                    color: '#ffffff',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 700
                  }}>
                    Étape {idx + 1}
                  </span>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#ffffff', flexGrow: 1 }}>
                    {step.title}
                  </h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    ⏱️ {step.formattedTime}
                  </span>
                </div>

                <img
                  src={step.imageUrl}
                  alt={step.title}
                  style={{
                    width: '100%',
                    maxHeight: '400px',
                    objectFit: 'contain',
                    background: '#000000',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    marginBottom: '14px',
                    display: 'block'
                  }}
                />

                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 10px 0' }}>
                  {step.description}
                </p>

                {step.tip && (
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'flex-start',
                    background: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#7dd3fc'
                  }}>
                    <span>💡</span>
                    <div><strong>Astuce :</strong> {step.tip}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
