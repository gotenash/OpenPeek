import type { SubtitleCue, SubtitleOptions } from './subtitles/subtitleTypes';
import { renderSubtitledVideo as internalRenderVideo } from './subtitles/subtitledVideoRenderer';
import { renderSubtitledGif as internalRenderGif } from './subtitles/subtitledGifRenderer';

// Re-export all types and presets
export * from './subtitles/subtitleTypes';
// Re-export parsing & formatting utilities
export * from './subtitles/subtitleParsers';
// Re-export whisper & audio utilities
export * from './subtitles/whisperService';

/**
 * Draws active subtitle cues onto a canvas context with full styling & word highlights.
 */
export function drawSubtitles(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  cues: SubtitleCue[],
  currentTime: number,
  options: SubtitleOptions
) {
  const activeCue = cues.find(
    (cue) => currentTime >= cue.startTime && currentTime <= cue.endTime
  );

  if (!activeCue || !activeCue.text.trim()) return;

  const scale = canvasHeight / 1080;
  let scaledFontSize = Math.max(16, Math.round(options.fontSize * scale));

  ctx.save();

  let posY = canvasHeight * 0.88;
  if (options.position === 'middle') {
    posY = canvasHeight * 0.5;
  } else if (options.position === 'top') {
    posY = canvasHeight * 0.12;
  }

  const posX = canvasWidth / 2;

  let text = activeCue.text;
  if (options.textTransform === 'uppercase') {
    text = text.toUpperCase();
  }

  const maxAllowedWidth = canvasWidth * 0.86;

  ctx.font = `bold ${scaledFontSize}px 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
  let textMetrics = ctx.measureText(text);
  let textWidth = textMetrics.width;

  // If text width exceeds 86% of the screen width, scale font size down proportionally
  if (textWidth > maxAllowedWidth) {
    const scaleRatio = maxAllowedWidth / textWidth;
    scaledFontSize = Math.max(14, Math.floor(scaledFontSize * scaleRatio));
    ctx.font = `bold ${scaledFontSize}px 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    textMetrics = ctx.measureText(text);
    textWidth = textMetrics.width;
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const paddingX = scaledFontSize * 0.7;
  const boxWidth = textWidth + paddingX * 2;
  const boxHeight = scaledFontSize * 1.5;

  if (options.backgroundColor && options.backgroundColor !== 'transparent') {
    ctx.fillStyle = options.backgroundColor;
    const cornerRadius = scaledFontSize * 0.35;
    const boxX = posX - boxWidth / 2;
    const boxY = posY - boxHeight / 2;

    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, cornerRadius);
    ctx.fill();
  }

  if (options.style === 'tiktok' || options.style === 'karaoke') {
    const words = text.split(' ');
    if (words.length > 1) {
      const cueDuration = Math.max(0.1, activeCue.endTime - activeCue.startTime);
      const progress = Math.max(0, Math.min(1, (currentTime - activeCue.startTime) / cueDuration));
      const activeWordIndex = Math.min(words.length - 1, Math.floor(progress * words.length));

      // Calculate progress of the active word (0.0 -> 1.0)
      const wordSlotDuration = cueDuration / words.length;
      const wordStartTime = activeCue.startTime + activeWordIndex * wordSlotDuration;
      const wordProgress = Math.max(0, Math.min(1, (currentTime - wordStartTime) / Math.max(0.01, wordSlotDuration)));

      const animType = options.wordAnimation || (options.style === 'tiktok' ? 'pop' : (options.style === 'karaoke' ? 'zoom' : 'none'));

      let currentX = posX - textWidth / 2;
      for (let i = 0; i < words.length; i++) {
        const word = words[i] + (i < words.length - 1 ? ' ' : '');
        const wordWidth = ctx.measureText(word).width;
        const isActive = i === activeWordIndex;

        let scale = 1.0;
        let yOffset = 0;

        if (isActive) {
          if (animType === 'pop') {
            // Elastic pop scale: 1.0 -> 1.3 -> 1.0
            scale = 1.0 + 0.28 * Math.sin(wordProgress * Math.PI);
            yOffset = -0.15 * scaledFontSize * Math.sin(wordProgress * Math.PI);
          } else if (animType === 'bounce') {
            // Vertical bounce: moves up and settles
            scale = 1.05 + 0.12 * Math.sin(wordProgress * Math.PI);
            yOffset = -0.32 * scaledFontSize * Math.sin(wordProgress * Math.PI);
          } else if (animType === 'zoom') {
            // Static punchy zoom
            scale = 1.16;
            yOffset = -0.08 * scaledFontSize;
          }
        }

        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        const wordCenterX = currentX + wordWidth / 2;
        const wordCenterY = posY + yOffset;

        if (scale !== 1.0 || yOffset !== 0) {
          ctx.translate(wordCenterX, wordCenterY);
          ctx.scale(scale, scale);
          ctx.translate(-wordCenterX, -wordCenterY);
        }

        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(4, scaledFontSize * 0.18);
        ctx.strokeStyle = '#000000';
        ctx.strokeText(word, currentX, posY + yOffset);

        if (isActive) {
          ctx.fillStyle = options.highlightColor;
          if (options.style === 'karaoke') {
            ctx.shadowColor = options.highlightColor;
            ctx.shadowBlur = scaledFontSize * 0.6;
          }
        } else {
          ctx.fillStyle = options.primaryColor;
        }
        ctx.fillText(word, currentX, posY + yOffset);

        ctx.restore();
        currentX += wordWidth;
      }
    } else {
      let scale = 1.0;
      let yOffset = 0;
      const animType = options.wordAnimation || 'pop';
      const cueDuration = Math.max(0.1, activeCue.endTime - activeCue.startTime);
      const cueProgress = Math.max(0, Math.min(1, (currentTime - activeCue.startTime) / cueDuration));

      if (animType === 'pop') {
        scale = 1.0 + 0.25 * Math.sin(cueProgress * Math.PI);
        yOffset = -0.12 * scaledFontSize * Math.sin(cueProgress * Math.PI);
      } else if (animType === 'bounce') {
        scale = 1.05 + 0.1 * Math.sin(cueProgress * Math.PI);
        yOffset = -0.28 * scaledFontSize * Math.sin(cueProgress * Math.PI);
      } else if (animType === 'zoom') {
        scale = 1.15;
      }

      ctx.save();
      const textCenterX = posX;
      const textCenterY = posY + yOffset;

      if (scale !== 1.0 || yOffset !== 0) {
        ctx.translate(textCenterX, textCenterY);
        ctx.scale(scale, scale);
        ctx.translate(-textCenterX, -textCenterY);
      }

      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(4, scaledFontSize * 0.18);
      ctx.strokeStyle = '#000000';
      ctx.strokeText(text, posX, posY + yOffset);

      ctx.fillStyle = options.highlightColor;
      ctx.fillText(text, posX, posY + yOffset);
      ctx.restore();
    }
  } else if (options.style === 'classic') {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.lineWidth = Math.max(3, scaledFontSize * 0.12);
    ctx.strokeStyle = '#000000';
    ctx.strokeText(text, posX, posY);

    ctx.fillStyle = options.primaryColor;
    ctx.fillText(text, posX, posY);
  } else {
    ctx.fillStyle = options.primaryColor;
    ctx.fillText(text, posX, posY);
  }

  ctx.restore();
}

/**
 * Burns subtitles permanently into a video Blob with complete sound synchronization.
 */
export async function renderSubtitledVideo(
  videoBlob: Blob,
  cues: SubtitleCue[],
  options: SubtitleOptions,
  knownDuration?: number,
  onProgress?: (progress: number) => void,
  abortSignal?: AbortSignal
): Promise<Blob> {
  return internalRenderVideo(videoBlob, cues, options, drawSubtitles, knownDuration, onProgress, abortSignal);
}

/**
 * Burns subtitles permanently into an animated GIF.
 */
export async function renderSubtitledGif(
  videoBlob: Blob,
  cues: SubtitleCue[],
  options: SubtitleOptions,
  gifSettings: { fps?: number; speed?: number; maxColors?: number } = {},
  knownDuration?: number,
  onProgress?: (progress: number) => void,
  abortSignal?: AbortSignal
): Promise<Blob> {
  return internalRenderGif(videoBlob, cues, options, drawSubtitles, gifSettings, knownDuration, onProgress, abortSignal);
}
