import { useState, useEffect, useRef } from 'react';
import { drawCompositeFrame as renderCompositeOnCanvas } from '../utils/recorder/compositeRenderer';
import { finalizeRecordingSession } from '../utils/recorder/projectFinalizer';
import { setupAudioPipeline } from '../utils/recorder/audioPipeline';
import { getScreenCaptureConstraints } from '../utils/recorder/streamConstraints';
import { createCompositedCanvas } from '../utils/recorder/canvasSetup';
import { useRecorderTauriEvents } from './recorder/useRecorderTauriEvents';
import { useRecorderZoom } from './recorder/useRecorderZoom';
import { useRecorderDrawing } from './recorder/useRecorderDrawing';
import { useRecorderSecondaryCam } from './recorder/useRecorderSecondaryCam';
import { useRecorderPreview } from './recorder/useRecorderPreview';
import { useRecorderCountdown } from './recorder/useRecorderCountdown';
import { useRecorderWebcamPosition } from './recorder/useRecorderWebcamPosition';

export type { RecorderOptions, DrawTool, BlurMask, DrawingStroke } from '../types/recorder';
import type { RecorderOptions } from '../types/recorder';

export function useRecorder(options: RecorderOptions, onSaveComplete?: () => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingStartTimeRef = useRef<number>(0);
  const accumulatedTimeRef = useRef<number>(0);
  const [micLevel, setMicLevel] = useState(0);
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { optionsRef.current = options; }, [options]);

  // Screen and Canvas elements refs
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Zoom & Spotlight Hook
  const {
    isZoomed,
    setIsZoomed,
    isZoomedRef,
    isSpotlight,
    isSpotlightRef,
    zoomFactor,
    zoomFactorRef,
    isAutoZoomEnabled,
    currentZoomRef,
    targetZoomCenterRef,
    currentZoomCenterRef,
    isAutoZoomingRef,
    toggleZoom,
    triggerAutoZoom,
    toggleAutoZoom,
    setZoomCenter,
    setZoomFactor,
    toggleSpotlight
  } = useRecorderZoom({ options, optionsRef });

  // Live Screen Marker & Privacy Blur Hook
  const {
    isDrawingMode,
    setIsDrawingMode,
    isDrawingModeRef,
    drawTool,
    setDrawTool,
    drawToolRef,
    drawColor,
    setDrawColor,
    drawColorRef,
    isAutoFade,
    setIsAutoFade,
    isAutoFadeRef,
    strokesRef,
    currentStrokeRef,
    freezeFrameRef,
    blurOffscreenCanvasRef,
    ripplesRef,
    addClickRipple,
    toggleDrawingMode,
    clearDrawings,
    blurMasks,
    blurMasksRef,
    addBlurMask,
    removeBlurMask,
    updateBlurMask,
    clearBlurMasks,
    startDrawingStroke,
    updateDrawingStroke,
    endDrawingStroke
  } = useRecorderDrawing({ options, screenVideoRef, canvasRef });

  // Recording Countdown Hook
  const {
    countdown,
    countdownRef,
    startCountdown,
    cancelCountdown: cancelTimerCountdown
  } = useRecorderCountdown({ isDrawingModeRef });

  // Webcam bubble position & size hook
  const {
    webcamPosRef,
    webcamRadiusRef,
    updateWebcamPosition,
    setWebcamSizePercentage
  } = useRecorderWebcamPosition(canvasRef);

  // Secondary Camera (B-Roll) Hook
  const {
    isSecondaryCamRecording,
    secondaryCamStream,
    secondaryCamSegmentsRef,
    initSecondaryCamStream,
    toggleSecondaryCamRecording,
    stopSecondaryCam
  } = useRecorderSecondaryCam({
    options,
    optionsRef,
    isRecordingRef,
    recordingStartTimeRef,
    accumulatedTimeRef
  });

  // Refs for media streams and elements
  const screenStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const hasLoggedCompositeErrorRef = useRef(false);
  const workerRef = useRef<Worker | null>(null);

  // Web Audio API refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const systemAudioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioNodesRef = useRef<AudioNode[]>([]);

  // Cinematic Smooth Cursor Tracking refs
  const targetCursorPosRef = useRef({ x: 0.5, y: 0.5 });
  const currentCursorPosRef = useRef({ x: 0.5, y: 0.5 });
  const hasReceivedCursorRef = useRef(false);
  const cursorClickScaleRef = useRef(1.0);

  // Live Keystroke Visualizer HUD refs
  const activeKeystrokesRef = useRef<Array<{ id: number; combo: string; startTime: number; duration: number }>>([]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAllStreams();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const stopAllStreams = () => {
    cancelCountdown();

    isZoomedRef.current = false;
    currentZoomRef.current = 1.0;
    targetZoomCenterRef.current = { x: 0.5, y: 0.5 };
    currentZoomCenterRef.current = { x: 0.5, y: 0.5 };
    setIsZoomed(false);

    if (workerRef.current) {
      workerRef.current.postMessage({ action: 'stop' });
      workerRef.current.terminate();
      workerRef.current = null;
    }
    try {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('set_active_capture_monitor', { monitorId: 'prompt' }).catch((err) => {
          console.debug('[Recorder] Reset capture monitor error:', err);
        });
      });
    } catch (err) {
      console.debug('[Recorder] Tauri API unavailable for reset monitor:', err);
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(t => t.stop());
      webcamStreamRef.current = null;
    }
    stopSecondaryCam();
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (audioNodesRef.current.length > 0) {
      audioNodesRef.current.forEach(node => {
        try {
          node.disconnect();
        } catch (e) {
          console.debug('[Recorder] Audio node disconnect error (already disconnected):', e);
        }
      });
      audioNodesRef.current = [];
    }

    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
      screenVideoRef.current.remove();
      screenVideoRef.current = null;
    }
    if (webcamVideoRef.current) {
      webcamVideoRef.current.srcObject = null;
      webcamVideoRef.current.remove();
      webcamVideoRef.current = null;
    }
  };

  // Shared GPU Composite frame renderer (used both by live screen preview & active recording)
  const drawCompositeFrame = (canvas: HTMLCanvasElement) => {
    renderCompositeOnCanvas(canvas, {
      options: optionsRef.current,
      isZoomed: isZoomedRef.current,
      zoomFactor: zoomFactorRef.current,
      currentZoom: currentZoomRef,
      targetZoomCenter: targetZoomCenterRef,
      currentZoomCenter: currentZoomCenterRef,
      isDrawingMode: isDrawingModeRef.current,
      freezeFrame: freezeFrameRef.current,
      screenVideo: screenVideoRef.current,
      blurMasks: blurMasksRef.current,
      blurOffscreenCanvas: blurOffscreenCanvasRef,
      isSpotlight: isSpotlightRef.current,
      ripples: ripplesRef,
      strokes: strokesRef,
      currentStroke: currentStrokeRef.current,
      webcamVideo: webcamVideoRef.current,
      webcamStream: webcamStreamRef.current,
      webcamRadius: webcamRadiusRef,
      webcamPos: webcamPosRef,
      hasReceivedCursor: hasReceivedCursorRef.current,
      currentCursorPos: currentCursorPosRef,
      targetCursorPos: targetCursorPosRef,
      cursorClickScale: cursorClickScaleRef,
      activeKeystrokes: activeKeystrokesRef,
      hasLoggedCompositeError: hasLoggedCompositeErrorRef
    });
  };


  // Live Screen Preview Hook
  const {
    isPreviewing,
    setIsPreviewing,
    isPreviewingRef,
    startScreenPreview,
    stopScreenPreview
  } = useRecorderPreview({
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
  });

  // Start screen capture, microphone, and webcam streams
  const startRecording = async () => {
    try {
      chunksRef.current = [];
      setRecordingTime(0);
      hasLoggedCompositeErrorRef.current = false;

      // 1. Get Screen Capture Stream (or reuse active preview stream)
      let screenStream = screenStreamRef.current;
      if (!screenStream || !screenVideoRef.current || screenStream.getVideoTracks().length === 0 || screenStream.getVideoTracks()[0].readyState === 'ended') {
        const screenConstraints = getScreenCaptureConstraints(optionsRef.current);
        screenStream = await navigator.mediaDevices.getDisplayMedia(screenConstraints);
        screenStreamRef.current = screenStream;

        try {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('set_active_capture_monitor', { monitorId: options.selectedMonitorId || 'prompt' });
        } catch (err) {
          console.debug('[Recorder] set_active_capture_monitor failed during start:', err);
        }

        screenStream.getVideoTracks()[0].onended = () => {
          stopRecording();
        };

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
      }

      // Turn off standalone preview mode as recording is taking over
      setIsPreviewing(false);
      isPreviewingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // 2. Initialize Web Audio API for mixing
      const opts = optionsRef.current;
      const sysAudioStream = (opts.recordSystemAudio && screenStream.getAudioTracks().length > 0)
        ? new MediaStream([screenStream.getAudioTracks()[0]])
        : null;

      const pipeline = await setupAudioPipeline(
        opts,
        sysAudioStream,
        (lvl) => setMicLevel(lvl),
        () => isRecordingRef.current
      );

      audioContextRef.current = pipeline.audioContext;
      audioDestinationRef.current = pipeline.audioDestination;
      analyserRef.current = pipeline.analyser;
      audioNodesRef.current = pipeline.audioNodes;
      micStreamRef.current = pipeline.micStream;
      systemAudioSourceRef.current = pipeline.systemAudioSource;
      micSourceRef.current = pipeline.micSource;


      // 5. Get webcam stream if enabled
      if (opts.showWebcam) {
        try {
          let webcamStream: MediaStream | null = null;
          
          if (opts.selectedCamId) {
            try {
              webcamStream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: opts.selectedCamId }, width: { ideal: 640 }, height: { ideal: 480 } }
              });
            } catch (e) {
              console.warn('Preferred deviceId failed, falling back to general constraints:', e);
            }
          }
          
          if (!webcamStream) {
            try {
              webcamStream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 } }
              });
            } catch (e) {
              console.warn('Standard 640x480 failed, falling back to video: true:', e);
              webcamStream = await navigator.mediaDevices.getUserMedia({ video: true });
            }
          }
          
          webcamStreamRef.current = webcamStream;

          // Create hidden video element for webcam (kept visible to prevent browser suspension)
          const webcamVideo = document.createElement('video');
          webcamVideo.srcObject = webcamStream;
          webcamVideo.crossOrigin = "anonymous";
          webcamVideo.muted = true;
          webcamVideo.autoplay = true;
          webcamVideo.playsInline = true;
          webcamVideo.style.position = 'fixed';
          webcamVideo.style.top = '-9999px';
          webcamVideo.style.left = '-9999px';
          webcamVideo.style.width = '320px';
          webcamVideo.style.height = '240px';
          webcamVideo.style.opacity = '0.01';
          webcamVideo.style.pointerEvents = 'none';
          document.body.appendChild(webcamVideo);
          webcamVideoRef.current = webcamVideo;
          try {
            await webcamVideo.play();
          } catch (playErr) {
            console.warn('Webcam initial play catch, continuing stream:', playErr);
          }
        } catch (err) {
          console.warn('Webcam access failed or denied:', err);
        }
      }

      // 5b. Setup Secondary Camera (B-Roll / Iriun Webcam) stream if enabled
      await initSecondaryCamStream();

      // 6. Setup Canvas Compositing Engine
      const canvas = createCompositedCanvas(opts, screenStream);
      canvasRef.current = canvas;
      
      // Animation loop to draw composite video onto canvas
      const drawComposite = () => {
        drawCompositeFrame(canvas);
      };

      // Start the loop with a Web Worker metronome to prevent background throttling freeze
      if (workerRef.current) {
        workerRef.current.terminate();
      }
      const workerBlob = new Blob([`
        let intervalId = null;
        self.onmessage = function(e) {
          if (e.data.action === 'start') {
            if (intervalId) clearInterval(intervalId);
            intervalId = setInterval(() => {
              self.postMessage('tick');
            }, 1000 / e.data.fps);
          } else if (e.data.action === 'stop') {
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
          }
        };
      `], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(workerBlob);
      const worker = new Worker(workerUrl);
      workerRef.current = worker;

      worker.onmessage = () => {
        drawComposite();
      };
      
      worker.postMessage({ action: 'start', fps: opts.frameRate });

      // 7. Get video track for recording (always use composited canvas to capture Zoom, Spotlight, and Webcam)
      const canvasStream = canvas.captureStream(opts.frameRate);
      const videoTrack = canvasStream.getVideoTracks()[0];

      // Combine video track and mixed audio tracks (only single composited video track)
      const outputTracks = [videoTrack];
      
      if (opts.recordMic || opts.recordSystemAudio) {
        const mixedAudioTracks = audioDestinationRef.current?.stream.getAudioTracks() || [];
        if (mixedAudioTracks.length > 0) {
          outputTracks.push(mixedAudioTracks[0]);
        }
      }

      const outputStream = new MediaStream(outputTracks);

      // 8. Create MediaRecorder
      let selectedCodec: string = opts.codec;
      if (!MediaRecorder.isTypeSupported(selectedCodec)) {
        console.warn(`${selectedCodec} not supported, falling back to default webm`);
        selectedCodec = 'video/webm';
      }

      const mediaRecorder = new MediaRecorder(outputStream, {
        mimeType: selectedCodec,
        videoBitsPerSecond: opts.resolution === '4k' ? 16000000 : opts.resolution === '1080p' ? 8000000 : 4000000
      });

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        await finalizeRecording(canvas);
      };

      // 9. Countdown HUD and start recording on completion
      startCountdown(() => {
        try {
          chunksRef.current = [];
          recordingStartTimeRef.current = Date.now();
          accumulatedTimeRef.current = 0;
          setRecordingTime(0);
          mediaRecorder.start(1000);
          setIsRecording(true);
          setIsPaused(false);

          // Start Timer using real wall-clock elapsed time (immune to Chromium background throttling)
          timerIntervalRef.current = window.setInterval(() => {
            if (recordingStartTimeRef.current > 0) {
              const elapsedMs = (Date.now() - recordingStartTimeRef.current) + accumulatedTimeRef.current;
              setRecordingTime(Math.max(1, Math.floor(elapsedMs / 1000)));
            }
          }, 500);
        } catch (recErr) {
          console.error('Failed to start MediaRecorder:', recErr);
          stopAllStreams();
        }
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      stopAllStreams();
      throw error;
    }
  };

  // Pause recording
  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (recordingStartTimeRef.current > 0) {
        accumulatedTimeRef.current += (Date.now() - recordingStartTimeRef.current);
        recordingStartTimeRef.current = 0;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (workerRef.current) {
        workerRef.current.postMessage({ action: 'stop' });
      }
      // Pause AudioContext to freeze levels
      if (audioContextRef.current) {
        audioContextRef.current.suspend();
      }
    }
  };

  // Resume recording
  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      recordingStartTimeRef.current = Date.now();
      timerIntervalRef.current = window.setInterval(() => {
        if (recordingStartTimeRef.current > 0) {
          const elapsedMs = (Date.now() - recordingStartTimeRef.current) + accumulatedTimeRef.current;
          setRecordingTime(Math.max(1, Math.floor(elapsedMs / 1000)));
        }
      }, 500);
      if (workerRef.current) {
        workerRef.current.postMessage({ action: 'start', fps: options.frameRate });
      }
      // Resume AudioContext
      if (audioContextRef.current) {
        audioContextRef.current.resume();
      }
    }
  };

  // Stop recording
  const stopRecording = () => {
    // If secondary cam is actively recording a segment, stop it
    if (isSecondaryCamRecording) {
      stopSecondaryCam();
    }

    let totalElapsedMs = accumulatedTimeRef.current;
    if (recordingStartTimeRef.current > 0) {
      totalElapsedMs += (Date.now() - recordingStartTimeRef.current);
      recordingStartTimeRef.current = 0;
    }
    const recordedDuration = Math.max(recordingTime, Math.round(totalElapsedMs / 1000));

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Trigger cinema cut animation ("C'est dans la boîte !") on full-screen overlay
    try {
      import('@tauri-apps/api/event').then(({ emit }) => {
        emit('recording-stopped-animation', { duration: recordedDuration }).catch((err) => {
          console.debug('[Recorder] recording-stopped-animation emit failed:', err);
        });
      });
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('show_overlay').catch((err) => {
          console.debug('[Recorder] show_overlay invoke failed:', err);
        });
      });
    } catch (err) {
      console.debug('[Recorder] Overlay stop animation error:', err);
    }
    
    if (workerRef.current) {
      workerRef.current.postMessage({ action: 'stop' });
      workerRef.current.terminate();
      workerRef.current = null;
    }

    // Stop timers & animation frames
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Force reset drawing mode and blur masks so they never leak into the next recording
    isDrawingModeRef.current = false;
    setIsDrawingMode(false);
    freezeFrameRef.current = null;
    clearDrawings();
    clearBlurMasks();
    try {
      import('@tauri-apps/api/event').then(({ emit }) => {
        emit('set-drawing-mode', { active: false }).catch(() => {});
        emit('unfreeze-snapshot', {}).catch(() => {});
        emit('clear-drawings', {}).catch(() => {});
        emit('clear-blur-masks', {}).catch(() => {});
      });
    } catch (err) {
      console.debug('[Recorder] Reset drawing events emit error:', err);
    }

    // Reset zoom state
    if (isZoomedRef.current) {
      isZoomedRef.current = false;
      setIsZoomed(false);
      try {
        import('@tauri-apps/api/event').then(({ emit }) => {
          emit('zoom-hud', { zoomed: false, factor: 1.0, showToast: false, showCorner: false }).catch(() => {});
        });
      } catch (err) {
        console.debug('[Recorder] zoom-hud emit error on stop:', err);
      }
    }

    // Reset keystrokes
    activeKeystrokesRef.current = [];

    setIsRecording(false);
    setIsPaused(false);
    setMicLevel(0);
  };

  // Finalize video generation, create thumbnail, and save to IndexedDB
  const finalizeRecording = async (canvasElement: HTMLCanvasElement) => {
    let totalElapsedMs = accumulatedTimeRef.current;
    if (recordingStartTimeRef.current > 0) {
      totalElapsedMs += (Date.now() - recordingStartTimeRef.current);
    }
    const currentChunks = chunksRef.current;
    chunksRef.current = [];

    await finalizeRecordingSession({
      chunks: currentChunks,
      mimeType: mediaRecorderRef.current?.mimeType || 'video/webm',
      recordingTime,
      totalElapsedMs,
      canvasElement,
      secondaryCamSegments: secondaryCamSegmentsRef.current,
      stopAllStreams,
      onSaveComplete
    });

    secondaryCamSegmentsRef.current = [];
  };

  // Native OS-wide Global Hotkeys, Click, and Draw listeners (emitted from Rust backend)
  useRecorderTauriEvents({
    optionsRef,
    isRecordingRef,
    isPausedRef,
    countdownRef,
    isDrawingModeRef,
    freezeFrameRef,
    drawToolRef,
    drawColorRef,
    isAutoFadeRef,
    currentCursorPosRef,
    targetCursorPosRef,
    hasReceivedCursorRef,
    cursorClickScaleRef,
    activeKeystrokesRef,
    targetZoomCenterRef,
    isAutoZoomingRef,
    isZoomedRef,
    canvasRef,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    toggleZoom,
    triggerAutoZoom,
    addClickRipple,
    toggleDrawingMode,
    setIsDrawingMode,
    clearDrawings,
    addBlurMask,
    clearBlurMasks,
    startDrawingStroke,
    updateDrawingStroke,
    endDrawingStroke,
    setDrawTool,
    setDrawColor,
    setIsAutoFade,
    toggleSecondaryCamRecording,
  });



  const cancelCountdown = () => {
    cancelTimerCountdown();
    stopAllStreams();
  };

  return {
    isRecording,
    isPaused,
    isPreviewing,
    recordingTime,
    micLevel,
    countdown,
    cancelCountdown,
    startScreenPreview,
    stopScreenPreview,
    // Zoom & Spotlight API
    isZoomed,
    isSpotlight,
    zoomFactor,
    isAutoZoomEnabled,
    toggleAutoZoom,
    triggerAutoZoom,
    toggleZoom,
    setZoomCenter,
    setZoomFactor,
    toggleSpotlight,
    // Live Drawing & Annotations API
    isDrawingMode,
    drawTool,
    drawColor,
    isAutoFade,
    blurMasks,
    addBlurMask,
    updateBlurMask,
    removeBlurMask,
    clearBlurMasks,
    toggleDrawingMode,
    setDrawTool,
    setDrawColor,
    setIsAutoFade,
    clearDrawings,
    startDrawingStroke,
    updateDrawingStroke,
    endDrawingStroke,
    canvas: canvasRef.current,
    analyserNode: analyserRef.current,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    updateWebcamPosition,
    setWebcamSize: setWebcamSizePercentage,
    webcamPosition: webcamPosRef.current,
    webcamRadius: webcamRadiusRef.current,
    // Secondary Camera (B-Roll / Iriun Webcam) API
    hasSecondaryCam: Boolean(options.enableSecondaryCam && options.selectedSecondaryCamId),
    isSecondaryCamRecording,
    secondaryCamStream,
    toggleSecondaryCamRecording
  };
}
