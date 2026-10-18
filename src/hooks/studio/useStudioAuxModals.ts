import { useState } from 'react';
import type { SavedVideo } from '../../utils/db';

export function useStudioAuxModals() {
  const [gifModalVideo, setGifModalVideo] = useState<SavedVideo | null>(null);
  const [frameModalVideo, setFrameModalVideo] = useState<SavedVideo | null>(null);
  const [subtitlesModalVideo, setSubtitlesModalVideo] = useState<SavedVideo | null>(null);
  const [isTutorialMakerOpen, setIsTutorialMakerOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [silenceRemoverLibraryVideo, setSilenceRemoverLibraryVideo] = useState<SavedVideo | null>(null);

  const openExportedInSubtitles = (exportedBlob: Blob | null, projectId: string, projectName: string, totalDuration: number) => {
    if (exportedBlob) {
      setSubtitlesModalVideo({
        id: projectId,
        title: projectName,
        blob: exportedBlob,
        thumbnail: '',
        duration: Math.round(totalDuration),
        size: exportedBlob.size,
        date: new Date().toISOString()
      });
    }
  };

  const openExportedInFrame = (exportedBlob: Blob | null, projectId: string, projectName: string, totalDuration: number) => {
    if (exportedBlob) {
      setFrameModalVideo({
        id: projectId,
        title: projectName,
        blob: exportedBlob,
        thumbnail: '',
        duration: Math.round(totalDuration),
        size: exportedBlob.size,
        date: new Date().toISOString()
      });
    }
  };

  const openExportedInGif = (exportedBlob: Blob | null, projectId: string, projectName: string, totalDuration: number) => {
    if (exportedBlob) {
      setGifModalVideo({
        id: projectId,
        title: projectName,
        blob: exportedBlob,
        thumbnail: '',
        duration: Math.round(totalDuration),
        size: exportedBlob.size,
        date: new Date().toISOString()
      });
    }
  };

  return {
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
    silenceRemoverLibraryVideo,
    setSilenceRemoverLibraryVideo,
    openExportedInSubtitles,
    openExportedInFrame,
    openExportedInGif
  };
}
