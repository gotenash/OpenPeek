import React, { useState } from 'react';
import {
  saveProject,
  deleteProject,
  type SavedProject,
  type SavedVideo,
  type SavedMedia
} from '../../utils/db';
import {
  type TimelineClip,
  type EditorProject,
  type BackgroundMusicTrack,
  type TimelineVoiceover,
  generateAmbientMusicBlob
} from '../../utils/videoCompositor';

export interface UseStudioProjectManagerProps {
  project: EditorProject;
  setProject: (updater: EditorProject | ((prev: EditorProject) => EditorProject), forceHistory?: boolean) => void;
  _setProject: React.Dispatch<React.SetStateAction<EditorProject>>;
  projectId: string;
  setProjectId: (id: string) => void;
  projectName: string;
  setProjectName: (name: string) => void;
  totalDuration: number;
  libraryVideos: SavedVideo[];
  libraryImages: SavedMedia[];
  loadLibraryAndProjects: () => Promise<void>;
  setCurrentTime: (time: number) => void;
  setSelectedClipId: (id: string | null) => void;
  setSelectedElement: (el: any) => void;
  setIsPlaying: (playing: boolean) => void;
  isPlayingRef: React.MutableRefObject<boolean>;
  undoStackRef: React.MutableRefObject<EditorProject[]>;
  redoStackRef: React.MutableRefObject<EditorProject[]>;
  setCanUndo: (can: boolean) => void;
  setCanRedo: (can: boolean) => void;
  setIsProjectListModalOpen: (open: boolean) => void;
}

export function useStudioProjectManager({
  project,
  setProject: _setProjectHistory,
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
}: UseStudioProjectManagerProps) {
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // 1. Save current project to IndexedDB
  const handleSaveProject = async () => {
    try {
      const serializableClips = project.clips.map(c => ({
        id: c.id,
        track: c.track || 1,
        startTime: c.startTime,
        volume: c.volume !== undefined ? c.volume : 1.0,
        videoId: c.video.id,
        videoTitle: c.video.title,
        startTrim: c.startTrim,
        endTrim: c.endTrim,
        transitionToNext: c.transitionToNext,
        transitionDuration: c.transitionDuration,
        playbackSpeed: c.playbackSpeed || 1.0,
        type: c.type || 'video',
        slideContent: c.slideContent,
        imageThumbnail: c.type === 'image' ? (c.video.thumbnail || '') : undefined
      }));

      const projectData = {
        clips: serializableClips,
        titles: project.titles,
        zooms: project.zooms || [],
        images: project.images || [],
        chapters: project.chapters || [],
        voiceovers: (project.voiceovers || []).map(v => ({
          id: v.id,
          startTime: v.startTime,
          duration: v.duration,
          volume: v.volume,
          label: v.label,
          dataUrl: v.dataUrl
        })),
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
        if (item.type === 'slide') {
          loadedClips.push({
            id: item.id || `clip_${Date.now()}_${Math.random()}`,
            track: item.track || 1,
            startTime: item.startTime,
            volume: item.volume !== undefined ? item.volume : 1.0,
            type: 'slide',
            slideContent: item.slideContent,
            video: {
              id: item.videoId || `slide_${Date.now()}`,
              title: item.videoTitle || item.slideContent?.title || 'Diapositive Titre',
              blob: new Blob([], { type: 'video/mp4' }),
              thumbnail: '',
              duration: (item.endTrim || 4) - (item.startTrim || 0),
              size: 0,
              date: new Date().toISOString()
            },
            startTrim: item.startTrim || 0,
            endTrim: item.endTrim || 4,
            transitionToNext: item.transitionToNext || 'crossfade',
            transitionDuration: item.transitionDuration || 1.0,
            playbackSpeed: item.playbackSpeed || 1.0
          });
        } else if (item.type === 'image') {
          const matchingImg = libraryImages.find(img => img.id === item.videoId || img.title === item.videoTitle);
          loadedClips.push({
            id: item.id || `clip_${Date.now()}_${Math.random()}`,
            track: item.track || 1,
            startTime: item.startTime,
            volume: item.volume !== undefined ? item.volume : 1.0,
            type: 'image',
            video: {
              id: item.videoId || (matchingImg ? matchingImg.id : `img_${Date.now()}`),
              title: item.videoTitle || (matchingImg ? matchingImg.title : 'Image Diapo'),
              blob: matchingImg?.blob || new Blob([], { type: 'image/png' }),
              thumbnail: matchingImg?.thumbnail || item.imageThumbnail || '',
              duration: (item.endTrim || 5) - (item.startTrim || 0),
              size: matchingImg?.size || 0,
              date: new Date().toISOString()
            },
            startTrim: item.startTrim || 0,
            endTrim: item.endTrim || 5,
            transitionToNext: item.transitionToNext || 'crossfade',
            transitionDuration: item.transitionDuration || 1.0,
            playbackSpeed: item.playbackSpeed || 1.0
          });
        } else {
          const matchingVideo = libraryVideos.find(v => v.id === item.videoId || v.title === item.videoTitle);
          if (matchingVideo) {
            loadedClips.push({
              id: item.id || `clip_${Date.now()}_${Math.random()}`,
              track: item.track || 1,
              startTime: item.startTime,
              volume: item.volume !== undefined ? item.volume : 1.0,
              type: 'video',
              video: matchingVideo,
              startTrim: item.startTrim || 0,
              endTrim: item.endTrim || matchingVideo.duration || 10,
              transitionToNext: item.transitionToNext || 'crossfade',
              transitionDuration: item.transitionDuration || 1.0,
              playbackSpeed: item.playbackSpeed || 1.0
            });
          }
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

      const loadedVoiceovers: TimelineVoiceover[] = [];
      if (parsed.voiceovers && Array.isArray(parsed.voiceovers)) {
        for (const v of parsed.voiceovers) {
          let blob: Blob = new Blob([]);
          if (v.dataUrl) {
            try {
              const res = await fetch(v.dataUrl);
              blob = await res.blob();
            } catch (err) {
              console.warn('[VideoEditor] Failed to fetch voiceover dataUrl:', err);
            }
          }
          loadedVoiceovers.push({
            id: v.id,
            startTime: v.startTime,
            duration: v.duration,
            volume: v.volume ?? 1.0,
            label: v.label,
            dataUrl: v.dataUrl,
            blob
          });
        }
      }

      setProjectId(saved.id);
      setProjectName(saved.title);
      _setProject({
        clips: loadedClips,
        titles: parsed.titles || [],
        zooms: parsed.zooms || [],
        images: parsed.images || [],
        chapters: parsed.chapters || [],
        voiceovers: loadedVoiceovers,
        backgroundMusic: loadedBgMusic
      });

      undoStackRef.current = [];
      redoStackRef.current = [];
      setCanUndo(false);
      setCanRedo(false);
      setSelectedElement(null);
      setSelectedClipId(null);

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
    _setProject({ clips: [], titles: [], zooms: [], images: [], chapters: [], voiceovers: [], backgroundMusic: null });
    undoStackRef.current = [];
    redoStackRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
    setSelectedElement(null);
    setSelectedClipId(null);
    setCurrentTime(0);
    isPlayingRef.current = false;
    setIsPlaying(false);
  };

  // 5. Export .captproj JSON File
  const handleExportProjectFile = () => {
    const serializableClips = project.clips.map(c => ({
      id: c.id,
      track: c.track || 1,
      startTime: c.startTime,
      volume: c.volume !== undefined ? c.volume : 1.0,
      videoId: c.video.id,
      videoTitle: c.video.title,
      startTrim: c.startTrim,
      endTrim: c.endTrim,
      transitionToNext: c.transitionToNext,
      transitionDuration: c.transitionDuration,
      playbackSpeed: c.playbackSpeed || 1.0,
      type: c.type || 'video',
      slideContent: c.slideContent,
      imageThumbnail: c.type === 'image' ? (c.video.thumbnail || '') : undefined
    }));

    const exportObj = {
      version: 1,
      appName: 'OpenPeek Studio',
      projectId,
      projectName,
      date: new Date().toISOString(),
      clips: serializableClips,
      titles: project.titles,
      zooms: project.zooms || [],
      images: project.images || [],
      chapters: project.chapters || [],
      voiceovers: (project.voiceovers || []).map(v => ({
        id: v.id,
        startTime: v.startTime,
        duration: v.duration,
        volume: v.volume,
        label: v.label,
        dataUrl: v.dataUrl
      })),
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
          if (item.type === 'slide') {
            loadedClips.push({
              id: item.id || `clip_${Date.now()}_${Math.random()}`,
              track: item.track || 1,
              startTime: item.startTime,
              volume: item.volume !== undefined ? item.volume : 1.0,
              type: 'slide',
              slideContent: item.slideContent,
              video: {
                id: item.videoId || `slide_${Date.now()}`,
                title: item.videoTitle || item.slideContent?.title || 'Diapositive Titre',
                blob: new Blob([], { type: 'video/mp4' }),
                thumbnail: '',
                duration: (item.endTrim || 4) - (item.startTrim || 0),
                size: 0,
                date: new Date().toISOString()
              },
              startTrim: item.startTrim || 0,
              endTrim: item.endTrim || 4,
              transitionToNext: item.transitionToNext || 'crossfade',
              transitionDuration: item.transitionDuration || 1.0,
              playbackSpeed: item.playbackSpeed || 1.0
            });
          } else if (item.type === 'image') {
            const matchingImg = libraryImages.find(img => img.id === item.videoId || img.title === item.videoTitle);
            loadedClips.push({
              id: item.id || `clip_${Date.now()}_${Math.random()}`,
              track: item.track || 1,
              startTime: item.startTime,
              volume: item.volume !== undefined ? item.volume : 1.0,
              type: 'image',
              video: {
                id: item.videoId || (matchingImg ? matchingImg.id : `img_${Date.now()}`),
                title: item.videoTitle || (matchingImg ? matchingImg.title : 'Image Diapo'),
                blob: matchingImg?.blob || new Blob([], { type: 'image/png' }),
                thumbnail: matchingImg?.thumbnail || item.imageThumbnail || '',
                duration: (item.endTrim || 5) - (item.startTrim || 0),
                size: matchingImg?.size || 0,
                date: new Date().toISOString()
              },
              startTrim: item.startTrim || 0,
              endTrim: item.endTrim || 5,
              transitionToNext: item.transitionToNext || 'crossfade',
              transitionDuration: item.transitionDuration || 1.0,
              playbackSpeed: item.playbackSpeed || 1.0
            });
          } else {
            const matchingVideo = libraryVideos.find(v => v.id === item.videoId || v.title === item.videoTitle);
            if (matchingVideo) {
              loadedClips.push({
                id: item.id || `clip_${Date.now()}_${Math.random()}`,
                track: item.track || 1,
                startTime: item.startTime,
                volume: item.volume !== undefined ? item.volume : 1.0,
                type: 'video',
                video: matchingVideo,
                startTrim: item.startTrim || 0,
                endTrim: item.endTrim || matchingVideo.duration || 10,
                transitionToNext: item.transitionToNext || 'crossfade',
                transitionDuration: item.transitionDuration || 1.0,
                playbackSpeed: item.playbackSpeed || 1.0
              });
            }
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

        const loadedVoiceovers: TimelineVoiceover[] = [];
        if (parsed.voiceovers && Array.isArray(parsed.voiceovers)) {
          for (const v of parsed.voiceovers) {
            let blob: Blob = new Blob([]);
            if (v.dataUrl) {
              try {
                const res = await fetch(v.dataUrl);
                blob = await res.blob();
              } catch (err) {
                console.warn('[VideoEditor] Failed to fetch voiceover dataUrl:', err);
              }
            }
            loadedVoiceovers.push({
              id: v.id,
              startTime: v.startTime,
              duration: v.duration,
              volume: v.volume ?? 1.0,
              label: v.label,
              dataUrl: v.dataUrl,
              blob
            });
          }
        }

        setProjectId(parsed.projectId || `proj_${Date.now()}`);
        setProjectName(parsed.projectName || 'Projet Importé');
        _setProject({
          clips: loadedClips,
          titles: parsed.titles || [],
          zooms: parsed.zooms || [],
          images: parsed.images || [],
          chapters: parsed.chapters || [],
          voiceovers: loadedVoiceovers,
          backgroundMusic: loadedBgMusic
        });

        undoStackRef.current = [];
        redoStackRef.current = [];
        setCanUndo(false);
        setCanRedo(false);
        setSelectedElement(null);
        setSelectedClipId(null);

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

  return {
    saveSuccessMsg,
    setSaveSuccessMsg,
    handleSaveProject,
    handleLoadProject,
    handleDeleteSavedProject,
    handleNewProject,
    handleExportProjectFile,
    handleImportProjectFile
  };
}
