import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { EditorProject } from '../../utils/videoCompositor';
import {
  drawTitleOverlay,
  drawImageOverlay,
  getActiveTimelineZoom,
  applyTimelineZoomTransform
} from '../../utils/videoCompositor';
import { compositeActiveClipsToCanvas } from '../../utils/studio/masterCanvasRenderer';

export interface UseStudioPlaybackProps {
  project: EditorProject;
  totalDuration: number;
  clipTimelineOffsets: Map<string, any>;
  previewCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  videoElementsRef: React.MutableRefObject<Map<string, HTMLVideoElement>>;
  imagesCacheRef: React.MutableRefObject<Map<string, HTMLImageElement>>;
  voiceoverAudiosRef: React.MutableRefObject<Map<string, HTMLAudioElement>>;
  bgMusicAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
  animationFrameRef: React.MutableRefObject<number>;
  isRecordingVoiceover: boolean;
  stopVoiceoverRecording: () => void;
}

export function useStudioPlayback({
  project,
  totalDuration,
  clipTimelineOffsets,
  previewCanvasRef,
  videoElementsRef,
  imagesCacheRef,
  voiceoverAudiosRef,
  bgMusicAudioRef,
  animationFrameRef,
  isRecordingVoiceover,
  stopVoiceoverRecording
}: UseStudioPlaybackProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const currentTimeRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef<boolean>(false);

  const renderStaticPreviewAt = useCallback((time: number) => {
    try {
      const canvas = previewCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const clips = project.clips || [];

      if (clips.length === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = '15px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Ajoutez des clips depuis le chutier pour commencer le montage', canvas.width / 2, canvas.height / 2);

        // Overlay active titles if any
        for (const title of (project.titles || [])) {
          if (time >= title.startTime && time <= title.startTime + title.duration) {
            drawTitleOverlay(ctx, title, canvas.width, canvas.height, time - title.startTime);
          }
        }
        // Overlay active images if any
        if (project.images) {
          for (const imgOverlay of (project.images || [])) {
            if (time >= imgOverlay.startTime && time <= imgOverlay.startTime + imgOverlay.duration) {
              const cachedImg = imagesCacheRef.current.get(imgOverlay.id);
              if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
                drawImageOverlay(ctx, imgOverlay, cachedImg, canvas.width, canvas.height, time - imgOverlay.startTime, true);
              }
            }
          }
        }
        return;
      }

      // Apply Timeline Zoom Transform if active at preview time
      const activeZoom = getActiveTimelineZoom(project.zooms || [], time);
      const isZoomed = applyTimelineZoomTransform(ctx, activeZoom, time, canvas.width, canvas.height);

      // Composite clips with transition support!
      compositeActiveClipsToCanvas(
        ctx,
        time,
        canvas.width,
        canvas.height,
        project.clips || [],
        clipTimelineOffsets as any,
        videoElementsRef.current,
        imagesCacheRef.current,
        false
      );

      // Restore zoom transform before drawing text titles
      if (isZoomed) {
        ctx.restore();
      }

      for (const title of (project.titles || [])) {
        if (time >= title.startTime && time <= title.startTime + title.duration) {
          drawTitleOverlay(ctx, title, canvas.width, canvas.height, time - title.startTime);
        }
      }

      if (project.images) {
        for (const imgOverlay of (project.images || [])) {
          if (time >= imgOverlay.startTime && time <= imgOverlay.startTime + imgOverlay.duration) {
            let cachedImg = imagesCacheRef.current.get(imgOverlay.id);
            if (!cachedImg && imgOverlay.dataUrl) {
              cachedImg = new Image();
              cachedImg.onload = () => {
                if (!isPlayingRef.current) renderStaticPreviewAt(currentTimeRef.current);
              };
              cachedImg.src = imgOverlay.dataUrl;
              imagesCacheRef.current.set(imgOverlay.id, cachedImg);
            } else if (cachedImg && (!cachedImg.complete || cachedImg.naturalWidth === 0)) {
              cachedImg.onload = () => {
                if (!isPlayingRef.current) renderStaticPreviewAt(currentTimeRef.current);
              };
            }
            if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
              drawImageOverlay(ctx, imgOverlay, cachedImg, canvas.width, canvas.height, time - imgOverlay.startTime, true);
            }
          }
        }
      }
    } catch (err) {
      console.warn("renderStaticPreviewAt error:", err);
    }
  }, [project, previewCanvasRef, videoElementsRef, imagesCacheRef]);

  const togglePlay = useCallback(() => {
    if (isRecordingVoiceover) {
      stopVoiceoverRecording();
      return;
    }
    if (isPlayingRef.current) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
      videoElementsRef.current.forEach((v) => {
        v.pause();
        v.muted = true;
      });
      voiceoverAudiosRef.current.forEach((a) => a.pause());
      if (bgMusicAudioRef.current) bgMusicAudioRef.current.pause();
      renderStaticPreviewAt(currentTimeRef.current);
    } else {
      if (currentTimeRef.current >= totalDuration) {
        currentTimeRef.current = 0;
        setCurrentTime(0);
      }
      isPlayingRef.current = true;
      setIsPlaying(true);
      if (bgMusicAudioRef.current && project.backgroundMusic) {
        bgMusicAudioRef.current.play().catch(() => {});
      }
    }
  }, [isRecordingVoiceover, stopVoiceoverRecording, totalDuration, project.backgroundMusic, renderStaticPreviewAt, videoElementsRef, voiceoverAudiosRef, bgMusicAudioRef, animationFrameRef]);

  const handleSeek = useCallback((time: number) => {
    if (isRecordingVoiceover) {
      stopVoiceoverRecording();
    }
    currentTimeRef.current = time;
    setCurrentTime(time);
    voiceoverAudiosRef.current.forEach((a) => a.pause());
    if (!isPlayingRef.current) {
      videoElementsRef.current.forEach((v) => {
        v.pause();
        v.muted = true;
      });
      renderStaticPreviewAt(time);
    }
    if (bgMusicAudioRef.current && project.backgroundMusic) {
      bgMusicAudioRef.current.currentTime = time % (bgMusicAudioRef.current.duration || 9999);
    }
  }, [isRecordingVoiceover, stopVoiceoverRecording, project.backgroundMusic, renderStaticPreviewAt, videoElementsRef, voiceoverAudiosRef, bgMusicAudioRef]);

  // Live Canvas Rendering Loop
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!isPlaying) {
      renderStaticPreviewAt(currentTimeRef.current);
      return;
    }

    let lastTime = performance.now();

    const playbackLoop = () => {
      if (!isPlayingRef.current) return;

      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      let curTime = currentTimeRef.current + dt;
      if (curTime >= totalDuration) {
        curTime = totalDuration;
        videoElementsRef.current.forEach((v) => {
          v.pause();
          v.muted = true;
        });
        if (bgMusicAudioRef.current) bgMusicAudioRef.current.pause();
        voiceoverAudiosRef.current.forEach(a => a.pause());
        if (isRecordingVoiceover) {
          stopVoiceoverRecording();
        }
        isPlayingRef.current = false;
        setIsPlaying(false);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = 0;
        }
        currentTimeRef.current = curTime;
        setCurrentTime(curTime);
        renderStaticPreviewAt(curTime);
        return;
      }

      currentTimeRef.current = curTime;
      setCurrentTime(curTime);

      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Background music volume & intelligent ducking
      if (bgMusicAudioRef.current && project.backgroundMusic) {
        const baseVol = project.backgroundMusic.volume ?? 0.15;
        const hasActiveClip = (project.clips || []).length > 0;
        const hasActiveVoiceover = (project.voiceovers || []).some(
          vo => curTime >= vo.startTime && curTime <= vo.startTime + vo.duration
        );
        const targetVol = (hasActiveClip || hasActiveVoiceover) ? baseVol * (project.backgroundMusic.autoDucking !== false ? 0.2 : 1.0) : baseVol;
        bgMusicAudioRef.current.volume = Math.max(0, Math.min(1, targetVol));
      }

      // Apply Timeline Zoom Transform if active at curTime
      const activeZoom = getActiveTimelineZoom(project.zooms || [], curTime);
      const isZoomed = applyTimelineZoomTransform(ctx, activeZoom, curTime, canvas.width, canvas.height);

      // Composite clips with transition support!
      compositeActiveClipsToCanvas(
        ctx,
        curTime,
        canvas.width,
        canvas.height,
        project.clips || [],
        clipTimelineOffsets as any,
        videoElementsRef.current,
        imagesCacheRef.current,
        true
      );

      // Restore zoom transform before drawing text titles
      if (isZoomed) {
        ctx.restore();
      }

      // Draw titles on top of video clips
      for (const title of (project.titles || [])) {
        if (curTime >= title.startTime && curTime <= title.startTime + title.duration) {
          drawTitleOverlay(ctx, title, canvas.width, canvas.height, curTime - title.startTime);
        }
      }

      // Draw active overlay images
      if (project.images) {
        for (const imgOverlay of (project.images || [])) {
          if (curTime >= imgOverlay.startTime && curTime <= imgOverlay.startTime + imgOverlay.duration) {
            const cachedImg = imagesCacheRef.current.get(imgOverlay.id);
            if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
              drawImageOverlay(ctx, imgOverlay, cachedImg, canvas.width, canvas.height, curTime - imgOverlay.startTime, true);
            }
          }
        }
      }

      // Voiceover playback sync
      for (const vo of (project.voiceovers || [])) {
        const voAudio = voiceoverAudiosRef.current.get(vo.id);
        if (voAudio) {
          const voEnd = vo.startTime + vo.duration;
          if (curTime >= vo.startTime && curTime <= voEnd) {
            const targetAudioTime = curTime - vo.startTime;
            if (voAudio.paused) {
              voAudio.currentTime = Math.max(0, targetAudioTime);
              voAudio.play().catch(() => {});
            } else if (Math.abs(voAudio.currentTime - targetAudioTime) > 0.3) {
              voAudio.currentTime = Math.max(0, targetAudioTime);
            }
          } else {
            if (!voAudio.paused) {
              voAudio.pause();
            }
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(playbackLoop);
    };

    animationFrameRef.current = requestAnimationFrame(playbackLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
    };
  }, [
    isPlaying,
    totalDuration,
    project,
    isRecordingVoiceover,
    stopVoiceoverRecording,
    renderStaticPreviewAt,
    previewCanvasRef,
    videoElementsRef,
    imagesCacheRef,
    voiceoverAudiosRef,
    bgMusicAudioRef,
    animationFrameRef
  ]);

  return {
    currentTime,
    currentTimeRef,
    setCurrentTime,
    isPlaying,
    isPlayingRef,
    setIsPlaying,
    togglePlay,
    handleSeek,
    renderStaticPreviewAt
  };
}
