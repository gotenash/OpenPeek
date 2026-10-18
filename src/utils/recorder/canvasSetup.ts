import type { RecorderOptions } from '../../types/recorder';

export function createCompositedCanvas(opts: RecorderOptions, screenStream: MediaStream): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const screenSettings = screenStream.getVideoTracks()[0].getSettings();
  const screenWidth = screenSettings.width || 1920;
  const screenHeight = screenSettings.height || 1080;
  
  // Determine maximum resolution limits based on user configuration selection
  let maxW = 1920;
  let maxH = 1080;
  if (opts.resolution === '720p') {
    maxW = 1280;
    maxH = 720;
  } else if (opts.resolution === '4k') {
    maxW = 3840;
    maxH = 2160;
  }
  
  // Scale down canvas dimensions if screen resolution exceeds maximum target resolution limits
  let canvasWidth = screenWidth;
  let canvasHeight = screenHeight;
  if (canvasWidth > maxW || canvasHeight > maxH) {
    const aspectRatio = screenWidth / screenHeight;
    if (canvasWidth / maxW > canvasHeight / maxH) {
      canvasWidth = maxW;
      canvasHeight = Math.round(maxW / aspectRatio);
    } else {
      canvasHeight = maxH;
      canvasWidth = Math.round(maxH * aspectRatio);
    }
  }
  
  // Ensure canvas width and height are even to prevent MediaRecorder silent failures
  if (canvasWidth % 2 !== 0) canvasWidth -= 1;
  if (canvasHeight % 2 !== 0) canvasHeight -= 1;
  
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  // GPU-accelerated 2D context with no alpha channel for maximum performance
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
  }

  return canvas;
}
