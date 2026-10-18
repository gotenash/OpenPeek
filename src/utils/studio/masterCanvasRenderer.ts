import { 
  type TimelineClip,
  drawSlideClip,
  drawImageClip,
  drawFastForwardBadge
} from '../videoCompositor';

export interface RenderClipOffset {
  start: number;
  end: number;
  duration: number;
}

export function drawSingleClipToCanvas(
  ctx: CanvasRenderingContext2D,
  clip: TimelineClip,
  time: number,
  offset: RenderClipOffset,
  canvasWidth: number,
  canvasHeight: number,
  videoElMap: Map<string, HTMLVideoElement>,
  imgCacheMap: Map<string, HTMLImageElement>,
  isPlayback: boolean,
  containerEl?: HTMLElement | null,
  onSeekRequest?: (time: number) => void
) {
  const speed = clip.playbackSpeed && clip.playbackSpeed > 0 ? clip.playbackSpeed : 1.0;
  if (clip.type === 'slide' && clip.slideContent) {
    drawSlideClip(ctx, clip.slideContent, canvasWidth, canvasHeight);
  } else if (clip.type === 'image') {
    let imgEl = imgCacheMap.get(clip.id);
    if (!imgEl && (clip.video?.thumbnail || (clip.video?.blob && clip.video.blob.size > 0))) {
      imgEl = new Image();
      imgEl.src = clip.video?.thumbnail || (clip.video?.blob ? URL.createObjectURL(clip.video.blob) : '');
      imgCacheMap.set(clip.id, imgEl);
    }
    if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
      drawImageClip(ctx, imgEl, canvasWidth, canvasHeight);
    }
  } else {
    const videoEl = videoElMap.get(clip.id);
    let frameDrawn = false;
    if (videoEl) {
      const targetClipTime = Math.max(0, Math.min(
        videoEl.duration || 9999,
        ((time - offset.start) * speed) + (clip.startTrim ?? 0)
      ));
      if (isPlayback) {
        if (containerEl && !containerEl.contains(videoEl)) {
          containerEl.appendChild(videoEl);
        }
        videoEl.playbackRate = speed;
        if (videoEl.paused) {
          videoEl.currentTime = targetClipTime;
          videoEl.play().catch(() => {});
        }
      } else {
        if (Math.abs(videoEl.currentTime - targetClipTime) > 0.05) {
          const onSeeked = () => {
            videoEl.removeEventListener('seeked', onSeeked);
            if (onSeekRequest) onSeekRequest(targetClipTime);
          };
          videoEl.addEventListener('seeked', onSeeked, { once: true });
          videoEl.currentTime = targetClipTime;
        }
      }

      if (videoEl.readyState >= 1) {
        ctx.drawImage(videoEl, 0, 0, canvasWidth, canvasHeight);
        if (speed > 1.0) {
          drawFastForwardBadge(ctx, speed, canvasWidth, canvasHeight);
        }
        frameDrawn = true;
      }
    }

    if (!frameDrawn && clip.video?.thumbnail) {
      let thumbImg = imgCacheMap.get(`thumb_${clip.id}`);
      if (!thumbImg) {
        thumbImg = new Image();
        thumbImg.onload = () => {
          if (onSeekRequest) onSeekRequest(time);
        };
        thumbImg.src = clip.video.thumbnail;
        imgCacheMap.set(`thumb_${clip.id}`, thumbImg);
      }
      if (thumbImg && thumbImg.complete && thumbImg.naturalWidth > 0) {
        ctx.drawImage(thumbImg, 0, 0, canvasWidth, canvasHeight);
        if (speed > 1.0) {
          drawFastForwardBadge(ctx, speed, canvasWidth, canvasHeight);
        }
      }
    }
  }
}

export function compositeActiveClipsToCanvas(
  ctx: CanvasRenderingContext2D,
  time: number,
  canvasWidth: number,
  canvasHeight: number,
  clips: TimelineClip[],
  clipTimelineOffsets: Map<string, RenderClipOffset>,
  videoElMap: Map<string, HTMLVideoElement>,
  imgCacheMap: Map<string, HTMLImageElement>,
  isPlayback: boolean,
  containerEl?: HTMLElement | null,
  onSeekRequest?: (time: number) => void
) {
  const active: { clip: TimelineClip; offset: RenderClipOffset }[] = [];
  for (const c of clips) {
    const off = clipTimelineOffsets.get(c.id);
    if (off && time >= off.start && time <= off.end) {
      active.push({ clip: c, offset: off });
    }
  }

  if (isPlayback) {
    videoElMap.forEach((v, id) => {
      const isActive = active.some(a => a.clip.id === id);
      if (!isActive && !v.paused) {
        v.pause();
        v.muted = true;
      }
    });
  }

  if (active.length === 0) return;

  if (active.length === 1) {
    const single = active[0];
    const vEl = videoElMap.get(single.clip.id);
    if (vEl && isPlayback) {
      const cVol = single.clip.volume !== undefined ? single.clip.volume : 1.0;
      vEl.muted = (cVol === 0);
      vEl.volume = Math.max(0, Math.min(1, cVol));
    }
    drawSingleClipToCanvas(ctx, single.clip, time, single.offset, canvasWidth, canvasHeight, videoElMap, imgCacheMap, isPlayback, containerEl, onSeekRequest);
    return;
  }

  // Multiple clips active (overlap between Track 1 and Track 2, or sequential transition)
  active.sort((a, b) => {
    const trackA = a.clip.track ?? 1;
    const trackB = b.clip.track ?? 1;
    if (trackA !== trackB) return trackA - trackB;
    return a.offset.start - b.offset.start;
  });

  const base = active[0];
  const incoming = active[1];

  const overlapStart = Math.max(base.offset.start, incoming.offset.start);
  const overlapEnd = Math.min(base.offset.end, incoming.offset.end);
  const overlapDur = Math.max(0.01, overlapEnd - overlapStart);
  const progress = Math.max(0, Math.min(1, (time - overlapStart) / overlapDur));
  const transType = base.clip.transitionToNext || 'crossfade';

  if (isPlayback) {
    const isMultiTrack = (base.clip.track ?? 1) !== (incoming.clip.track ?? 1);
    const vBase = videoElMap.get(base.clip.id);
    const baseVol = base.clip.volume !== undefined ? base.clip.volume : 1.0;
    if (vBase) {
      vBase.muted = (baseVol === 0);
      vBase.volume = isMultiTrack ? baseVol : Math.max(0, Math.min(1, (1 - progress) * baseVol));
    }
    const vInc = videoElMap.get(incoming.clip.id);
    const incVol = incoming.clip.volume !== undefined ? incoming.clip.volume : 1.0;
    if (vInc) {
      vInc.muted = (incVol === 0);
      vInc.volume = isMultiTrack ? incVol : Math.max(0, Math.min(1, progress * incVol));
    }
  }

  // 1. Draw Base Clip
  ctx.save();
  if (transType === 'fade-black') {
    if (progress < 0.5) {
      ctx.globalAlpha = Math.max(0, 1 - progress * 2);
      drawSingleClipToCanvas(ctx, base.clip, time, base.offset, canvasWidth, canvasHeight, videoElMap, imgCacheMap, isPlayback, containerEl, onSeekRequest);
    } else {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
  } else {
    drawSingleClipToCanvas(ctx, base.clip, time, base.offset, canvasWidth, canvasHeight, videoElMap, imgCacheMap, isPlayback, containerEl, onSeekRequest);
  }
  ctx.restore();

  // 2. Draw Incoming Clip with transition
  ctx.save();
  if (transType === 'crossfade') {
    ctx.globalAlpha = progress;
    drawSingleClipToCanvas(ctx, incoming.clip, time, incoming.offset, canvasWidth, canvasHeight, videoElMap, imgCacheMap, isPlayback, containerEl, onSeekRequest);
  } else if (transType === 'fade-black') {
    if (progress >= 0.5) {
      ctx.globalAlpha = Math.max(0, (progress - 0.5) * 2);
      drawSingleClipToCanvas(ctx, incoming.clip, time, incoming.offset, canvasWidth, canvasHeight, videoElMap, imgCacheMap, isPlayback, containerEl, onSeekRequest);
    }
  } else if (transType === 'slide') {
    const offX = (1.0 - progress) * canvasWidth;
    ctx.translate(offX, 0);
    drawSingleClipToCanvas(ctx, incoming.clip, time, incoming.offset, canvasWidth, canvasHeight, videoElMap, imgCacheMap, isPlayback, containerEl, onSeekRequest);
  } else {
    // 'none' or cutaway
    if (progress >= 0.5) {
      drawSingleClipToCanvas(ctx, incoming.clip, time, incoming.offset, canvasWidth, canvasHeight, videoElMap, imgCacheMap, isPlayback, containerEl, onSeekRequest);
    }
  }
  ctx.restore();
}
