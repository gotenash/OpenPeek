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
  calculateTotalDuration, 
  drawTitleOverlay 
} from '../utils/videoCompositor';
import { 
  Film, Plus, Trash2, ArrowLeft, ArrowRight, Play, Pause, 
  Download, Sparkles, Type, Layers, Check, X, Save, FolderOpen, 
  FileText, Upload, RefreshCw
} from 'lucide-react';

export function VideoEditorStudio() {
  const [libraryVideos, setLibraryVideos] = useState<SavedVideo[]>([]);
  const [projectId, setProjectId] = useState<string>(() => `proj_${Date.now()}`);
  const [projectName, setProjectName] = useState<string>('Mon Projet de Montage');
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [isProjectListModalOpen, setIsProjectListModalOpen] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const [project, setProject] = useState<EditorProject>({
    clips: [],
    titles: []
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
        titles: project.titles
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
  const handleLoadProject = (saved: SavedProject) => {
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

      setProjectId(saved.id);
      setProjectName(saved.title);
      setProject({
        clips: loadedClips,
        titles: parsed.titles || []
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
    setProject({ clips: [], titles: [] });
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
      appName: 'Capt Screen',
      projectId,
      projectName,
      date: new Date().toISOString(),
      clips: serializableClips,
      titles: project.titles
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
    reader.onload = (event) => {
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

        setProjectId(parsed.projectId || `proj_${Date.now()}`);
        setProjectName(parsed.projectName || file.name.replace('.captproj', ''));
        setProject({
          clips: loadedClips,
          titles: parsed.titles || []
        });

        setCurrentTime(0);
        setSaveSuccessMsg("Fichier projet importé avec succès !");
        setTimeout(() => setSaveSuccessMsg(null), 3000);
      } catch (err) {
        alert("Fichier de projet invalide.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Timeline Clip Operations ---

  const addClipToTimeline = (video: SavedVideo) => {
    const newClip: TimelineClip = {
      id: `clip_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
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

  const removeClip = (clipId: string) => {
    setProject((prev) => ({
      ...prev,
      clips: prev.clips.filter((c) => c.id !== clipId)
    }));
  };

  const moveClip = (index: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= project.clips.length) return;

    setProject((prev) => {
      const nextClips = [...prev.clips];
      const temp = nextClips[index];
      nextClips[index] = nextClips[targetIdx];
      nextClips[targetIdx] = temp;
      return { ...prev, clips: nextClips };
    });
  };

  const updateClip = (clipId: string, updates: Partial<TimelineClip>) => {
    setProject((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => (c.id === clipId ? { ...c, ...updates } : c))
    }));
  };

  // --- Title Operations ---

  const handleSaveTitle = () => {
    if (!titleForm.text.trim()) return;

    const titleToSave = {
      ...titleForm,
      id: titleForm.id || `title_${Date.now()}`
    };

    setProject((prev) => {
      const exists = prev.titles.some((t) => t.id === titleToSave.id);
      if (exists) {
        return {
          ...prev,
          titles: prev.titles.map((t) => (t.id === titleToSave.id ? titleToSave : t))
        };
      }
      return {
        ...prev,
        titles: [...prev.titles, titleToSave]
      };
    });

    setIsTitleModalOpen(false);
  };

  const removeTitle = (titleId: string) => {
    setProject((prev) => ({
      ...prev,
      titles: prev.titles.filter((t) => t.id !== titleId)
    }));
  };

  // --- Playback & Transport Engine ---

  const handleSeek = (targetTime: number) => {
    setCurrentTime(targetTime);
    
    let cumulative = 0;
    for (let i = 0; i < project.clips.length; i++) {
      const clip = project.clips[i];
      const clipDuration = Math.max(0.1, clip.endTrim - clip.startTrim);
      const isLast = i === project.clips.length - 1;
      const transDur = (!isLast && clip.transitionToNext !== 'none')
        ? Math.min(clip.transitionDuration, clipDuration / 2)
        : 0;

      const clipStart = cumulative;
      const clipEnd = cumulative + clipDuration;

      const videoEl = videoElementsRef.current.get(clip.id);
      if (videoEl) {
        if (targetTime >= clipStart && targetTime <= clipEnd) {
          const targetInClip = (targetTime - clipStart) + clip.startTrim;
          videoEl.currentTime = Math.max(clip.startTrim, Math.min(clip.endTrim, targetInClip));
        } else {
          videoEl.pause();
        }
      }

      cumulative += clipDuration - transDur;
    }
  };

  const togglePlay = () => {
    if (project.clips.length === 0 || totalDuration <= 0) return;

    if (isPlaying) {
      videoElementsRef.current.forEach(v => v.pause());
      setIsPlaying(false);
    } else {
      if (currentTime >= totalDuration - 0.1) {
        handleSeek(0);
      }
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (!isPlaying) {
      renderStaticPreviewAt(currentTime);
      return;
    }

    let lastTime = performance.now();
    let currentMasterTime = currentTime;

    const playbackLoop = () => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      currentMasterTime += dt;
      if (currentMasterTime >= totalDuration) {
        setIsPlaying(false);
        setCurrentTime(0);
        videoElementsRef.current.forEach(v => v.pause());
        return;
      }

      setCurrentTime(currentMasterTime);

      const canvas = previewCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0a0a0a';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          let cumulative = 0;
          for (let i = 0; i < project.clips.length; i++) {
            const clip = project.clips[i];
            const clipDuration = Math.max(0.1, clip.endTrim - clip.startTrim);
            const isLast = i === project.clips.length - 1;
            const transDur = (!isLast && clip.transitionToNext !== 'none')
              ? Math.min(clip.transitionDuration, clipDuration / 2)
              : 0;

            const clipStart = cumulative;
            const clipEnd = cumulative + clipDuration;
            const videoEl = videoElementsRef.current.get(clip.id);

            if (currentMasterTime >= clipStart && currentMasterTime <= clipEnd) {
              if (videoEl) {
                if (videoEl.paused) {
                  const targetInClip = (currentMasterTime - clipStart) + clip.startTrim;
                  videoEl.currentTime = targetInClip;
                  videoEl.play().catch(() => {});
                }
                if (videoEl.readyState >= 2) {
                  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
                }
              }

              // Active transition to next clip
              if (!isLast && clip.transitionToNext !== 'none' && currentMasterTime > clipEnd - transDur) {
                const transProgress = (currentMasterTime - (clipEnd - transDur)) / transDur;
                const nextClip = project.clips[i + 1];
                const nextVideoEl = videoElementsRef.current.get(nextClip.id);

                if (nextVideoEl) {
                  if (nextVideoEl.paused) {
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
              if (videoEl && !videoEl.paused && (currentMasterTime < clipStart - 1 || currentMasterTime > clipEnd + 1)) {
                videoEl.pause();
              }
            }

            cumulative += clipDuration - transDur;
          }

          // Overlay titles
          for (const title of project.titles) {
            if (currentMasterTime >= title.startTime && currentMasterTime <= title.startTime + title.duration) {
              drawTitleOverlay(ctx, title, canvas.width, canvas.height, currentMasterTime - title.startTime);
            }
          }
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
      const clipDuration = Math.max(0.1, clip.endTrim - clip.startTrim);
      const isLast = i === project.clips.length - 1;
      const transDur = (!isLast && clip.transitionToNext !== 'none')
        ? Math.min(clip.transitionDuration, clipDuration / 2)
        : 0;

      const clipStart = cumulative;
      const clipEnd = cumulative + clipDuration;

      if (time >= clipStart && time <= clipEnd) {
        const videoEl = videoElementsRef.current.get(clip.id);
        if (videoEl && videoEl.readyState >= 2) {
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
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

    try {
      exportAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const dest = exportAudioCtx.createMediaStreamDestination();

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
        return;
      }

      if (exportCtx) {
        exportCtx.fillStyle = '#0a0a0a';
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

        let cumulative = 0;
        for (let i = 0; i < project.clips.length; i++) {
          const clip = project.clips[i];
          const clipDuration = Math.max(0.1, clip.endTrim - clip.startTrim);
          const isLast = i === project.clips.length - 1;
          const transDur = (!isLast && clip.transitionToNext !== 'none')
            ? Math.min(clip.transitionDuration, clipDuration / 2)
            : 0;

          const clipStart = cumulative;
          const clipEnd = cumulative + clipDuration;
          const videoEl = videoElementsRef.current.get(clip.id);

          if (exportTime >= clipStart && exportTime <= clipEnd) {
            if (videoEl) {
              if (videoEl.paused) {
                videoEl.currentTime = (exportTime - clipStart) + clip.startTrim;
                videoEl.play().catch(() => {});
              }
              if (videoEl.readyState >= 2) {
                exportCtx.drawImage(videoEl, 0, 0, exportCanvas.width, exportCanvas.height);
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
      {/* Hidden file input for .captproj import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".captproj,.json"
        style={{ display: 'none' }}
        onChange={handleImportProjectFile}
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
      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '12px' }}>
        {/* Media Bin */}
        <div className="glass-panel" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', height: '220px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Film size={14} color="#c084fc" />
              Chutier ({libraryVideos.length} clips)
            </span>
          </div>

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
                <button
                  className="btn-toolbar"
                  style={{ padding: '2px 5px', fontSize: '10px', backgroundColor: 'rgba(139, 92, 246, 0.25)', color: '#c084fc' }}
                  onClick={() => addClipToTimeline(v)}
                  title="Ajouter à la timeline"
                >
                  <Plus size={11} />
                </button>
              </div>
            ))}
            {libraryVideos.length === 0 && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                Aucune capture enregistrée.
              </div>
            )}
          </div>
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
                <button className="btn-secondary" onClick={handleDownloadExported} style={{ fontSize: '11px', padding: '3px 8px' }}>
                  <Download size={12} />
                  <span>Télécharger</span>
                </button>
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
          <span style={{ fontSize: '10px', width: '70px', color: '#c084fc', fontWeight: 600 }}>🔤 Titres ({project.titles.length})</span>
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
          <span style={{ fontSize: '10px', width: '70px', color: '#06b6d4', fontWeight: 600 }}>🎬 Vidéos ({project.clips.length})</span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {project.clips.map((clip, idx) => (
              <div key={clip.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    padding: '6px 8px',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '5px',
                    minWidth: '160px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>
                      {clip.video.title}
                    </span>
                    <button
                      style={{ background: 'transparent', border: 'none', color: '#fb7185', cursor: 'pointer', padding: 0 }}
                      onClick={() => removeClip(clip.id)}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px', fontSize: '9px' }}>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <button className="btn-toolbar" style={{ padding: '1px 3px' }} disabled={idx === 0} onClick={() => moveClip(idx, 'left')}>
                        <ArrowLeft size={9} />
                      </button>
                      <button className="btn-toolbar" style={{ padding: '1px 3px' }} disabled={idx === project.clips.length - 1} onClick={() => moveClip(idx, 'right')}>
                        <ArrowRight size={9} />
                      </button>
                    </div>

                    <span style={{ color: '#06b6d4' }}>
                      {clip.startTrim.toFixed(1)}s à {clip.endTrim.toFixed(1)}s
                    </span>
                  </div>
                </div>

                {idx < project.clips.length - 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                    <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>Transition</span>
                    <select
                      className="form-input"
                      style={{ padding: '1px 3px', fontSize: '9px', width: '80px' }}
                      value={clip.transitionToNext}
                      onChange={(e) => updateClip(clip.id, { transitionToNext: e.target.value as any })}
                    >
                      <option value="none">Coupure</option>
                      <option value="crossfade">Fondu</option>
                      <option value="fade-black">Au Noir</option>
                      <option value="slide">Glissement</option>
                    </select>
                  </div>
                )}
              </div>
            ))}

            {project.clips.length === 0 && (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Glissez ou cliquez sur « + » sur un clip du chutier pour l'insérer ici.</span>
            )}
          </div>
        </div>
      </div>

      {/* Saved Projects List Modal */}
      {isProjectListModalOpen && (
        <div className="modal-overlay" onClick={() => setIsProjectListModalOpen(false)}>
          <div className="glass-panel modal-content" style={{ maxWidth: '520px', padding: '16px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderOpen size={18} color="#c084fc" />
                <h3 className="modal-title" style={{ fontSize: '15px' }}>Projets de Montage Enregistrés</h3>
              </div>
              <button className="close-btn" onClick={() => setIsProjectListModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
              {savedProjects.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{p.title}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {p.clipCount} clips • {formatTime(p.totalDuration)} • {new Date(p.date).toLocaleDateString()}
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
                      className="action-btn delete"
                      style={{ padding: '3px 6px' }}
                      onClick={() => handleDeleteSavedProject(p.id)}
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
    </div>
  );
}
