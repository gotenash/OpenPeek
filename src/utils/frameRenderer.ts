import { GIFEncoder, quantize, applyPalette } from 'gifenc';

export type FrameAspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | 'auto';
export type WindowChromeStyle = 'macos' | 'windows' | 'minimal';
export type BackgroundThemeKey = 'aurora' | 'sunset' | 'cosmic' | 'emerald' | 'velvet' | 'dark' | 'blur';
export type ShadowIntensity = 'none' | 'soft' | 'medium' | 'deep' | 'glow';

export interface FrameTheme {
  key: BackgroundThemeKey;
  label: string;
  gradient: [string, string, string?];
  darkGradient?: [string, string];
}

export const BACKGROUND_THEMES: Record<BackgroundThemeKey, FrameTheme> = {
  aurora: {
    key: 'aurora',
    label: '🌌 Aurora (Violet & Rose)',
    gradient: ['#7c3aed', '#ec4899', '#f43f5e']
  },
  sunset: {
    key: 'sunset',
    label: '🌅 Sunset (Ambre & Magenta)',
    gradient: ['#f97316', '#e11d48', '#8b5cf6']
  },
  cosmic: {
    key: 'cosmic',
    label: '✨ Cosmic (Bleu Nuit & Cyan)',
    gradient: ['#0f172a', '#1e1b4b', '#06b6d4']
  },
  emerald: {
    key: 'emerald',
    label: '🌿 Emerald (Forêt & Menthe)',
    gradient: ['#064e3b', '#059669', '#34d399']
  },
  velvet: {
    key: 'velvet',
    label: '🖤 Dark Velvet (Ardoise Pro)',
    gradient: ['#090d16', '#1e293b', '#0f172a']
  },
  dark: {
    key: 'dark',
    label: '🌑 Minimaliste Sombre',
    gradient: ['#12131a', '#1c1d27']
  },
  blur: {
    key: 'blur',
    label: '🪟 Flou Vidéo Immersif',
    gradient: ['#0f172a', '#1e1b4b']
  }
};

export interface FrameOptions {
  aspectRatio: FrameAspectRatio;
  theme: BackgroundThemeKey;
  customColor?: string;
  chromeStyle: WindowChromeStyle;
  windowTitle?: string;
  padding: number;        // in px (e.g. 40)
  borderRadius: number;   // in px (e.g. 16)
  shadowIntensity: ShadowIntensity;
}

export interface FrameDimensions {
  canvasWidth: number;
  canvasHeight: number;
  videoX: number;
  videoY: number;
  videoWidth: number;
  videoHeight: number;
  headerHeight: number;
  totalCardWidth: number;
  totalCardHeight: number;
}

/**
 * Calculates canvas bounds and video card positioning according to aspect ratio and padding.
 */
export function calculateFrameDimensions(
  originalWidth: number,
  originalHeight: number,
  aspectRatio: FrameAspectRatio,
  padding: number,
  chromeStyle: WindowChromeStyle
): FrameDimensions {
  const headerHeight = chromeStyle === 'minimal' ? 0 : 38;
  const baseTargetWidth = 1920;

  let canvasWidth = baseTargetWidth;
  let canvasHeight = 1080;

  if (aspectRatio === '16:9') {
    canvasWidth = 1920;
    canvasHeight = 1080;
  } else if (aspectRatio === '9:16') {
    canvasWidth = 1080;
    canvasHeight = 1920;
  } else if (aspectRatio === '1:1') {
    canvasWidth = 1080;
    canvasHeight = 1080;
  } else if (aspectRatio === '4:5') {
    canvasWidth = 1080;
    canvasHeight = 1350;
  } else {
    // Auto: maintain video ratio with uniform padding around it
    const videoRatio = originalHeight / originalWidth;
    canvasWidth = 1600;
    canvasHeight = Math.round(1600 * videoRatio) + (padding * 2) + headerHeight;
  }

  // Available area for the framed card
  const availWidth = Math.max(100, canvasWidth - padding * 2);
  const availHeight = Math.max(100, canvasHeight - padding * 2);

  const videoAspect = originalHeight / originalWidth;

  let totalCardWidth = availWidth;
  let videoHeight = Math.round(totalCardWidth * videoAspect);
  let totalCardHeight = videoHeight + headerHeight;

  if (totalCardHeight > availHeight) {
    totalCardHeight = availHeight;
    videoHeight = totalCardHeight - headerHeight;
    totalCardWidth = Math.round(videoHeight / videoAspect);
  }

  const cardX = Math.round((canvasWidth - totalCardWidth) / 2);
  const cardY = Math.round((canvasHeight - totalCardHeight) / 2);
  const videoX = cardX;
  const videoY = cardY + headerHeight;

  return {
    canvasWidth,
    canvasHeight,
    videoX,
    videoY,
    videoWidth: totalCardWidth,
    videoHeight,
    headerHeight,
    totalCardWidth,
    totalCardHeight
  };
}

/**
 * Draws the framed video composition onto any 2D canvas context.
 */
export function drawFramedVideo(
  ctx: CanvasRenderingContext2D,
  sourceElement: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
  dimensions: FrameDimensions,
  options: FrameOptions
) {
  const { canvasWidth, canvasHeight, videoX, videoY, videoWidth, videoHeight, headerHeight, totalCardWidth, totalCardHeight } = dimensions;
  const cardX = videoX;
  const cardY = videoY - headerHeight;

  ctx.save();

  // 1. Draw Canvas Background
  if (options.theme === 'blur') {
    // Blurred background video replica
    ctx.filter = 'blur(40px) brightness(0.65)';
    ctx.drawImage(sourceElement, -50, -50, canvasWidth + 100, canvasHeight + 100);
    ctx.filter = 'none';
  } else {
    const theme = BACKGROUND_THEMES[options.theme] || BACKGROUND_THEMES.aurora;
    const grad = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    grad.addColorStop(0, theme.gradient[0]);
    grad.addColorStop(0.5, theme.gradient[1]);
    if (theme.gradient[2]) {
      grad.addColorStop(1, theme.gradient[2]);
    } else {
      grad.addColorStop(1, theme.gradient[1]);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  // 2. Draw 3D Drop Shadow for the Card
  if (options.shadowIntensity !== 'none') {
    ctx.save();
    let shadowBlur = 32;
    let shadowColor = 'rgba(0, 0, 0, 0.45)';
    let shadowOffsetY = 16;

    if (options.shadowIntensity === 'soft') {
      shadowBlur = 20;
      shadowColor = 'rgba(0, 0, 0, 0.3)';
      shadowOffsetY = 10;
    } else if (options.shadowIntensity === 'deep') {
      shadowBlur = 50;
      shadowColor = 'rgba(0, 0, 0, 0.65)';
      shadowOffsetY = 24;
    } else if (options.shadowIntensity === 'glow') {
      shadowBlur = 45;
      shadowColor = 'rgba(139, 92, 246, 0.55)';
      shadowOffsetY = 12;
    }

    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetY = shadowOffsetY;

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, totalCardWidth, totalCardHeight, options.borderRadius);
    ctx.fill();
    ctx.restore();
  }

  // 3. Clip Card Area with rounded corners
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, totalCardWidth, totalCardHeight, options.borderRadius);
  ctx.clip();

  // Draw Card Background
  ctx.fillStyle = '#090d16';
  ctx.fillRect(cardX, cardY, totalCardWidth, totalCardHeight);

  // 4. Draw Window Chrome Header if not minimal
  if (options.chromeStyle === 'macos') {
    // macOS Header
    ctx.fillStyle = 'rgba(23, 23, 33, 0.95)';
    ctx.fillRect(cardX, cardY, totalCardWidth, headerHeight);

    // Traffic light buttons
    const btnY = cardY + headerHeight / 2;
    const btnRadius = 6;

    // Red (close)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cardX + 18, btnY, btnRadius, 0, Math.PI * 2);
    ctx.fill();

    // Yellow (minimize)
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(cardX + 38, btnY, btnRadius, 0, Math.PI * 2);
    ctx.fill();

    // Green (zoom)
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(cardX + 58, btnY, btnRadius, 0, Math.PI * 2);
    ctx.fill();

    // Window Title
    if (options.windowTitle) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.font = '500 13px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(options.windowTitle, cardX + totalCardWidth / 2, btnY);
    }
  } else if (options.chromeStyle === 'windows') {
    // Windows 11 Header
    ctx.fillStyle = 'rgba(18, 20, 29, 0.95)';
    ctx.fillRect(cardX, cardY, totalCardWidth, headerHeight);

    const centerY = cardY + headerHeight / 2;
    const rightX = cardX + totalCardWidth;

    // Controls icons on the right
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.2;

    // Minimize
    ctx.beginPath();
    ctx.moveTo(rightX - 52, centerY);
    ctx.lineTo(rightX - 42, centerY);
    ctx.stroke();

    // Maximize
    ctx.strokeRect(rightX - 32, centerY - 4, 8, 8);

    // Close
    ctx.beginPath();
    ctx.moveTo(rightX - 16, centerY - 4);
    ctx.lineTo(rightX - 8, centerY + 4);
    ctx.moveTo(rightX - 8, centerY - 4);
    ctx.lineTo(rightX - 16, centerY + 4);
    ctx.stroke();

    if (options.windowTitle) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.font = '500 13px "Inter", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(options.windowTitle, cardX + 16, centerY);
    }
  }

  // 5. Draw Video Content
  ctx.drawImage(sourceElement, videoX, videoY, videoWidth, videoHeight);

  // Inset subtle border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore(); // end clip
  ctx.restore(); // end canvas state
}

/**
 * Encodes framed video into a final WebM / H.264 video Blob with progress callback.
 */
export async function renderFramedVideo(
  videoBlob: Blob,
  options: FrameOptions,
  onProgress?: (progress: number) => void,
  abortSignal?: AbortSignal
): Promise<Blob> {
  const videoUrl = URL.createObjectURL(videoBlob);
  const video = document.createElement('video');
  video.src = videoUrl;
  video.muted = false;
  video.playsInline = true;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Impossible de charger la vidéo"));
    });

    const origW = video.videoWidth || 1920;
    const origH = video.videoHeight || 1080;
    const dimensions = calculateFrameDimensions(origW, origH, options.aspectRatio, options.padding, options.chromeStyle);

    const canvas = document.createElement('canvas');
    canvas.width = dimensions.canvasWidth;
    canvas.height = dimensions.canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Impossible d'initialiser le contexte Canvas");

    const canvasStream = canvas.captureStream(60);
    let combinedStream: MediaStream = canvasStream;

    // Audio mixing
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaElementSource(video);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      source.connect(audioCtx.destination);
      if (dest.stream.getAudioTracks().length > 0) {
        combinedStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...dest.stream.getAudioTracks()
        ]);
      }
    } catch (e) {
      console.warn("AudioContext warning:", e);
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=h264')
      ? 'video/webm;codecs=h264'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const recorder = new MediaRecorder(combinedStream, { mimeType });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const duration = video.duration || 10;

    await new Promise<void>((resolve, reject) => {
      recorder.onstop = () => resolve();
      recorder.onerror = reject;

      recorder.start(100);
      video.currentTime = 0;
      video.play().catch(reject);

      let animId: number;
      const renderLoop = () => {
        if (abortSignal?.aborted) {
          cancelAnimationFrame(animId);
          video.pause();
          recorder.stop();
          reject(new DOMException("Rendu annulé", "AbortError"));
          return;
        }

        if (video.ended || video.currentTime >= duration) {
          cancelAnimationFrame(animId);
          video.pause();
          recorder.stop();
          return;
        }

        drawFramedVideo(ctx, video, dimensions, options);
        const pct = Math.min(99, Math.round((video.currentTime / duration) * 100));
        onProgress?.(pct);

        animId = requestAnimationFrame(renderLoop);
      };

      animId = requestAnimationFrame(renderLoop);
    });

    onProgress?.(100);
    return new Blob(chunks, { type: mimeType });
  } finally {
    URL.revokeObjectURL(videoUrl);
  }
}

/**
 * Encodes framed video into an animated GIF with progress callback.
 */
export async function renderFramedGif(
  videoBlob: Blob,
  options: FrameOptions,
  gifSettings: { fps?: number; speed?: number; maxColors?: number } = {},
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
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Impossible de charger la vidéo"));
    });

    const origW = video.videoWidth || 1280;
    const origH = video.videoHeight || 720;
    const fullDimensions = calculateFrameDimensions(origW, origH, options.aspectRatio, options.padding, options.chromeStyle);

    // Scale dimensions for compact GIF (max width ~720px)
    const scale = Math.min(1.0, 720 / fullDimensions.canvasWidth);
    const targetW = Math.round((fullDimensions.canvasWidth * scale) / 2) * 2;
    const targetH = Math.round((fullDimensions.canvasHeight * scale) / 2) * 2;

    const scaledDimensions: FrameDimensions = {
      canvasWidth: targetW,
      canvasHeight: targetH,
      videoX: Math.round(fullDimensions.videoX * scale),
      videoY: Math.round(fullDimensions.videoY * scale),
      videoWidth: Math.round(fullDimensions.videoWidth * scale),
      videoHeight: Math.round(fullDimensions.videoHeight * scale),
      headerHeight: Math.round(fullDimensions.headerHeight * scale),
      totalCardWidth: Math.round(fullDimensions.totalCardWidth * scale),
      totalCardHeight: Math.round(fullDimensions.totalCardHeight * scale)
    };

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error("Impossible d'initialiser Canvas");

    const duration = video.duration || 6;
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
        const complete = () => {
          if (isDone) return;
          isDone = true;
          clearTimeout(timeoutId);
          video.removeEventListener('seeked', onSeeked);
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
        throw new DOMException("Génération GIF annulée", "AbortError");
      }

      await seekVideo(timestamps[i]);
      drawFramedVideo(ctx, video, scaledDimensions, {
        ...options,
        borderRadius: Math.round(options.borderRadius * scale)
      });

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
