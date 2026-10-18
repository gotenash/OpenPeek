import { useEffect } from 'react';
import type { TimelineProject } from '../../utils/videoCompositor';

export interface UseStudioMediaPreloaderProps {
  project: TimelineProject;
  videoElementsRef: React.MutableRefObject<Map<string, HTMLVideoElement>>;
  imagesCacheRef: React.MutableRefObject<Map<string, HTMLImageElement>>;
  bgMusicAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
  voiceoverAudiosRef: React.MutableRefObject<Map<string, HTMLAudioElement>>;
  exportContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  isPlayingRef: React.MutableRefObject<boolean>;
  currentTimeRef: React.MutableRefObject<number>;
  renderStaticPreviewAt: (time: number) => void;
}

export function useStudioMediaPreloader({
  project,
  videoElementsRef,
  imagesCacheRef,
  bgMusicAudioRef,
  voiceoverAudiosRef,
  exportContainerRef,
  isPlayingRef,
  currentTimeRef,
  renderStaticPreviewAt
}: UseStudioMediaPreloaderProps) {
  // Pre-load video DOM elements and image assets for clips in the timeline
  useEffect(() => {
    (project.clips || []).forEach((clip) => {
      if (clip.type === 'slide') {
        if (clip.slideContent?.bgImageUrl) {
          const cacheKey = `slide_bg_${clip.id}`;
          if (!imagesCacheRef.current.has(cacheKey)) {
            const img = new Image();
            img.src = clip.slideContent.bgImageUrl;
            img.onload = () => {
              if (clip.slideContent) clip.slideContent.bgImageEl = img;
              if (!isPlayingRef.current) renderStaticPreviewAt(currentTimeRef.current);
            };
            imagesCacheRef.current.set(cacheKey, img);
          } else {
            const img = imagesCacheRef.current.get(cacheKey);
            if (img && clip.slideContent) clip.slideContent.bgImageEl = img;
          }
        }
        return;
      }

      if (clip.type === 'image') {
        if (!imagesCacheRef.current.has(clip.id)) {
          const img = new Image();
          if (clip.video?.thumbnail) {
            img.src = clip.video.thumbnail;
          } else if (clip.video?.blob && clip.video.blob.size > 0) {
            img.src = URL.createObjectURL(clip.video.blob);
          }
          img.onload = () => {
            if (!isPlayingRef.current) renderStaticPreviewAt(currentTimeRef.current);
          };
          imagesCacheRef.current.set(clip.id, img);
        }
        return;
      }

      // Normal video element - preload & attach render listeners
      if (!videoElementsRef.current.has(clip.id)) {
        const v = document.createElement('video');
        v.muted = true;
        v.playsInline = true;
        v.preload = 'auto';
        if (clip.video?.blob && clip.video.blob.size > 0) {
          v.src = URL.createObjectURL(clip.video.blob);
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
        videoElementsRef.current.set(clip.id, v);
      }

      // Also pre-cache thumbnail as instant fallback so canvas never shows black
      if (clip.video?.thumbnail && !imagesCacheRef.current.has(`thumb_${clip.id}`)) {
        const tImg = new Image();
        tImg.onload = () => {
          if (!isPlayingRef.current) renderStaticPreviewAt(currentTimeRef.current);
        };
        tImg.src = clip.video.thumbnail;
        imagesCacheRef.current.set(`thumb_${clip.id}`, tImg);
      }
    });

    // Cleanup unused video elements
    const activeVideoIds = new Set((project.clips || []).filter(c => !c.type || c.type === 'video').map((c) => c.id));
    for (const [id, el] of videoElementsRef.current.entries()) {
      if (!activeVideoIds.has(id)) {
        if (el.parentNode) el.parentNode.removeChild(el);
        URL.revokeObjectURL(el.src);
        videoElementsRef.current.delete(id);
      }
    }
  }, [project.clips, renderStaticPreviewAt]);

  // Pre-load HTMLImageElement cache for active timeline images
  useEffect(() => {
    if (!project.images) return;
    (project.images || []).forEach((img) => {
      let cached = imagesCacheRef.current.get(img.id);
      if ((!cached || cached.src !== img.dataUrl) && img.dataUrl) {
        const imageEl = new Image();
        imageEl.onload = () => {
          if (!isPlayingRef.current) {
            renderStaticPreviewAt(currentTimeRef.current);
          }
        };
        imageEl.src = img.dataUrl;
        imagesCacheRef.current.set(img.id, imageEl);
      }
    });

    const activeIds = new Set((project.images || []).map(i => i.id));
    for (const [id] of imagesCacheRef.current.entries()) {
      if (!activeIds.has(id)) {
        imagesCacheRef.current.delete(id);
      }
    }
  }, [project.images, renderStaticPreviewAt]);

  // Sync background music audio element with project
  useEffect(() => {
    if (project.backgroundMusic && project.backgroundMusic.blob) {
      if (!bgMusicAudioRef.current) {
        bgMusicAudioRef.current = document.createElement('audio');
        if (exportContainerRef.current) {
          exportContainerRef.current.appendChild(bgMusicAudioRef.current);
        }
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

  // Sync voiceover audio elements with project
  useEffect(() => {
    const activeVoiceoverIds = new Set((project.voiceovers || []).map(v => v.id));
    for (const vo of (project.voiceovers || [])) {
      if (!vo.blob || vo.blob.size === 0) continue;
      if (!voiceoverAudiosRef.current.has(vo.id)) {
        const audio = document.createElement('audio');
        audio.preload = 'auto';
        audio.src = URL.createObjectURL(vo.blob);
        audio.volume = vo.volume ?? 1.0;
        if (exportContainerRef.current) {
          exportContainerRef.current.appendChild(audio);
        }
        voiceoverAudiosRef.current.set(vo.id, audio);
      } else {
        const audio = voiceoverAudiosRef.current.get(vo.id);
        if (audio) {
          audio.volume = vo.volume ?? 1.0;
        }
      }
    }
    for (const [id, audio] of voiceoverAudiosRef.current.entries()) {
      if (!activeVoiceoverIds.has(id)) {
        audio.pause();
        if (audio.parentNode) audio.parentNode.removeChild(audio);
        URL.revokeObjectURL(audio.src);
        voiceoverAudiosRef.current.delete(id);
      }
    }
  }, [project.voiceovers]);
}
