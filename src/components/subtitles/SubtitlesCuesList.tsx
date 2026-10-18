import { Plus, Trash2, Eraser, Globe, Mic, X } from 'lucide-react';
import type { SubtitleCue } from '../../utils/subtitlesEngine';

interface SubtitlesCuesListProps {
  cues: SubtitleCue[];
  currentTime: number;
  onSeek: (time: number) => void;
  onUpdateCueText: (id: string, text: string) => void;
  onUpdateCueTiming: (id: string, field: 'startTime' | 'endTime', val: number) => void;
  onDeleteCue: (id: string) => void;
  onAddCue: () => void;
  onCleanTics: () => void;
  cleanedNotification: boolean;
  showTranslateMenu: boolean;
  onToggleTranslateMenu: () => void;
  targetLang: string;
  onTargetLangChange: (lang: string) => void;
  isTranslating: boolean;
  onTranslate: (lang: string) => void;
  onOpenVoiceModal: () => void;
  onSplitLongCues: () => void;
  onLocalTranscribe: () => void;
}

export function SubtitlesCuesList({
  cues,
  currentTime,
  onSeek,
  onUpdateCueText,
  onUpdateCueTiming,
  onDeleteCue,
  onAddCue,
  onCleanTics,
  cleanedNotification,
  showTranslateMenu,
  onToggleTranslateMenu,
  targetLang,
  onTargetLangChange,
  isTranslating,
  onTranslate,
  onOpenVoiceModal,
  onSplitLongCues,
  onLocalTranscribe
}: SubtitlesCuesListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Lignes de Sous-titres ({cues.length}) :
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {cues.length > 0 && (
            <>
              <button
                onClick={onCleanTics}
                style={{
                  background: cleanedNotification ? 'rgba(74, 222, 128, 0.15)' : 'rgba(236, 72, 153, 0.12)',
                  border: cleanedNotification ? '1px solid #4ade80' : '1px solid rgba(236, 72, 153, 0.35)',
                  color: cleanedNotification ? '#4ade80' : '#f472b6',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Supprimer les 'Euh...', hésitations et répétitions du texte"
              >
                <Eraser size={11} />
                <span>{cleanedNotification ? '✓ Nettoyé !' : 'Nettoyer "Euh..."'}</span>
              </button>

              <button
                onClick={onToggleTranslateMenu}
                style={{
                  background: showTranslateMenu ? 'rgba(56, 189, 248, 0.25)' : 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  color: '#38bdf8',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Traduire tous les sous-titres dans une autre langue"
              >
                <Globe size={11} />
                <span>Traduire...</span>
              </button>

              <button
                onClick={onOpenVoiceModal}
                style={{
                  background: 'rgba(192, 132, 252, 0.15)',
                  border: '1px solid rgba(192, 132, 252, 0.35)',
                  color: '#c084fc',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Générer une voix off IA qui lit tous vos sous-titres"
              >
                <Mic size={11} />
                <span>Voix IA...</span>
              </button>

              <button
                onClick={onSplitLongCues}
                style={{
                  background: 'rgba(253, 224, 71, 0.1)',
                  border: '1px solid rgba(253, 224, 71, 0.3)',
                  color: '#fde047',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Découper les sous-titres trop longs en segments courts de 3 à 4 mots"
              >
                <span>✂️ Raccourcir</span>
              </button>
            </>
          )}
          {cues.length === 0 && (
            <button
              onClick={onLocalTranscribe}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              ⚡ Auto-segmenter
            </button>
          )}
          <button
            onClick={onAddCue}
            style={{
              background: 'none',
              border: 'none',
              color: '#fde047',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Plus size={12} />
            <span>+ Ajouter</span>
          </button>
        </div>
      </div>

      {/* Quick Translation Popover Drawer */}
      {showTranslateMenu && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 10px',
          borderRadius: '6px',
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          border: '1px solid rgba(56, 189, 248, 0.4)'
        }}>
          <Globe size={13} color="#38bdf8" />
          <span style={{ fontSize: '11px', color: '#ffffff', fontWeight: 600 }}>Traduire vers :</span>
          <select
            value={targetLang}
            onChange={(e) => onTargetLangChange(e.target.value)}
            className="form-input"
            style={{ padding: '2px 6px', fontSize: '11px', flexGrow: 1 }}
          >
            <option value="en">Anglais (English)</option>
            <option value="es">Espagnol (Español)</option>
            <option value="de">Allemand (Deutsch)</option>
            <option value="it">Italien (Italiano)</option>
            <option value="pt">Portugais (Português)</option>
            <option value="fr">Français (Français)</option>
            <option value="ja">Japonais (日本語)</option>
            <option value="zh">Chinois (中文)</option>
            <option value="nl">Néerlandais (Nederlands)</option>
            <option value="ar">Arabe (العربية)</option>
          </select>
          <button
            className="btn-primary"
            onClick={() => onTranslate(targetLang)}
            disabled={isTranslating}
            style={{ padding: '3px 10px', fontSize: '11px', background: 'linear-gradient(135deg, #38bdf8, #818cf8)' }}
          >
            {isTranslating ? 'Traduction en cours...' : 'Traduire en 1 clic'}
          </button>
          <button
            onClick={onToggleTranslateMenu}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div style={{
        maxHeight: '140px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '6px',
        backgroundColor: 'rgba(0,0,0,0.25)',
        borderRadius: '6px',
        border: '1px solid var(--border-color)'
      }}>
        {cues.map((cue) => {
          const isActive = currentTime >= cue.startTime && currentTime <= cue.endTime;
          return (
            <div
              key={cue.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 8px',
                borderRadius: '4px',
                backgroundColor: isActive ? 'rgba(253, 224, 71, 0.15)' : 'rgba(255,255,255,0.02)',
                border: isActive ? '1px solid #fde047' : '1px solid var(--border-color)'
              }}
            >
              <button
                onClick={() => onSeek(cue.startTime)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isActive ? '#fde047' : 'var(--text-muted)',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  width: '45px',
                  textAlign: 'left'
                }}
                title="Aller à ce moment"
              >
                {cue.startTime.toFixed(1)}s
              </button>

              <input
                type="text"
                value={cue.text}
                onChange={(e) => onUpdateCueText(cue.id, e.target.value)}
                style={{
                  flexGrow: 1,
                  padding: '3px 8px',
                  fontSize: '11px',
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: '#ffffff'
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="number"
                  step="0.1"
                  value={cue.startTime}
                  onChange={(e) => onUpdateCueTiming(cue.id, 'startTime', parseFloat(e.target.value) || 0)}
                  style={{ width: '45px', padding: '2px 4px', fontSize: '10px', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: '3px' }}
                />
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>-</span>
                <input
                  type="number"
                  step="0.1"
                  value={cue.endTime}
                  onChange={(e) => onUpdateCueTiming(cue.id, 'endTime', parseFloat(e.target.value) || 0)}
                  style={{ width: '45px', padding: '2px 4px', fontSize: '10px', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: '3px' }}
                />
              </div>

              <button
                onClick={() => onDeleteCue(cue.id)}
                style={{ background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer', padding: '2px' }}
                title="Supprimer"
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}

        {cues.length === 0 && (
          <div style={{ textAlign: 'center', padding: '16px 8px', color: 'var(--text-muted)', fontSize: '11px' }}>
            Cliquez sur "Transcrire avec Whisper IA", "Découpage VAD", "Importer .SRT" ou "+ Ajouter un sous-titre" pour commencer.
          </div>
        )}
      </div>
    </div>
  );
}
