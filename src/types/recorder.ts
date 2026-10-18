import type { WebcamBackgroundEffect, WebcamVirtualBg } from '../utils/webcamSegmenter';

export interface RecorderOptions {
  resolution: '1080p' | '720p' | '4k';
  aspectRatio?: '16:9' | '9:16' | '1:1';
  frameRate: 30 | 60;
  codec: 'video/webm;codecs=vp9' | 'video/webm;codecs=vp8' | 'video/webm;codecs=h264';
  recordMic: boolean;
  recordSystemAudio: boolean;
  enableNoiseSuppression?: boolean;
  enableVocalEnhancer?: boolean;
  micGain?: number;
  showWebcam: boolean;
  webcamShape?: 'circle' | 'squircle' | 'rect';
  webcamHaloColor?: string;
  webcamMirrorMode?: boolean;
  webcamGlow?: boolean;
  webcamBackgroundEffect?: WebcamBackgroundEffect;
  webcamVirtualBg?: WebcamVirtualBg;
  webcamCustomBgImage?: string;
  showMouseClicks: boolean;
  enableAutoZoom?: boolean;
  autoZoomFactor?: number;
  autoZoomDuration?: number;
  selectedMicId: string;
  selectedCamId: string;
  captureSourcePreference?: 'screen' | 'window';
  zoomSoundFeedback?: boolean;
  zoomToastFeedback?: boolean;
  zoomCornerIndicator?: boolean;
  zoomVisualFeedback?: boolean;
  enableCinematicCursor?: boolean;
  cursorSize?: 'normal' | 'large' | 'xlarge';
  cursorSmoothingSpeed?: 'smooth' | 'cinematic' | 'direct';
  enableKeystrokeHUD?: boolean;
  keystrokeHUDPosition?: 'bottom-center' | 'bottom-left' | 'bottom-right' | 'top-right';
  selectedMonitorId?: string;
  enableSecondaryCam?: boolean;
  selectedSecondaryCamId?: string;
  secondaryCamAudio?: boolean;
  secondaryCamShortcut?: string;
}

export type DrawTool = 'pen' | 'arrow' | 'rect' | 'highlighter';

export interface BlurMask {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DrawingStroke {
  id: number;
  tool: DrawTool;
  color: string;
  width: number;
  points: Array<{ x: number; y: number }>;
  startTime: number;
  fadeDuration: number | null;
}
