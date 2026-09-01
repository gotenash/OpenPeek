import { useState, useEffect, useRef } from 'react';
import { saveRecording, type SavedVideo } from '../utils/db';

export interface RecorderOptions {
  resolution: '1080p' | '720p' | '4k';
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
  showMouseClicks: boolean;
  selectedMicId: string;
  selectedCamId: string;
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
  fadeDuration: number | null; // null for permanent, 3500ms for auto-fade
}

export function useRecorder(options: RecorderOptions, onSaveComplete?: () => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const isPreviewingRef = useRef(false);

  // Click Ripples active queue
  const ripplesRef = useRef<Array<{ id: number; x: number; y: number; startTime: number; button: string; duration: number }>>([]);

  // Live Screen Marker (Drawing) states & refs
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawTool, setDrawTool] = useState<DrawTool>('pen');
  const [drawColor, setDrawColor] = useState('#f43f5e'); // Vibrant Neon Red
  const [isAutoFade, setIsAutoFade] = useState(true);

  const isDrawingModeRef = useRef(false);
  const drawToolRef = useRef<DrawTool>('pen');
  const drawColorRef = useRef('#f43f5e');
  const isAutoFadeRef = useRef(true);

  // Persistent Privacy Blur Masks across recording session
  const [blurMasks, setBlurMasks] = useState<BlurMask[]>([]);
  const blurMasksRef = useRef<BlurMask[]>([]);

  const strokesRef = useRef<DrawingStroke[]>([]);
  const currentStrokeRef = useRef<DrawingStroke | null>(null);
  const freezeFrameRef = useRef<HTMLCanvasElement | null>(null);
  const blurOffscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keep drawing refs in sync with state
  useEffect(() => { isDrawingModeRef.current = isDrawingMode; }, [isDrawingMode]);
  useEffect(() => { drawToolRef.current = drawTool; }, [drawTool]);
  useEffect(() => { drawColorRef.current = drawColor; }, [drawColor]);
  useEffect(() => { isAutoFadeRef.current = isAutoFade; }, [isAutoFade]);

  // Zoom & Spotlight states and refs
  const [isZoomed, setIsZoomed] = useState(false);
  const [isSpotlight, setIsSpotlight] = useState(false);
  const [zoomFactor, setZoomFactorState] = useState(2.0);

  const isZoomedRef = useRef(false);
  const isSpotlightRef = useRef(false);
  const zoomFactorRef = useRef(2.0);
  const currentZoomRef = useRef(1.0);
  const targetZoomCenterRef = useRef({ x: 0.5, y: 0.5 });
  const currentZoomCenterRef = useRef({ x: 0.5, y: 0.5 });

  // Refs for media streams and elements
  const screenStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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

  // Webcam position & size variables (relative coordinates 0-1)
  const webcamPosRef = useRef({ x: 0.85, y: 0.85 }); // bottom right
  const webcamRadiusRef = useRef(0.08); // 8% of width

  // Get available resolutions with entire screen preference by default
  const getConstraints = () => {
    let width = 1920;
    let height = 1080;
    
    if (options.resolution === '720p') {
      width = 1280;
      height = 720;
    } else if (options.resolution === '4k') {
      width = 3840;
      height = 2160;
    }

    return {
      video: {
        displaySurface: 'monitor',
        width: { ideal: width },
        height: { ideal: height },
        frameRate: { ideal: options.frameRate }
      },
      audio: options.recordSystemAudio ? {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      } : false,
      systemAudio: options.recordSystemAudio ? 'include' : 'exclude',
      selfBrowserSurface: 'exclude',
      surfaceSwitching: 'include',
      preferCurrentTab: false
    } as any;
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAllStreams();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);



  const stopAllStreams = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);

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
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
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
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) return;

    try {
      // 1. Interpolate smooth Zoom and Center (Lerp 60 FPS)
      const targetZoom = isZoomedRef.current ? zoomFactorRef.current : 1.0;
      currentZoomRef.current += (targetZoom - currentZoomRef.current) * 0.14;
      
      currentZoomCenterRef.current.x += (targetZoomCenterRef.current.x - currentZoomCenterRef.current.x) * 0.14;
      currentZoomCenterRef.current.y += (targetZoomCenterRef.current.y - currentZoomCenterRef.current.y) * 0.14;
      
      const zoom = currentZoomRef.current;
      const centerX = currentZoomCenterRef.current.x;
      const centerY = currentZoomCenterRef.current.y;

      // Draw screen capture (with Zoom transformation and Freeze Frame support)
      const sourceElement: HTMLVideoElement | HTMLCanvasElement | null = 
        (isDrawingModeRef.current && freezeFrameRef.current) 
          ? freezeFrameRef.current 
          : screenVideoRef.current;

      if (sourceElement && (sourceElement instanceof HTMLCanvasElement || sourceElement.readyState >= 2)) {
        const videoW = (sourceElement instanceof HTMLVideoElement) ? sourceElement.videoWidth : sourceElement.width;
        const videoH = (sourceElement instanceof HTMLVideoElement) ? sourceElement.videoHeight : sourceElement.height;
        
        const cropW = videoW / zoom;
        const cropH = videoH / zoom;
        const maxCropX = videoW - cropW;
        const maxCropY = videoH - cropH;
        const idealCropX = (centerX * videoW) - (cropW / 2);
        const idealCropY = (centerY * videoH) - (cropH / 2);
        const cropX = Math.max(0, Math.min(maxCropX, idealCropX));
        const cropY = Math.max(0, Math.min(maxCropY, idealCropY));
        
        ctx.drawImage(sourceElement, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Coordinate projection helper based on active Zoom level
      const mapCoord = (nx: number, ny: number) => {
        if (zoom > 1.0) {
          const cropW = 1.0 / zoom;
          const cropH = 1.0 / zoom;
          const maxCropX = 1.0 - cropW;
          const maxCropY = 1.0 - cropH;
          const cropX = Math.max(0, Math.min(maxCropX, centerX - cropW / 2));
          const cropY = Math.max(0, Math.min(maxCropY, centerY - cropH / 2));
          return {
            x: ((nx - cropX) / cropW) * canvas.width,
            y: ((ny - cropY) / cropH) * canvas.height
          };
        }
        return {
          x: nx * canvas.width,
          y: ny * canvas.height
        };
      };

      // Render Persistent Privacy Blur Masks
      for (const mask of blurMasksRef.current) {
        const pStart = mapCoord(mask.x, mask.y);
        const pEnd = mapCoord(mask.x + mask.width, mask.y + mask.height);
        const minX = Math.min(pStart.x, pEnd.x);
        const minY = Math.min(pStart.y, pEnd.y);
        const rw = Math.abs(pEnd.x - pStart.x);
        const rh = Math.abs(pEnd.y - pStart.y);

        if (rw > 4 && rh > 4) {
          if (!blurOffscreenCanvasRef.current) {
            blurOffscreenCanvasRef.current = document.createElement('canvas');
          }
          const offCanvas = blurOffscreenCanvasRef.current;
          const pixelSize = Math.max(8, Math.round(rw / 14));
          const smallW = Math.max(2, Math.floor(rw / pixelSize));
          const smallH = Math.max(2, Math.floor(rh / pixelSize));

          offCanvas.width = smallW;
          offCanvas.height = smallH;
          const offCtx = offCanvas.getContext('2d');
          if (offCtx) {
            offCtx.drawImage(canvas, minX, minY, rw, rh, 0, 0, smallW, smallH);
            
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(offCanvas, 0, 0, smallW, smallH, minX, minY, rw, rh);
            
            ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
            ctx.fillRect(minX, minY, rw, rh);

            ctx.strokeStyle = 'rgba(139, 92, 246, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(minX, minY, rw, rh);
            ctx.restore();
          }
        }
      }

      // Draw Spotlight if enabled
      if (isSpotlightRef.current && zoom > 1.05) {
        const spotRadius = canvas.width * 0.24;
        const spotX = canvas.width * centerX;
        const spotY = canvas.height * centerY;
        
        ctx.save();
        const gradient = ctx.createRadialGradient(
          spotX, spotY, spotRadius * 0.4,
          spotX, spotY, spotRadius * 1.5
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(0.65, 'rgba(0, 0, 0, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.82)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      // Draw Click Ripples if enabled
      if (options.showMouseClicks && ripplesRef.current.length > 0) {
        const now = performance.now();
        ripplesRef.current = ripplesRef.current.filter(r => now - r.startTime < r.duration);
        
        for (const ripple of ripplesRef.current) {
          const progress = (now - ripple.startTime) / ripple.duration;
          const ease = 1 - Math.pow(1 - progress, 3);
          
          let renderX = ripple.x * canvas.width;
          let renderY = ripple.y * canvas.height;
          
          if (zoom > 1.0) {
            const cropW = 1.0 / zoom;
            const cropH = 1.0 / zoom;
            const maxCropX = 1.0 - cropW;
            const maxCropY = 1.0 - cropH;
            const cropX = Math.max(0, Math.min(maxCropX, centerX - cropW / 2));
            const cropY = Math.max(0, Math.min(maxCropY, centerY - cropH / 2));
            
            renderX = ((ripple.x - cropX) / cropW) * canvas.width;
            renderY = ((ripple.y - cropY) / cropH) * canvas.height;
          }
          
          const maxRadius = canvas.width * 0.024;
          const radius = maxRadius * (0.2 + ease * 0.8);
          const alpha = Math.max(0, 1 - progress);
          
          ctx.save();
          ctx.beginPath();
          ctx.arc(renderX, renderY, radius, 0, Math.PI * 2);
          ctx.strokeStyle = ripple.button === 'right'
            ? `rgba(6, 182, 212, ${alpha * 0.9})`
            : `rgba(168, 85, 247, ${alpha * 0.95})`;
          ctx.lineWidth = canvas.width * 0.0028;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(renderX, renderY, radius * 0.35, 0, Math.PI * 2);
          ctx.fillStyle = ripple.button === 'right'
            ? `rgba(6, 182, 212, ${alpha * 0.5})`
            : `rgba(244, 63, 94, ${alpha * 0.65})`;
          ctx.fill();
          ctx.restore();
        }
      }

      // Draw Live Drawings
      const nowMs = performance.now();
      strokesRef.current = strokesRef.current.filter(s => {
        if (s.fadeDuration === null) return true;
        return nowMs - s.startTime < s.fadeDuration;
      });

      const allStrokes = [...strokesRef.current];
      if (currentStrokeRef.current) {
        allStrokes.push(currentStrokeRef.current);
      }

      for (const stroke of allStrokes) {
        if (stroke.points.length === 0) continue;

        let alpha = 1.0;
        if (stroke.fadeDuration !== null && stroke !== currentStrokeRef.current) {
          const elapsed = nowMs - stroke.startTime;
          if (elapsed > 0) {
            const progress = elapsed / stroke.fadeDuration;
            alpha = Math.max(0, 1 - progress);
          }
        }

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = stroke.tool === 'highlighter' ? alpha * 0.4 : alpha;
        ctx.strokeStyle = stroke.color;
        ctx.fillStyle = stroke.color;
        ctx.lineWidth = canvas.width * stroke.width;

        if (stroke.tool === 'pen' || stroke.tool === 'highlighter') {
          ctx.beginPath();
          const p0 = mapCoord(stroke.points[0].x, stroke.points[0].y);
          ctx.moveTo(p0.x, p0.y);

          if (stroke.points.length === 1) {
            ctx.arc(p0.x, p0.y, ctx.lineWidth / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            for (let i = 1; i < stroke.points.length; i++) {
              const pi = mapCoord(stroke.points[i].x, stroke.points[i].y);
              ctx.lineTo(pi.x, pi.y);
            }
            ctx.stroke();
          }
        } else if (stroke.tool === 'rect') {
          const pStart = mapCoord(stroke.points[0].x, stroke.points[0].y);
          const pEnd = mapCoord(stroke.points[stroke.points.length - 1].x, stroke.points[stroke.points.length - 1].y);
          const rw = pEnd.x - pStart.x;
          const rh = pEnd.y - pStart.y;
          ctx.strokeRect(pStart.x, pStart.y, rw, rh);
        } else if (stroke.tool === 'arrow') {
          const pStart = mapCoord(stroke.points[0].x, stroke.points[0].y);
          const pEnd = mapCoord(stroke.points[stroke.points.length - 1].x, stroke.points[stroke.points.length - 1].y);
          
          ctx.beginPath();
          ctx.moveTo(pStart.x, pStart.y);
          ctx.lineTo(pEnd.x, pEnd.y);
          ctx.stroke();

          const angle = Math.atan2(pEnd.y - pStart.y, pEnd.x - pStart.x);
          const headLen = canvas.width * 0.018;
          ctx.beginPath();
          ctx.moveTo(pEnd.x, pEnd.y);
          ctx.lineTo(
            pEnd.x - headLen * Math.cos(angle - Math.PI / 6),
            pEnd.y - headLen * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            pEnd.x - headLen * Math.cos(angle + Math.PI / 6),
            pEnd.y - headLen * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      }

      // Draw Advanced Webcam Studio Overlay (Squircle, Circle, Rect, Neon Glow & Mirror Mode)
      if (options.showWebcam && webcamVideoRef.current && webcamStreamRef.current && webcamVideoRef.current.readyState >= 2) {
        const wVideo = webcamVideoRef.current.videoWidth;
        const hVideo = webcamVideoRef.current.videoHeight;
        
        if (wVideo > 0 && hVideo > 0) {
          const r = canvas.width * webcamRadiusRef.current;
          const x = canvas.width * webcamPosRef.current.x;
          const y = canvas.height * webcamPosRef.current.y;
          const shape = options.webcamShape || 'circle';
          const haloColor = options.webcamHaloColor || '#8b5cf6';
          const isMirror = options.webcamMirrorMode !== false;
          
          let boxW = r * 2;
          let boxH = r * 2;
          if (shape === 'rect') {
            boxW = r * 2.5;
            boxH = r * 1.5;
          }

          ctx.save();
          ctx.beginPath();
          if (shape === 'circle') {
            ctx.arc(x, y, r, 0, Math.PI * 2, true);
          } else if (shape === 'squircle') {
            if (ctx.roundRect) {
              ctx.roundRect(x - r, y - r, boxW, boxH, r * 0.45);
            } else {
              ctx.arc(x, y, r, 0, Math.PI * 2, true);
            }
          } else if (shape === 'rect') {
            if (ctx.roundRect) {
              ctx.roundRect(x - boxW / 2, y - boxH / 2, boxW, boxH, r * 0.2);
            } else {
              ctx.rect(x - boxW / 2, y - boxH / 2, boxW, boxH);
            }
          }
          ctx.closePath();
          ctx.clip();
          
          // Crop and draw source video with optional Mirror flip
          ctx.save();
          if (isMirror) {
            ctx.translate(x, y);
            ctx.scale(-1, 1);
            ctx.translate(-x, -y);
          }

          if (shape === 'rect') {
            const targetAspect = boxW / boxH;
            const srcAspect = wVideo / hVideo;
            let sx = 0, sy = 0, sWidth = wVideo, sHeight = hVideo;
            if (srcAspect > targetAspect) {
              sWidth = hVideo * targetAspect;
              sx = (wVideo - sWidth) / 2;
            } else {
              sHeight = wVideo / targetAspect;
              sy = (hVideo - sHeight) / 2;
            }
            ctx.drawImage(webcamVideoRef.current, sx, sy, sWidth, sHeight, x - boxW / 2, y - boxH / 2, boxW, boxH);
          } else {
            const minDim = Math.min(wVideo, hVideo);
            const sx = (wVideo - minDim) / 2;
            const sy = (hVideo - minDim) / 2;
            ctx.drawImage(webcamVideoRef.current, sx, sy, minDim, minDim, x - r, y - r, boxW, boxH);
          }
          ctx.restore();
          ctx.restore();

          // Draw Neon Halo & Border
          if (haloColor !== 'none') {
            ctx.save();
            ctx.strokeStyle = haloColor;
            ctx.lineWidth = canvas.width * 0.003;
            if (options.webcamGlow !== false) {
              ctx.shadowColor = haloColor;
              ctx.shadowBlur = canvas.width * 0.012;
            }

            ctx.beginPath();
            if (shape === 'circle') {
              ctx.arc(x, y, r, 0, Math.PI * 2, true);
            } else if (shape === 'squircle') {
              if (ctx.roundRect) {
                ctx.roundRect(x - r, y - r, boxW, boxH, r * 0.45);
              } else {
                ctx.arc(x, y, r, 0, Math.PI * 2, true);
              }
            } else if (shape === 'rect') {
              if (ctx.roundRect) {
                ctx.roundRect(x - boxW / 2, y - boxH / 2, boxW, boxH, r * 0.2);
              } else {
                ctx.rect(x - boxW / 2, y - boxH / 2, boxW, boxH);
              }
            }
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    } catch (err) {
      if (!hasLoggedCompositeErrorRef.current) {
        console.error('Error drawing composite frame:', err);
        hasLoggedCompositeErrorRef.current = true;
      }
    }
  };

  // Start live screen preview without recording (for framing & positioning blur zones)
  const startScreenPreview = async () => {
    try {
      if (isRecording || isPreviewingRef.current) return;
      hasLoggedCompositeErrorRef.current = false;

      // 1. Get Screen Capture Stream
      const screenConstraints = getConstraints();
      const screenStream = await navigator.mediaDevices.getDisplayMedia(screenConstraints);
      screenStreamRef.current = screenStream;

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

      setIsPreviewing(true);
      isPreviewingRef.current = true;

      // Start continuous preview render loop
      const renderPreviewFrame = () => {
        if (!isPreviewingRef.current) return;
        drawCompositeFrame(canvas!);
        animationFrameRef.current = requestAnimationFrame(renderPreviewFrame);
      };
      animationFrameRef.current = requestAnimationFrame(renderPreviewFrame);

    } catch (err) {
      console.warn('Screen preview cancelled or failed:', err);
      stopAllStreams();
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

  // Start screen capture, microphone, and webcam streams
  const startRecording = async () => {
    try {
      chunksRef.current = [];
      setRecordingTime(0);
      hasLoggedCompositeErrorRef.current = false;

      // 1. Get Screen Capture Stream (or reuse active preview stream)
      let screenStream = screenStreamRef.current;
      if (!screenStream || !screenVideoRef.current || screenStream.getVideoTracks().length === 0 || screenStream.getVideoTracks()[0].readyState === 'ended') {
        const screenConstraints = getConstraints();
        screenStream = await navigator.mediaDevices.getDisplayMedia(screenConstraints);
        screenStreamRef.current = screenStream;

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
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      const audioDestination = audioContext.createMediaStreamDestination();
      audioDestinationRef.current = audioDestination;

      // Setup analyser node for visualizer
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      // Do NOT connect to audioContext.destination to avoid sending microphone input to speakers (echo feedback loop)

      // 3. Connect system audio if present in screen stream
      if (options.recordSystemAudio && screenStream.getAudioTracks().length > 0) {
        const sysAudioTrack = screenStream.getAudioTracks()[0];
        const sysAudioStream = new MediaStream([sysAudioTrack]);
        const sysSource = audioContext.createMediaStreamSource(sysAudioStream);
        sysSource.connect(audioDestination);
        sysSource.connect(analyser);
        systemAudioSourceRef.current = sysSource;
      }

      // 4. Connect microphone audio with DSP Filter Chain (Noise Suppression + Vocal Enhancer)
      if (options.recordMic) {
        const micConstraints = {
          audio: options.selectedMicId 
            ? { 
                deviceId: options.selectedMicId, 
                echoCancellation: true, 
                noiseSuppression: options.enableNoiseSuppression !== false, 
                autoGainControl: true 
              }
            : { 
                echoCancellation: true, 
                noiseSuppression: options.enableNoiseSuppression !== false, 
                autoGainControl: true 
              }
        };
        let micStream: MediaStream;
        try {
          micStream = await navigator.mediaDevices.getUserMedia(micConstraints);
        } catch (e) {
          console.warn('Failed to get mic with preferred deviceId, falling back to default:', e);
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: { 
              echoCancellation: true, 
              noiseSuppression: options.enableNoiseSuppression !== false, 
              autoGainControl: true 
            }
          });
        }
        micStreamRef.current = micStream;

        const micSource = audioContext.createMediaStreamSource(micStream);
        micSourceRef.current = micSource;

        let lastNode: AudioNode = micSource;

        // DSP Filter 1: Anti-Rumble High-Pass Filter (Cuts 0-85Hz HVAC/Fan rumble and desk bumps)
        if (options.enableNoiseSuppression !== false) {
          const highPass = audioContext.createBiquadFilter();
          highPass.type = 'highpass';
          highPass.frequency.value = 85;
          highPass.Q.value = 0.7;
          lastNode.connect(highPass);
          lastNode = highPass;
        }

        // DSP Filter 2: Studio Vocal Presence & Clarity Boost
        if (options.enableVocalEnhancer !== false) {
          const vocalPresence = audioContext.createBiquadFilter();
          vocalPresence.type = 'peaking';
          vocalPresence.frequency.value = 3200;
          vocalPresence.Q.value = 1.2;
          vocalPresence.gain.value = 3.5; // +3.5dB speech intelligibility
          lastNode.connect(vocalPresence);
          lastNode = vocalPresence;

          // DSP Filter 3: Studio Dynamics Compressor & Limiter (Leveler for broadcast clarity)
          const compressor = audioContext.createDynamicsCompressor();
          compressor.threshold.value = -24;
          compressor.knee.value = 10;
          compressor.ratio.value = 4;
          compressor.attack.value = 0.003;
          compressor.release.value = 0.15;
          lastNode.connect(compressor);
          lastNode = compressor;
        }

        // DSP Filter 4: Output Gain Control
        const gainNode = audioContext.createGain();
        gainNode.gain.value = options.micGain !== undefined ? options.micGain : 1.15;
        lastNode.connect(gainNode);
        lastNode = gainNode;

        lastNode.connect(audioDestination);
        lastNode.connect(analyser);

        // Monitor mic audio levels (simple visualizer value)
        const micAnalyser = audioContext.createAnalyser();
        micAnalyser.fftSize = 32;
        lastNode.connect(micAnalyser);
        const dataArray = new Uint8Array(micAnalyser.frequencyBinCount);
        
        const updateLevel = () => {
          if (!isRecording) return;
          micAnalyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          setMicLevel(average / 255); // Normalize to 0-1
          requestAnimationFrame(updateLevel);
        };
        setTimeout(updateLevel, 100);
      }

      // 5. Get webcam stream if enabled
      if (options.showWebcam) {
        try {
          let webcamStream: MediaStream | null = null;
          
          if (options.selectedCamId) {
            try {
              webcamStream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: options.selectedCamId }, width: { ideal: 640 }, height: { ideal: 480 } }
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
          webcamVideo.playsInline = true;
          webcamVideo.style.position = 'fixed';
          webcamVideo.style.top = '-9999px';
          webcamVideo.style.left = '-9999px';
          webcamVideo.style.width = '320px';
          webcamVideo.style.height = '240px';
          webcamVideo.style.opacity = '0.01';
          webcamVideo.style.pointerEvents = 'none';
          document.body.appendChild(webcamVideo);
          try {
            await webcamVideo.play();
            webcamVideoRef.current = webcamVideo;
          } catch (playErr) {
            console.error('Failed to play webcam video element, stopping tracks:', playErr);
            webcamStream.getTracks().forEach(t => t.stop());
            webcamStreamRef.current = null;
            webcamVideo.remove();
          }
        } catch (err) {
          console.warn('Webcam access failed or denied:', err);
        }
      }

      // 6. Setup Canvas Compositing Engine
      const canvas = document.createElement('canvas');
      const screenSettings = screenStream.getVideoTracks()[0].getSettings();
      const screenWidth = screenSettings.width || 1920;
      const screenHeight = screenSettings.height || 1080;
      
      // Determine maximum resolution limits based on user configuration selection
      let maxW = 1920;
      let maxH = 1080;
      if (options.resolution === '720p') {
        maxW = 1280;
        maxH = 720;
      } else if (options.resolution === '4k') {
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
      canvasRef.current = canvas;

      // GPU-accelerated 2D context with no alpha channel for maximum performance
      const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
      }
      
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
      
      worker.postMessage({ action: 'start', fps: options.frameRate });

      // 7. Get video track for recording (always use composited canvas to capture Zoom, Spotlight, and Webcam)
      const canvasStream = canvas.captureStream(options.frameRate);
      const videoTrack = canvasStream.getVideoTracks()[0];

      // Combine video track and mixed audio tracks (only single composited video track)
      const outputTracks = [videoTrack];
      
      if (options.recordMic || options.recordSystemAudio) {
        const mixedAudioTracks = audioDestination.stream.getAudioTracks();
        if (mixedAudioTracks.length > 0) {
          outputTracks.push(mixedAudioTracks[0]);
        }
      }

      const outputStream = new MediaStream(outputTracks);

      // 8. Create MediaRecorder
      let selectedCodec: string = options.codec;
      if (!MediaRecorder.isTypeSupported(selectedCodec)) {
        console.warn(`${selectedCodec} not supported, falling back to default webm`);
        selectedCodec = 'video/webm';
      }

      const mediaRecorder = new MediaRecorder(outputStream, {
        mimeType: selectedCodec,
        videoBitsPerSecond: options.resolution === '4k' ? 16000000 : options.resolution === '1080p' ? 8000000 : 4000000
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

      // Start 3-second Countdown (giving time for Windows Camera OSD to display and vanish before recording)
      setCountdown(3);
      let count = 3;
      
      countdownTimerRef.current = window.setInterval(() => {
        count -= 1;
        if (count > 0) {
          setCountdown(count);
        } else {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          setCountdown(null);
          
          try {
            // Start recording chunks every 1 second
            mediaRecorder.start(1000);
            setIsRecording(true);
            setIsPaused(false);

            // Start Timer
            timerIntervalRef.current = window.setInterval(() => {
              setRecordingTime(prev => prev + 1);
            }, 1000);
          } catch (recErr) {
            console.error('Failed to start MediaRecorder:', recErr);
            stopAllStreams();
          }
        }
      }, 1000);

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
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
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

    setIsRecording(false);
    setIsPaused(false);
    setMicLevel(0);
  };

  // Finalize video generation, create thumbnail, and save to IndexedDB
  const finalizeRecording = async (canvasElement: HTMLCanvasElement) => {
    const videoBlob = new Blob(chunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'video/webm' });
    const finalDuration = recordingTime;
    const finalSize = videoBlob.size;
    
    // Generate thumbnail from canvas
    let thumbnailBase64 = '';
    try {
      // Create smaller canvas for thumbnail
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 320;
      thumbCanvas.height = 180;
      const thumbCtx = thumbCanvas.getContext('2d');
      if (thumbCtx) {
        thumbCtx.drawImage(canvasElement, 0, 0, 320, 180);
        thumbnailBase64 = thumbCanvas.toDataURL('image/jpeg', 0.7);
      }
    } catch (e) {
      console.error('Failed to generate thumbnail:', e);
    }

    // Stop all raw camera/mic/screen capture tracks
    stopAllStreams();

    // Save to IndexedDB
    const dateStr = new Date().toISOString();
    const formattedDate = new Date().toLocaleString();
    const newVideo: SavedVideo = {
      id: crypto.randomUUID(),
      title: `Enregistrement du ${formattedDate}`,
      blob: videoBlob,
      duration: finalDuration,
      size: finalSize,
      date: dateStr,
      thumbnail: thumbnailBase64
    };

    try {
      await saveRecording(newVideo);
      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (err) {
      console.error('Failed to save video to database:', err);
    }
  };

  // Helper to drag webcam bubble inside live preview canvas
  // Expects client mouse X/Y and rect of the canvas element
  const updateWebcamPosition = (clientX: number, clientY: number, canvasBoundingRect: DOMRect) => {
    if (!canvasRef.current) return;
    
    const clickX = (clientX - canvasBoundingRect.left) / canvasBoundingRect.width;
    const clickY = (clientY - canvasBoundingRect.top) / canvasBoundingRect.height;
    
    // Constrain position between radius and 1 - radius
    const rX = webcamRadiusRef.current;
    const rY = webcamRadiusRef.current * (canvasBoundingRect.width / canvasBoundingRect.height);
    
    webcamPosRef.current = {
      x: Math.max(rX, Math.min(1 - rX, clickX)),
      y: Math.max(rY, Math.min(1 - rY, clickY))
    };
  };

  const setWebcamSizePercentage = (percent: number) => {
    // scale radius (range: 0.04 to 0.15)
    webcamRadiusRef.current = Math.max(0.04, Math.min(0.15, percent));
  };

  const toggleZoom = (targetX = 0.5, targetY = 0.5) => {
    if (!isZoomedRef.current) {
      // Zoom in centered on target cursor coordinates
      isZoomedRef.current = true;
      targetZoomCenterRef.current = { x: targetX, y: targetY };
      setIsZoomed(true);
    } else {
      // Zoom out back to full screen
      isZoomedRef.current = false;
      setIsZoomed(false);
    }
  };

  const setZoomCenter = (targetX: number, targetY: number) => {
    targetZoomCenterRef.current = { x: targetX, y: targetY };
    if (!isZoomedRef.current) {
      isZoomedRef.current = true;
      setIsZoomed(true);
    }
  };

  const setZoomFactor = (factor: number) => {
    zoomFactorRef.current = factor;
    setZoomFactorState(factor);
  };

  const toggleSpotlight = () => {
    const nextState = !isSpotlightRef.current;
    isSpotlightRef.current = nextState;
    setIsSpotlight(nextState);
  };

  const addClickRipple = (x: number, y: number, button = 'left') => {
    if (!options.showMouseClicks) return;
    ripplesRef.current.push({
      id: Math.random(),
      x,
      y,
      startTime: performance.now(),
      button,
      duration: 450
    });
  };

  // Drawing Stroke Helpers
  const toggleDrawingMode = async () => {
    const next = !isDrawingModeRef.current;
    isDrawingModeRef.current = next;
    setIsDrawingMode(next);

    if (next) {
      // Freeze the exact screen frame at the moment drawing starts
      if (screenVideoRef.current && screenVideoRef.current.readyState >= 2) {
        const fc = document.createElement('canvas');
        fc.width = screenVideoRef.current.videoWidth || canvasRef.current?.width || 1920;
        fc.height = screenVideoRef.current.videoHeight || canvasRef.current?.height || 1080;
        const fctx = fc.getContext('2d');
        if (fctx) {
          fctx.drawImage(screenVideoRef.current, 0, 0, fc.width, fc.height);
          freezeFrameRef.current = fc;

          // Emit snapshot to overlay window so desktop displays frozen screenshot
          try {
            const dataUrl = fc.toDataURL('image/jpeg', 0.92);
            const { emit } = await import('@tauri-apps/api/event');
            await emit('freeze-snapshot', { image: dataUrl });
          } catch (e) {}
        }
      }
    } else {
      // Unfreeze
      freezeFrameRef.current = null;
      try {
        const { emit } = await import('@tauri-apps/api/event');
        await emit('unfreeze-snapshot', {});
      } catch (e) {}
    }
  };

  const clearDrawings = () => {
    strokesRef.current = [];
    currentStrokeRef.current = null;
  };

  const addBlurMask = (mask: BlurMask) => {
    setBlurMasks(prev => [...prev, mask]);
    blurMasksRef.current = [...blurMasksRef.current, mask];
  };

  const removeBlurMask = (id: number) => {
    setBlurMasks(prev => prev.filter(m => m.id !== id));
    blurMasksRef.current = blurMasksRef.current.filter(m => m.id !== id);
  };

  const updateBlurMask = (id: number, updates: Partial<BlurMask>) => {
    setBlurMasks(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    blurMasksRef.current = blurMasksRef.current.map(m => m.id === id ? { ...m, ...updates } : m);
  };

  const clearBlurMasks = () => {
    setBlurMasks([]);
    blurMasksRef.current = [];
  };

  const startDrawingStroke = (x: number, y: number) => {
    const newStroke: DrawingStroke = {
      id: Math.random(),
      tool: drawToolRef.current,
      color: drawColorRef.current,
      width: drawToolRef.current === 'highlighter' ? 0.022 : 0.0035,
      points: [{ x, y }],
      startTime: performance.now(),
      fadeDuration: isAutoFadeRef.current ? 3500 : null
    };
    currentStrokeRef.current = newStroke;
  };

  const updateDrawingStroke = (x: number, y: number) => {
    if (!currentStrokeRef.current) return;
    currentStrokeRef.current.points.push({ x, y });
  };

  const endDrawingStroke = () => {
    if (currentStrokeRef.current) {
      currentStrokeRef.current.startTime = performance.now();
      strokesRef.current.push(currentStrokeRef.current);
      currentStrokeRef.current = null;
    }
  };

  // Native OS-wide Global Hotkeys, Click, and Draw listeners (emitted from Rust backend)
  useEffect(() => {
    let unlistenZoom: (() => void) | null = null;
    let unlistenClick: (() => void) | null = null;
    let unlistenDraw: (() => void) | null = null;
    let unlistenDrawStart: (() => void) | null = null;
    let unlistenDrawPoint: (() => void) | null = null;
    let unlistenDrawEnd: (() => void) | null = null;
    let unlistenClear: (() => void) | null = null;
    let unlistenAddBlur: (() => void) | null = null;
    let unlistenClearBlur: (() => void) | null = null;

    async function setupTauriListener() {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        
        unlistenZoom = await listen<{ x: number; y: number }>('toggle-zoom', (event) => {
          if (event.payload && typeof event.payload.x === 'number' && typeof event.payload.y === 'number') {
            toggleZoom(event.payload.x, event.payload.y);
          } else {
            toggleZoom();
          }
        });

        unlistenClick = await listen<{ x: number; y: number; button: string }>('mouse-click', (event) => {
          if (event.payload && typeof event.payload.x === 'number' && typeof event.payload.y === 'number') {
            addClickRipple(event.payload.x, event.payload.y, event.payload.button || 'left');
          }
        });

        unlistenDraw = await listen('toggle-draw', () => {
          toggleDrawingMode();
        });

        unlistenDrawStart = await listen<{ x: number; y: number }>('draw-start', (event) => {
          if (isDrawingModeRef.current && event.payload && typeof event.payload.x === 'number') {
            startDrawingStroke(event.payload.x, event.payload.y);
          }
        });

        unlistenDrawPoint = await listen<{ x: number; y: number }>('draw-point', (event) => {
          if (isDrawingModeRef.current && event.payload && typeof event.payload.x === 'number') {
            updateDrawingStroke(event.payload.x, event.payload.y);
          }
        });

        unlistenDrawEnd = await listen('draw-end', () => {
          if (isDrawingModeRef.current) {
            endDrawingStroke();
          }
        });

        unlistenClear = await listen('clear-drawings', () => {
          clearDrawings();
        });

        unlistenAddBlur = await listen<BlurMask>('add-blur-mask', (event) => {
          if (event.payload) {
            addBlurMask(event.payload);
          }
        });

        unlistenClearBlur = await listen('clear-blur-masks', () => {
          clearBlurMasks();
        });
      } catch (err) {
        // Fallback if running in pure web browser
      }
    }

    setupTauriListener();

    return () => {
      if (unlistenZoom) unlistenZoom();
      if (unlistenClick) unlistenClick();
      if (unlistenDraw) unlistenDraw();
      if (unlistenDrawStart) unlistenDrawStart();
      if (unlistenDrawPoint) unlistenDrawPoint();
      if (unlistenDrawEnd) unlistenDrawEnd();
      if (unlistenClear) unlistenClear();
      if (unlistenAddBlur) unlistenAddBlur();
      if (unlistenClearBlur) unlistenClearBlur();
    };
  }, [options.showMouseClicks]);

  // In-window Keyboard shortcut listener for Alt+Z, Alt+D, Alt+C, F9, or Z key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const isAltZ = (e.altKey && e.key?.toLowerCase() === 'z') || e.code === 'F9';
      const isAltD = (e.altKey && e.key?.toLowerCase() === 'd') || e.code === 'F8';
      const isAltC = (e.altKey && e.key?.toLowerCase() === 'c') || e.code === 'F10';
      const isZ = e.key?.toLowerCase() === 'z' || e.code === 'KeyZ' || e.code === 'KeyW';
      
      if (isAltD) {
        e.preventDefault();
        toggleDrawingMode();
      } else if (isAltC) {
        e.preventDefault();
        clearDrawings();
      } else if ((isAltZ || isZ) && (isRecording || isZoomedRef.current || canvasRef.current !== null)) {
        e.preventDefault();
        toggleZoom();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording]);

  const cancelCountdown = () => {
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
    webcamRadius: webcamRadiusRef.current
  };
}
