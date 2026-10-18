import { useState, useRef } from 'react';
import type { RecorderOptions } from '../../types/recorder';
import { getScreenCaptureConstraints } from '../../utils/recorder/streamConstraints';

interface UseRecorderPreviewProps {
  optionsRef: React.MutableRefObject<RecorderOptions>;
  isRecording: boolean;
  screenStreamRef: React.MutableRefObject<MediaStream | null>;
  screenVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  webcamStreamRef: React.MutableRefObject<MediaStream | null>;
  webcamVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
  animationFrameRef: React.MutableRefObject<number | null>;
  hasLoggedCompositeErrorRef: React.MutableRefObject<boolean>;
  drawCompositeFrame: (canvas: HTMLCanvasElement) => void;
  stopAllStreams: () => void;
}

export function useRecorderPreview({
  optionsRef,
  isRecording,
  screenStreamRef,
  screenVideoRef,
  canvasRef,
  webcamStreamRef,
  webcamVideoRef,
  animationFrameRef,
  hasLoggedCompositeErrorRef,
  drawCompositeFrame,
  stopAllStreams
}: UseRecorderPreviewProps) {
  const [isPreviewing, setIsPreviewing] = useState(false);
  const isPreviewingRef = useRef(false);

  const startScreenPreview = async () => {
    try {
      if (isRecording || isPreviewingRef.current) return;
      hasLoggedCompositeErrorRef.current = false;
      const options = optionsRef.current;

      // 1. Get Screen Capture Stream
      const screenConstraints = getScreenCaptureConstraints(options);
      const screenStream = await navigator.mediaDevices.getDisplayMedia(screenConstraints);
      screenStreamRef.current = screenStream;

      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('set_active_capture_monitor', { monitorId: options.selectedMonitorId || 'prompt' });
      } catch (err) {
        console.debug('[Recorder] set_active_capture_monitor failed during preview:', err);
      }

      screenStream.getVideoTracks()[0].onended = () => {
        stopScreenPreview();
      };

      // Create hidden video element for screen stream
      const screenVideo = document.createElement('video');
      screenVideo.srcObject = screenStream;
      screenVideo.crossOrigin = "anonymous";
      screenVideo.muted = true;
      screenVideo.playsInline = true;
      screenVideo.style.position = 'fixed';
      screenVideo.style.top = '-9999px';
      screenVideo.style.left = '-9999px';
      screenVideo.style.width = '320px';
      screenVideo.style.height = '240px';
      screenVideo.style.opacity = '0.01';
      screenVideo.style.pointerEvents = 'none';
      document.body.appendChild(screenVideo);
      await screenVideo.play();
      screenVideoRef.current = screenVideo;

      // Setup Canvas
      const resolutionMap: Record<string, { width: number; height: number }> = {
        '720p': { width: 1280, height: 720 },
        '1080p': { width: 1920, height: 1080 },
        '4k': { width: 3840, height: 2160 }
      };
      const { width, height } = resolutionMap[options.resolution] || { width: 1920, height: 1080 };
      
      let canvas = canvasRef.current;
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvasRef.current = canvas;
      }
      canvas.width = width;
      canvas.height = height;

      // Setup Webcam if enabled
      if (options.showWebcam && !webcamStreamRef.current) {
        try {
          const webcamStream = await navigator.mediaDevices.getUserMedia({
            video: options.selectedCamId 
              ? { deviceId: { exact: options.selectedCamId }, width: { ideal: 640 }, height: { ideal: 480 } } 
              : { width: { ideal: 640 }, height: { ideal: 480 } }
          });
          webcamStreamRef.current = webcamStream;
          const webcamVideo = document.createElement('video');
          webcamVideo.srcObject = webcamStream;
          webcamVideo.muted = true;
          webcamVideo.playsInline = true;
          webcamVideo.style.position = 'fixed';
          webcamVideo.style.top = '-9999px';
          webcamVideo.style.left = '-9999px';
          webcamVideo.style.width = '320px';
          webcamVideo.style.height = '240px';
          webcamVideo.style.opacity = '0.01';
          webcamVideo.style.pointerEvents = 'none';
          document.body.appendChild(webcamVideo);
          await webcamVideo.play();
          webcamVideoRef.current = webcamVideo;
        } catch (e) {
          console.warn('Webcam preview error:', e);
        }
      }

      // Start animation loop rendering composite canvas preview
      setIsPreviewing(true);
      isPreviewingRef.current = true;

      const loop = () => {
        if (!isPreviewingRef.current) return;
        drawCompositeFrame(canvas!);
        animationFrameRef.current = requestAnimationFrame(loop);
      };
      animationFrameRef.current = requestAnimationFrame(loop);

    } catch (err) {
      console.warn('Screen preview aborted or cancelled by user:', err);
      setIsPreviewing(false);
      isPreviewingRef.current = false;
    }
  };

  const stopScreenPreview = () => {
    setIsPreviewing(false);
    isPreviewingRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    stopAllStreams();
  };

  return {
    isPreviewing,
    setIsPreviewing,
    isPreviewingRef,
    startScreenPreview,
    stopScreenPreview
  };
}
