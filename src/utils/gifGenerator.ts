import { GIFEncoder, quantize, applyPalette } from 'gifenc';

export interface GifOptions {
  startTime?: number;       // In seconds (default 0)
  endTime?: number;         // In seconds (default video duration)
  fps?: number;             // Frames per second (default 12)
  width?: number;           // Target width in px (default 640)
  height?: number;          // Target height in px (auto-calculated if omitted)
  speed?: number;           // Playback speed multiplier (default 1.0)
  maxColors?: number;       // 64, 128, 256 (default 256)
  loop?: number;            // 0 = infinite loop (default 0)
  palettePerFrame?: boolean; // If true, calculates palette per frame (better colors, slightly larger)
}

export interface GifProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  statusText: string;
}

export interface GifResult {
  blob: Blob;
  url: string;
  size: number;
  width: number;
  height: number;
  duration: number;
  totalFrames: number;
}

export type GifPresetKey = 'discord' | 'balanced' | 'hd' | 'compact';

export interface GifPreset {
  key: GifPresetKey;
  label: string;
  description: string;
  width: number;
  fps: number;
  maxColors: number;
  speed: number;
}

export const GIF_PRESETS: Record<GifPresetKey, GifPreset> = {
  discord: {
    key: 'discord',
    label: '⚡ Léger (Discord / Slack)',
    description: 'Fichier très compact (<5 Mo), idéal pour messageries et bug reports.',
    width: 480,
    fps: 10,
    maxColors: 128,
    speed: 1.0
  },
  balanced: {
    key: 'balanced',
    label: '✨ Équilibré (Web & Docs)',
    description: 'Excellent équilibre entre fluidité, lisibilité et taille de fichier.',
    width: 640,
    fps: 14,
    maxColors: 256,
    speed: 1.0
  },
  hd: {
    key: 'hd',
    label: '🎬 Haute Qualité (Showcase)',
    description: 'Rendu haute fidélité pour démonstrations et présentations produits.',
    width: 800,
    fps: 20,
    maxColors: 256,
    speed: 1.0
  },
  compact: {
    key: 'compact',
    label: '🐇 Rapide (Accéléré x1.5)',
    description: 'Format condensé pour survoler un tutoriel ou un parcours utilisateur.',
    width: 540,
    fps: 12,
    maxColors: 192,
    speed: 1.5
  }
};

/**
 * Generates an animated GIF from a Video Blob or Media Source with progress callbacks.
 */
export async function generateGifFromVideo(
  videoSource: Blob | string,
  options: GifOptions = {},
  onProgress?: (progress: GifProgress) => void,
  abortSignal?: AbortSignal
): Promise<GifResult> {
  const {
    fps = 12,
    speed = 1.0,
    maxColors = 256,
    loop = 0
  } = options;

  // Resolve source URL
  const videoUrl = typeof videoSource === 'string' ? videoSource : URL.createObjectURL(videoSource);
  const shouldRevoke = typeof videoSource !== 'string';

  const video = document.createElement('video');
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  try {
    // 1. Wait for video metadata with readyState check & fallback timeout
    await new Promise<void>((resolve) => {
      if (video.readyState >= 1 && video.videoWidth > 0) {
        resolve();
        return;
      }
      const timeout = setTimeout(() => {
        resolve();
      }, 2000);

      const onDone = () => {
        clearTimeout(timeout);
        video.removeEventListener('loadedmetadata', onDone);
        video.removeEventListener('loadeddata', onDone);
        video.removeEventListener('canplay', onDone);
        resolve();
      };

      video.addEventListener('loadedmetadata', onDone);
      video.addEventListener('loadeddata', onDone);
      video.addEventListener('canplay', onDone);
    });

    const videoDuration = isFinite(video.duration) && video.duration > 0 ? video.duration : 10;
    const start = Math.max(0, Math.min(options.startTime ?? 0, videoDuration));
    const end = Math.max(start + 0.1, Math.min(options.endTime ?? videoDuration, videoDuration));
    const clipDuration = end - start;

    // Calculate dimensions
    const originalWidth = video.videoWidth || 1280;
    const originalHeight = video.videoHeight || 720;
    const aspectRatio = originalHeight / originalWidth;

    let targetWidth = options.width || 640;
    // ensure even dimensions for video & gif codecs
    targetWidth = Math.round(targetWidth / 2) * 2;
    let targetHeight = options.height || Math.round((targetWidth * aspectRatio) / 2) * 2;

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error("Impossible de créer le contexte 2D Canvas");

    // Frame timestamps
    const frameInterval = 1 / fps; // in simulated seconds
    const timeStep = frameInterval * speed; // in actual video seconds
    const timestamps: number[] = [];

    for (let t = start; t < end; t += timeStep) {
      timestamps.push(t);
    }
    if (timestamps.length === 0) {
      timestamps.push(start);
    }

    const totalFrames = timestamps.length;
    const gif = GIFEncoder();
    const frameDelayMs = Math.round((frameInterval * 1000));

    // 2. Sequential frame extraction & encoding with reliable rasterization
    const seekVideo = (time: number): Promise<void> => {
      return new Promise((resolve) => {
        if (Math.abs(video.currentTime - time) < 0.02 && video.readyState >= 2) {
          resolve();
          return;
        }

        let isDone = false;
        const complete = () => {
          if (isDone) return;
          isDone = true;
          clearTimeout(timeoutId);
          video.removeEventListener('seeked', onSeeked);
          // Wait 25ms for video frame rasterizer
          setTimeout(resolve, 25);
        };

        const onSeeked = () => complete();
        const timeoutId = window.setTimeout(complete, 300);

        video.addEventListener('seeked', onSeeked, { once: true });

        try {
          video.currentTime = time;
        } catch (e) {
          complete();
        }
      });
    };

    for (let i = 0; i < totalFrames; i++) {
      if (abortSignal?.aborted) {
        throw new DOMException("Génération de GIF annulée par l'utilisateur", "AbortError");
      }

      const timestamp = timestamps[i];
      await seekVideo(timestamp);

      // Render frame onto canvas
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      const rgbaData = imgData.data;

      // Always quantize per frame for vibrant colors and to avoid initial black frame palette lock
      const palette = quantize(rgbaData, maxColors, { format: 'rgb565' });
      const indexedPixels = applyPalette(rgbaData, palette, 'rgb565');

      gif.writeFrame(indexedPixels, targetWidth, targetHeight, {
        palette,
        delay: frameDelayMs,
        repeat: loop,
        dispose: 2 // Clear to background
      });

      const pct = Math.round(((i + 1) / totalFrames) * 100);
      onProgress?.({
        currentFrame: i + 1,
        totalFrames,
        percentage: pct,
        statusText: `Encodage de l'image ${i + 1}/${totalFrames} (${pct}%)`
      });

      // Yield event loop briefly every 3 frames to keep UI smooth
      if (i % 3 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    gif.finish();
    const buffer = gif.bytes();
    const gifBlob = new Blob([buffer as any], { type: 'image/gif' });
    const resultUrl = URL.createObjectURL(gifBlob);

    return {
      blob: gifBlob,
      url: resultUrl,
      size: gifBlob.size,
      width: targetWidth,
      height: targetHeight,
      duration: clipDuration / speed,
      totalFrames
    };
  } finally {
    if (shouldRevoke) {
      URL.revokeObjectURL(videoUrl);
    }
  }
}

/**
 * Format bytes to readable string (e.g. 1.25 Mo).
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 octet';
  const k = 1024;
  const sizes = ['octets', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
