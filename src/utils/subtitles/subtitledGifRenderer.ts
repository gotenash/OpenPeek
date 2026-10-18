import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import type { SubtitleCue, SubtitleOptions } from './subtitleTypes';
import { resolveAccurateBlobDuration } from './whisperService';

/**
 * Burns subtitles permanently into an animated GIF.
 */
export async function renderSubtitledGif(
  videoBlob: Blob,
  cues: SubtitleCue[],
  options: SubtitleOptions,
  drawSubtitlesFn: (
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    cues: SubtitleCue[],
    currentTime: number,
    options: SubtitleOptions
  ) => void,
  gifSettings: { fps?: number; speed?: number; maxColors?: number } = {},
  knownDuration?: number,
  onProgress?: (progress: number) => void,
  abortSignal?: AbortSignal
): Promise<Blob> {
  const { fps = 12, speed = 1.0, maxColors = 256 } = gifSettings;
  const videoUrl = URL.createObjectURL(videoBlob);
  const video = document.createElement('video');
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;

  try {
    await new Promise<void>((resolve) => {
      if (video.readyState >= 1 && video.videoWidth > 0) {
        resolve();
        return;
      }
      const timeout = setTimeout(resolve, 3000);
      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        resolve();
      };
    });

    const origW = video.videoWidth || 1280;
    const origH = video.videoHeight || 720;
    const scale = Math.min(1.0, 680 / origW);
    const targetW = Math.round((origW * scale) / 2) * 2;
    const targetH = Math.round((origH * scale) / 2) * 2;

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error("Contexte Canvas indisponible");

    const duration = await resolveAccurateBlobDuration(videoBlob, knownDuration);
    const frameInterval = 1 / fps;
    const timeStep = frameInterval * speed;
    const timestamps: number[] = [];

    for (let t = 0; t < duration; t += timeStep) {
      timestamps.push(t);
    }

    const totalFrames = timestamps.length;
    const gif = GIFEncoder();
    const frameDelayMs = Math.round(frameInterval * 1000);

    const seekVideo = (time: number): Promise<void> => {
      return new Promise((resolve) => {
        if (Math.abs(video.currentTime - time) < 0.02 && video.readyState >= 2) {
          resolve();
          return;
        }

        let isDone = false;
        const done = () => {
          if (isDone) return;
          isDone = true;
          clearTimeout(timeoutId);
          video.removeEventListener('seeked', onSeeked);
          setTimeout(resolve, 25);
        };

        const onSeeked = () => done();
        const timeoutId = window.setTimeout(done, 300);

        video.addEventListener('seeked', onSeeked, { once: true });

        try {
          video.currentTime = time;
        } catch (err) {
          console.debug('[Subtitles] Frame seek error during GIF export:', err);
          done();
        }
      });
    };

    for (let i = 0; i < totalFrames; i++) {
      if (abortSignal?.aborted) {
        throw new DOMException("Génération GIF annulée", "AbortError");
      }

      const timestamp = timestamps[i];
      await seekVideo(timestamp);

      ctx.drawImage(video, 0, 0, targetW, targetH);
      drawSubtitlesFn(ctx, targetW, targetH, cues, timestamp, options);

      const imgData = ctx.getImageData(0, 0, targetW, targetH);
      const rgbaData = imgData.data;

      const palette = quantize(rgbaData, maxColors, { format: 'rgb565' });
      const indexedPixels = applyPalette(rgbaData, palette, 'rgb565');

      gif.writeFrame(indexedPixels, targetW, targetH, {
        palette,
        delay: frameDelayMs,
        repeat: 0,
        dispose: 2
      });

      const pct = Math.round(((i + 1) / totalFrames) * 100);
      onProgress?.(pct);

      if (i % 3 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    gif.finish();
    const buffer = gif.bytes();
    return new Blob([buffer as any], { type: 'image/gif' });
  } finally {
    URL.revokeObjectURL(videoUrl);
  }
}
