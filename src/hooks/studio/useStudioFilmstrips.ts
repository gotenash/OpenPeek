import React, { useState, useEffect } from 'react';
import type { EditorProject } from '../../utils/videoCompositor';
import { drawSlideClip, drawImageClip } from '../../utils/videoCompositor';

export interface UseStudioFilmstripsProps {
  project: EditorProject;
  clipTimelineOffsets: Map<string, { start: number; end: number; duration: number }>;
  imagesCacheRef: React.MutableRefObject<Map<string, HTMLImageElement>>;
  formatTime: (secs: number) => string;
}

export function useStudioFilmstrips({
  project,
  clipTimelineOffsets,
  imagesCacheRef,
  formatTime
}: UseStudioFilmstripsProps) {
  const [clipFilmstrips, setClipFilmstrips] = useState<Record<string, { id: string; clipTime: number; timelineTime: number; formattedTime: string; dataUrl: string }[]>>({});
  const [generatingFilmstrips, setGeneratingFilmstrips] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!project.clips || project.clips.length === 0) return;

    let isCancelled = false;

    (project.clips || []).forEach(async (clip) => {
      const offset = clipTimelineOffsets.get(clip.id);
      if (!offset) return;

      const cacheKey = `${clip.id}_${clip.startTrim}_${clip.endTrim}_${clip.playbackSpeed || 1}`;
      if (clipFilmstrips[cacheKey] || generatingFilmstrips[clip.id]) return;

      setGeneratingFilmstrips(prev => ({ ...prev, [clip.id]: true }));

      try {
        const frameCount = 5;
        const frames: { id: string; clipTime: number; timelineTime: number; formattedTime: string; dataUrl: string }[] = [];
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 160;
        tempCanvas.height = 90;
        const ctx = tempCanvas.getContext('2d');
        const clipDur = Math.max(0.1, clip.endTrim - clip.startTrim);

        if (clip.type === 'slide' && clip.slideContent) {
          if (ctx) {
            drawSlideClip(ctx, clip.slideContent, 160, 90);
            const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.85);
            for (let i = 0; i < frameCount; i++) {
              const ratio = i / (frameCount - 1);
              const targetClipTime = clip.startTrim + clipDur * ratio;
              const targetTimelineTime = offset.start + (offset.duration * ratio);
              frames.push({
                id: `${clip.id}_f${i}`,
                clipTime: targetClipTime,
                timelineTime: targetTimelineTime,
                formattedTime: formatTime(targetTimelineTime),
                dataUrl
              });
            }
          }
          if (!isCancelled && frames.length > 0) {
            setClipFilmstrips(prev => ({
              ...prev,
              [cacheKey]: frames,
              [clip.id]: frames
            }));
          }
          return;
        }

        if (clip.type === 'image') {
          let cachedImg = imagesCacheRef.current.get(clip.id);
          if (!cachedImg && (clip.video?.thumbnail || (clip.video?.blob && clip.video.blob.size > 0))) {
            cachedImg = new Image();
            cachedImg.src = clip.video?.thumbnail || (clip.video?.blob ? URL.createObjectURL(clip.video.blob) : '');
            await new Promise((res) => { cachedImg!.onload = res; cachedImg!.onerror = res; });
            imagesCacheRef.current.set(clip.id, cachedImg);
          }
          if (ctx && cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
            drawImageClip(ctx, cachedImg, 160, 90);
            const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.85);
            for (let i = 0; i < frameCount; i++) {
              const ratio = i / (frameCount - 1);
              const targetClipTime = clip.startTrim + clipDur * ratio;
              const targetTimelineTime = offset.start + (offset.duration * ratio);
              frames.push({
                id: `${clip.id}_f${i}`,
                clipTime: targetClipTime,
                timelineTime: targetTimelineTime,
                formattedTime: formatTime(targetTimelineTime),
                dataUrl
              });
            }
          }
          if (!isCancelled && frames.length > 0) {
            setClipFilmstrips(prev => ({
              ...prev,
              [cacheKey]: frames,
              [clip.id]: frames
            }));
          }
          return;
        }

        if (!clip.video?.blob || clip.video.blob.size === 0) {
          return;
        }

        const blobUrl = URL.createObjectURL(clip.video.blob);
        const tempVideo = document.createElement('video');
        tempVideo.src = blobUrl;
        tempVideo.preload = 'auto';
        tempVideo.muted = true;
        tempVideo.playsInline = true;

        await new Promise<void>((resolve) => {
          tempVideo.onloadeddata = () => resolve();
          tempVideo.onerror = () => resolve();
          setTimeout(() => resolve(), 1200);
        });

        for (let i = 0; i < frameCount; i++) {
          if (isCancelled) break;
          const ratio = i / (frameCount - 1);
          const targetClipTime = clip.startTrim + clipDur * ratio;
          const targetTimelineTime = offset.start + (offset.duration * ratio);

          await new Promise<void>((resolve) => {
            const onSeeked = () => {
              tempVideo.removeEventListener('seeked', onSeeked);
              resolve();
            };
            tempVideo.addEventListener('seeked', onSeeked);
            tempVideo.currentTime = Math.max(0, Math.min(tempVideo.duration || 999, targetClipTime));
            setTimeout(() => {
              tempVideo.removeEventListener('seeked', onSeeked);
              resolve();
            }, 350);
          });

          if (ctx) {
            ctx.drawImage(tempVideo, 0, 0, 160, 90);
            frames.push({
              id: `${clip.id}_f${i}`,
              clipTime: targetClipTime,
              timelineTime: targetTimelineTime,
              formattedTime: formatTime(targetTimelineTime),
              dataUrl: tempCanvas.toDataURL('image/jpeg', 0.75)
            });
          }
        }

        URL.revokeObjectURL(blobUrl);

        if (!isCancelled && frames.length > 0) {
          setClipFilmstrips(prev => ({
            ...prev,
            [cacheKey]: frames,
            [clip.id]: frames
          }));
        }
      } catch (err) {
        console.error('Filmstrip extraction error:', err);
      } finally {
        if (!isCancelled) {
          setGeneratingFilmstrips(prev => ({ ...prev, [clip.id]: false }));
        }
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [project.clips, clipTimelineOffsets]);

  return {
    clipFilmstrips,
    generatingFilmstrips
  };
}
