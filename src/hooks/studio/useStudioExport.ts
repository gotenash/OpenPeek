import React, { useState, useRef, useMemo } from 'react';
import type { EditorProject } from '../../utils/videoCompositor';
import { exportProjectVideo } from '../../utils/studio/projectExporter';
import { saveRecording } from '../../utils/db';

export interface UseStudioExportProps {
  project: EditorProject;
  totalDuration: number;
  exportFormat: 'mp4' | 'webm';
  projectName: string;
  imagesCacheRef: React.MutableRefObject<Map<string, HTMLImageElement>>;
  exportContainerRef: React.RefObject<HTMLDivElement | null>;
  previewCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  clipTimelineOffsets: Map<string, { start: number; end: number; duration: number }>;
  videoElementsRef: React.MutableRefObject<Map<string, HTMLVideoElement>>;
  bgMusicAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
  isPlayingRef: React.MutableRefObject<boolean>;
  setIsPlaying: (playing: boolean) => void;
  setSaveSuccessMsg: (msg: string | null) => void;
  loadLibraryAndProjects: () => Promise<void>;
}

export function useStudioExport({
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
}: UseStudioExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportCurrentSec, setExportCurrentSec] = useState(0);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [exportEngine, setExportEngine] = useState<'auto' | 'turbo' | 'studio'>('auto');
  const [downloadToast, setDownloadToast] = useState<{ visible: boolean; fileName: string } | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const abortExportRef = useRef<boolean>(false);

  const isEligibleForTurbo = useMemo(() => {
    if (!project || !project.clips || project.clips.length === 0) return false;
    const hasZooms = (project.zooms || []).length > 0;
    const hasTitles = (project.titles || []).length > 0;
    const hasImages = (project.images || []).length > 0;
    const hasVoiceovers = (project.voiceovers || []).length > 0;
    const hasSlides = project.clips.some(c => c.type === 'slide');
    return !hasZooms && !hasTitles && !hasImages && !hasVoiceovers && !hasSlides;
  }, [project]);

  const handleCancelExport = () => {
    abortExportRef.current = true;
    setIsExporting(false);
    setExportStatus('');
    setExportProgress(0);
    setExportCurrentSec(0);
  };

  const handleExportProject = async () => {
    abortExportRef.current = false;
    setExportCurrentSec(0);
    videoElementsRef.current.forEach(v => v.pause());
    if (bgMusicAudioRef.current) bgMusicAudioRef.current.pause();
    isPlayingRef.current = false;
    setIsPlaying(false);
    setIsExporting(true);

    await exportProjectVideo({
      project,
      totalDuration,
      exportFormat,
      exportEngine,
      projectName,
      imagesCache: imagesCacheRef.current,
      container: exportContainerRef.current || document.body,
      clipTimelineOffsets: clipTimelineOffsets as any,
      isAborted: () => abortExportRef.current,
      onStatus: (status) => setExportStatus(status),
      onProgress: (prog, curSec) => {
        setExportProgress(prog);
        setExportCurrentSec(curSec);
      },
      onFrame: (canvas) => {
        if (previewCanvasRef.current) {
          const pCtx = previewCanvasRef.current.getContext('2d');
          if (pCtx) {
            pCtx.drawImage(canvas, 0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
          }
        }
      },
      onComplete: async (finalBlob, outputExt, thumbUrl) => {
        setExportedBlob(finalBlob);
        setIsExporting(false);
        setExportStatus('');
        setExportProgress(100);
        setSaveSuccessMsg(`Montage exporté en ${outputExt.toUpperCase()} avec succès !`);
        setTimeout(() => setSaveSuccessMsg(null), 5000);

        await saveRecording({
          id: crypto.randomUUID ? crypto.randomUUID() : `montage_${Date.now()}`,
          title: `${projectName || 'Montage'}.${outputExt}`,
          blob: finalBlob,
          thumbnail: thumbUrl,
          duration: Math.round(totalDuration),
          size: finalBlob.size,
          date: new Date().toISOString()
        });
        loadLibraryAndProjects();
      },
      onError: (msg) => {
        setIsExporting(false);
        alert(msg);
      }
    });
  };

  const handleDownloadExported = () => {
    if (!exportedBlob) return;
    const url = URL.createObjectURL(exportedBlob);
    const a = document.createElement('a');
    a.href = url;
    const isMp4 = exportedBlob.type.includes('mp4');
    const ext = isMp4 ? 'mp4' : 'webm';
    const fileName = `${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'montage'}.${ext}`;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setIsDownloaded(true);
    setDownloadToast({ visible: true, fileName });
    setSaveSuccessMsg(`Fichier "${fileName}" téléchargé avec succès !`);
    setTimeout(() => {
      setIsDownloaded(false);
    }, 4000);
    setTimeout(() => {
      setDownloadToast(null);
    }, 7000);
  };

  return {
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
  };
}
