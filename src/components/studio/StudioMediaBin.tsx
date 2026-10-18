import { Film, Image as ImageIcon, Music, Upload, Scissors, Plus, Trash2 } from 'lucide-react';
import type { SavedVideo, SavedMedia } from '../../utils/db';
import { MediaBinAudioTab } from './MediaBinAudioTab';

export interface StudioMediaBinProps {
  previewHeight: number;
  chutierTab: 'videos' | 'images' | 'audio';
  setChutierTab: (tab: 'videos' | 'images' | 'audio') => void;
  libraryVideos: SavedVideo[];
  libraryImages: SavedMedia[];
  customAudios: { id: string; title: string; blob: Blob; url: string }[];
  previewingAudioId: string | null;
  generatingPresetId: string | null;
  currentBackgroundMusicId?: string;
  formatTime: (secs: number) => string;
  onTriggerVideoImport: () => void;
  onTriggerImageImport: () => void;
  onTriggerAudioImport: () => void;
  onOpenSilenceRemoverForVideo: (video: SavedVideo) => void;
  onAddClipToTimeline: (video: SavedVideo) => void;
  onAddImageAsClip: (img: SavedMedia) => void;
  onOpenAddImageOverlayModal: (img: SavedMedia) => void;
  onDeleteImage: (id: string, title: string) => void;
  onOpenVoiceModal: () => void;
  onSelectPresetMusic: (presetId: string) => void;
  onTogglePreviewAudio: (id: string, blob: Blob) => void;
  onSelectCustomAudio: (audio: { id: string; title: string; blob: Blob }) => void;
}

export function StudioMediaBin({
  previewHeight,
  chutierTab,
  setChutierTab,
  libraryVideos,
  libraryImages,
  customAudios,
  previewingAudioId,
  generatingPresetId,
  currentBackgroundMusicId,
  formatTime,
  onTriggerVideoImport,
  onTriggerImageImport,
  onTriggerAudioImport,
  onOpenSilenceRemoverForVideo,
  onAddClipToTimeline,
  onAddImageAsClip,
  onOpenAddImageOverlayModal,
  onDeleteImage,
  onOpenVoiceModal,
  onSelectPresetMusic,
  onTogglePreviewAudio,
  onSelectCustomAudio
}: StudioMediaBinProps) {
  return (
    <div className="glass-panel" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', height: `${previewHeight}px`, transition: 'height 0.22s ease-in-out' }}>
      {/* Chutier Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
        <button
          onClick={() => setChutierTab('videos')}
          style={{
            flex: 1,
            padding: '4px 6px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: chutierTab === 'videos' ? 'rgba(192, 132, 252, 0.2)' : 'transparent',
            border: chutierTab === 'videos' ? '1px solid #c084fc' : '1px solid transparent',
            color: chutierTab === 'videos' ? '#c084fc' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <Film size={12} />
          <span>Vidéos ({libraryVideos.length})</span>
        </button>

        <button
          onClick={() => setChutierTab('images')}
          style={{
            flex: 1,
            padding: '4px 6px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: chutierTab === 'images' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
            border: chutierTab === 'images' ? '1px solid #10b981' : '1px solid transparent',
            color: chutierTab === 'images' ? '#34d399' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <ImageIcon size={12} />
          <span>Images ({libraryImages.length})</span>
        </button>

        <button
          onClick={() => setChutierTab('audio')}
          style={{
            flex: 1,
            padding: '4px 6px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: chutierTab === 'audio' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
            border: chutierTab === 'audio' ? '1px solid #38bdf8' : '1px solid transparent',
            color: chutierTab === 'audio' ? '#38bdf8' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <Music size={12} />
          <span>Musiques</span>
        </button>
      </div>

      {/* Videos Tab Content */}
      {chutierTab === 'videos' && (
        <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <button
            className="btn-toolbar"
            onClick={onTriggerVideoImport}
            style={{
              padding: '5px 8px',
              fontSize: '11px',
              backgroundColor: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              borderRadius: '4px'
            }}
            title="Importer un fichier vidéo depuis votre PC (MP4, WebM, MOV, MKV)"
          >
            <Upload size={12} />
            <span>+ Importer une Vidéo</span>
          </button>

          {libraryVideos.map((v) => (
            <div 
              key={v.id} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '5px 7px', 
                borderRadius: '5px', 
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                gap: '6px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                {v.thumbnail ? (
                  <img src={v.thumbnail} alt="" style={{ width: '32px', height: '20px', objectFit: 'cover', borderRadius: '3px' }} />
                ) : (
                  <Film size={16} color="#94a3b8" />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <span style={{ fontSize: '11px', fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '140px' }}>{v.title}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{formatTime(v.duration || 0)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '3px' }}>
                <button
                  className="btn-toolbar"
                  style={{ padding: '2px 5px', fontSize: '10px', backgroundColor: 'rgba(6, 182, 212, 0.2)', color: '#38bdf8' }}
                  onClick={() => onOpenSilenceRemoverForVideo(v)}
                  title="Détecter et supprimer les silences avant d'ajouter à la timeline"
                >
                  <Scissors size={11} />
                </button>
                <button
                  className="btn-toolbar"
                  style={{ padding: '2px 5px', fontSize: '10px', backgroundColor: 'rgba(139, 92, 246, 0.25)', color: '#c084fc' }}
                  onClick={() => onAddClipToTimeline(v)}
                  title="Ajouter brut à la timeline"
                >
                  <Plus size={11} />
                </button>
              </div>
            </div>
          ))}
          {libraryVideos.length === 0 && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
              Aucune capture vidéo enregistrée.
            </div>
          )}
        </div>
      )}

      {/* Images & Logos Tab Content */}
      {chutierTab === 'images' && (
        <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button
            className="btn-toolbar"
            onClick={onTriggerImageImport}
            style={{
              padding: '5px 8px',
              fontSize: '11px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              borderRadius: '4px'
            }}
            title="Importer un logo ou image (PNG transparent, SVG, JPG, WebP)"
          >
            <Upload size={12} />
            <span>+ Importer un Logo / Image</span>
          </button>

          {libraryImages.map((img) => (
            <div
              key={img.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 6px',
                borderRadius: '5px',
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                gap: '6px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                <div style={{
                  width: '32px',
                  height: '24px',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  backgroundImage: 'repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 50% / 8px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <img
                    src={img.thumbnail || (img.blob ? URL.createObjectURL(img.blob) : '')}
                    alt=""
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <span style={{ fontSize: '11px', fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '130px' }} title={img.title}>
                    {img.title}
                  </span>
                  <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
                    {img.width && img.height ? `${img.width}×${img.height}` : 'Image'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                <button
                  className="btn-toolbar"
                  style={{ padding: '2px 5px', fontSize: '10px', backgroundColor: 'rgba(6, 182, 212, 0.2)', color: '#38bdf8', borderColor: 'rgba(6, 182, 212, 0.4)', display: 'flex', alignItems: 'center', gap: '2px' }}
                  onClick={() => onAddImageAsClip(img)}
                  title="Insérer cette image directement comme un clip diapositive sur la piste vidéo"
                >
                  <Film size={10} />
                  <span>Diapo</span>
                </button>
                <button
                  className="btn-toolbar"
                  style={{ padding: '2px 6px', fontSize: '10px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', borderColor: '#10b981' }}
                  onClick={() => onOpenAddImageOverlayModal(img)}
                  title="Ajouter ce logo en superposition sur la vidéo"
                >
                  <Plus size={11} />
                </button>
                <button
                  style={{ background: 'transparent', border: 'none', color: '#fb7185', cursor: 'pointer', padding: '2px' }}
                  onClick={() => onDeleteImage(img.id, img.title)}
                  title="Supprimer cette image"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}

          {libraryImages.length === 0 && (
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', padding: '14px 4px', lineHeight: 1.4 }}>
              Aucun logo ou image enregistré.<br />
              Cliquez ci-dessus pour importer un logo PNG ou SVG transparent.
            </div>
          )}
        </div>
      )}

      {/* Audio Tab Content */}
      {chutierTab === 'audio' && (
        <MediaBinAudioTab
          customAudios={customAudios}
          previewingAudioId={previewingAudioId}
          generatingPresetId={generatingPresetId}
          currentBackgroundMusicId={currentBackgroundMusicId}
          onTriggerAudioImport={onTriggerAudioImport}
          onOpenVoiceModal={onOpenVoiceModal}
          onSelectPresetMusic={onSelectPresetMusic}
          onTogglePreviewAudio={onTogglePreviewAudio}
          onSelectCustomAudio={onSelectCustomAudio}
        />
      )}
    </div>
  );
}
