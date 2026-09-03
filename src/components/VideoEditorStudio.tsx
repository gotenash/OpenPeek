import React, { useState, useEffect, useRef } from 'react';
import { 
  getAllRecordings, 
  saveRecording, 
  getAllProjects, 
  saveProject, 
  deleteProject, 
  type SavedVideo, 
  type SavedProject 
} from '../utils/db';
import { 
  type TimelineClip, 
  type TimelineTitle, 
  type EditorProject, 
  type BackgroundMusicTrack,
  AMBIENT_MUSIC_PRESETS,
  generateAmbientMusicBlob,
  calculateTotalDuration, 
  drawTitleOverlay,
  drawFastForwardBadge
} from '../utils/videoCompositor';
import { 
  Film, Plus, Trash2, Play, Pause, 
  Download, Sparkles, Type, Layers, Check, X, Save, FolderOpen, 
  FileText, Upload, RefreshCw, Music, Volume2, VolumeX, Headphones, Mic,
  Scissors, FastForward
} from 'lucide-react';
import { GifExportModal } from './GifExportModal';
import { DeviceFrameModal } from './DeviceFrameModal';
import { SubtitlesStudioModal } from './SubtitlesStudioModal';
import { VoiceGeneratorModal } from './VoiceGeneratorModal';
import { SilenceRemoverModal } from './SilenceRemoverModal';
import type { SpeechSegment } from '../utils/audioSilenceDetector';

export function VideoEditorStudio() {
  const [libraryVideos, setLibraryVideos] = useState<SavedVideo[]>([]);
  const [projectId, setProjectId] = useState<string>(() => `proj_${Date.now()}`);
  const [projectName, setProjectName] = useState<string>('Mon Projet de Montage');
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [isProjectListModalOpen, setIsProjectListModalOpen] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [gifModalVideo, setGifModalVideo] = useState<SavedVideo | null>(null);
  const [frameModalVideo, setFrameModalVideo] = useState<SavedVideo | null>(null);
  const [subtitlesModalVideo, setSubtitlesModalVideo] = useState<SavedVideo | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [silenceRemoverClip, setSilenceRemoverClip] = useState<TimelineClip | null>(null);
  const [silenceRemoverLibraryVideo, setSilenceRemoverLibraryVideo] = useState<SavedVideo | null>(null);

  // Chutier tab ('videos' or 'audio')
  const [chutierTab, setChutierTab] = useState<'videos' | 'audio'>('videos');
  const [customAudios, setCustomAudios] = useState<{ id: string; title: string; blob: Blob; url: string }[]>([]);
  const [previewingAudioId, setPreviewingAudioId] = useState<string | null>(null);
  const [generatingPresetId, setGeneratingPresetId] = useState<string | null>(null);

  const [project, setProject] = useState<EditorProject>({
    clips: [],
    titles: [],
    backgroundMusic: null
  });

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);

  // Title modal state
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  const [titleForm, setTitleForm] = useState<TimelineTitle>({
    id: '',
    text: 'Titre de la vidéo',
    subtitle: 'Sous-titre ou explication',
    startTime: 0,
    duration: 3,
    style: 'lowerthird',
    textColor: '#ffffff',
    bgColor: 'rgba(15, 23, 42, 0.85)',
    fontSize: 28
  });

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const animationFrameRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const audioPreviewElRef = useRef<HTMLAudioElement | null>(null);
  const bgMusicAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load recordings & saved projects from IndexedDB
  const loadLibraryAndProjects = async () => {
    const list = await getAllRecordings();
    setLibraryVideos(list);
    const projs = await getAllProjects();
    setSavedProjects(projs);
  };

  useEffect(() => {
    loadLibraryAndProjects();
  }, []);

  // Pre-load video DOM elements for clips in the timeline
  useEffect(() => {
    project.clips.forEach((clip) => {
      if (!videoElementsRef.current.has(clip.id)) {
        const v = document.createElement('video');
        v.src = URL.createObjectURL(clip.video.blob);
        v.preload = 'auto';
        v.playsInline = true;
        videoElementsRef.current.set(clip.id, v);
      }
    });

    // Cleanup unused video elements
    const activeIds = new Set(project.clips.map((c) => c.id));
    for (const [id, el] of videoElementsRef.current.entries()) {
      if (!activeIds.has(id)) {
        URL.revokeObjectURL(el.src);
        videoElementsRef.current.delete(id);
      }
    }
  }, [project.clips]);

  // Sync background music audio element with project
  useEffect(() => {
    if (project.backgroundMusic && project.backgroundMusic.blob) {
      if (!bgMusicAudioRef.current) {
        bgMusicAudioRef.current = document.createElement('audio');
      }
      const audioEl = bgMusicAudioRef.current;
      const url = URL.createObjectURL(project.backgroundMusic.blob);
      audioEl.src = url;
      audioEl.loop = project.backgroundMusic.loop !== false;
      audioEl.volume = project.backgroundMusic.volume ?? 0.15;

      return () => {
        audioEl.pause();
        URL.revokeObjectURL(url);
      };
    } else {
      if (bgMusicAudioRef.current) {
        bgMusicAudioRef.current.pause();
        bgMusicAudioRef.current.src = '';
      }
    }
  }, [project.backgroundMusic?.id, project.backgroundMusic?.blob]);

  // Sync background music volume
  useEffect(() => {
    if (bgMusicAudioRef.current && project.backgroundMusic) {
      bgMusicAudioRef.current.volume = Math.max(0, Math.min(1, project.backgroundMusic.volume ?? 0.15));
    }
  }, [project.backgroundMusic?.volume]);

  const totalDuration = calculateTotalDuration(project);

  // --- Project Persistence Functions ---

  // 1. Save current project to IndexedDB
  const handleSaveProject = async () => {
    try {
      const serializableClips = project.clips.map(c => ({
        id: c.id,
        videoId: c.video.id,
        videoTitle: c.video.title,
        startTrim: c.startTrim,
        endTrim: c.endTrim,
        transitionToNext: c.transitionToNext,
        transitionDuration: c.transitionDuration
      }));

      const projectData = {
        clips: serializableClips,
        titles: project.titles,
        backgroundMusic: project.backgroundMusic ? {
          id: project.backgroundMusic.id,
          title: project.backgroundMusic.title,
          volume: project.backgroundMusic.volume,
          loop: project.backgroundMusic.loop,
          isPreset: project.backgroundMusic.isPreset
        } : null
      };

      const record: SavedProject = {
        id: projectId,
        title: projectName.trim() || 'Sans titre',
        date: new Date().toISOString(),
        data: JSON.stringify(projectData),
        clipCount: project.clips.length,
        totalDuration: Math.round(totalDuration)
      };

      await saveProject(record);
      setSaveSuccessMsg("Projet enregistré !");
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      loadLibraryAndProjects();
    } catch (e) {
      alert("Erreur lors de l'enregistrement du projet.");
    }
  };

  // 2. Load project from IndexedDB
  const handleLoadProject = async (saved: SavedProject) => {
    try {
      const parsed = JSON.parse(saved.data);
      const loadedClips: TimelineClip[] = [];

      for (const item of parsed.clips) {
        const matchingVideo = libraryVideos.find(v => v.id === item.videoId);
        if (matchingVideo) {
          loadedClips.push({
            id: item.id || `clip_${Date.now()}_${Math.random()}`,
            video: matchingVideo,
            startTrim: item.startTrim || 0,
            endTrim: item.endTrim || matchingVideo.duration || 10,
            transitionToNext: item.transitionToNext || 'crossfade',
            transitionDuration: item.transitionDuration || 1.0
          });
        }
      }

      let loadedBgMusic: BackgroundMusicTrack | null = null;
      if (parsed.backgroundMusic) {
        if (parsed.backgroundMusic.isPreset) {
          const blob = await generateAmbientMusicBlob(parsed.backgroundMusic.id);
          loadedBgMusic = {
            id: parsed.backgroundMusic.id,
            title: parsed.backgroundMusic.title,
            blob,
            volume: parsed.backgroundMusic.volume ?? 0.15,
            loop: parsed.backgroundMusic.loop !== false,
            isPreset: true
          };
        }
      }

      setProjectId(saved.id);
      setProjectName(saved.title);
      setProject({
        clips: loadedClips,
        titles: parsed.titles || [],
        backgroundMusic: loadedBgMusic
      });

      setCurrentTime(0);
      setIsProjectListModalOpen(false);
      setSaveSuccessMsg(`Projet "${saved.title}" chargé !`);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (e) {
      alert("Impossible de charger ce projet.");
    }
  };

  // 3. Delete a saved project
  const handleDeleteSavedProject = async (id: string) => {
    if (confirm("Voulez-vous supprimer ce projet sauvegardé ?")) {
      await deleteProject(id);
      loadLibraryAndProjects();
    }
  };

  // 4. Reset to New Fresh Project
  const handleNewProject = () => {
    if (project.clips.length > 0 && !confirm("Créer un nouveau projet effacera la timeline actuelle. Continuer ?")) {
      return;
    }
    setProjectId(`proj_${Date.now()}`);
    setProjectName('Nouveau Projet');
    setProject({ clips: [], titles: [], backgroundMusic: null });
    setCurrentTime(0);
    setIsPlaying(false);
  };

  // 5. Export .captproj JSON File
  const handleExportProjectFile = () => {
    const serializableClips = project.clips.map(c => ({
      id: c.id,
      videoId: c.video.id,
      videoTitle: c.video.title,
      startTrim: c.startTrim,
      endTrim: c.endTrim,
      transitionToNext: c.transitionToNext,
      transitionDuration: c.transitionDuration
    }));

    const exportObj = {
      version: 1,
      appName: 'OpenPeek Studio',
      projectId,
      projectName,
      date: new Date().toISOString(),
      clips: serializableClips,
      titles: project.titles,
      backgroundMusic: project.backgroundMusic ? {
        id: project.backgroundMusic.id,
        title: project.backgroundMusic.title,
        volume: project.backgroundMusic.volume,
        loop: project.backgroundMusic.loop,
        isPreset: project.backgroundMusic.isPreset
      } : null
    };

    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const clean = projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `${clean}.captproj`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 6. Import .captproj JSON File
  const handleImportProjectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const loadedClips: TimelineClip[] = [];

        for (const item of (parsed.clips || [])) {
          const matchingVideo = libraryVideos.find(v => v.id === item.videoId || v.title === item.videoTitle);
          if (matchingVideo) {
            loadedClips.push({
              id: item.id || `clip_${Date.now()}_${Math.random()}`,
              video: matchingVideo,
              startTrim: item.startTrim || 0,
              endTrim: item.endTrim || matchingVideo.duration || 10,
              transitionToNext: item.transitionToNext || 'crossfade',
              transitionDuration: item.transitionDuration || 1.0
            });
          }
        }

        let loadedBgMusic: BackgroundMusicTrack | null = null;
        if (parsed.backgroundMusic?.isPreset) {
          const blob = await generateAmbientMusicBlob(parsed.backgroundMusic.id);
          loadedBgMusic = {
            id: parsed.backgroundMusic.id,
            title: parsed.backgroundMusic.title,
            blob,
            volume: parsed.backgroundMusic.volume ?? 0.15,
            loop: parsed.backgroundMusic.loop !== false,
            isPreset: true
          };
        }

        setProjectId(parsed.projectId || `proj_${Date.now()}`);
        setProjectName(parsed.projectName || 'Projet Importé');
        setProject({
          clips: loadedClips,
          titles: parsed.titles || [],
          backgroundMusic: loadedBgMusic
        });

        setCurrentTime(0);
        setSaveSuccessMsg(`Fichier ${file.name} importé !`);
        setTimeout(() => setSaveSuccessMsg(null), 3000);
      } catch (err) {
        alert("Fichier projet corrompu ou illisible.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // --- Background Music Handlers ---

  const handleSelectPresetMusic = async (presetId: string) => {
    const preset = AMBIENT_MUSIC_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    setGeneratingPresetId(presetId);
    try {
      const blob = await generateAmbientMusicBlob(presetId);
      setProject(prev => ({
        ...prev,
        backgroundMusic: {
          id: preset.id,
          title: preset.title,
          blob,
          volume: prev.backgroundMusic?.volume ?? 0.15,
          loop: true,
          isPreset: true
        }
      }));
    } catch (e) {
      alert("Erreur lors de la génération de l'ambiance musicale.");
    } finally {
      setGeneratingPresetId(null);
    }
  };

  const handleUploadAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newAudio = {
      id: `audio_${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ""),
      blob: file,
      url: URL.createObjectURL(file)
    };

    setCustomAudios(prev => [newAudio, ...prev]);

    // Automatically apply to timeline as background music
    setProject(prev => ({
      ...prev,
      backgroundMusic: {
        id: newAudio.id,
        title: newAudio.title,
        blob: newAudio.blob,
        volume: prev.backgroundMusic?.volume ?? 0.15,
        loop: true,
        isPreset: false
      }
    }));

    e.target.value = '';
  };

  const handleTogglePreviewAudio = (id: string, blob: Blob) => {
    if (previewingAudioId === id) {
      if (audioPreviewElRef.current) {
        audioPreviewElRef.current.pause();
      }
      setPreviewingAudioId(null);
    } else {
      if (!audioPreviewElRef.current) {
        audioPreviewElRef.current = document.createElement('audio');
      }
      const audioEl = audioPreviewElRef.current;
      audioEl.src = URL.createObjectURL(blob);
      audioEl.volume = 0.5;
      audioEl.play().catch(() => {});
      audioEl.onended = () => setPreviewingAudioId(null);
      setPreviewingAudioId(id);
    }
  };

  const handleUpdateMusicVolume = (volume: number) => {
    setProject(prev => {
      if (!prev.backgroundMusic) return prev;
      return {
        ...prev,
        backgroundMusic: {
          ...prev.backgroundMusic,
          volume: Math.max(0, Math.min(1, volume))
        }
      };
    });
  };

  const handleRemoveBackgroundMusic = () => {
    setProject(prev => ({ ...prev, backgroundMusic: null }));
    if (bgMusicAudioRef.current) {
      bgMusicAudioRef.current.pause();
    }
  };

  // --- Clip Manipulation ---

  const addClipToTimeline = (video: SavedVideo) => {
    const newClip: TimelineClip = {
      id: `clip_${Date.now()}_${Math.random()}`,
      video,
      startTrim: 0,
      endTrim: video.duration || 10,
      transitionToNext: 'crossfade',
      transitionDuration: 1.0
    };
    setProject((prev) => ({
      ...prev,
      clips: [...prev.clips, newClip]
    }));
  };

  const removeClipFromTimeline = (id: string) => {
    setProject((prev) => ({
      ...prev,
      clips: prev.clips.filter((c) => c.id !== id)
    }));
  };

  const moveClip = (index: number, direction: 'left' | 'right') => {
    const newClips = [...project.clips];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newClips.length) return;
    const temp = newClips[index];
    newClips[index] = newClips[targetIndex];
    newClips[targetIndex] = temp;
    setProject((prev) => ({ ...prev, clips: newClips }));
  };

  const updateClipTrim = (id: string, startTrim: number, endTrim: number) => {
    setProject((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => c.id === id ? { ...c, startTrim, endTrim } : c)
    }));
  };

  const updateClipTransition = (id: string, transitionToNext: any, transitionDuration: number) => {
    setProject((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => c.id === id ? { ...c, transitionToNext, transitionDuration } : c)
    }));
  };

  const updateClipSpeed = (id: string, playbackSpeed: number) => {
    setProject((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => c.id === id ? {
        ...c,
        playbackSpeed,
        showFastForwardBadge: playbackSpeed > 1
      } : c)
    }));
  };

  const splitAndFastForward = (clipId: string, speed: number = 4) => {
    setProject((prev) => {
      const idx = prev.clips.findIndex((c) => c.id === clipId);
      if (idx === -1) return prev;
      const c = prev.clips[idx];
      const dur = c.endTrim - c.startTrim;
      if (dur < 3) {
        return {
          ...prev,
          clips: prev.clips.map((item) => item.id === clipId ? { ...item, playbackSpeed: speed, showFastForwardBadge: true } : item)
        };
      }

      const part1End = c.startTrim + dur * 0.25;
      const part2End = c.startTrim + dur * 0.75;

      const clip1: TimelineClip = {
        ...c,
        id: `clip_${Date.now()}_1`,
        startTrim: c.startTrim,
        endTrim: part1End,
        playbackSpeed: 1.0,
        showFastForwardBadge: false,
        transitionToNext: 'none'
      };

      const clip2: TimelineClip = {
        ...c,
        id: `clip_${Date.now()}_2`,
        startTrim: part1End,
        endTrim: part2End,
        playbackSpeed: speed,
        showFastForwardBadge: true,
        transitionToNext: 'none'
      };

      const clip3: TimelineClip = {
        ...c,
        id: `clip_${Date.now()}_3`,
        startTrim: part2End,
        endTrim: c.endTrim,
        playbackSpeed: 1.0,
        showFastForwardBadge: false
      };

      const updated = [...prev.clips];
      updated.splice(idx, 1, clip1, clip2, clip3);
      return { ...prev, clips: updated };
    });
  };

  const handleApplySilenceSegmentsToClip = (targetClipId: string, speechSegments: SpeechSegment[]) => {
    setProject((prev) => {
      const clipIndex = prev.clips.findIndex((c) => c.id === targetClipId);
      if (clipIndex === -1) return prev;
      const originalClip = prev.clips[clipIndex];

      const newClips: TimelineClip[] = speechSegments.map((seg, idx) => ({
        id: `clip_${Date.now()}_${idx}`,
        video: originalClip.video,
        startTrim: seg.start,
        endTrim: seg.end,
        transitionToNext: idx === speechSegments.length - 1 ? originalClip.transitionToNext : 'none',
        transitionDuration: originalClip.transitionDuration,
        playbackSpeed: originalClip.playbackSpeed,
        showFastForwardBadge: originalClip.showFastForwardBadge
      }));

      const updatedClips = [...prev.clips];
      updatedClips.splice(clipIndex, 1, ...newClips);
      return { ...prev, clips: updatedClips };
    });
  };

  const handleApplySilenceSegmentsToLibraryVideo = (video: SavedVideo, speechSegments: SpeechSegment[]) => {
    const newClips: TimelineClip[] = speechSegments.map((seg, idx) => ({
      id: `clip_${Date.now()}_${idx}`,
      video: video,
      startTrim: seg.start,
      endTrim: seg.end,
      transitionToNext: 'none',
      transitionDuration: 0.5,
      playbackSpeed: 1.0
    }));
    setProject((prev) => ({
      ...prev,
      clips: [...prev.clips, ...newClips]
    }));
  };

  // --- Title Manipulation ---

  const handleSaveTitle = () => {
    if (!titleForm.text.trim()) return;
    const newTitle: TimelineTitle = {
      ...titleForm,
      id: titleForm.id || `title_${Date.now()}`
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

  const removeTitle = (id: string) => {
    setProject((prev) => ({
      ...prev,
      titles: prev.titles.filter((t) => t.id !== id)
    }));
  };

  // --- Playback Engine & Interactive Seek ---

  const togglePlay = () => {
    if (isPlaying) {
      videoElementsRef.current.forEach((v) => v.pause());
      if (bgMusicAudioRef.current) bgMusicAudioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (currentTime >= totalDuration) {
        setCurrentTime(0);
      }
      setIsPlaying(true);
      if (bgMusicAudioRef.current && project.backgroundMusic) {
        bgMusicAudioRef.current.play().catch(() => {});
      }
    }
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (!isPlaying) {
      renderStaticPreviewAt(time);
    }
    if (bgMusicAudioRef.current && project.backgroundMusic) {
      bgMusicAudioRef.current.currentTime = time % (bgMusicAudioRef.current.duration || 16);
    }
  };

  // Live Canvas Rendering Loop
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!isPlaying) {
      renderStaticPreviewAt(currentTime);
      return;
    }

    let lastTime = performance.now();

    const playbackLoop = () => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      setCurrentTime((prev) => {
        const nextTime = prev + dt;
        if (nextTime >= totalDuration) {
          videoElementsRef.current.forEach((v) => v.pause());
          if (bgMusicAudioRef.current) bgMusicAudioRef.current.pause();
          setIsPlaying(false);
          return totalDuration;
        }
        return nextTime;
      });

      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let cumulative = 0;
      for (let i = 0; i < project.clips.length; i++) {
        const clip = project.clips[i];
        const speed = clip.playbackSpeed && clip.playbackSpeed > 0 ? clip.playbackSpeed : 1.0;
        const clipDuration = Math.max(0.1, (clip.endTrim - clip.startTrim) / speed);
        const isLast = i === project.clips.length - 1;
        const transDur = (!isLast && clip.transitionToNext !== 'none')
          ? Math.min(clip.transitionDuration, clipDuration / 2)
          : 0;

        const clipStart = cumulative;
        const clipEnd = cumulative + clipDuration;
        const videoEl = videoElementsRef.current.get(clip.id);

        if (currentTime >= clipStart && currentTime <= clipEnd) {
          if (videoEl) {
            videoEl.playbackRate = speed;
            if (videoEl.paused && isPlaying) {
              videoEl.currentTime = ((currentTime - clipStart) * speed) + clip.startTrim;
              videoEl.play().catch(() => {});
            }
            if (videoEl.readyState >= 2) {
              ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
              if (speed > 1.0) {
                drawFastForwardBadge(ctx, speed, canvas.width, canvas.height);
              }
            }
          }

          // Render transition to next clip
          if (!isLast && clip.transitionToNext !== 'none' && currentTime > clipEnd - transDur) {
            const transProgress = (currentTime - (clipEnd - transDur)) / transDur;
            const nextClip = project.clips[i + 1];
            const nextVideoEl = videoElementsRef.current.get(nextClip.id);

            if (nextVideoEl) {
              if (nextVideoEl.paused && isPlaying) {
                nextVideoEl.currentTime = nextClip.startTrim + (transProgress * transDur);
                nextVideoEl.play().catch(() => {});
              }

              if (nextVideoEl.readyState >= 2) {
                ctx.save();
                if (clip.transitionToNext === 'crossfade') {
                  ctx.globalAlpha = transProgress;
                  ctx.drawImage(nextVideoEl, 0, 0, canvas.width, canvas.height);
                } else if (clip.transitionToNext === 'fade-black') {
                  ctx.fillStyle = '#000000';
                  ctx.globalAlpha = Math.sin(transProgress * Math.PI);
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                } else if (clip.transitionToNext === 'slide') {
                  const offsetX = (1.0 - transProgress) * canvas.width;
                  ctx.drawImage(nextVideoEl, offsetX, 0, canvas.width, canvas.height);
                }
                ctx.restore();
              }
            }
          }
        } else {
          if (videoEl && !videoEl.paused && (currentTime < clipStart - 1 || currentTime > clipEnd + 1)) {
            videoEl.pause();
          }
        }

        cumulative += clipDuration - transDur;
      }

      // Overlay active titles
      for (const title of project.titles) {
        if (currentTime >= title.startTime && currentTime <= title.startTime + title.duration) {
          drawTitleOverlay(ctx, title, canvas.width, canvas.height, currentTime - title.startTime);
        }
      }

      animationFrameRef.current = requestAnimationFrame(playbackLoop);
    };

    animationFrameRef.current = requestAnimationFrame(playbackLoop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, totalDuration, project]);

  const renderStaticPreviewAt = (time: number) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (project.clips.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '15px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Ajoutez des clips depuis le chutier pour commencer le montage', canvas.width / 2, canvas.height / 2);
      return;
    }

    let cumulative = 0;
    for (let i = 0; i < project.clips.length; i++) {
      const clip = project.clips[i];
      const speed = clip.playbackSpeed && clip.playbackSpeed > 0 ? clip.playbackSpeed : 1.0;
      const clipDuration = Math.max(0.1, (clip.endTrim - clip.startTrim) / speed);
      const isLast = i === project.clips.length - 1;
      const transDur = (!isLast && clip.transitionToNext !== 'none')
        ? Math.min(clip.transitionDuration, clipDuration / 2)
        : 0;

      const clipStart = cumulative;
      const clipEnd = cumulative + clipDuration;

      if (time >= clipStart && time <= clipEnd) {
        const videoEl = videoElementsRef.current.get(clip.id);
        if (videoEl) {
          videoEl.currentTime = ((time - clipStart) * speed) + clip.startTrim;
          if (videoEl.readyState >= 2) {
            ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
            if (speed > 1.0) {
              drawFastForwardBadge(ctx, speed, canvas.width, canvas.height);
            }
          }
        }
        break;
      }

      cumulative += clipDuration - transDur;
    }

    for (const title of project.titles) {
      if (time >= title.startTime && time <= title.startTime + title.duration) {
        drawTitleOverlay(ctx, title, canvas.width, canvas.height, time - title.startTime);
      }
    }
  };

  // --- Project Video Export ---

  const handleExportProject = async () => {
    if (project.clips.length === 0 || totalDuration <= 0) {
      alert("Ajoutez au moins un clip à la timeline avant d'exporter.");
      return;
    }

    videoElementsRef.current.forEach(v => v.pause());
    if (bgMusicAudioRef.current) bgMusicAudioRef.current.pause();
    setIsPlaying(false);
    setIsExporting(true);
    setExportProgress(0);

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 1920;
    exportCanvas.height = 1080;
    const exportCtx = exportCanvas.getContext('2d');

    // Build mixed Audio + Video stream for MediaRecorder
    let combinedStream: MediaStream = exportCanvas.captureStream(30);
    let exportAudioCtx: AudioContext | null = null;
    let bgExportAudioEl: HTMLAudioElement | null = null;

    try {
      exportAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (exportAudioCtx.state === 'suspended') {
        await exportAudioCtx.resume();
      }
      const dest = exportAudioCtx.createMediaStreamDestination();

      // 1. Connect video clips audio
      for (const clip of project.clips) {
        const videoEl = videoElementsRef.current.get(clip.id);
        if (videoEl) {
          try {
            let source = (videoEl as any)._audioSourceNode as MediaElementAudioSourceNode;
            if (!source) {
              source = exportAudioCtx.createMediaElementSource(videoEl);
              (videoEl as any)._audioSourceNode = source;
            }
            source.connect(dest);
          } catch (audioErr) {
            console.warn("Audio node connection:", audioErr);
          }
        }
      }

      // 2. Connect Background Music with dedicated GainNode
      if (project.backgroundMusic && project.backgroundMusic.blob) {
        bgExportAudioEl = document.createElement('audio');
        bgExportAudioEl.src = URL.createObjectURL(project.backgroundMusic.blob);
        bgExportAudioEl.loop = project.backgroundMusic.loop !== false;
        
        try {
          const bgSource = exportAudioCtx.createMediaElementSource(bgExportAudioEl);
          const bgGain = exportAudioCtx.createGain();
          bgGain.gain.value = project.backgroundMusic.volume ?? 0.15;
          bgSource.connect(bgGain);
          bgGain.connect(dest);
          bgExportAudioEl.play().catch(() => {});
        } catch (e) {
          console.warn("Bg music audio route error:", e);
        }
      }

      if (dest.stream.getAudioTracks().length > 0) {
        combinedStream = new MediaStream([
          ...exportCanvas.captureStream(30).getVideoTracks(),
          ...dest.stream.getAudioTracks()
        ]);
      }
    } catch (e) {
      console.warn("AudioContext initialization warning:", e);
    }

    const mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm'
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.start(100);

    let exportTime = 0;
    let lastExportTime = performance.now();

    const exportLoop = () => {
      const now = performance.now();
      const dt = (now - lastExportTime) / 1000;
      lastExportTime = now;

      exportTime += dt;
      setExportProgress(Math.min(99, Math.round((exportTime / totalDuration) * 100)));

      if (exportTime >= totalDuration) {
        mediaRecorder.stop();
        videoElementsRef.current.forEach(v => v.pause());
        if (bgExportAudioEl) {
          bgExportAudioEl.pause();
          URL.revokeObjectURL(bgExportAudioEl.src);
        }
        return;
      }

      if (exportCtx) {
        exportCtx.fillStyle = '#0a0a0a';
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

        let cumulative = 0;
        for (let i = 0; i < project.clips.length; i++) {
          const clip = project.clips[i];
          const speed = clip.playbackSpeed && clip.playbackSpeed > 0 ? clip.playbackSpeed : 1.0;
          const clipDuration = Math.max(0.1, (clip.endTrim - clip.startTrim) / speed);
          const isLast = i === project.clips.length - 1;
          const transDur = (!isLast && clip.transitionToNext !== 'none')
            ? Math.min(clip.transitionDuration, clipDuration / 2)
            : 0;

          const clipStart = cumulative;
          const clipEnd = cumulative + clipDuration;
          const videoEl = videoElementsRef.current.get(clip.id);

          if (exportTime >= clipStart && exportTime <= clipEnd) {
            if (videoEl) {
              videoEl.playbackRate = speed;
              if (videoEl.paused) {
                videoEl.currentTime = ((exportTime - clipStart) * speed) + clip.startTrim;
                videoEl.play().catch(() => {});
              }
              if (videoEl.readyState >= 2) {
                exportCtx.drawImage(videoEl, 0, 0, exportCanvas.width, exportCanvas.height);
                if (speed > 1.0) {
                  drawFastForwardBadge(exportCtx, speed, exportCanvas.width, exportCanvas.height);
                }
              }
            }

            if (!isLast && clip.transitionToNext !== 'none' && exportTime > clipEnd - transDur) {
              const transProgress = (exportTime - (clipEnd - transDur)) / transDur;
              const nextClip = project.clips[i + 1];
              const nextVideoEl = videoElementsRef.current.get(nextClip.id);

              if (nextVideoEl) {
                if (nextVideoEl.paused) {
                  nextVideoEl.currentTime = nextClip.startTrim + (transProgress * transDur);
                  nextVideoEl.play().catch(() => {});
                }

                if (nextVideoEl.readyState >= 2) {
                  exportCtx.save();
                  if (clip.transitionToNext === 'crossfade') {
                    exportCtx.globalAlpha = transProgress;
                    exportCtx.drawImage(nextVideoEl, 0, 0, exportCanvas.width, exportCanvas.height);
                  } else if (clip.transitionToNext === 'fade-black') {
                    exportCtx.fillStyle = '#000000';
                    exportCtx.globalAlpha = Math.sin(transProgress * Math.PI);
                    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
                  } else if (clip.transitionToNext === 'slide') {
                    const offsetX = (1.0 - transProgress) * exportCanvas.width;
                    exportCtx.drawImage(nextVideoEl, offsetX, 0, exportCanvas.width, exportCanvas.height);
                  }
                  exportCtx.restore();
                }
              }
            }
          } else {
            if (videoEl && !videoEl.paused && (exportTime < clipStart - 1 || exportTime > clipEnd + 1)) {
              videoEl.pause();
            }
          }

          cumulative += clipDuration - transDur;
        }

        // Overlay titles
        for (const title of project.titles) {
          if (exportTime >= title.startTime && exportTime <= title.startTime + title.duration) {
            drawTitleOverlay(exportCtx, title, exportCanvas.width, exportCanvas.height, exportTime - title.startTime);
          }
        }
      }

      requestAnimationFrame(exportLoop);
    };

    mediaRecorder.onstop = async () => {
      const finalBlob = new Blob(chunks, { type: 'video/webm' });
      setExportedBlob(finalBlob);
      setIsExporting(false);
      setExportProgress(100);

      // Save to IndexedDB
      await saveRecording({
        id: crypto.randomUUID ? crypto.randomUUID() : `montage_${Date.now()}`,
        title: projectName || `Montage_${new Date().toLocaleDateString().replace(/\//g, '-')}`,
        blob: finalBlob,
        thumbnail: exportCanvas.toDataURL('image/jpeg', 0.8),
        duration: Math.round(totalDuration),
        size: finalBlob.size,
        date: new Date().toISOString()
      });
      loadLibraryAndProjects();
    };

    requestAnimationFrame(exportLoop);
  };

  const handleDownloadExported = () => {
    if (!exportedBlob) return;
    const url = URL.createObjectURL(exportedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'montage'}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
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

      {/* Top Project Bar */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={16} color="#c084fc" />
          <input
            type="text"
            className="form-input"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            style={{ width: '220px', padding: '4px 8px', fontSize: '13px', fontWeight: 600 }}
            placeholder="Nom du projet"
          />
          {saveSuccessMsg && (
            <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Check size={12} /> {saveSuccessMsg}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className="btn-primary"
            onClick={handleSaveProject}
            style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}
            title="Enregistrer ce montage dans votre base locale"
          >
            <Save size={13} />
            <span>Enregistrer</span>
          </button>

          <button
            className="btn-secondary"
            onClick={() => setIsProjectListModalOpen(true)}
            style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}
            title="Ouvrir un projet enregistré"
          >
            <FolderOpen size={13} />
            <span>Mes Projets ({savedProjects.length})</span>
          </button>

          <button
            className="btn-toolbar"
            onClick={handleNewProject}
            style={{ padding: '4px 8px', fontSize: '11px' }}
            title="Démarrer un nouveau projet vierge"
          >
            <RefreshCw size={12} />
            <span>Nouveau</span>
          </button>

          <button
            className="btn-toolbar"
            onClick={handleExportProjectFile}
            style={{ padding: '4px 8px', fontSize: '11px' }}
            title="Exporter le fichier projet (.captproj) sur votre PC"
          >
            <Download size={12} />
            <span>Export .captproj</span>
          </button>

          <button
            className="btn-toolbar"
            onClick={() => fileInputRef.current?.click()}
            style={{ padding: '4px 8px', fontSize: '11px' }}
            title="Importer un fichier projet (.captproj) depuis votre PC"
          >
            <Upload size={12} />
            <span>Importer</span>
          </button>
        </div>
      </div>

      {/* Middle Split: Media Bin & Master Preview Player */}
      <div style={{ display: 'grid', gridTemplateColumns: '270px 1fr', gap: '12px' }}>
        {/* Media Bin (Chutier) */}
        <div className="glass-panel" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', height: '220px' }}>
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
                gap: '5px'
              }}
            >
              <Film size={12} />
              <span>Vidéos ({libraryVideos.length})</span>
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
                gap: '5px'
              }}
            >
              <Music size={12} />
              <span>Musiques</span>
            </button>
          </div>

          {/* Videos Tab Content */}
          {chutierTab === 'videos' && (
            <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
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
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{formatTime(v.duration)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    <button
                      className="btn-toolbar"
                      style={{ padding: '2px 5px', fontSize: '10px', backgroundColor: 'rgba(6, 182, 212, 0.2)', color: '#38bdf8' }}
                      onClick={() => setSilenceRemoverLibraryVideo(v)}
                      title="Détecter et supprimer les silences avant d'ajouter à la timeline"
                    >
                      <Scissors size={11} />
                    </button>
                    <button
                      className="btn-toolbar"
                      style={{ padding: '2px 5px', fontSize: '10px', backgroundColor: 'rgba(139, 92, 246, 0.25)', color: '#c084fc' }}
                      onClick={() => addClipToTimeline(v)}
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

          {/* Audio Tab Content */}
          {chutierTab === 'audio' && (
            <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                {/* Voice Generator Button */}
                <button
                  className="btn-primary"
                  onClick={() => setIsVoiceModalOpen(true)}
                  style={{ padding: '4px 6px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: 'linear-gradient(135deg, #c084fc, #ec4899)' }}
                  title="Générer une voix off IA à partir de votre texte"
                >
                  <Mic size={11} />
                  <span>🎙️ Voix Off IA</span>
                </button>

                {/* Upload Button */}
                <button
                  className="btn-secondary"
                  onClick={() => audioFileInputRef.current?.click()}
                  style={{ padding: '4px 6px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  title="Importer un fichier audio existant (MP3, WAV, M4A)"
                >
                  <Upload size={11} />
                  <span>Importer MP3</span>
                </button>
              </div>

              {/* Ambient Presets */}
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '2px' }}>
                Ambiances Libres de Droits :
              </div>
              {AMBIENT_MUSIC_PRESETS.map((preset) => {
                const isSelected = project.backgroundMusic?.id === preset.id;
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
                        onClick={() => handleSelectPresetMusic(preset.id)}
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

              {/* Custom Uploaded Audios */}
              {customAudios.length > 0 && (
                <>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Mes Fichiers Importés :
                  </div>
                  {customAudios.map((audio) => {
                    const isSelected = project.backgroundMusic?.id === audio.id;
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
                            onClick={() => handleTogglePreviewAudio(audio.id, audio.blob)}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                            title="Écouter un extrait"
                          >
                            {isPreviewing ? <Pause size={12} /> : <Play size={12} />}
                          </button>
                          <button
                            onClick={() => setProject(prev => ({
                              ...prev,
                              backgroundMusic: {
                                id: audio.id,
                                title: audio.title,
                                blob: audio.blob,
                                volume: prev.backgroundMusic?.volume ?? 0.15,
                                loop: true,
                                isPreset: false
                              }
                            }))}
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
          )}
        </div>

        {/* Master Monitor Preview */}
        <div className="glass-panel" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', height: '220px' }}>
          <div style={{ flexGrow: 1, backgroundColor: '#000', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <canvas 
              ref={previewCanvasRef} 
              width={1280} 
              height={720} 
              style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
            />
          </div>

          {/* Master Transport Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="btn-toolbar"
                onClick={togglePlay}
                style={{ padding: '3px 8px', backgroundColor: isPlaying ? '#8b5cf6' : 'rgba(255,255,255,0.06)' }}
              >
                {isPlaying ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}
              </button>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                {formatTime(currentTime)} / {formatTime(totalDuration)}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className="btn-toolbar"
                onClick={() => {
                  setTitleForm({
                    id: '',
                    text: 'Introduction',
                    subtitle: 'Bienvenue dans ce tutoriel',
                    startTime: 0,
                    duration: 3,
                    style: 'lowerthird',
                    textColor: '#ffffff',
                    bgColor: 'rgba(15, 23, 42, 0.85)',
                    fontSize: 28
                  });
                  setIsTitleModalOpen(true);
                }}
                style={{ fontSize: '11px', padding: '3px 8px' }}
              >
                <Type size={12} color="#c084fc" />
                <span>+ Titre</span>
              </button>

              <button
                className="btn-primary"
                onClick={handleExportProject}
                disabled={isExporting || project.clips.length === 0}
                style={{ fontSize: '11px', padding: '3px 10px' }}
              >
                {isExporting ? <Sparkles size={12} className="spinning" /> : <Check size={12} />}
                <span>{isExporting ? `Export (${exportProgress}%)` : 'Exporter Montage'}</span>
              </button>

              {exportedBlob && (
                <>
                  <button 
                    className="btn-secondary" 
                    onClick={() => {
                      setSubtitlesModalVideo({
                        id: projectId,
                        title: projectName,
                        blob: exportedBlob,
                        thumbnail: '',
                        duration: Math.round(totalDuration),
                        size: exportedBlob.size,
                        date: new Date().toISOString()
                      });
                    }} 
                    style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px', color: '#fde047', borderColor: 'rgba(253, 224, 71, 0.4)' }}
                    title="Générer des sous-titres et captions dynamiques pour ce montage"
                  >
                    <Type size={12} />
                    <span>Sous-titres</span>
                  </button>

                  <button 
                    className="btn-secondary" 
                    onClick={() => {
                      setFrameModalVideo({
                        id: projectId,
                        title: projectName,
                        blob: exportedBlob,
                        thumbnail: '',
                        duration: Math.round(totalDuration),
                        size: exportedBlob.size,
                        date: new Date().toISOString()
                      });
                    }} 
                    style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                    title="Ajouter un habillage gradient, cadre macOS et formats TikTok/YouTube/LinkedIn"
                  >
                    <Layers size={12} />
                    <span>Habillage</span>
                  </button>

                  <button 
                    className="btn-secondary" 
                    onClick={() => {
                      setGifModalVideo({
                        id: projectId,
                        title: projectName,
                        blob: exportedBlob,
                        thumbnail: '',
                        duration: Math.round(totalDuration),
                        size: exportedBlob.size,
                        date: new Date().toISOString()
                      });
                    }} 
                    style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px', color: '#c084fc', borderColor: 'rgba(192, 132, 252, 0.4)' }}
                    title="Générer un GIF animé à partir de ce montage"
                  >
                    <Sparkles size={12} />
                    <span>Créer un GIF</span>
                  </button>

                  <button className="btn-secondary" onClick={handleDownloadExported} style={{ fontSize: '11px', padding: '3px 8px' }}>
                    <Download size={12} />
                    <span>Télécharger</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Timeline Multi-Track Panel */}
      <div className="glass-panel" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={14} color="#06b6d4" />
            Timeline Multi-Pistes
          </span>
          <input
            type="range"
            min={0}
            max={totalDuration || 1}
            step={0.1}
            value={currentTime}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            style={{ width: '50%', accentColor: '#8b5cf6', cursor: 'pointer' }}
          />
        </div>

        {/* Track 1: Titles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(0,0,0,0.25)', padding: '5px 8px', borderRadius: '5px' }}>
          <span style={{ fontSize: '10px', width: '90px', color: '#c084fc', fontWeight: 600 }}>🔤 Titres ({project.titles.length})</span>
          <div style={{ display: 'flex', gap: '6px', flexGrow: 1, overflowX: 'auto' }}>
            {project.titles.map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 6px',
                  backgroundColor: 'rgba(139, 92, 246, 0.25)',
                  border: '1px solid #8b5cf6',
                  borderRadius: '4px',
                  fontSize: '10px'
                }}
              >
                <span>{t.text}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>({t.startTime}s - {t.startTime + t.duration}s)</span>
                <button
                  style={{ background: 'transparent', border: 'none', color: '#fb7185', cursor: 'pointer', padding: 0 }}
                  onClick={() => removeTitle(t.id)}
                >
                  <X size={11} />
                </button>
              </div>
            ))}
            {project.titles.length === 0 && (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Aucun titre. Cliquez sur « + Titre » pour en ajouter.</span>
            )}
          </div>
        </div>

        {/* Track 2: Video Clips & Transitions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(0,0,0,0.25)', padding: '6px 8px', borderRadius: '5px', overflowX: 'auto' }}>
          <span style={{ fontSize: '10px', width: '90px', color: '#06b6d4', fontWeight: 600 }}>🎬 Vidéos ({project.clips.length})</span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {project.clips.map((clip, idx) => (
              <div key={clip.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '6px 8px',
                    backgroundColor: (clip.playbackSpeed || 1.0) > 1 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255,255,255,0.04)',
                    border: (clip.playbackSpeed || 1.0) > 1 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-color)',
                    borderRadius: '6px',
                    minWidth: '185px'
                  }}
                >
                  {/* Top Row: Title + Speed Badge + Delete */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                      {(clip.playbackSpeed || 1.0) > 1 && (
                        <span style={{
                          fontSize: '8px',
                          fontWeight: 800,
                          color: '#fde68a',
                          backgroundColor: 'rgba(245, 158, 11, 0.3)',
                          padding: '1px 4px',
                          borderRadius: '3px',
                          border: '1px solid #f59e0b'
                        }}>
                          ⏩ {clip.playbackSpeed}x
                        </span>
                      )}
                      <span style={{ fontSize: '10px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }}>
                        {clip.video.title}
                      </span>
                    </div>
                    <button
                      style={{ background: 'transparent', border: 'none', color: '#fb7185', cursor: 'pointer', padding: 0 }}
                      onClick={() => removeClipFromTimeline(clip.id)}
                      title="Supprimer ce clip"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>

                  {/* Trims + Effective Duration */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)' }}>
                    <span>{clip.startTrim.toFixed(1)}s - {clip.endTrim.toFixed(1)}s</span>
                    <span style={{ color: (clip.playbackSpeed || 1.0) > 1 ? '#fde68a' : 'var(--text-secondary)', fontWeight: 600 }}>
                      Durée: {(((clip.endTrim - clip.startTrim) / (clip.playbackSpeed || 1.0))).toFixed(1)}s
                    </span>
                  </div>

                  {/* Trim Inputs & Move Buttons */}
                  <div style={{ display: 'flex', gap: '4px', marginTop: '1px' }}>
                    <button
                      className="btn-toolbar"
                      style={{ padding: '2px 4px', fontSize: '9px' }}
                      disabled={idx === 0}
                      onClick={() => moveClip(idx, 'left')}
                      title="Déplacer vers la gauche"
                    >
                      ◀
                    </button>
                    <button
                      className="btn-toolbar"
                      style={{ padding: '2px 4px', fontSize: '9px' }}
                      disabled={idx === project.clips.length - 1}
                      onClick={() => moveClip(idx, 'right')}
                      title="Déplacer vers la droite"
                    >
                      ▶
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={clip.endTrim - 0.5}
                      step={0.5}
                      value={clip.startTrim}
                      onChange={(e) => updateClipTrim(clip.id, parseFloat(e.target.value) || 0, clip.endTrim)}
                      style={{ width: '44px', fontSize: '9px', padding: '1px 3px' }}
                      className="form-input"
                      title="Rognage début (s)"
                    />
                    <input
                      type="number"
                      min={clip.startTrim + 0.5}
                      max={clip.video.duration || 999}
                      step={0.5}
                      value={clip.endTrim}
                      onChange={(e) => updateClipTrim(clip.id, clip.startTrim, parseFloat(e.target.value) || 10)}
                      style={{ width: '44px', fontSize: '9px', padding: '1px 3px' }}
                      className="form-input"
                      title="Rognage fin (s)"
                    />
                  </div>

                  {/* Fast-Forward & Silence Remover Action Tools */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <select
                      value={clip.playbackSpeed || 1.0}
                      onChange={(e) => updateClipSpeed(clip.id, parseFloat(e.target.value))}
                      style={{
                        fontSize: '9px',
                        padding: '1px 3px',
                        borderRadius: '3px',
                        backgroundColor: (clip.playbackSpeed || 1.0) > 1 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(15, 23, 42, 0.7)',
                        color: (clip.playbackSpeed || 1.0) > 1 ? '#fde68a' : 'var(--text-secondary)',
                        border: (clip.playbackSpeed || 1.0) > 1 ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                        cursor: 'pointer'
                      }}
                      title="Vitesse de lecture / Avance Rapide"
                    >
                      <option value="1">1x Normal</option>
                      <option value="2">2x</option>
                      <option value="4">4x</option>
                      <option value="8">8x</option>
                      <option value="16">16x</option>
                    </select>

                    <button
                      className="btn-toolbar"
                      style={{ padding: '1px 5px', fontSize: '9px', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)', display: 'flex', alignItems: 'center', gap: '3px' }}
                      onClick={() => splitAndFastForward(clip.id, 4)}
                      title="Isoler et accélérer en 4x le temps de chargement au milieu de ce clip"
                    >
                      <FastForward size={9} /> 4x
                    </button>

                    <button
                      className="btn-toolbar"
                      style={{ padding: '1px 5px', fontSize: '9px', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)', display: 'flex', alignItems: 'center', gap: '3px' }}
                      onClick={() => setSilenceRemoverClip(clip)}
                      title="Supprimer automatiquement les blancs et pauses de ce clip"
                    >
                      <Scissors size={9} /> Silences
                    </button>
                  </div>
                </div>

                {/* Transition Selector between clips */}
                {idx < project.clips.length - 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <select
                      value={clip.transitionToNext}
                      onChange={(e) => updateClipTransition(clip.id, e.target.value, clip.transitionDuration)}
                      style={{ fontSize: '9px', padding: '2px 3px', backgroundColor: 'rgba(15, 23, 42, 0.8)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '3px' }}
                      title="Transition vers le clip suivant"
                    >
                      <option value="none">Coupe (Cut)</option>
                      <option value="crossfade">Fondu (Crossfade)</option>
                      <option value="fade-black">Fondu au Noir</option>
                      <option value="slide">Glissement (Slide)</option>
                    </select>
                  </div>
                )}
              </div>
            ))}

            {project.clips.length === 0 && (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                Aucun clip vidéo. Cliquez sur le « + » d'une vidéo dans le Chutier pour l'ajouter.
              </span>
            )}
          </div>
        </div>

        {/* Track 3: Background Music & Audio Ducking */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(0,0,0,0.25)', padding: '6px 8px', borderRadius: '5px' }}>
          <span style={{ fontSize: '10px', width: '90px', color: '#38bdf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                  onClick={handleRemoveBackgroundMusic}
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
                  onChange={(e) => handleUpdateMusicVolume(parseFloat(e.target.value))}
                  style={{ width: '90px', accentColor: '#38bdf8', cursor: 'pointer' }}
                  title="Réglez le volume de la musique (recommandé 10-20% pour ne pas masquer la voix)"
                />
              </div>

              <span style={{ fontSize: '9px', color: '#10b981', marginLeft: 'auto' }}>
                ✓ Mixage auto avec voix active
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                Aucune musique de fond active.
              </span>
              <button
                onClick={() => setChutierTab('audio')}
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
      </div>

      {/* Saved Projects Modal */}
      {isProjectListModalOpen && (
        <div className="modal-overlay" onClick={() => setIsProjectListModalOpen(false)}>
          <div className="glass-panel modal-content" style={{ maxWidth: '500px', padding: '16px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FolderOpen size={16} color="#c084fc" />
                Mes Projets de Montage ({savedProjects.length})
              </h3>
              <button className="close-btn" onClick={() => setIsProjectListModalOpen(false)}>
                <X size={15} />
              </button>
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {savedProjects.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{p.title}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                      {p.clipCount} clip(s) • ~{formatTime(p.totalDuration)} • {new Date(p.date).toLocaleDateString()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn-primary"
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                      onClick={() => handleLoadProject(p)}
                    >
                      Ouvrir
                    </button>
                    <button
                      className="btn-toolbar"
                      style={{ padding: '3px 6px', color: '#fb7185' }}
                      onClick={() => handleDeleteSavedProject(p.id)}
                      title="Supprimer ce projet"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}

              {savedProjects.length === 0 && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                  Aucun projet enregistré. Cliquez sur « Enregistrer » pour sauvegarder votre montage actuel.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Title / Text Modal */}
      {isTitleModalOpen && (
        <div className="modal-overlay" onClick={() => setIsTitleModalOpen(false)}>
          <div className="glass-panel modal-content" style={{ maxWidth: '400px', padding: '14px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '14px' }}>Ajouter un Titre / Carton</h3>
              <button className="close-btn" onClick={() => setIsTitleModalOpen(false)}>
                <X size={15} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Texte principal</label>
                <input
                  type="text"
                  className="form-input"
                  value={titleForm.text}
                  onChange={(e) => setTitleForm({ ...titleForm, text: e.target.value })}
                  style={{ width: '100%', fontSize: '12px', padding: '4px 6px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Sous-titre (optionnel)</label>
                <input
                  type="text"
                  className="form-input"
                  value={titleForm.subtitle || ''}
                  onChange={(e) => setTitleForm({ ...titleForm, subtitle: e.target.value })}
                  style={{ width: '100%', fontSize: '12px', padding: '4px 6px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Début (s)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    className="form-input"
                    value={titleForm.startTime}
                    onChange={(e) => setTitleForm({ ...titleForm, startTime: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', fontSize: '11px', padding: '3px 5px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Durée (s)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    step={0.5}
                    className="form-input"
                    value={titleForm.duration}
                    onChange={(e) => setTitleForm({ ...titleForm, duration: parseFloat(e.target.value) || 3 })}
                    style={{ width: '100%', fontSize: '11px', padding: '3px 5px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Disposition</label>
                <select
                  className="form-input"
                  value={titleForm.style}
                  onChange={(e) => setTitleForm({ ...titleForm, style: e.target.value as any })}
                  style={{ width: '100%', fontSize: '11px', padding: '3px 5px' }}
                >
                  <option value="lowerthird">Bandeau inférieur (Lower Third)</option>
                  <option value="intro">Plein écran (Intro / Chapitre)</option>
                  <option value="outro">Plein écran (Outro / Fin)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '6px' }}>
                <button className="action-btn" onClick={() => setIsTitleModalOpen(false)}>Annuler</button>
                <button className="btn-primary" onClick={handleSaveTitle}>Valider le titre</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GIF Export Modal */}
      {gifModalVideo && (
        <GifExportModal
          video={gifModalVideo}
          onClose={() => setGifModalVideo(null)}
          onSavedToLibrary={loadLibraryAndProjects}
        />
      )}

      {/* Device Frame Modal */}
      {frameModalVideo && (
        <DeviceFrameModal
          video={frameModalVideo}
          onClose={() => setFrameModalVideo(null)}
          onSavedToLibrary={loadLibraryAndProjects}
        />
      )}

      {/* Subtitles Studio Modal */}
      {subtitlesModalVideo && (
        <SubtitlesStudioModal
          video={subtitlesModalVideo}
          onClose={() => setSubtitlesModalVideo(null)}
          onSavedToLibrary={loadLibraryAndProjects}
        />
      )}

      {/* Voice Generator Modal */}
      {isVoiceModalOpen && (
        <VoiceGeneratorModal
          onClose={() => setIsVoiceModalOpen(false)}
          onGenerated={(title, blob) => {
            const newAudio = {
              id: `voice_${Date.now()}`,
              title,
              blob,
              url: URL.createObjectURL(blob)
            };
            setCustomAudios(prev => [newAudio, ...prev]);
            setProject(prev => ({
              ...prev,
              backgroundMusic: {
                id: newAudio.id,
                title: newAudio.title,
                blob: newAudio.blob,
                volume: 0.85, // Higher default volume for speech voiceovers
                loop: false,
                isPreset: false
              }
            }));
            setIsVoiceModalOpen(false);
          }}
        />
      )}

      {/* Silence Remover for a Timeline Clip */}
      {silenceRemoverClip && (
        <SilenceRemoverModal
          video={silenceRemoverClip.video}
          onClose={() => setSilenceRemoverClip(null)}
          onApplySegments={(segments) => handleApplySilenceSegmentsToClip(silenceRemoverClip.id, segments)}
        />
      )}

      {/* Silence Remover for a Library Video */}
      {silenceRemoverLibraryVideo && (
        <SilenceRemoverModal
          video={silenceRemoverLibraryVideo}
          onClose={() => setSilenceRemoverLibraryVideo(null)}
          onApplySegments={(segments) => handleApplySilenceSegmentsToLibraryVideo(silenceRemoverLibraryVideo, segments)}
        />
      )}
    </div>
  );
}
