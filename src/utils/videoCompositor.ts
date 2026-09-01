import type { SavedVideo } from './db';

export type TransitionType = 'none' | 'crossfade' | 'fade-black' | 'slide';
export type TitleStyle = 'intro' | 'lowerthird' | 'outro';

export interface TimelineClip {
  id: string;
  video: SavedVideo;
  startTrim: number; // in seconds from original video start
  endTrim: number;   // in seconds from original video start
  transitionToNext: TransitionType;
  transitionDuration: number; // e.g. 1.0s
}

export interface TimelineTitle {
  id: string;
  text: string;
  subtitle?: string;
  startTime: number; // position on master timeline in seconds
  duration: number;  // duration on master timeline in seconds
  style: TitleStyle;
  textColor: string;
  bgColor: string;
  fontSize: number;
}

export interface EditorProject {
  clips: TimelineClip[];
  titles: TimelineTitle[];
}

/**
 * Calculates the total duration of the master timeline taking into account
 * clip trims and overlapping transition durations.
 */
export function calculateTotalDuration(project: EditorProject): number {
  if (project.clips.length === 0) return 0;

  let total = 0;
  for (let i = 0; i < project.clips.length; i++) {
    const clip = project.clips[i];
    const clipDuration = Math.max(0.1, clip.endTrim - clip.startTrim);
    total += clipDuration;

    // Transitions shorten total time when overlapping
    if (i < project.clips.length - 1 && clip.transitionToNext !== 'none') {
      const transDur = Math.min(clip.transitionDuration, clipDuration / 2);
      total -= transDur;
    }
  }

  return Math.max(0, total);
}

/**
 * Renders text overlay for a given timeline timestamp onto a 2D Canvas.
 */
export function drawTitleOverlay(
  ctx: CanvasRenderingContext2D,
  title: TimelineTitle,
  canvasW: number,
  canvasH: number,
  timeWithinTitle: number
) {
  const progress = timeWithinTitle / title.duration;
  if (progress < 0 || progress > 1) return;

  // Smooth fade-in and fade-out alpha
  let alpha = 1.0;
  if (timeWithinTitle < 0.4) {
    alpha = timeWithinTitle / 0.4;
  } else if (title.duration - timeWithinTitle < 0.4) {
    alpha = Math.max(0, (title.duration - timeWithinTitle) / 0.4);
  }

  ctx.save();
  ctx.globalAlpha = alpha;

  if (title.style === 'intro' || title.style === 'outro') {
    // Full screen card with glassmorphism gradient
    ctx.fillStyle = title.bgColor || 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = title.textColor || '#ffffff';
    ctx.font = `bold ${title.fontSize * (canvasW / 1280)}px "Outfit", sans-serif`;
    
    // Shadow glow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 16;
    ctx.fillText(title.text, canvasW / 2, canvasH / 2 - (title.subtitle ? 24 : 0));

    if (title.subtitle) {
      ctx.font = `normal ${(title.fontSize * 0.5) * (canvasW / 1280)}px "Inter", sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillText(title.subtitle, canvasW / 2, canvasH / 2 + 36);
    }
  } else if (title.style === 'lowerthird') {
    // Elegant lower third banner at the bottom
    const bannerH = canvasH * 0.16;
    const bannerY = canvasH * 0.78;
    const bannerX = canvasW * 0.05;
    const bannerW = canvasW * 0.9;

    ctx.fillStyle = title.bgColor || 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 12);
    ctx.fill();

    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = title.textColor || '#ffffff';
    ctx.font = `bold ${title.fontSize * 0.75 * (canvasW / 1280)}px "Outfit", sans-serif`;
    ctx.fillText(title.text, bannerX + 24, bannerY + bannerH * 0.38);

    if (title.subtitle) {
      ctx.font = `normal ${(title.fontSize * 0.45) * (canvasW / 1280)}px "Inter", sans-serif`;
      ctx.fillStyle = '#c084fc';
      ctx.fillText(title.subtitle, bannerX + 24, bannerY + bannerH * 0.72);
    }
  }

  ctx.restore();
}
