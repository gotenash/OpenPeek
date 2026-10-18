import React from 'react';
import type { SavedVideo, SavedProject, SavedMedia } from '../../utils/db';
import type { TimelineProject, TimelineClip, TimelineVoiceover } from '../../utils/videoCompositor';
import type { SpeechSegment } from '../../utils/audioSilenceDetector';
import { ProjectListModal } from './ProjectListModal';
import { TitleOverlayModal } from './TitleOverlayModal';
import { ZoomEffectModal } from './ZoomEffectModal';
import { ImageOverlayModal } from './ImageOverlayModal';
import { YouTubeChaptersModal } from './YouTubeChaptersModal';
import { GifExportModal } from '../GifExportModal';
import { DeviceFrameModal } from '../DeviceFrameModal';
import { SubtitlesStudioModal } from '../SubtitlesStudioModal';
import { VoiceGeneratorModal } from '../VoiceGeneratorModal';
import { SilenceRemoverModal } from '../SilenceRemoverModal';
import { TutorialMakerModal } from '../TutorialMakerModal';
import { SlideEditorModal } from './SlideEditorModal';
import { ImageSlidePickerModal } from './ImageSlidePickerModal';
import { VideoPickerModal } from './VideoPickerModal';
import { VoiceoverModal } from './VoiceoverModal';

export interface StudioModalsLayerProps {
  project: TimelineProject;
  setProject: React.Dispatch<React.SetStateAction<TimelineProject>>;
  totalDuration: number;
  currentTime: number;
  formatTime: (secs: number) => string;
  exportedBlob: Blob | null;
  savedProjects: SavedProject[];
  libraryVideos: SavedVideo[];
  libraryImages: SavedMedia[];
  imageFileInputRef: React.RefObject<HTMLInputElement | null>;
  videoFileInputRef: React.RefObject<HTMLInputElement | null>;

  // Project List
  isProjectListModalOpen: boolean;
  setIsProjectListModalOpen: (open: boolean) => void;
  handleLoadProject: (p: SavedProject) => void;
  handleDeleteSavedProject: (id: string) => void;

  // Title
  isTitleModalOpen: boolean;
  setIsTitleModalOpen: (open: boolean) => void;
  titleFormData: any;
  setTitleFormData: React.Dispatch<React.SetStateAction<any>>;
  handleSaveTitleModal: () => void;

  // Zoom
  isZoomModalOpen: boolean;
  setIsZoomModalOpen: (open: boolean) => void;
  zoomFormData: any;
  setZoomFormData: React.Dispatch<React.SetStateAction<any>>;
  handleSaveZoomModal: () => void;

  // Image Overlay
  isImageModalOpen: boolean;
  setIsImageModalOpen: (open: boolean) => void;
  imageModalMode: 'add' | 'edit';
  imageFormData: any;
  setImageFormData: React.Dispatch<React.SetStateAction<any>>;
  isPermanentOverlay: boolean;
  setIsPermanentOverlay: React.Dispatch<React.SetStateAction<boolean>>;
  handleSaveImageModal: () => void;

  // YouTube Chapters
  isChaptersModalOpen: boolean;
  setIsChaptersModalOpen: (open: boolean) => void;
  copiedChapters: boolean;
  formatYouTubeChapters: (chapters: any[]) => string;
  handleAutoGenerateChaptersFromClips: () => void;
  handleAutoGenerateChaptersFromTitles: () => void;
  handleAddChapterAtCurrentTime: () => void;
  handleUpdateChapter: (id: string, time: number, title: string) => void;
  handleRemoveChapter: (id: string) => void;
  handleSeek: (time: number) => void;
  handleDownloadYouTubeChapters: () => void;
  handleCopyYouTubeChapters: () => void;

  // Gif / Frame / Subtitles modals
  gifModalVideo: SavedVideo | null;
  setGifModalVideo: (v: SavedVideo | null) => void;
  frameModalVideo: SavedVideo | null;
  setFrameModalVideo: (v: SavedVideo | null) => void;
  subtitlesModalVideo: SavedVideo | null;
  setSubtitlesModalVideo: (v: SavedVideo | null) => void;

  // Voice Generator
  isVoiceModalOpen: boolean;
  setIsVoiceModalOpen: (open: boolean) => void;

  // Silence Remover
  isSilenceModalOpen: boolean;
  setIsSilenceModalOpen: (open: boolean) => void;
  silenceModalClip: TimelineClip | null;
  setSilenceModalClip: (c: TimelineClip | null) => void;
  handleApplySilenceCuts: (targetClipId: string, segments: SpeechSegment[]) => void;

  // Tutorial Maker
  isTutorialMakerOpen: boolean;
  setIsTutorialMakerOpen: (open: boolean) => void;

  // Slide Editor
  isSlideModalOpen: boolean;
  setIsSlideModalOpen: (open: boolean) => void;
  slideModalMode: 'add' | 'edit';
  slideForm: any;
  handleSaveSlideClip: (data: any) => void;

  // Image Slide Picker
  isImageSlidePickerOpen: boolean;
  setIsImageSlidePickerOpen: (open: boolean) => void;
  imageSlideInsertPosition: 'start' | 'end' | 'current';
  handleAddImageAsClip: (img: SavedMedia, duration: number, pos: any) => void;

  // Video Picker
  isVideoPickerOpen: boolean;
  setIsVideoPickerOpen: (open: boolean) => void;
  videoInsertPosition: 'start' | 'end' | 'current';
  addClipToTimeline: (v: SavedVideo, pos?: any) => void;

  // Voiceover modal
  isVoiceoverModalOpen: boolean;
  setIsVoiceoverModalOpen: (open: boolean) => void;
  voiceoverForm: any;
  setVoiceoverForm: React.Dispatch<React.SetStateAction<any>>;
  handleSaveVoiceoverForm: () => void;
}

export const StudioModalsLayer: React.FC<StudioModalsLayerProps> = ({
  project,
  setProject,
  totalDuration,
  currentTime,
  formatTime,
  exportedBlob,
  savedProjects,
  libraryVideos,
  libraryImages,
  imageFileInputRef,
  videoFileInputRef,
  isProjectListModalOpen,
  setIsProjectListModalOpen,
  handleLoadProject,
  handleDeleteSavedProject,
  isTitleModalOpen,
  setIsTitleModalOpen,
  titleFormData,
  setTitleFormData,
  handleSaveTitleModal,
  isZoomModalOpen,
  setIsZoomModalOpen,
  zoomFormData,
  setZoomFormData,
  handleSaveZoomModal,
  isImageModalOpen,
  setIsImageModalOpen,
  imageModalMode,
  imageFormData,
  setImageFormData,
  isPermanentOverlay,
  setIsPermanentOverlay,
  handleSaveImageModal,
  isChaptersModalOpen,
  setIsChaptersModalOpen,
  copiedChapters,
  formatYouTubeChapters,
  handleAutoGenerateChaptersFromClips,
  handleAutoGenerateChaptersFromTitles,
  handleAddChapterAtCurrentTime,
  handleUpdateChapter,
  handleRemoveChapter,
  handleSeek,
  handleDownloadYouTubeChapters,
  handleCopyYouTubeChapters,
  gifModalVideo,
  setGifModalVideo,
  frameModalVideo,
  setFrameModalVideo,
  subtitlesModalVideo,
  setSubtitlesModalVideo,
  isVoiceModalOpen,
  setIsVoiceModalOpen,
  isSilenceModalOpen,
  setIsSilenceModalOpen,
  silenceModalClip,
  setSilenceModalClip,
  handleApplySilenceCuts,
  isTutorialMakerOpen,
  setIsTutorialMakerOpen,
  isSlideModalOpen,
  setIsSlideModalOpen,
  slideModalMode,
  slideForm,
  handleSaveSlideClip,
  isImageSlidePickerOpen,
  setIsImageSlidePickerOpen,
  imageSlideInsertPosition,
  handleAddImageAsClip,
  isVideoPickerOpen,
  setIsVideoPickerOpen,
  videoInsertPosition,
  addClipToTimeline,
  isVoiceoverModalOpen,
  setIsVoiceoverModalOpen,
  voiceoverForm,
  setVoiceoverForm,
  handleSaveVoiceoverForm
}) => {
  return (
    <>
      <ProjectListModal
        isOpen={isProjectListModalOpen}
        savedProjects={savedProjects}
        formatTime={formatTime}
        onLoadProject={handleLoadProject}
        onDeleteProject={handleDeleteSavedProject}
        onClose={() => setIsProjectListModalOpen(false)}
      />

      <TitleOverlayModal
        isOpen={isTitleModalOpen}
        titleForm={titleFormData}
        setTitleForm={setTitleFormData as any}
        onSaveTitle={handleSaveTitleModal}
        onClose={() => setIsTitleModalOpen(false)}
      />

      <ZoomEffectModal
        isOpen={isZoomModalOpen}
        zoomForm={zoomFormData}
        setZoomForm={setZoomFormData as any}
        onSaveZoom={handleSaveZoomModal}
        onClose={() => setIsZoomModalOpen(false)}
      />

      <ImageOverlayModal
        isOpen={isImageModalOpen}
        imageModalMode={imageModalMode}
        imageForm={imageFormData}
        setImageForm={setImageFormData as any}
        isPermanentOverlay={isPermanentOverlay}
        setIsPermanentOverlay={setIsPermanentOverlay}
        onSaveImageOverlay={handleSaveImageModal}
        onClose={() => setIsImageModalOpen(false)}
      />

      <YouTubeChaptersModal
        isOpen={isChaptersModalOpen}
        chapters={project.chapters || []}
        totalDuration={totalDuration}
        currentTime={currentTime}
        clipsCount={project.clips.length}
        titlesCount={(project.titles || []).length}
        copiedChapters={copiedChapters}
        formatTime={formatTime}
        formatYouTubeChapters={formatYouTubeChapters}
        onAutoGenerateFromClips={handleAutoGenerateChaptersFromClips}
        onAutoGenerateFromTitles={handleAutoGenerateChaptersFromTitles}
        onAddChapterAtCurrentTime={handleAddChapterAtCurrentTime}
        onUpdateChapter={handleUpdateChapter}
        onRemoveChapter={handleRemoveChapter}
        onSeek={handleSeek}
        onDownloadChapters={handleDownloadYouTubeChapters}
        onCopyChapters={handleCopyYouTubeChapters}
        onClose={() => setIsChaptersModalOpen(false)}
      />

      {/* GIF Export Modal */}
      {gifModalVideo && (
        <GifExportModal
          video={gifModalVideo}
          onClose={() => setGifModalVideo(null)}
        />
      )}

      {/* Device Frame Modal */}
      {frameModalVideo && (
        <DeviceFrameModal
          video={frameModalVideo}
          onClose={() => setFrameModalVideo(null)}
        />
      )}

      {/* Subtitles Studio Modal */}
      {subtitlesModalVideo && (
        <SubtitlesStudioModal
          video={subtitlesModalVideo}
          onClose={() => setSubtitlesModalVideo(null)}
        />
      )}

      {/* Voice Generator Modal */}
      {isVoiceModalOpen && (
        <VoiceGeneratorModal
          onClose={() => setIsVoiceModalOpen(false)}
          onGenerated={async (transcript: string, audioBlob: Blob) => {
            const voiceoverId = 'vo_' + Date.now();
            const audioDataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(audioBlob);
            });
            const newVoiceover: TimelineVoiceover = {
              id: voiceoverId,
              startTime: currentTime,
              duration: 5,
              blob: audioBlob,
              dataUrl: audioDataUrl,
              label: transcript.slice(0, 30) + '...',
              volume: 1
            };
            setProject(prev => ({
              ...prev,
              voiceovers: [...(prev.voiceovers || []), newVoiceover]
            }));
            setIsVoiceModalOpen(false);
          }}
        />
      )}

      {/* Silence Remover Modal */}
      {isSilenceModalOpen && silenceModalClip && (
        <SilenceRemoverModal
          video={silenceModalClip.video}
          onClose={() => {
            setIsSilenceModalOpen(false);
            setSilenceModalClip(null);
          }}
          onApplySegments={(segments: SpeechSegment[]) => {
            handleApplySilenceCuts(silenceModalClip.id, segments);
            setIsSilenceModalOpen(false);
            setSilenceModalClip(null);
          }}
        />
      )}

      {/* Step-by-Step Tutorial Maker Modal */}
      {isTutorialMakerOpen && (exportedBlob || project.clips[0]?.video.blob) && 
        <TutorialMakerModal
          videoBlob={exportedBlob || project.clips[0]?.video.blob}
          onClose={() => setIsTutorialMakerOpen(false)}
        />
      }

      {/* Slide / Title Card Editor Modal */}
      <SlideEditorModal
        isOpen={isSlideModalOpen}
        mode={slideModalMode}
        initialForm={slideForm}
        onSave={handleSaveSlideClip}
        onClose={() => setIsSlideModalOpen(false)}
      />

      {/* Image Slide Picker Modal */}
      <ImageSlidePickerModal
        isOpen={isImageSlidePickerOpen}
        libraryImages={libraryImages}
        initialPosition={imageSlideInsertPosition}
        onSelectImage={handleAddImageAsClip}
        onImportNewImage={() => imageFileInputRef.current?.click()}
        onClose={() => setIsImageSlidePickerOpen(false)}
      />

      {/* Video Picker Modal */}
      <VideoPickerModal
        isOpen={isVideoPickerOpen}
        libraryVideos={libraryVideos}
        initialPosition={videoInsertPosition}
        onSelectVideo={(v, pos) => addClipToTimeline(v, pos)}
        onImportNewVideo={() => videoFileInputRef.current?.click()}
        onClose={() => setIsVideoPickerOpen(false)}
      />

      <VoiceoverModal
        isOpen={isVoiceoverModalOpen}
        voiceoverForm={voiceoverForm}
        setVoiceoverForm={setVoiceoverForm as any}
        onSaveVoiceover={handleSaveVoiceoverForm}
        onClose={() => setIsVoiceoverModalOpen(false)}
      />
    </>
  );
};
