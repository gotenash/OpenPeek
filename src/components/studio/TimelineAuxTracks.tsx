import React from 'react';
import {
  ZoomIn,
  Mic,
  Type,
  Image as ImageIcon,
  Music,
  Headphones,
  Volume2,
  VolumeX,
  X,
  Plus,
  ListTree,
  Bookmark
} from 'lucide-react';
import type {
  TimelineProject,
  TimelineTitle,
  TimelineImageOverlay,
  TimelineZoomEffect,
  TimelineVoiceover
} from '../../utils/videoCompositor';
import { SpatialTrackLane } from './SpatialTrackLane';

function formatTime(secs: number): string {
  const safe = typeof secs === 'number' && !isNaN(secs) && secs >= 0 ? secs : 0;
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export interface TimelineAuxTracksProps {
  project: TimelineProject;
  setProject: React.Dispatch<React.SetStateAction<TimelineProject>>;
  currentTime: number;
  totalDuration: number;
  selectedElement: { type: string; id: string } | null;
  setSelectedElement: (el: any) => void;
  setSelectedClipId: (id: string | null) => void;
  onSeek: (time: number) => void;
  isRecordingVoiceover: boolean;
  onToggleRecordVoiceover: () => void;
  onUpdateVoiceoverTiming: (id: string, startTime: number, duration: number) => void;
  onOpenEditVoiceover: (vo: TimelineVoiceover) => void;
  onRemoveVoiceover: (id: string) => void;
  onUpdateTitleTiming: (id: string, startTime: number, duration: number) => void;
  onOpenEditTitle: (title: TimelineTitle) => void;
  onRemoveTitle: (id: string) => void;
  onOpenAddTitleAtTime: (time: number) => void;
  onUpdateImageTiming: (id: string, startTime: number, duration: number) => void;
  onOpenEditImage: (image: TimelineImageOverlay) => void;
  onRemoveImage: (id: string) => void;
  onOpenAddImageAtTime: (time: number) => void;
  onUpdateZoomTiming: (id: string, startTime: number, duration: number) => void;
  onOpenEditZoom: (zoom: TimelineZoomEffect) => void;
  onRemoveZoom: (id: string) => void;
  onOpenAddZoomAtTime: (time: number) => void;
  onRemoveBackgroundMusic: () => void;
  onUpdateMusicVolume: (volume: number) => void;
  onOpenChutierAudio: () => void;
  onRemoveChapter: (id: string) => void;
}

export const TimelineAuxTracks: React.FC<TimelineAuxTracksProps> = ({
  project,
  setProject,
  currentTime,
  totalDuration,
  selectedElement,
  setSelectedElement,
  setSelectedClipId,
  onSeek,
  isRecordingVoiceover,
  onToggleRecordVoiceover,
  onUpdateVoiceoverTiming,
  onOpenEditVoiceover,
  onRemoveVoiceover,
  onUpdateTitleTiming,
  onOpenEditTitle,
  onRemoveTitle,
  onOpenAddTitleAtTime,
  onUpdateImageTiming,
  onOpenEditImage,
  onRemoveImage,
  onOpenAddImageAtTime,
  onUpdateZoomTiming,
  onOpenEditZoom,
  onRemoveZoom,
  onOpenAddZoomAtTime,
  onRemoveBackgroundMusic,
  onUpdateMusicVolume,
  onOpenChutierAudio,
  onRemoveChapter
}) => {
  return (
    <>
      {/* Track 3: Voiceovers Lane */}
      <SpatialTrackLane
        label="Voix Off & Micro"
        icon={<Mic size={11} color="#a855f7" />}
        labelColor="#a855f7"
        items={(project.voiceovers || []).map(v => ({
          id: v.id,
          startTime: v.startTime,
          duration: v.duration,
          label: v.title || 'Enregistrement vocal'
        }))}
        totalDuration={totalDuration}
        currentTime={currentTime}
        emptyMessage="Aucune voix off. Enregistrez directement via le micro pour ajouter un commentaire vocal."
        theme={{
          bg: 'rgba(168, 85, 247, 0.22)',
          border: '#a855f7',
          text: '#ffffff',
          badgeColor: '#e9d5ff'
        }}
        selectedItemId={selectedElement?.type === 'voiceover' ? selectedElement.id : null}
        onSelect={(id) => {
          setSelectedElement({ type: 'voiceover', id });
          setSelectedClipId(null);
        }}
        onUpdateTiming={onUpdateVoiceoverTiming}
        onSeek={onSeek}
        onEdit={(id) => {
          const vo = (project.voiceovers || []).find(x => x.id === id);
          if (vo) onOpenEditVoiceover(vo);
        }}
        onDelete={onRemoveVoiceover}
        onAddQuick={onToggleRecordVoiceover}
        quickAddLabel={isRecordingVoiceover ? '🔴 Arrêter micro' : '🎙️ Enregistrer micro'}
      />

      {/* Track 4: Titles & Text Overlays Lane */}
      <SpatialTrackLane
        label="Titres & Textes"
        icon={<Type size={11} color="#38bdf8" />}
        labelColor="#38bdf8"
        items={(project.titles || []).map(t => ({
          id: t.id,
          startTime: t.startTime,
          duration: t.duration,
          label: t.text
        }))}
        totalDuration={totalDuration}
        currentTime={currentTime}
        emptyMessage="Aucun texte incrusté. Cliquez sur « + Texte » dans la barre de contrôle pour ajouter un titre."
        theme={{
          bg: 'rgba(56, 189, 248, 0.22)',
          border: '#38bdf8',
          text: '#ffffff',
          badgeColor: '#bae6fd'
        }}
        selectedItemId={selectedElement?.type === 'title' ? selectedElement.id : null}
        onSelect={(id) => {
          setSelectedElement({ type: 'title', id });
          setSelectedClipId(null);
        }}
        onUpdateTiming={onUpdateTitleTiming}
        onSeek={onSeek}
        onEdit={(id) => {
          const title = (project.titles || []).find(x => x.id === id);
          if (title) onOpenEditTitle(title);
        }}
        onDelete={onRemoveTitle}
        onAddQuick={() => onOpenAddTitleAtTime(currentTime)}
      />

      {/* Track 4b: Images & Stickers Overlays Lane */}
      <SpatialTrackLane
        label="Images & Logos"
        icon={<ImageIcon size={11} color="#ec4899" />}
        labelColor="#ec4899"
        items={(project.images || []).map(img => ({
          id: img.id,
          startTime: img.startTime,
          duration: img.duration,
          label: img.title || 'Image incrustée'
        }))}
        totalDuration={totalDuration}
        currentTime={currentTime}
        emptyMessage="Aucun logo ou image incrusté. Cliquez sur « + Image » dans la barre de contrôle pour ajouter un watermark."
        theme={{
          bg: 'rgba(236, 72, 153, 0.22)',
          border: '#ec4899',
          text: '#ffffff',
          badgeColor: '#fbcfe8'
        }}
        selectedItemId={selectedElement?.type === 'image' ? selectedElement.id : null}
        onSelect={(id) => {
          setSelectedElement({ type: 'image', id });
          setSelectedClipId(null);
        }}
        onUpdateTiming={onUpdateImageTiming}
        onSeek={onSeek}
        onEdit={(id) => {
          const img = (project.images || []).find(x => x.id === id);
          if (img) onOpenEditImage(img);
        }}
        onDelete={onRemoveImage}
        onAddQuick={() => onOpenAddImageAtTime(currentTime)}
      />

      {/* Track 5: Interactive Spatial Zooms Lane */}
      <SpatialTrackLane
        label="Zooms Focus"
        icon={<ZoomIn size={11} color="#f59e0b" />}
        labelColor="#f59e0b"
        items={(project.zooms || []).map(z => ({
          id: z.id,
          startTime: z.startTime,
          duration: z.duration,
          label: `${z.scale}x ${z.label || 'Zoom'}`
        }))}
        totalDuration={totalDuration}
        currentTime={currentTime}
        emptyMessage="Aucun zoom actif. Cliquez sur « + Zoom » dans la barre de contrôle pour cibler une zone clé."
        theme={{
          bg: 'rgba(245, 158, 11, 0.22)',
          border: '#f59e0b',
          text: '#ffffff',
          badgeColor: '#fde68a'
        }}
        selectedItemId={selectedElement?.type === 'zoom' ? selectedElement.id : null}
        onSelect={(id) => {
          setSelectedElement({ type: 'zoom', id });
          setSelectedClipId(null);
        }}
        onUpdateTiming={onUpdateZoomTiming}
        onSeek={onSeek}
        onEdit={(id) => {
          const z = (project.zooms || []).find(x => x.id === id);
          if (z) onOpenEditZoom(z);
        }}
        onDelete={onRemoveZoom}
        onAddQuick={() => onOpenAddZoomAtTime(currentTime)}
      />

      {/* Track 6: Background Music & Audio Ducking */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(0,0,0,0.25)', padding: '6px 8px', borderRadius: '5px' }}>
        <span className="timeline-track-sticky-header" style={{ fontSize: '10px', width: '160px', minWidth: '160px', maxWidth: '160px', flexShrink: 0, color: '#38bdf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', boxSizing: 'border-box', paddingRight: '8px' }}>
          <Music size={11} />
          Musique de Fond
        </span>

        {project.backgroundMusic ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexGrow: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.4)', padding: '3px 8px', borderRadius: '4px' }}>
              <Headphones size={12} color="#38bdf8" />
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#38bdf8' }}>{project.backgroundMusic.title}</span>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>({project.backgroundMusic.isPreset ? 'Ambiance' : 'Fichier'})</span>
              <button
                type="button"
                onClick={onRemoveBackgroundMusic}
                style={{ background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer', padding: '0 2px' }}
                title="Retirer la musique de fond"
              >
                <X size={11} />
              </button>
            </div>

            {/* Volume Slider with fine tuning */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {project.backgroundMusic.volume === 0 ? <VolumeX size={12} color="#94a3b8" /> : <Volume2 size={12} color="#38bdf8" />}
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', width: '68px' }}>
                Volume ({Math.round(project.backgroundMusic.volume * 100)}%) :
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={project.backgroundMusic.volume}
                onChange={(e) => onUpdateMusicVolume(parseFloat(e.target.value))}
                style={{ width: '90px', accentColor: '#38bdf8', cursor: 'pointer' }}
                title="Réglez le volume de la musique (recommandé 10-20% pour ne pas masquer la voix)"
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: (project.backgroundMusic.autoDucking !== false) ? '#38bdf8' : 'var(--text-muted)', cursor: 'pointer', marginLeft: 'auto' }}>
              <input
                type="checkbox"
                checked={project.backgroundMusic.autoDucking !== false}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setProject(prev => prev.backgroundMusic ? {
                    ...prev,
                    backgroundMusic: {
                      ...prev.backgroundMusic,
                      autoDucking: checked
                    }
                  } : prev);
                }}
                style={{ accentColor: '#38bdf8', cursor: 'pointer' }}
              />
              <span title="Baisse automatiquement la musique de fond à 20% dès qu'une personne parle ou qu'un son vidéo est présent">
                Auto-Ducking intelligent
              </span>
            </label>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              Aucune musique de fond active.
            </span>
            <button
              type="button"
              onClick={onOpenChutierAudio}
              style={{
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                color: '#38bdf8',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Plus size={10} />
              <span>Choisir une musique dans le Chutier</span>
            </button>
          </div>
        )}
      </div>

      {/* Track 7: YouTube Chapters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(0,0,0,0.25)', padding: '5px 8px', borderRadius: '5px' }}>
        <span className="timeline-track-sticky-header" style={{ fontSize: '10px', width: '160px', minWidth: '160px', maxWidth: '160px', flexShrink: 0, color: '#38bdf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', boxSizing: 'border-box', paddingRight: '8px' }}>
          <ListTree size={11} color="#38bdf8" />
          Chapitres ({(project.chapters || []).length})
        </span>
        <div style={{ display: 'flex', gap: '6px', flexGrow: 1, overflowX: 'auto', alignItems: 'center' }}>
          {(project.chapters || []).map((chap) => (
            <div
              key={chap.id}
              onClick={() => onSeek(chap.time)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 8px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid #38bdf8',
                borderRadius: '4px',
                fontSize: '10px',
                cursor: 'pointer'
              }}
              title={`Cliquer pour aller à ${formatTime(chap.time)}`}
            >
              <Bookmark size={10} color="#38bdf8" />
              <span style={{ fontWeight: 700, color: '#bae6fd', fontFamily: 'monospace' }}>{formatTime(chap.time)}</span>
              <span style={{ color: '#ffffff', maxWidth: '120px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{chap.title}</span>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', color: '#fb7185', cursor: 'pointer', padding: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveChapter(chap.id);
                }}
                title="Supprimer ce chapitre"
              >
                <X size={11} />
              </button>
            </div>
          ))}
          {(!project.chapters || project.chapters.length === 0) && (
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              Aucun chapitre défini. Cliquez sur « 📑 Chapitres » dans la barre de contrôle pour les générer automatiquement.
            </span>
          )}
        </div>
      </div>
    </>
  );
};
