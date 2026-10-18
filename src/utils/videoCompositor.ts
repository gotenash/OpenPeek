import type { EditorProject, TimelineZoom, TimelineImage } from './compositor/compositorTypes';

export * from './compositor/compositorTypes';
export * from './compositor/titleRenderer';
export * from './compositor/slideRenderer';
export * from './compositor/chapterFormatter';

/**
 * Calculates the total duration of the master timeline taking into account
 * clip trims and overlapping transition durations.
 */
export function calculateTotalDuration(project: EditorProject): number {
  if (!project) return 0;
  const clips = project.clips || [];
  let clipSequentialTotal = 0;
  let maxExplicitClipEnd = 0;
  let hasExplicitStartTime = false;

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    if (!clip) continue;
    const speed = typeof clip.playbackSpeed === 'number' && clip.playbackSpeed > 0 && !isNaN(clip.playbackSpeed)
      ? clip.playbackSpeed
      : 1.0;
    const start = typeof clip.startTrim === 'number' && !isNaN(clip.startTrim) ? Math.max(0, clip.startTrim) : 0;
    const end = typeof clip.endTrim === 'number' && !isNaN(clip.endTrim)
      ? Math.max(start + 0.1, clip.endTrim)
      : (clip.video?.duration && clip.video.duration > 0 ? clip.video.duration : start + 10);
    const clipDuration = Math.max(0.1, (end - start) / speed);

    if (typeof clip.startTime === 'number' && !isNaN(clip.startTime)) {
      hasExplicitStartTime = true;
      const clipEnd = clip.startTime + clipDuration;
      if (clipEnd > maxExplicitClipEnd) maxExplicitClipEnd = clipEnd;
    }

    clipSequentialTotal += clipDuration;

    // Transitions shorten total time when overlapping
    if (i < clips.length - 1 && clip.transitionToNext && clip.transitionToNext !== 'none') {
      const transDuration = typeof clip.transitionDuration === 'number' && !isNaN(clip.transitionDuration)
        ? clip.transitionDuration
        : 1.0;
      const transDur = Math.min(transDuration, clipDuration / 2);
      clipSequentialTotal -= transDur;
    }
  }

  const effectiveClipDur = hasExplicitStartTime ? Math.max(maxExplicitClipEnd, clipSequentialTotal) : clipSequentialTotal;

  // Also account for titles, images, zooms, voiceovers
  let maxOther = 0;
  for (const t of (project.titles || [])) {
    if (!t) continue;
    const end = (typeof t.startTime === 'number' && !isNaN(t.startTime) ? t.startTime : 0) +
                (typeof t.duration === 'number' && !isNaN(t.duration) ? t.duration : 3);
    if (end > maxOther) maxOther = end;
  }
  for (const img of (project.images || [])) {
    if (!img) continue;
    const end = (typeof img.startTime === 'number' && !isNaN(img.startTime) ? img.startTime : 0) +
                (typeof img.duration === 'number' && !isNaN(img.duration) ? img.duration : 5);
    if (end > maxOther) maxOther = end;
  }
  for (const z of (project.zooms || [])) {
    if (!z) continue;
    const end = (typeof z.startTime === 'number' && !isNaN(z.startTime) ? z.startTime : 0) +
                (typeof z.duration === 'number' && !isNaN(z.duration) ? z.duration : 3);
    if (end > maxOther) maxOther = end;
  }
  for (const v of (project.voiceovers || [])) {
    if (!v) continue;
    const end = (typeof v.startTime === 'number' && !isNaN(v.startTime) ? v.startTime : 0) +
                (typeof v.duration === 'number' && !isNaN(v.duration) ? v.duration : 1);
    if (end > maxOther) maxOther = end;
  }

  const finalDur = effectiveClipDur > 0 ? Math.max(effectiveClipDur, maxOther) : maxOther;
  return typeof finalDur === 'number' && !isNaN(finalDur) ? Math.max(0, finalDur) : 0;
}

/**
 * Returns the active timeline zoom if any at currentTime.
 */
export function getActiveTimelineZoom(zooms: TimelineZoom[] | undefined, currentTime: number): TimelineZoom | null {
  if (!zooms || zooms.length === 0) return null;
  return zooms.find(z => currentTime >= z.startTime && currentTime <= z.startTime + z.duration) || null;
}

/**
 * Calculates current zoom progress (0 to 1 with smooth in/out easing) and applies the canvas 2D matrix transformation.
 * Returns true if a zoom transformation was applied (meaning ctx.restore() should be called).
 */
export function applyTimelineZoomTransform(
  ctx: CanvasRenderingContext2D,
  zoom: TimelineZoom | null | undefined,
  currentTime: number,
  canvasW: number,
  canvasH: number
): boolean {
  if (!zoom) return false;
  const elapsed = currentTime - zoom.startTime;
  if (elapsed < 0 || elapsed > zoom.duration) return false;

  const transIn = Math.min(0.35, Math.max(0.1, zoom.duration / 3));
  const transOut = Math.min(0.35, Math.max(0.1, zoom.duration / 3));

  let progress = 1.0;
  if (elapsed < transIn) {
    const t = elapsed / transIn;
    // Smooth sinusoidal ease-in
    progress = 0.5 - 0.5 * Math.cos(Math.PI * t);
  } else if (elapsed > zoom.duration - transOut) {
    const t = (zoom.duration - elapsed) / transOut;
    // Smooth sinusoidal ease-out
    progress = 0.5 - 0.5 * Math.cos(Math.PI * t);
  }

  if (progress <= 0.001) return false;

  const currentScale = 1.0 + (zoom.scale - 1.0) * progress;
  const targetCenterX = zoom.originX * canvasW;
  const targetCenterY = zoom.originY * canvasH;

  const currentCenterX = (canvasW / 2) + (targetCenterX - (canvasW / 2)) * progress;
  const currentCenterY = (canvasH / 2) + (targetCenterY - (canvasH / 2)) * progress;

  ctx.save();
  ctx.translate(canvasW / 2, canvasH / 2);
  ctx.scale(currentScale, currentScale);
  ctx.translate(-currentCenterX, -currentCenterY);
  return true;
}

/**
 * Draws an image/logo overlay with position presets or custom coordinates, scale, opacity, shadow, and rounded corners.
 */
export function drawImageOverlay(
  ctx: CanvasRenderingContext2D,
  overlay: TimelineImage,
  img: HTMLImageElement | null | undefined,
  canvasW: number,
  canvasH: number,
  timeWithinOverlay: number,
  isStaticPreview: boolean = false
): void {
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const naturalW = img.naturalWidth;
  const naturalH = img.naturalHeight;
  const aspectRatio = naturalW / naturalH;

  // Target width relative to canvas
  const targetW = canvasW * overlay.scale;
  const targetH = targetW / aspectRatio;

  const margin = Math.min(canvasW, canvasH) * 0.04; // 4% margin from canvas borders

  let drawX = 0;
  let drawY = 0;

  switch (overlay.position) {
    case 'top-left':
      drawX = margin;
      drawY = margin;
      break;
    case 'top-right':
      drawX = canvasW - targetW - margin;
      drawY = margin;
      break;
    case 'bottom-left':
      drawX = margin;
      drawY = canvasH - targetH - margin;
      break;
    case 'bottom-right':
      drawX = canvasW - targetW - margin;
      drawY = canvasH - targetH - margin;
      break;
    case 'center':
      drawX = (canvasW - targetW) / 2;
      drawY = (canvasH - targetH) / 2;
      break;
    case 'custom':
    default:
      drawX = (overlay.x * canvasW) - (targetW / 2);
      drawY = (overlay.y * canvasH) - (targetH / 2);
      break;
  }

  // Alpha calculation
  let alpha = overlay.opacity ?? 1.0;

  // In static preview mode (paused or scrubbing), always show full configured opacity
  // so the creator can see and position the image immediately!
  if (!isStaticPreview) {
    const isPermanent = overlay.startTime === 0 && overlay.duration >= 999;
    if (!isPermanent) {
      const fadeInDuration = 0.25;
      const fadeOutDuration = 0.25;
      if (timeWithinOverlay >= 0 && timeWithinOverlay < fadeInDuration) {
        alpha *= Math.max(0.15, timeWithinOverlay / fadeInDuration);
      } else if (overlay.duration > 0 && timeWithinOverlay > overlay.duration - fadeOutDuration) {
        alpha *= Math.max(0, (overlay.duration - timeWithinOverlay) / fadeOutDuration);
      }
    }
  }

  ctx.save();
  ctx.globalAlpha = Math.max(0.05, Math.min(1, alpha));

  if (overlay.hasShadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
  }

  const radius = overlay.borderRadius ? (overlay.borderRadius * (canvasW / 1280)) : 0;
  if (radius > 0 && typeof (ctx as any).roundRect === 'function') {
    ctx.beginPath();
    (ctx as any).roundRect(drawX, drawY, targetW, targetH, radius);
    ctx.clip();
  }

  ctx.drawImage(img, drawX, drawY, targetW, targetH);
  ctx.restore();
}






