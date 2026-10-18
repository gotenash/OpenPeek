import { Upload, Mic, Play, Pause } from 'lucide-react';
import { AMBIENT_MUSIC_PRESETS } from '../../utils/videoCompositor';

interface MediaBinAudioTabProps {
  customAudios: { id: string; title: string; blob: Blob; url: string }[];
  previewingAudioId: string | null;
  generatingPresetId: string | null;
  currentBackgroundMusicId?: string;
  onTriggerAudioImport: () => void;
  onOpenVoiceModal: () => void;
  onSelectPresetMusic: (presetId: string) => void;
  onTogglePreviewAudio: (id: string, blob: Blob) => void;
  onSelectCustomAudio: (audio: { id: string; title: string; blob: Blob }) => void;
}

export function MediaBinAudioTab({
  customAudios,
  previewingAudioId,
  generatingPresetId,
  currentBackgroundMusicId,
  onTriggerAudioImport,
  onOpenVoiceModal,
  onSelectPresetMusic,
  onTogglePreviewAudio,
  onSelectCustomAudio
}: MediaBinAudioTabProps) {
  return (
    <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
        <button
          className="btn-primary"
          onClick={onOpenVoiceModal}
          style={{ padding: '4px 6px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: 'linear-gradient(135deg, #c084fc, #ec4899)' }}
          title="Générer une voix off IA à partir de votre texte"
        >
          <Mic size={11} />
          <span>🎙️ Voix Off IA</span>
        </button>

        <button
          className="btn-secondary"
          onClick={onTriggerAudioImport}
          style={{ padding: '4px 6px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
          title="Importer un fichier audio existant (MP3, WAV, M4A)"
        >
          <Upload size={11} />
          <span>Importer MP3</span>
        </button>
      </div>

      <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '2px' }}>
        Ambiances Libres de Droits :
      </div>
      {AMBIENT_MUSIC_PRESETS.map((preset) => {
        const isSelected = currentBackgroundMusicId === preset.id;
        return (
          <div
            key={preset.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 6px',
              borderRadius: '4px',
              backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.02)',
              border: isSelected ? '1px solid #38bdf8' : '1px solid var(--border-color)',
              fontSize: '11px'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', maxWidth: '170px' }}>
              <span style={{ fontWeight: 600, color: isSelected ? '#38bdf8' : '#ffffff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {preset.title}
              </span>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{preset.genre} • {preset.bpm} BPM</span>
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => onSelectPresetMusic(preset.id)}
                disabled={generatingPresetId === preset.id}
                style={{
                  background: isSelected ? '#38bdf8' : 'rgba(56, 189, 248, 0.2)',
                  color: isSelected ? '#000000' : '#38bdf8',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '2px 6px',
                  fontSize: '10px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                title="Ajouter comme musique de fond sur la timeline"
              >
                {generatingPresetId === preset.id ? '...' : (isSelected ? '✓ Actif' : '+ Ajouter')}
              </button>
            </div>
          </div>
        );
      })}

      {customAudios.length > 0 && (
        <>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '4px' }}>
            Mes Fichiers Importés :
          </div>
          {customAudios.map((audio) => {
            const isSelected = currentBackgroundMusicId === audio.id;
            const isPreviewing = previewingAudioId === audio.id;
            return (
              <div
                key={audio.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 6px',
                  borderRadius: '4px',
                  backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.02)',
                  border: isSelected ? '1px solid #38bdf8' : '1px solid var(--border-color)',
                  fontSize: '11px'
                }}
              >
                <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                  {audio.title}
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => onTogglePreviewAudio(audio.id, audio.blob)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                    title="Écouter un extrait"
                  >
                    {isPreviewing ? <Pause size={12} /> : <Play size={12} />}
                  </button>
                  <button
                    onClick={() => onSelectCustomAudio({ id: audio.id, title: audio.title, blob: audio.blob })}
                    style={{
                      background: isSelected ? '#38bdf8' : 'rgba(56, 189, 248, 0.2)',
                      color: isSelected ? '#000000' : '#38bdf8',
                      border: 'none',
                      borderRadius: '3px',
                      padding: '2px 5px',
                      fontSize: '10px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {isSelected ? '✓ Actif' : '+ Ajouter'}
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
