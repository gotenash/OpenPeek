import type { RecorderOptions } from '../../types/recorder';

export function getScreenCaptureConstraints(opts: RecorderOptions): DisplayMediaStreamOptions {
  const resolutionMap: Record<string, { width: number; height: number }> = {
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 },
    '4k': { width: 3840, height: 2160 }
  };

  let { width, height } = resolutionMap[opts.resolution] || { width: 1920, height: 1080 };
  if (opts.aspectRatio === '9:16') {
    const temp = width;
    width = height;
    height = temp;
  } else if (opts.aspectRatio === '1:1') {
    width = Math.min(width, height);
    height = width;
  }

  const useCinematicCursor = opts.enableCinematicCursor !== false;

  return {
    video: {
      displaySurface: opts.captureSourcePreference === 'window' ? 'window' : 'monitor',
      cursor: useCinematicCursor ? 'never' : 'always',
      width: { ideal: width },
      height: { ideal: height },
      frameRate: { ideal: opts.frameRate }
    },
    audio: opts.recordSystemAudio ? {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false
    } : false,
    systemAudio: opts.recordSystemAudio ? 'include' : 'exclude',
    selfBrowserSurface: 'exclude',
    surfaceSwitching: 'include',
    preferCurrentTab: false,
    monitorTypeSurfaces: 'include'
  } as any;
}
