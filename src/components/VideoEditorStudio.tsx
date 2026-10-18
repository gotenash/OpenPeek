import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { 
  getAllMedia,
  deleteMedia,
  getAllProjects,
  type SavedVideo, 
  type SavedMedia,
  type SavedProject 
} from '../utils/db';
import { 
  calculateTotalDuration, 
  formatYouTubeChapters
} from '../utils/videoCompositor';
import { importSingleFile } from '../utils/mediaImporter';

import { StudioTimeline } from './studio/StudioTimeline';
import { StudioTopBar } from './studio/StudioTopBar';
import { StudioModalsLayer } from './studio/StudioModalsLayer';
import { useStudioProjectState } from '../hooks/studio/useStudioProjectState';
import { useStudioFullscreen } from '../hooks/studio/useStudioFullscreen';
import { useStudioAuxModals } from '../hooks/studio/useStudioAuxModals';
import { useStudioHistory } from '../hooks/studio/useStudioHistory';
import { useStudioProjectManager } from '../hooks/studio/useStudioProjectManager';
import { useStudioClips } from '../hooks/studio/useStudioClips';
import { useStudioOverlays } from '../hooks/studio/useStudioOverlays';
import { useStudioAudio } from '../hooks/studio/useStudioAudio';
import { useStudioShortcuts } from '../hooks/studio/useStudioShortcuts';
import { useStudioFilmstrips } from '../hooks/studio/useStudioFilmstrips';
import { useStudioExport } from '../hooks/studio/useStudioExport';
import { useStudioPlayback } from '../hooks/studio/useStudioPlayback';
import { useStudioMediaPreloader } from '../hooks/studio/useStudioMediaPreloader';
import { StudioMediaBin } from './studio/StudioMediaBin';
import { StudioPlayer } from './studio/StudioPlayer';

export function formatTime(secs: number): string {
  const safe = typeof secs === 'number' && !isNaN(secs) && secs >= 0 ? secs : 0;
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function VideoEditorStudio() {
  const {
    previewSize,
    previewHeight,
    updatePreviewSize,
    isFullscreen,
    toggleFullscreen,
    previewContainerRef
  } = useStudioFullscreen();

  const {
    project,
    setProject,
    _setProject,
    projectRef,
    undoStackRef,
    redoStackRef,
    canUndo,
    setCanUndo,
    canRedo,
    setCanRedo,
    isUndoRedoRef,
    selectedElement,
    setSelectedElement
  } = useStudioProjectState();

  const {
    gifModalVideo,
    setGifModalVideo,
    frameModalVideo,
    setFrameModalVideo,
    subtitlesModalVideo,
    setSubtitlesModalVideo,
    isTutorialMakerOpen,
    setIsTutorialMakerOpen,
    isVoiceModalOpen,
    setIsVoiceModalOpen,
    setSilenceRemoverLibraryVideo,
    openExportedInSubtitles,
    openExportedInFrame,
    openExportedInGif
  } = useStudioAuxModals();

  const [libraryVideos, setLibraryVideos] = useState<SavedVideo[]>([]);
  const [libraryImages, setLibraryImages] = useState<SavedMedia[]>([]);
  const [projectId, setProjectId] = useState<string>(() => `proj_${Date.now()}`);
  const [projectName, setProjectName] = useState<string>('Mon Projet de Montage');
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [isProjectListModalOpen, setIsProjectListModalOpen] = useState(false);
  const [chutierTab, setChutierTab] = useState<'videos' | 'images' | 'audio'>('videos');
  const [exportFormat, setExportFormat] = useState<'mp4' | 'webm'>('mp4');
  const [targetTrackForInsert, setTargetTrackForInsert] = useState<1 | 2>(1);

  const [timelineViewMode, setTimelineViewMode] = useState<'spatial' | 'filmstrip' | 'compact'>('spatial');
  const [timelineScale, setTimelineScale] = useState<number>(1);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const imagesCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const animationFrameRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const bgMusicAudioRef = useRef<HTMLAudioElement | null>(null);
  const exportContainerRef = useRef<HTMLDivElement | null>(null);
  const voiceoverAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const loadLibraryAndProjects = async () => {
    const list = await getAllMedia();
    setLibraryVideos(list.filter(m => !m.type || m.type === 'video'));
    setLibraryImages(list.filter(m => m.type === 'image'));
    const projs = await getAllProjects();
    setSavedProjects(projs);
  };

  useEffect(() => {
    loadLibraryAndProjects();
  }, []);

  const clipTimelineOffsets = useMemo(() => {
    const offsets = new Map<string, { start: number; end: number; duration: number }>();
    let currentOffset = 0;
    const clips = project.clips || [];
    for (let i = 0; i < clips.length; i++) {
      const c = clips[i];
      const speed = c.playbackSpeed && c.playbackSpeed > 0 ? c.playbackSpeed : 1.0;
      const duration = Math.max(0.1, ((c.endTrim ?? 10) - (c.startTrim ?? 0)) / speed);
      const start = (typeof c.startTime === 'number' && !isNaN(c.startTime)) ? c.startTime : currentOffset;
      offsets.set(c.id, { start, end: start + duration, duration });
      currentOffset = Math.max(currentOffset + duration, start + duration);
      if (i < clips.length - 1 && c.transitionToNext && c.transitionToNext !== 'none') {
        const transDur = Math.min(c.transitionDuration || 1, duration / 2);
        currentOffset -= transDur;
      }
    }
    return offsets;
  }, [project.clips]);

  const { clipFilmstrips } = useStudioFilmstrips({
    project,
    clipTimelineOffsets,
    imagesCacheRef,
    formatTime
  });

  const totalDuration = calculateTotalDuration(project);
  const safeDur = Math.max(0.1, totalDuration || 1);

  const {
    currentTime,
    currentTimeRef,
    setCurrentTime,
    isPlaying,
    isPlayingRef,
    setIsPlaying,
    togglePlay,
    handleSeek,
    renderStaticPreviewAt
  } = useStudioPlayback({
    project,
    totalDuration,
    clipTimelineOffsets,
    previewCanvasRef,
    videoElementsRef,
    imagesCacheRef,
    voiceoverAudiosRef,
    bgMusicAudioRef,
    animationFrameRef,
    isRecordingVoiceover: false,
    stopVoiceoverRecording: () => {}
  });

  useStudioMediaPreloader({
    project,
    videoElementsRef,
    imagesCacheRef,
    bgMusicAudioRef,
    voiceoverAudiosRef,
    exportContainerRef,
    isPlayingRef,
    currentTimeRef,
    renderStaticPreviewAt
  });

  const {
    saveSuccessMsg,
    setSaveSuccessMsg,
    handleSaveProject,
    handleLoadProject,
    handleDeleteSavedProject,
    handleNewProject,
    handleExportProjectFile,
    handleImportProjectFile
  } = useStudioProjectManager({
    project,
    setProject,
    _setProject,
    projectId,
    setProjectId,
    projectName,
    setProjectName,
    totalDuration,
    libraryVideos,
    libraryImages,
    loadLibraryAndProjects,
    setCurrentTime,
    setSelectedClipId,
    setSelectedElement,
    setIsPlaying,
    isPlayingRef,
    undoStackRef,
    redoStackRef,
    setCanUndo,
    setCanRedo,
    setIsProjectListModalOpen
  });

  const {
    customAudios,
    previewingAudioId,
    generatingPresetId,
    handleSelectPresetMusic,
    handleUploadAudio,
    handleTogglePreviewAudio,
    handleUpdateMusicVolume,
    handleRemoveBackgroundMusic
  } = useStudioAudio({
    setProject,
    bgMusicAudioRef
  });

  const {
    isVideoPickerOpen,
    setIsVideoPickerOpen,
    videoInsertPosition,
    setVideoInsertPosition,
    addClipToTimeline,
    isSlideModalOpen,
    setIsSlideModalOpen,
    slideModalMode,
    slideForm,
    openAddSlideModal,
    openEditSlideModal,
    handleSaveSlideClip,
    isImageSlidePickerOpen,
    setIsImageSlidePickerOpen,
    imageSlideInsertPosition,
    setImageSlideInsertPosition,
    handleAddImageAsClip,
    removeClipFromTimeline,
    updateClipTrim,
    updateClipTransition,
    updateClipSpeed,
    updateClipVolume,
    toggleClipTrack,
    updateClipTiming,
    isSilenceModalOpen,
    setIsSilenceModalOpen,
    silenceModalClip,
    setSilenceModalClip,
    handleApplySilenceSegmentsToClip,
    canSplitAtPlayhead,
    handleSplitAtPlayhead
  } = useStudioClips({
    project,
    setProject,
    selectedClipId,
    setSelectedClipId,
    selectedElement,
    setSelectedElement,
    targetTrackForInsert,
    setTargetTrackForInsert,
    currentTime,
    currentTimeRef,
    isPlayingRef,
    videoElementsRef,
    imagesCacheRef,
    exportContainerRef,
    clipTimelineOffsets,
    handleSeek: (t) => handleSeek(t),
    renderStaticPreviewAt: (t) => renderStaticPreviewAt(t),
    formatTime
  });

  const {
    isTitleModalOpen,
    setIsTitleModalOpen,
    titleFormData,
    setTitleFormData,
    handleSaveTitleModal,
    openAddTitleAtTime,
    openEditTitleModal,
    updateTitleTiming,
    removeTitle,
    isZoomModalOpen,
    setIsZoomModalOpen,
    zoomFormData,
    setZoomFormData,
    openAddZoomAtTime,
    openEditZoomModal,
    updateZoomTiming,
    handleSaveZoomModal,
    removeZoom,
    isImageModalOpen,
    setIsImageModalOpen,
    imageModalMode,
    imageFormData,
    setImageFormData,
    openAddImageAtTime,
    openAddImageOverlayModal,
    openEditImageOverlayModal,
    handleSaveImageModal,
    updateImageTiming,
    removeImageOverlay,
    isChaptersModalOpen,
    setIsChaptersModalOpen,
    copiedChapters,
    handleAutoGenerateChaptersFromClips,
    handleAutoGenerateChaptersFromTitles,
    handleAddChapterAtCurrentTime,
    handleUpdateChapter,
    handleRemoveChapter,
    handleCopyYouTubeChapters,
    handleDownloadYouTubeChapters,
    isPermanentOverlay,
    setIsPermanentOverlay,
    isVoiceoverModalOpen,
    setIsVoiceoverModalOpen,
    voiceoverForm,
    setVoiceoverForm,
    isRecordingVoiceover,
    startVoiceoverRecording,
    stopVoiceoverRecording,
    updateVoiceoverTiming,
    removeVoiceover,
    openEditVoiceoverModal,
    handleSaveVoiceoverForm
  } = useStudioOverlays({
    project,
    setProject,
    projectName,
    totalDuration,
    currentTime,
    currentTimeRef,
    isPlayingRef,
    setIsPlaying,
    imagesCacheRef,
    videoElementsRef,
    voiceoverAudiosRef,
    bgMusicAudioRef,
    animationFrameRef,
    renderStaticPreviewAt: (t) => renderStaticPreviewAt(t),
    loadLibraryAndProjects,
    formatTime
  });

  const {
    handleUndo,
    handleRedo,
    handleDeleteSelected
  } = useStudioHistory({
    undoStackRef,
    redoStackRef,
    projectRef,
    isUndoRedoRef,
    _setProject,
    setCanUndo,
    setCanRedo,
    selectedElement,
    setSelectedElement,
    selectedClipId,
    setSelectedClipId,
    currentTimeRef,
    isPlayingRef,
    renderStaticPreviewAt,
    removeClipFromTimeline,
    removeVoiceover,
    removeTitle,
    removeImageOverlay,
    removeZoom,
    handleRemoveChapter
  });

  useStudioShortcuts({
    isFullscreen,
    toggleFullscreen,
    togglePlay: () => togglePlay(),
    handleSeek: (t) => handleSeek(t),
    currentTimeRef,
    totalDuration,
    handleUndo,
    handleRedo,
    handleDeleteSelected: () => handleDeleteSelected(),
    handleSplitAtPlayhead,
    selectedElement,
    selectedClipId,
    isAnyModalOpen:
      isTitleModalOpen ||
      isSlideModalOpen ||
      isZoomModalOpen ||
      isVoiceoverModalOpen ||
      isVideoPickerOpen ||
      isImageSlidePickerOpen ||
      isImageModalOpen ||
      isProjectListModalOpen
  });

  const handleImportVideoFromDisk = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importSingleFile(file);
      await loadLibraryAndProjects();
      addClipToTimeline(imported, videoInsertPosition);
    } catch {
      alert("Impossible de charger ce fichier vidéo.");
    }
    e.target.value = '';
  };

  const {
    isExporting,
    exportProgress,
    exportCurrentSec,
    exportStatus,
    exportedBlob,
    exportEngine,
    setExportEngine,
    isEligibleForTurbo,
    downloadToast,
    setDownloadToast,
    isDownloaded,
    handleCancelExport,
    handleExportProject,
    handleDownloadExported
  } = useStudioExport({
    project,
    totalDuration,
    exportFormat,
    projectName,
    imagesCacheRef,
    exportContainerRef,
    previewCanvasRef,
    clipTimelineOffsets,
    videoElementsRef,
    bgMusicAudioRef,
    isPlayingRef,
    setIsPlaying,
    setSaveSuccessMsg,
    loadLibraryAndProjects
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
      {/* Hidden container for rendering & export media elements */}
      <div 
        ref={exportContainerRef}
        style={{ position: 'fixed', left: -9999, top: -9999, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} 
        aria-hidden="true"
      />
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".captproj,.json"
        style={{ display: 'none' }}
        onChange={handleImportProjectFile}
      />
      <input
        type="file"
        ref={audioFileInputRef}
        accept="audio/*,.mp3,.wav,.m4a,.ogg"
        style={{ display: 'none' }}
        onChange={handleUploadAudio}
      />
      <input
        type="file"
        ref={videoFileInputRef}
        accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv"
        style={{ display: 'none' }}
        onChange={handleImportVideoFromDisk}
      />

      <StudioTopBar
        projectName={projectName}
        setProjectName={setProjectName}
        saveSuccessMsg={saveSuccessMsg}
        handleSaveProject={handleSaveProject}
        setIsProjectListModalOpen={setIsProjectListModalOpen}
        savedProjects={savedProjects}
        handleNewProject={handleNewProject}
        handleExportProjectFile={handleExportProjectFile}
        fileInputRef={fileInputRef}
      />

      {/* Middle Split: Media Bin & Master Preview Player */}
      <div style={{ display: 'grid', gridTemplateColumns: '270px 1fr', gap: '12px' }}>
        <StudioMediaBin
          previewHeight={previewHeight}
          chutierTab={chutierTab}
          setChutierTab={setChutierTab}
          libraryVideos={libraryVideos}
          libraryImages={libraryImages}
          customAudios={customAudios}
          previewingAudioId={previewingAudioId}
          generatingPresetId={generatingPresetId}
          currentBackgroundMusicId={project.backgroundMusic?.id}
          formatTime={formatTime}
          onTriggerVideoImport={() => videoFileInputRef.current?.click()}
          onTriggerImageImport={() => imageFileInputRef.current?.click()}
          onTriggerAudioImport={() => audioFileInputRef.current?.click()}
          onOpenSilenceRemoverForVideo={(v) => setSilenceRemoverLibraryVideo(v)}
          onAddClipToTimeline={(v) => addClipToTimeline(v)}
          onAddImageAsClip={(img) => handleAddImageAsClip(img, 5, 'end')}
          onOpenAddImageOverlayModal={(img) => openAddImageOverlayModal(img)}
          onDeleteImage={async (id, title) => {
            if (confirm(`Supprimer "${title}" de la bibliothèque locale ?`)) {
              await deleteMedia(id);
              loadLibraryAndProjects();
            }
          }}
          onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
          onSelectPresetMusic={(presetId) => handleSelectPresetMusic(presetId)}
          onTogglePreviewAudio={(id, blob) => handleTogglePreviewAudio(id, blob)}
          onSelectCustomAudio={(audio) => {
            setProject(prev => ({
              ...prev,
              backgroundMusic: {
                id: audio.id,
                title: audio.title,
                blob: audio.blob,
                volume: prev.backgroundMusic?.volume ?? 0.15,
                loop: true,
                isPreset: false
              }
            }));
          }}
        />

        <StudioPlayer
          previewContainerRef={previewContainerRef}
          previewCanvasRef={previewCanvasRef}
          previewSize={previewSize}
          previewHeight={previewHeight}
          updatePreviewSize={updatePreviewSize}
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen}
          projectName={projectName}
          currentTime={currentTime}
          totalDuration={totalDuration}
          isPlaying={isPlaying}
          togglePlay={togglePlay}
          handleSeek={handleSeek}
          handleSplitAtPlayhead={handleSplitAtPlayhead}
          canSplitAtPlayhead={canSplitAtPlayhead}
          isRecordingVoiceover={isRecordingVoiceover}
          startVoiceoverRecording={startVoiceoverRecording}
          stopVoiceoverRecording={stopVoiceoverRecording}
          isExporting={isExporting}
          exportProgress={exportProgress}
          exportStatus={exportStatus}
          exportFormat={exportFormat}
          setExportFormat={setExportFormat}
          exportEngine={exportEngine}
          setExportEngine={setExportEngine}
          isEligibleForTurbo={isEligibleForTurbo}
          exportCurrentSec={exportCurrentSec}
          handleExportProject={handleExportProject}
          handleCancelExport={handleCancelExport}
          exportedBlob={exportedBlob}
          handleDownloadExported={handleDownloadExported}
          isDownloaded={isDownloaded}
          formatTime={formatTime}
          hasClips={project.clips.length > 0}
          onOpenAddTitleModal={() => openAddTitleAtTime(currentTime)}
          onOpenAddSlideModal={() => openAddSlideModal('current')}
          onOpenAddZoomModal={() => openAddZoomAtTime(currentTime)}
          onOpenAddImageOverlayModal={() => {
            if (libraryImages.length > 0) {
              openAddImageOverlayModal(libraryImages[0]);
            } else {
              setChutierTab('images');
              imageFileInputRef.current?.click();
            }
          }}
          onOpenChaptersModal={() => setIsChaptersModalOpen(true)}
          onOpenSubtitlesModal={() => openExportedInSubtitles(exportedBlob, projectId, projectName, totalDuration)}
          onOpenFrameModal={() => openExportedInFrame(exportedBlob, projectId, projectName, totalDuration)}
          onOpenGifModal={() => openExportedInGif(exportedBlob, projectId, projectName, totalDuration)}
          onOpenTutorialMaker={() => setIsTutorialMakerOpen(true)}
          chaptersCount={(project.chapters || []).length}
          activeOverlays={{
            hasTitle: (project.titles || []).some(t => currentTime >= t.startTime && currentTime <= t.startTime + t.duration),
            hasZoom: (project.zooms || []).some(z => currentTime >= z.startTime && currentTime <= z.startTime + z.duration),
            hasImage: (project.images || []).some(img => currentTime >= img.startTime && currentTime <= img.startTime + img.duration)
          }}
        />
      </div>

      <StudioTimeline
        project={project}
        setProject={setProject}
        currentTime={currentTime}
        totalDuration={totalDuration}
        safeDur={safeDur}
        timelineScale={timelineScale}
        setTimelineScale={setTimelineScale}
        timelineViewMode={timelineViewMode}
        setTimelineViewMode={setTimelineViewMode}
        selectedClipId={selectedClipId}
        setSelectedClipId={setSelectedClipId}
        selectedElement={selectedElement}
        setSelectedElement={setSelectedElement}
        clipTimelineOffsets={clipTimelineOffsets}
        clipFilmstrips={clipFilmstrips}
        onSeek={handleSeek}
        onUndo={handleUndo}
        canUndo={canUndo}
        onRedo={handleRedo}
        canRedo={canRedo}
        onSplitAtPlayhead={handleSplitAtPlayhead}
        canSplitAtPlayhead={canSplitAtPlayhead}
        onDeleteSelected={handleDeleteSelected}
        onUpdateClipTiming={updateClipTiming}
        onUpdateClipTrim={updateClipTrim}
        onUpdateClipSpeed={updateClipSpeed}
        onUpdateClipVolume={updateClipVolume}
        onUpdateClipTransition={updateClipTransition}
        onToggleClipTrack={toggleClipTrack}
        onRemoveClip={removeClipFromTimeline}
        onOpenEditSlide={openEditSlideModal}
        onOpenAddSlide={(track) => {
          setTargetTrackForInsert(track);
          openAddSlideModal('current');
        }}
        onOpenVideoPicker={(track) => {
          setTargetTrackForInsert(track);
          setVideoInsertPosition('current');
          setIsVideoPickerOpen(true);
        }}
        onOpenAddImage={(track) => {
          setTargetTrackForInsert(track);
          setImageSlideInsertPosition('current');
          setIsImageSlidePickerOpen(true);
        }}
        onOpenSilenceRemover={(clip) => {
          setSilenceModalClip(clip);
          setIsSilenceModalOpen(true);
        }}
        isRecordingVoiceover={isRecordingVoiceover}
        onToggleRecordVoiceover={() => {
          if (isRecordingVoiceover) {
            stopVoiceoverRecording();
          } else {
            startVoiceoverRecording();
          }
        }}
        onUpdateVoiceoverTiming={updateVoiceoverTiming}
        onOpenEditVoiceover={openEditVoiceoverModal}
        onRemoveVoiceover={removeVoiceover}
        onUpdateTitleTiming={updateTitleTiming}
        onOpenEditTitle={openEditTitleModal}
        onRemoveTitle={removeTitle}
        onOpenAddTitleAtTime={openAddTitleAtTime}
        onUpdateImageTiming={updateImageTiming}
        onOpenEditImage={openEditImageOverlayModal}
        onRemoveImage={removeImageOverlay}
        onOpenAddImageAtTime={openAddImageAtTime}
        onUpdateZoomTiming={updateZoomTiming}
        onOpenEditZoom={openEditZoomModal}
        onRemoveZoom={removeZoom}
        onOpenAddZoomAtTime={openAddZoomAtTime}
        onRemoveBackgroundMusic={handleRemoveBackgroundMusic}
        onUpdateMusicVolume={handleUpdateMusicVolume}
        onOpenChutierAudio={() => setChutierTab('audio')}
        onRemoveChapter={handleRemoveChapter}
      />
      <StudioModalsLayer
        project={project}
        setProject={setProject}
        totalDuration={totalDuration}
        currentTime={currentTime}
        formatTime={formatTime}
        exportedBlob={exportedBlob}
        savedProjects={savedProjects}
        libraryVideos={libraryVideos}
        libraryImages={libraryImages}
        imageFileInputRef={imageFileInputRef}
        videoFileInputRef={videoFileInputRef}
        isProjectListModalOpen={isProjectListModalOpen}
        setIsProjectListModalOpen={setIsProjectListModalOpen}
        handleLoadProject={handleLoadProject}
        handleDeleteSavedProject={handleDeleteSavedProject}
        isTitleModalOpen={isTitleModalOpen}
        setIsTitleModalOpen={setIsTitleModalOpen}
        titleFormData={titleFormData}
        setTitleFormData={setTitleFormData}
        handleSaveTitleModal={handleSaveTitleModal}
        isZoomModalOpen={isZoomModalOpen}
        setIsZoomModalOpen={setIsZoomModalOpen}
        zoomFormData={zoomFormData}
        setZoomFormData={setZoomFormData}
        handleSaveZoomModal={handleSaveZoomModal}
        isImageModalOpen={isImageModalOpen}
        setIsImageModalOpen={setIsImageModalOpen}
        imageModalMode={imageModalMode}
        imageFormData={imageFormData}
        setImageFormData={setImageFormData}
        isPermanentOverlay={isPermanentOverlay}
        setIsPermanentOverlay={setIsPermanentOverlay}
        handleSaveImageModal={handleSaveImageModal}
        isChaptersModalOpen={isChaptersModalOpen}
        setIsChaptersModalOpen={setIsChaptersModalOpen}
        copiedChapters={copiedChapters}
        formatYouTubeChapters={formatYouTubeChapters}
        handleAutoGenerateChaptersFromClips={handleAutoGenerateChaptersFromClips}
        handleAutoGenerateChaptersFromTitles={handleAutoGenerateChaptersFromTitles}
        handleAddChapterAtCurrentTime={handleAddChapterAtCurrentTime}
        handleUpdateChapter={handleUpdateChapter}
        handleRemoveChapter={handleRemoveChapter}
        handleSeek={handleSeek}
        handleDownloadYouTubeChapters={handleDownloadYouTubeChapters}
        handleCopyYouTubeChapters={handleCopyYouTubeChapters}
        gifModalVideo={gifModalVideo}
        setGifModalVideo={setGifModalVideo}
        frameModalVideo={frameModalVideo}
        setFrameModalVideo={setFrameModalVideo}
        subtitlesModalVideo={subtitlesModalVideo}
        setSubtitlesModalVideo={setSubtitlesModalVideo}
        isVoiceModalOpen={isVoiceModalOpen}
        setIsVoiceModalOpen={setIsVoiceModalOpen}
        isSilenceModalOpen={isSilenceModalOpen}
        setIsSilenceModalOpen={setIsSilenceModalOpen}
        silenceModalClip={silenceModalClip}
        setSilenceModalClip={setSilenceModalClip}
        handleApplySilenceCuts={handleApplySilenceSegmentsToClip}
        isTutorialMakerOpen={isTutorialMakerOpen}
        setIsTutorialMakerOpen={setIsTutorialMakerOpen}
        isSlideModalOpen={isSlideModalOpen}
        setIsSlideModalOpen={setIsSlideModalOpen}
        slideModalMode={slideModalMode}
        slideForm={slideForm}
        handleSaveSlideClip={handleSaveSlideClip}
        isImageSlidePickerOpen={isImageSlidePickerOpen}
        setIsImageSlidePickerOpen={setIsImageSlidePickerOpen}
        imageSlideInsertPosition={imageSlideInsertPosition}
        handleAddImageAsClip={handleAddImageAsClip}
        isVideoPickerOpen={isVideoPickerOpen}
        setIsVideoPickerOpen={setIsVideoPickerOpen}
        videoInsertPosition={videoInsertPosition}
        addClipToTimeline={addClipToTimeline}
        isVoiceoverModalOpen={isVoiceoverModalOpen}
        setIsVoiceoverModalOpen={setIsVoiceoverModalOpen}
        voiceoverForm={voiceoverForm}
        setVoiceoverForm={setVoiceoverForm}
        handleSaveVoiceoverForm={handleSaveVoiceoverForm}
      />

      {/* Floating Download Success Toast */}
      {downloadToast && (
        <div 
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 99999,
            backgroundColor: 'rgba(15, 23, 42, 0.96)',
            border: '1px solid #10b981',
            borderRadius: '10px',
            padding: '14px 18px',
            boxShadow: '0 12px 35px rgba(0, 0, 0, 0.65), 0 0 25px rgba(16, 185, 129, 0.35)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '380px',
            animation: 'fadeIn 0.25s ease'
          }}
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981',
            flexShrink: 0
          }}>
            <Check size={20} strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', marginBottom: '2px' }}>
              Téléchargement réussi !
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Fichier : <strong style={{ color: '#34d399' }}>{downloadToast.fileName}</strong>
            </div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
              Enregistré dans votre dossier Téléchargements
            </div>
          </div>
          <button 
            onClick={() => setDownloadToast(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Fermer"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
