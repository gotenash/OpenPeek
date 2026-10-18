import React, { useState, useMemo, useCallback } from 'react';
import {
  type TimelineClip,
  type TimelineTitle,
  type SlideContent,
  type EditorProject
} from '../../utils/videoCompositor';
import { type SavedVideo, type SavedMedia } from '../../utils/db';
import { resolveAccurateBlobDuration } from '../../utils/subtitlesEngine';
import type { SpeechSegment } from '../../utils/audioSilenceDetector';

export interface UseStudioClipsProps {
  project: EditorProject;
  setProject: (updater: EditorProject | ((prev: EditorProject) => EditorProject), forceHistory?: boolean) => void;
  selectedClipId: string | null;
  setSelectedClipId: (id: string | null) => void;
  selectedElement: { type: string; id: string } | null;
  setSelectedElement: (el: any) => void;
  targetTrackForInsert: 1 | 2;
  setTargetTrackForInsert: (track: 1 | 2) => void;
  currentTime: number;
  currentTimeRef: React.MutableRefObject<number>;
  isPlayingRef: React.MutableRefObject<boolean>;
  videoElementsRef: React.MutableRefObject<Map<string, HTMLVideoElement>>;
  imagesCacheRef: React.MutableRefObject<Map<string, HTMLImageElement>>;
  exportContainerRef: React.RefObject<HTMLDivElement | null>;
  clipTimelineOffsets: Map<string, { start: number; end: number; duration: number }>;
  handleSeek: (time: number) => void;
  renderStaticPreviewAt: (time: number) => void;
  formatTime?: (secs: number) => string;
}

export function useStudioClips({
  project,
  setProject,
  selectedClipId,
  setSelectedClipId,
  selectedElement,
  setSelectedElement,
  targetTrackForInsert,
  currentTime,
  currentTimeRef,
  isPlayingRef,
  videoElementsRef,
  imagesCacheRef,
  exportContainerRef,
  clipTimelineOffsets,
  handleSeek,
  renderStaticPreviewAt
}: UseStudioClipsProps) {
  // Video insertion
  const [isVideoPickerOpen, setIsVideoPickerOpen] = useState(false);
  const [videoInsertPosition, setVideoInsertPosition] = useState<'start' | 'current' | 'end'>('end');

  // Slide modal
  const [isSlideModalOpen, setIsSlideModalOpen] = useState(false);
  const [slideModalMode, setSlideModalMode] = useState<'add' | 'edit'>('add');
  const [editingSlideClipId, setEditingSlideClipId] = useState<string | null>(null);
  const [slideInsertPosition, setSlideInsertPosition] = useState<'start' | 'current' | 'end'>('start');
  const [slideForm, setSlideForm] = useState<{
    title: string;
    subtitle: string;
    bgColor: string;
    textColor: string;
    subtextColor: string;
    fontSize: number;
    duration: number;
    align: 'left' | 'center' | 'right';
    bgImageUrl?: string;
    transitionToNext?: any;
  }>({
    title: 'Titre de la Présentation',
    subtitle: 'Introduction et présentation',
    bgColor: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
    textColor: '#ffffff',
    subtextColor: '#94a3b8',
    fontSize: 52,
    duration: 4,
    align: 'center',
    bgImageUrl: '',
    transitionToNext: 'crossfade'
  });

  // Image slide picker
  const [isImageSlidePickerOpen, setIsImageSlidePickerOpen] = useState(false);
  const [imageSlideInsertPosition, setImageSlideInsertPosition] = useState<'start' | 'current' | 'end'>('end');

  // Silence remover
  const [isSilenceModalOpen, setIsSilenceModalOpen] = useState(false);
  const [silenceModalClip, setSilenceModalClip] = useState<TimelineClip | null>(null);

  const addClipToTimeline = (video: SavedVideo, insertPosition: 'start' | 'current' | 'end' = 'end', track?: 1 | 2) => {
    const newClipId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const initialEndTrim = video.duration && video.duration > 0 ? video.duration : 10;
    const assignedTrack = track || targetTrackForInsert || 1;
    const newClip: TimelineClip = {
      id: newClipId,
      track: assignedTrack,
      video,
      startTrim: 0,
      endTrim: initialEndTrim,
      transitionToNext: 'crossfade',
      transitionDuration: 1.0,
      playbackSpeed: 1.0
    };

    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    if (video.blob && video.blob.size > 0) {
      v.src = URL.createObjectURL(video.blob);
    }
    v.onloadeddata = () => {
      if (!isPlayingRef.current) renderStaticPreviewAt(currentTimeRef.current);
    };
    v.oncanplay = () => {
      if (!isPlayingRef.current) renderStaticPreviewAt(currentTimeRef.current);
    };
    v.load();
    if (exportContainerRef.current) {
      exportContainerRef.current.appendChild(v);
    }
    videoElementsRef.current.set(newClipId, v);

    if (video.thumbnail) {
      const thumbImg = new Image();
      thumbImg.onload = () => {
        if (!isPlayingRef.current) renderStaticPreviewAt(currentTimeRef.current);
      };
      thumbImg.src = video.thumbnail;
      imagesCacheRef.current.set(`thumb_${newClipId}`, thumbImg);
    }

    setProject((prev) => {
      const clips = [...prev.clips];
      if (insertPosition === 'start') {
        clips.unshift(newClip);
      } else if (insertPosition === 'current') {
        let insertIdx = clips.length;
        let cumulative = 0;
        for (let i = 0; i < clips.length; i++) {
          const c = clips[i];
          const clipDur = (c.endTrim - c.startTrim) / (c.playbackSpeed || 1.0);
          if (currentTimeRef.current >= cumulative && currentTimeRef.current <= cumulative + clipDur) {
            insertIdx = i + 1;
            break;
          }
          cumulative += clipDur;
        }
        clips.splice(insertIdx, 0, newClip);
      } else {
        clips.push(newClip);
      }
      return { ...prev, clips };
    });

    setSelectedClipId(newClipId);

    setTimeout(() => {
      if (!isPlayingRef.current) {
        renderStaticPreviewAt(currentTimeRef.current);
      }
    }, 50);

    if (video.blob && video.blob.size > 0) {
      resolveAccurateBlobDuration(video.blob, video.duration).then((dur) => {
        if (dur > initialEndTrim) {
          setProject((prev) => ({
            ...prev,
            clips: prev.clips.map((c) => (c.id === newClipId && c.endTrim === initialEndTrim) ? { ...c, endTrim: dur } : c)
          }));
        }
      }).catch(() => {});
    }
  };

  const openAddSlideModal = (position: 'start' | 'current' | 'end' = 'start') => {
    setSlideModalMode('add');
    setEditingSlideClipId(null);
    setSlideInsertPosition(position);
    setSlideForm({
      title: position === 'start' ? 'Titre de la Présentation' : 'Nouveau Chapitre',
      subtitle: position === 'start' ? 'Introduction et présentation' : 'Sous-titre explicatif',
      bgColor: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      textColor: '#ffffff',
      subtextColor: '#94a3b8',
      fontSize: 52,
      duration: 4,
      align: 'center',
      bgImageUrl: '',
      transitionToNext: 'crossfade'
    });
    setIsSlideModalOpen(true);
  };

  const openEditSlideModal = (clip: TimelineClip) => {
    setEditingSlideClipId(clip.id);
    setSelectedClipId(clip.id);
    setSlideModalMode('edit');
    const dur = Math.max(0.5, clip.endTrim - clip.startTrim);
    const content = clip.slideContent || {
      title: clip.video?.title || 'Diapositive Titre',
      subtitle: '',
      bgColor: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      textColor: '#ffffff',
      subtextColor: '#94a3b8',
      fontSize: 52,
      align: 'center'
    };
    setSlideForm({
      title: content.title || 'Diapositive Titre',
      subtitle: content.subtitle || '',
      bgColor: content.bgColor || 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      textColor: content.textColor || '#ffffff',
      subtextColor: content.subtextColor || '#94a3b8',
      fontSize: content.fontSize || 52,
      duration: dur,
      align: content.align || 'center',
      bgImageUrl: content.bgImageUrl || '',
      transitionToNext: clip.transitionToNext || 'crossfade'
    });
    setIsSlideModalOpen(true);
  };

  const handleSaveSlideClip = (savedForm?: typeof slideForm, position?: 'start' | 'current' | 'end') => {
    const activeForm = savedForm || slideForm;
    const activePos = position || slideInsertPosition;

    if (!activeForm.title.trim()) {
      alert("Veuillez saisir un titre pour la diapositive.");
      return;
    }

    const slideContent: SlideContent = {
      title: activeForm.title.trim(),
      subtitle: activeForm.subtitle.trim(),
      bgColor: activeForm.bgColor,
      textColor: activeForm.textColor,
      subtextColor: activeForm.subtextColor,
      fontSize: activeForm.fontSize,
      align: activeForm.align,
      bgImageUrl: activeForm.bgImageUrl
    };

    const dur = Math.max(0.5, activeForm.duration);

    if (slideModalMode === 'edit' && editingSlideClipId) {
      setProject(prev => ({
        ...prev,
        clips: prev.clips.map(c => {
          if (c.id === editingSlideClipId) {
            return {
              ...c,
              slideContent,
              video: {
                ...c.video,
                title: activeForm.title.trim(),
                duration: dur
              },
              startTrim: 0,
              endTrim: dur,
              transitionToNext: activeForm.transitionToNext
            };
          }
          return c;
        })
      }));
      setSelectedClipId(editingSlideClipId);
    } else {
      const newSlideClip: TimelineClip = {
        id: `slide_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'slide',
        track: targetTrackForInsert || 1,
        slideContent,
        video: {
          id: `slide_vid_${Date.now()}`,
          title: activeForm.title.trim(),
          blob: new Blob([], { type: 'video/mp4' }),
          thumbnail: '',
          duration: dur,
          size: 0,
          date: new Date().toISOString()
        },
        startTrim: 0,
        endTrim: dur,
        transitionToNext: activeForm.transitionToNext,
        transitionDuration: 1.0,
        playbackSpeed: 1.0
      };

      setProject(prev => {
        const clips = [...prev.clips];
        if (activePos === 'start') {
          clips.unshift(newSlideClip);
        } else if (activePos === 'current') {
          let insertIdx = clips.length;
          let cumulative = 0;
          for (let i = 0; i < clips.length; i++) {
            const c = clips[i];
            const clipDur = (c.endTrim - c.startTrim) / (c.playbackSpeed || 1.0);
            if (currentTimeRef.current >= cumulative && currentTimeRef.current <= cumulative + clipDur) {
              insertIdx = i + 1;
              break;
            }
            cumulative += clipDur;
          }
          clips.splice(insertIdx, 0, newSlideClip);
        } else {
          clips.push(newSlideClip);
        }
        return { ...prev, clips };
      });

      setSelectedClipId(newSlideClip.id);
      if (activePos === 'start') {
        handleSeek(0);
      }
    }

    setIsSlideModalOpen(false);
    setEditingSlideClipId(null);
    setTimeout(() => {
      if (!isPlayingRef.current) renderStaticPreviewAt(currentTimeRef.current);
    }, 60);
  };

  const handleAddImageAsClip = (media: SavedMedia, duration: number = 5, insertPosition: 'start' | 'current' | 'end' = 'end') => {
    const newClipId = `imgclip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newImageClip: TimelineClip = {
      id: newClipId,
      type: 'image',
      track: targetTrackForInsert || 1,
      video: {
        id: media.id,
        title: media.title || 'Diapositive Image',
        blob: media.blob || new Blob([], { type: 'image/png' }),
        thumbnail: media.thumbnail || '',
        duration: duration,
        size: media.size || 0,
        date: new Date().toISOString()
      },
      startTrim: 0,
      endTrim: duration,
      transitionToNext: 'crossfade',
      transitionDuration: 1.0,
      playbackSpeed: 1.0
    };

    const imgEl = new Image();
    if (media.thumbnail) {
      imgEl.src = media.thumbnail;
    } else if (media.blob) {
      imgEl.src = URL.createObjectURL(media.blob);
    }
    imgEl.onload = () => {
      if (!isPlayingRef.current) renderStaticPreviewAt(currentTimeRef.current);
    };
    imagesCacheRef.current.set(newClipId, imgEl);

    setProject(prev => {
      const clips = [...prev.clips];
      if (insertPosition === 'start') {
        clips.unshift(newImageClip);
      } else if (insertPosition === 'current') {
        let insertIdx = clips.length;
        let cumulative = 0;
        for (let i = 0; i < clips.length; i++) {
          const c = clips[i];
          const clipDur = (c.endTrim - c.startTrim) / (c.playbackSpeed || 1.0);
          if (currentTimeRef.current >= cumulative && currentTimeRef.current <= cumulative + clipDur) {
            insertIdx = i + 1;
            break;
          }
          cumulative += clipDur;
        }
        clips.splice(insertIdx, 0, newImageClip);
      } else {
        clips.push(newImageClip);
      }
      return { ...prev, clips };
    });

    setSelectedClipId(newClipId);
    if (insertPosition === 'start') {
      handleSeek(0);
    }

    setIsImageSlidePickerOpen(false);
    setTimeout(() => {
      if (!isPlayingRef.current) renderStaticPreviewAt(currentTimeRef.current);
    }, 60);
  };

  const updateSlideOrImageDuration = (clipId: string, duration: number) => {
    const validDur = Math.max(0.5, Math.round(duration * 10) / 10);
    setProject(prev => ({
      ...prev,
      clips: prev.clips.map(c => c.id === clipId ? {
        ...c,
        startTrim: 0,
        endTrim: validDur,
        video: { ...c.video, duration: validDur }
      } : c)
    }));
    if (!isPlayingRef.current) {
      renderStaticPreviewAt(currentTimeRef.current);
    }
  };

  const removeClipFromTimeline = (id: string) => {
    setProject((prev) => ({
      ...prev,
      clips: prev.clips.filter((c) => c.id !== id)
    }));
    if (selectedClipId === id) {
      setSelectedClipId(null);
    }
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

  const updateClipVolume = (id: string, volume: number) => {
    const clamped = Math.max(0, Math.min(1, Math.round(volume * 100) / 100));
    setProject((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => c.id === id ? {
        ...c,
        volume: clamped
      } : c)
    }));
    const vEl = videoElementsRef.current.get(id);
    if (vEl) {
      vEl.volume = clamped;
      vEl.muted = (clamped === 0);
    }
  };

  const toggleClipTrack = (id: string, targetTrack?: 1 | 2) => {
    setProject((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => {
        if (c.id === id) {
          const newTrack = targetTrack ?? ((c.track === 2) ? 1 : 2);
          return { ...c, track: newTrack };
        }
        return c;
      })
    }));
  };

  const updateClipTiming = (id: string, newStartTime: number, newDuration?: number) => {
    const validStart = Math.max(0, Math.round(newStartTime * 10) / 10);
    setProject((prev) => ({
      ...prev,
      clips: prev.clips.map((c) => {
        if (c.id === id) {
          const speed = c.playbackSpeed && c.playbackSpeed > 0 ? c.playbackSpeed : 1.0;
          let updatedEndTrim = c.endTrim;
          if (typeof newDuration === 'number' && newDuration > 0) {
            const rawDur = Math.max(0.2, Math.round(newDuration * 10) / 10);
            const originalMax = c.video?.duration && c.video.duration > 0 ? c.video.duration : 9999;
            const targetEndTrim = (c.startTrim ?? 0) + (rawDur * speed);
            updatedEndTrim = Math.min(originalMax, targetEndTrim);
          }
          return {
            ...c,
            startTime: validStart,
            endTrim: updatedEndTrim
          };
        }
        return c;
      })
    }));
    if (!isPlayingRef.current) {
      renderStaticPreviewAt(currentTimeRef.current);
    }
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

  const canSplitAtPlayhead = useMemo(() => {
    const curTime = currentTime;
    if (selectedElement?.type === 'title') {
      const title = (project.titles || []).find(t => t.id === selectedElement.id);
      if (title && curTime > title.startTime + 0.1 && curTime < title.startTime + title.duration - 0.1) {
        return true;
      }
    }
    if (selectedClipId) {
      const clip = (project.clips || []).find(c => c.id === selectedClipId);
      if (clip) {
        const off = clipTimelineOffsets.get(clip.id);
        if (off && curTime > off.start + 0.05 && curTime < off.end - 0.05) {
          return true;
        }
      }
    }
    return (project.clips || []).some(c => {
      const off = clipTimelineOffsets.get(c.id);
      return off && curTime > off.start + 0.05 && curTime < off.end - 0.05;
    });
  }, [project.clips, project.titles, selectedClipId, selectedElement, currentTime, clipTimelineOffsets]);

  const handleSplitAtPlayhead = useCallback(() => {
    const curTime = currentTimeRef.current;

    if (selectedElement?.type === 'title') {
      const titleIndex = (project.titles || []).findIndex(t => t.id === selectedElement.id);
      if (titleIndex !== -1) {
        const title = project.titles[titleIndex];
        if (curTime > title.startTime + 0.1 && curTime < title.startTime + title.duration - 0.1) {
          const firstDuration = Math.round((curTime - title.startTime) * 10) / 10;
          const secondDuration = Math.round((title.duration - firstDuration) * 10) / 10;
          const title1: TimelineTitle = {
            ...title,
            duration: Math.max(0.2, firstDuration)
          };
          const title2: TimelineTitle = {
            ...title,
            id: `title_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            startTime: Math.round(curTime * 10) / 10,
            duration: Math.max(0.2, secondDuration)
          };
          const newTitles = [...project.titles];
          newTitles.splice(titleIndex, 1, title1, title2);
          setProject(prev => ({ ...prev, titles: newTitles }), true);
          setSelectedElement({ type: 'title', id: title2.id });
          return;
        }
      }
    }

    let targetClip: TimelineClip | null = null;
    let targetOffset: { start: number; end: number; duration: number } | null = null;

    if (selectedClipId) {
      const found = project.clips.find(c => c.id === selectedClipId);
      if (found) {
        const off = clipTimelineOffsets.get(found.id);
        if (off && curTime > off.start + 0.05 && curTime < off.end - 0.05) {
          targetClip = found;
          targetOffset = off;
        }
      }
    }

    if (!targetClip) {
      const candidates = project.clips.filter(c => {
        const off = clipTimelineOffsets.get(c.id);
        return off && curTime > off.start + 0.05 && curTime < off.end - 0.05;
      });
      if (candidates.length > 0) {
        targetClip = candidates.find(c => c.track !== 2) || candidates[0];
        targetOffset = clipTimelineOffsets.get(targetClip.id) || null;
      }
    }

    if (!targetClip || !targetOffset) return;

    const deltaTimeline = curTime - targetOffset.start;
    const speed = targetClip.playbackSpeed && targetClip.playbackSpeed > 0 ? targetClip.playbackSpeed : 1.0;
    const deltaSource = deltaTimeline * speed;
    const splitSourceTime = Math.round((targetClip.startTrim + deltaSource) * 100) / 100;

    const clipLeft: TimelineClip = {
      ...targetClip,
      endTrim: splitSourceTime,
      startTime: targetOffset.start,
      transitionToNext: 'none',
      transitionDuration: 0
    };

    const newClipId = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const clipRight: TimelineClip = {
      ...targetClip,
      id: newClipId,
      startTrim: splitSourceTime,
      startTime: Math.round(curTime * 10) / 10,
      slideContent: targetClip.slideContent ? JSON.parse(JSON.stringify(targetClip.slideContent)) : undefined
    };

    const clipIndex = project.clips.findIndex(c => c.id === targetClip!.id);
    if (clipIndex === -1) return;

    const nextClips = [...project.clips];
    nextClips.splice(clipIndex, 1, clipLeft, clipRight);

    setProject(prev => ({
      ...prev,
      clips: nextClips
    }), true);

    setSelectedClipId(newClipId);
    setSelectedElement({ type: 'clip', id: newClipId });

    if (!isPlayingRef.current) {
      renderStaticPreviewAt(curTime);
    }
  }, [
    project.clips,
    project.titles,
    selectedClipId,
    selectedElement,
    clipTimelineOffsets,
    setProject,
    renderStaticPreviewAt
  ]);

  return {
    isVideoPickerOpen,
    setIsVideoPickerOpen,
    videoInsertPosition,
    setVideoInsertPosition,
    addClipToTimeline,

    isSlideModalOpen,
    setIsSlideModalOpen,
    slideModalMode,
    slideForm,
    setSlideForm,
    slideInsertPosition,
    setSlideInsertPosition,
    openAddSlideModal,
    openEditSlideModal,
    handleSaveSlideClip,

    isImageSlidePickerOpen,
    setIsImageSlidePickerOpen,
    imageSlideInsertPosition,
    setImageSlideInsertPosition,
    handleAddImageAsClip,
    updateSlideOrImageDuration,

    removeClipFromTimeline,
    moveClip,
    updateClipTrim,
    updateClipTransition,
    updateClipSpeed,
    updateClipVolume,
    toggleClipTrack,
    updateClipTiming,
    splitAndFastForward,

    isSilenceModalOpen,
    setIsSilenceModalOpen,
    silenceModalClip,
    setSilenceModalClip,
    handleApplySilenceSegmentsToClip,
    handleApplySilenceSegmentsToLibraryVideo,

    canSplitAtPlayhead,
    handleSplitAtPlayhead
  };
}
