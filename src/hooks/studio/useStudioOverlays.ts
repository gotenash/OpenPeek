import React, { useState, useRef } from 'react';
import {
  type TimelineTitle,
  type TimelineZoom,
  type TimelineImage,
  type TimelineChapter,
  type TimelineVoiceover,
  type EditorProject,
  formatYouTubeChapters
} from '../../utils/videoCompositor';
import { type SavedMedia } from '../../utils/db';
import { importSingleFile } from '../../utils/mediaImporter';

export interface UseStudioOverlaysProps {
  project: EditorProject;
  setProject: (updater: EditorProject | ((prev: EditorProject) => EditorProject), forceHistory?: boolean) => void;
  projectName: string;
  totalDuration: number;
  currentTime: number;
  currentTimeRef: React.MutableRefObject<number>;
  isPlayingRef: React.MutableRefObject<boolean>;
  setIsPlaying: (playing: boolean) => void;
  imagesCacheRef: React.MutableRefObject<Map<string, HTMLImageElement>>;
  videoElementsRef: React.MutableRefObject<Map<string, HTMLVideoElement>>;
  voiceoverAudiosRef: React.MutableRefObject<Map<string, HTMLAudioElement>>;
  bgMusicAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
  animationFrameRef: React.MutableRefObject<number>;
  renderStaticPreviewAt: (time: number) => void;
  loadLibraryAndProjects: () => Promise<void>;
  formatTime: (secs: number) => string;
}

export function useStudioOverlays({
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
  renderStaticPreviewAt,
  loadLibraryAndProjects,
  formatTime
}: UseStudioOverlaysProps) {
  // Title Modal State
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  const [titleFormData, setTitleFormData] = useState<TimelineTitle>({
    id: '',
    text: '',
    subtitle: '',
    startTime: 0,
    duration: 3,
    style: 'pill',
    textColor: '#ffffff',
    bgColor: 'rgba(0,0,0,0.7)',
    fontSize: 24,
    animation: 'slide-up'
  });

  // Zoom Modal State
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [zoomFormData, setZoomFormData] = useState<TimelineZoom>({
    id: '',
    startTime: 0,
    duration: 3,
    scale: 1.5,
    originX: 0.5,
    originY: 0.5,
    label: 'Focus'
  });

  // Image Overlay Modal State
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageModalMode, setImageModalMode] = useState<'add' | 'edit'>('add');
  const [isPermanentOverlay, setIsPermanentOverlay] = useState(false);
  const [imageFormData, setImageFormData] = useState<TimelineImage>({
    id: '',
    name: 'Logo',
    dataUrl: '',
    startTime: 0,
    duration: 5,
    position: 'top-right',
    x: 0.85,
    y: 0.15,
    scale: 0.15,
    opacity: 1.0,
    hasShadow: true,
    borderRadius: 0
  });

  // YouTube Chapters Modal State
  const [isChaptersModalOpen, setIsChaptersModalOpen] = useState(false);
  const [chaptersExportFormat, setChaptersExportFormat] = useState<'youtube' | 'json' | 'srt'>('youtube');
  const [copiedChapters, setCopiedChapters] = useState(false);

  // Voiceover Modal & Live Recording State
  const [isVoiceoverModalOpen, setIsVoiceoverModalOpen] = useState(false);
  const [voiceoverForm, setVoiceoverForm] = useState<{
    id: string;
    label: string;
    startTime: number;
    duration: number;
    volume: number;
    url: string;
  } | null>(null);
  const [isRecordingVoiceover, setIsRecordingVoiceover] = useState(false);
  const isRecordingVoiceoverRef = useRef(false);
  const voiceoverRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceoverStreamRef = useRef<MediaStream | null>(null);
  const voiceoverChunksRef = useRef<Blob[]>([]);
  const voiceoverStartPosRef = useRef(0);

  // --- Title Handlers ---
  const handleSaveTitleModal = () => {
    if (!titleFormData.text.trim()) return;
    const newTitle: TimelineTitle = {
      ...titleFormData,
      id: titleFormData.id || `title_${Date.now()}`
    };
    setProject((prev) => {
      const exists = prev.titles.some((t) => t.id === newTitle.id);
      return {
        ...prev,
        titles: exists
          ? prev.titles.map((t) => t.id === newTitle.id ? newTitle : t)
          : [...prev.titles, newTitle]
      };
    });
    setIsTitleModalOpen(false);
  };

  const openAddTitleAtTime = (time: number) => {
    const cur = Math.round(time * 10) / 10;
    setTitleFormData({
      id: `title_${Date.now()}`,
      text: 'Nouveau Titre',
      subtitle: '',
      startTime: cur,
      duration: 3,
      style: 'pill',
      textColor: '#ffffff',
      bgColor: 'rgba(0,0,0,0.7)',
      fontSize: 24,
      animation: 'slide-up'
    });
    setIsTitleModalOpen(true);
  };

  const openEditTitleModal = (title: TimelineTitle) => {
    setTitleFormData({
      ...title,
      animation: title.animation || 'slide-up'
    });
    setIsTitleModalOpen(true);
  };

  const updateTitleTiming = (id: string, startTime: number, duration: number) => {
    const maxDur = Math.max(1, totalDuration);
    const validStart = Math.max(0, Math.min(Math.max(0, maxDur - 0.2), Math.round(startTime * 10) / 10));
    const validDuration = Math.max(0.5, Math.round(duration * 10) / 10);
    setProject(prev => ({
      ...prev,
      titles: prev.titles.map(t => t.id === id ? {
        ...t,
        startTime: validStart,
        duration: validDuration
      } : t)
    }));
    if (!isPlayingRef.current) {
      renderStaticPreviewAt(currentTimeRef.current);
    }
  };

  const removeTitle = (id: string) => {
    setProject((prev) => ({
      ...prev,
      titles: (prev.titles || []).filter((t) => t.id !== id)
    }));
    if (!isPlayingRef.current) {
      renderStaticPreviewAt(currentTimeRef.current);
    }
  };

  // --- Zoom Handlers ---
  const openAddZoomAtTime = (time: number) => {
    const cur = Math.round(time * 10) / 10;
    setZoomFormData({
      id: `zoom_${Date.now()}`,
      startTime: cur,
      duration: 3,
      scale: 1.5,
      originX: 0.5,
      originY: 0.5,
      label: 'Zoom Focus'
    });
    setIsZoomModalOpen(true);
  };

  const openEditZoomModal = (zoom: TimelineZoom) => {
    setZoomFormData({ ...zoom });
    setIsZoomModalOpen(true);
  };

  const updateZoomTiming = (id: string, startTime: number, duration: number) => {
    const maxDur = Math.max(1, totalDuration);
    const validStart = Math.max(0, Math.min(Math.max(0, maxDur - 0.2), Math.round(startTime * 10) / 10));
    const validDuration = Math.max(0.5, Math.round(duration * 10) / 10);
    setProject(prev => ({
      ...prev,
      zooms: (prev.zooms || []).map(z => z.id === id ? {
        ...z,
        startTime: validStart,
        duration: validDuration
      } : z)
    }));
    if (!isPlayingRef.current) {
      renderStaticPreviewAt(currentTimeRef.current);
    }
  };

  const handleSaveZoomModal = () => {
    const newZoom: TimelineZoom = {
      ...zoomFormData,
      id: zoomFormData.id || `zoom_${Date.now()}`
    };
    setProject((prev) => {
      const exists = (prev.zooms || []).some((z) => z.id === newZoom.id);
      return {
        ...prev,
        zooms: exists
          ? (prev.zooms || []).map((z) => z.id === newZoom.id ? newZoom : z)
          : [...(prev.zooms || []), newZoom]
      };
    });
    setIsZoomModalOpen(false);
  };

  const removeZoom = (id: string) => {
    setProject((prev) => ({
      ...prev,
      zooms: (prev.zooms || []).filter((z) => z.id !== id)
    }));
    if (!isPlayingRef.current) {
      renderStaticPreviewAt(currentTimeRef.current);
    }
  };

  // --- Image Handlers ---
  const openAddImageAtTime = (time: number) => {
    const cur = Math.round(time * 10) / 10;
    setImageFormData({
      id: `img_${Date.now()}`,
      name: 'Image Overlay',
      dataUrl: '',
      startTime: cur,
      duration: 4,
      position: 'top-right',
      x: 0.85,
      y: 0.15,
      scale: 0.15,
      opacity: 1.0,
      hasShadow: true,
      borderRadius: 0
    });
    setIsPermanentOverlay(false);
    setImageModalMode('add');
    setIsImageModalOpen(true);
  };

  const openAddImageOverlayModal = async (media: SavedMedia) => {
    let dataUrl = media.thumbnail || '';
    if (media.blob) {
      try {
        dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(media.blob);
        });
      } catch (e) {
        dataUrl = media.thumbnail || '';
      }
    }

    const defaultDuration = totalDuration > 0 ? totalDuration : 10;
    setImageFormData({
      id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: media.title || 'Logo',
      dataUrl,
      startTime: 0,
      duration: defaultDuration,
      position: 'top-right',
      x: 0.85,
      y: 0.15,
      scale: 0.15,
      opacity: 1.0,
      hasShadow: true,
      borderRadius: 0
    });
    setIsPermanentOverlay(true);
    setImageModalMode('add');
    setIsImageModalOpen(true);
  };

  const openEditImageOverlayModal = (overlay: TimelineImage) => {
    setImageFormData({ ...overlay });
    setIsPermanentOverlay(Math.abs(overlay.duration - totalDuration) < 0.5 && overlay.startTime === 0);
    setImageModalMode('edit');
    setIsImageModalOpen(true);
  };

  const handleSaveImageModal = () => {
    const finalDuration = isPermanentOverlay ? Math.max(1, totalDuration || 10) : imageFormData.duration;
    const finalStartTime = isPermanentOverlay ? 0 : imageFormData.startTime;
    const finalOverlay: TimelineImage = {
      ...imageFormData,
      startTime: Math.max(0, finalStartTime),
      duration: Math.max(0.1, finalDuration)
    };

    if (finalOverlay.dataUrl) {
      const img = new Image();
      img.onload = () => {
        imagesCacheRef.current.set(finalOverlay.id, img);
        if (!isPlayingRef.current) {
          renderStaticPreviewAt(currentTimeRef.current);
        }
      };
      img.src = finalOverlay.dataUrl;
      imagesCacheRef.current.set(finalOverlay.id, img);
    }

    setProject((prev) => {
      const existing = (prev.images || []).some((i) => i.id === finalOverlay.id);
      return {
        ...prev,
        images: existing
          ? (prev.images || []).map((i) => i.id === finalOverlay.id ? finalOverlay : i)
          : [...(prev.images || []), finalOverlay]
      };
    });

    setIsImageModalOpen(false);
    renderStaticPreviewAt(currentTimeRef.current);
  };

  const updateImageTiming = (id: string, startTime: number, duration: number) => {
    const maxDur = Math.max(1, totalDuration);
    const validStart = Math.max(0, Math.min(Math.max(0, maxDur - 0.2), Math.round(startTime * 10) / 10));
    const validDuration = Math.max(0.5, Math.round(duration * 10) / 10);
    setProject(prev => ({
      ...prev,
      images: (prev.images || []).map(img => img.id === id ? {
        ...img,
        startTime: validStart,
        duration: validDuration
      } : img)
    }));
    if (!isPlayingRef.current) {
      renderStaticPreviewAt(currentTimeRef.current);
    }
  };

  const removeImageOverlay = (id: string) => {
    setProject((prev) => ({
      ...prev,
      images: (prev.images || []).filter((i) => i.id !== id)
    }));
    imagesCacheRef.current.delete(id);
    renderStaticPreviewAt(currentTimeRef.current);
  };

  const handleImportImageFromDisk = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await importSingleFile(file);
      await loadLibraryAndProjects();
      await openAddImageOverlayModal(imported);
    } catch (err) {
      alert("Impossible de charger ce fichier image.");
    }
    e.target.value = '';
  };

  // --- Chapter Handlers ---
  const handleAutoGenerateChaptersFromClips = () => {
    if (project.clips.length === 0) {
      alert("Ajoutez au moins un clip sur la timeline pour générer des chapitres.");
      return;
    }

    let cumulative = 0;
    const generated: TimelineChapter[] = [];

    for (let i = 0; i < project.clips.length; i++) {
      const clip = project.clips[i];
      const speed = clip.playbackSpeed && clip.playbackSpeed > 0 ? clip.playbackSpeed : 1.0;
      const clipDuration = Math.max(0.1, (clip.endTrim - clip.startTrim) / speed);
      const isLast = i === project.clips.length - 1;
      const transDur = (!isLast && clip.transitionToNext !== 'none')
        ? Math.min(clip.transitionDuration, clipDuration / 2)
        : 0;

      generated.push({
        id: `chap_clip_${clip.id}_${i}`,
        time: Math.round(cumulative * 10) / 10,
        title: i === 0 ? 'Introduction' : (clip.video?.title || `Partie ${i + 1}`)
      });

      cumulative += clipDuration - transDur;
    }

    setProject(prev => ({
      ...prev,
      chapters: generated
    }));
  };

  const handleAutoGenerateChaptersFromTitles = () => {
    if (!project.titles || project.titles.length === 0) {
      alert("Aucun titre texte n'est présent sur la timeline.");
      return;
    }

    const sortedTitles = [...(project.titles || [])].sort((a, b) => a.startTime - b.startTime);
    const generated: TimelineChapter[] = [];

    if (sortedTitles[0].startTime > 0.5) {
      generated.push({ id: 'chap_intro_auto', time: 0, title: 'Introduction' });
    }

    for (const t of sortedTitles) {
      generated.push({
        id: `chap_title_${t.id}`,
        time: Math.round(t.startTime * 10) / 10,
        title: t.text
      });
    }

    setProject(prev => ({
      ...prev,
      chapters: generated
    }));
  };

  const handleAddChapterAtCurrentTime = () => {
    const curTime = Math.round(currentTime * 10) / 10;
    const newChap: TimelineChapter = {
      id: `chap_${Date.now()}`,
      time: curTime,
      title: curTime === 0 ? 'Introduction' : `Chapitre à ${formatTime(curTime)}`
    };

    setProject(prev => {
      const list = [...(prev.chapters || []), newChap].sort((a, b) => a.time - b.time);
      return { ...prev, chapters: list };
    });
  };

  const handleUpdateChapter = (id: string, time: number, title: string) => {
    setProject(prev => ({
      ...prev,
      chapters: (prev.chapters || []).map(c => c.id === id ? { ...c, time: Math.max(0, time), title } : c).sort((a, b) => a.time - b.time)
    }));
  };

  const handleRemoveChapter = (id: string) => {
    setProject(prev => ({
      ...prev,
      chapters: (prev.chapters || []).filter(c => c.id !== id)
    }));
  };

  const handleCopyYouTubeChapters = () => {
    const formatted = formatYouTubeChapters(project.chapters || []);
    navigator.clipboard.writeText(formatted);
    setCopiedChapters(true);
    setTimeout(() => setCopiedChapters(false), 2500);
  };

  const handleDownloadYouTubeChapters = () => {
    const formatted = formatYouTubeChapters(project.chapters || []);
    const blob = new Blob([formatted], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chapitres_${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Voiceover Handlers ---
  const startVoiceoverRecording = async () => {
    if (isRecordingVoiceover) {
      stopVoiceoverRecording();
      return;
    }
    if (totalDuration <= 0) {
      alert("Ajoutez au moins un clip vidéo avant d'enregistrer une voix off.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      voiceoverStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';

      const recorder = new MediaRecorder(stream, { mimeType });
      voiceoverRecorderRef.current = recorder;
      voiceoverChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          voiceoverChunksRef.current.push(e.data);
        }
      };

      const startPos = currentTimeRef.current;
      voiceoverStartPosRef.current = startPos;

      recorder.onstop = () => {
        const audioBlob = new Blob(voiceoverChunksRef.current, { type: mimeType });
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
          voiceoverStreamRef.current = null;
        }
        const currentPos = currentTimeRef.current;
        const dur = Math.max(0.5, Math.round((currentPos - startPos) * 10) / 10);

        if (audioBlob.size > 100) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const newVo: TimelineVoiceover = {
              id: `vo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              blob: audioBlob,
              dataUrl,
              startTime: Math.round(startPos * 10) / 10,
              duration: dur,
              volume: 1.0,
              label: `Voix Off #${(project.voiceovers || []).length + 1}`
            };
            setProject(prev => ({
              ...prev,
              voiceovers: [...(prev.voiceovers || []), newVo]
            }));
          };
          reader.readAsDataURL(audioBlob);
        }
      };

      recorder.start(100);
      isRecordingVoiceoverRef.current = true;
      setIsRecordingVoiceover(true);

      if (!isPlayingRef.current) {
        isPlayingRef.current = true;
        setIsPlaying(true);
        if (bgMusicAudioRef.current && project.backgroundMusic) {
          bgMusicAudioRef.current.play().catch(() => {});
        }
      }
    } catch (err) {
      console.error("Impossible d'accéder au microphone :", err);
      alert("Impossible d'accéder à votre microphone. Veuillez vérifier les autorisations dans Windows.");
    }
  };

  const stopVoiceoverRecording = () => {
    if (!isRecordingVoiceoverRef.current && !voiceoverRecorderRef.current) return;
    isRecordingVoiceoverRef.current = false;
    setIsRecordingVoiceover(false);
    if (voiceoverRecorderRef.current && voiceoverRecorderRef.current.state !== 'inactive') {
      try {
        voiceoverRecorderRef.current.stop();
      } catch (err) {
        console.debug('[VideoEditor] Error stopping voiceover recorder:', err);
      }
    }
    voiceoverRecorderRef.current = null;

    if (isPlayingRef.current) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
      videoElementsRef.current.forEach(v => {
        v.pause();
        v.muted = true;
      });
      voiceoverAudiosRef.current.forEach(a => a.pause());
      if (bgMusicAudioRef.current) bgMusicAudioRef.current.pause();
      renderStaticPreviewAt(currentTimeRef.current);
    }
  };

  const updateVoiceoverTiming = (id: string, startTime: number, duration: number) => {
    const maxDur = Math.max(1, totalDuration);
    const validStart = Math.max(0, Math.min(Math.max(0, maxDur - 0.2), Math.round(startTime * 10) / 10));
    const validDuration = Math.max(0.5, Math.round(duration * 10) / 10);
    setProject(prev => ({
      ...prev,
      voiceovers: (prev.voiceovers || []).map(v => v.id === id ? {
        ...v,
        startTime: validStart,
        duration: validDuration
      } : v)
    }));
  };

  const removeVoiceover = (id: string) => {
    setProject(prev => ({
      ...prev,
      voiceovers: (prev.voiceovers || []).filter(v => v.id !== id)
    }));
    const audio = voiceoverAudiosRef.current.get(id);
    if (audio) {
      audio.pause();
      if (audio.parentNode) audio.parentNode.removeChild(audio);
      URL.revokeObjectURL(audio.src);
      voiceoverAudiosRef.current.delete(id);
    }
  };

  const openEditVoiceoverModal = (vo: TimelineVoiceover) => {
    let url = '';
    if (vo.blob && vo.blob.size > 0) {
      url = URL.createObjectURL(vo.blob);
    } else if (vo.dataUrl) {
      url = vo.dataUrl;
    }
    setVoiceoverForm({
      id: vo.id,
      label: vo.label || 'Voix Off',
      startTime: vo.startTime,
      duration: vo.duration,
      volume: vo.volume ?? 1.0,
      url
    });
    setIsVoiceoverModalOpen(true);
  };

  const handleSaveVoiceoverForm = () => {
    if (!voiceoverForm) return;
    setProject(prev => ({
      ...prev,
      voiceovers: (prev.voiceovers || []).map(v => v.id === voiceoverForm.id ? {
        ...v,
        label: voiceoverForm.label,
        volume: voiceoverForm.volume
      } : v)
    }));
    setIsVoiceoverModalOpen(false);
  };

  return {
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
    handleImportImageFromDisk,

    isChaptersModalOpen,
    setIsChaptersModalOpen,
    chaptersExportFormat,
    setChaptersExportFormat,
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
  };
}
