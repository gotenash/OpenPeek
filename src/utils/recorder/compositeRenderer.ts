import type { RecorderOptions, BlurMask, DrawingStroke } from '../../hooks/useRecorder';
import { webcamSegmenter } from '../webcamSegmenter';

export interface CompositeRendererState {
  options: RecorderOptions;
  isZoomed: boolean;
  zoomFactor: number;
  currentZoom: { current: number };
  targetZoomCenter: { current: { x: number; y: number } };
  currentZoomCenter: { current: { x: number; y: number } };
  isDrawingMode: boolean;
  freezeFrame: HTMLCanvasElement | null;
  screenVideo: HTMLVideoElement | null;
  blurMasks: BlurMask[];
  blurOffscreenCanvas: { current: HTMLCanvasElement | null };
  isSpotlight: boolean;
  ripples: { current: Array<{ id: number; x: number; y: number; startTime: number; button: string; duration: number }> };
  strokes: { current: DrawingStroke[] };
  currentStroke: DrawingStroke | null;
  webcamVideo: HTMLVideoElement | null;
  webcamStream: MediaStream | null;
  webcamRadius: { current: number };
  webcamPos: { current: { x: number; y: number } };
  hasReceivedCursor: boolean;
  currentCursorPos: { current: { x: number; y: number } };
  targetCursorPos: { current: { x: number; y: number } };
  cursorClickScale: { current: number };
  activeKeystrokes: { current: Array<{ id: number; combo: string; startTime: number; duration: number }> };
  hasLoggedCompositeError: { current: boolean };
}

export function drawCompositeFrame(canvas: HTMLCanvasElement, state: CompositeRendererState): void {
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!ctx) return;

  try {
    // 1. Interpolate smooth Zoom and Center (Lerp 60 FPS)
    const targetZoom = state.isZoomed ? state.zoomFactor : 1.0;
    state.currentZoom.current += (targetZoom - state.currentZoom.current) * 0.14;
    
    state.currentZoomCenter.current.x += (state.targetZoomCenter.current.x - state.currentZoomCenter.current.x) * 0.14;
    state.currentZoomCenter.current.y += (state.targetZoomCenter.current.y - state.currentZoomCenter.current.y) * 0.14;
    
    const zoom = state.currentZoom.current;
    const centerX = state.currentZoomCenter.current.x;
    const centerY = state.currentZoomCenter.current.y;

    // Draw screen capture (with Zoom transformation and Freeze Frame support)
    const sourceElement: HTMLVideoElement | HTMLCanvasElement | null = 
      (state.isDrawingMode && state.freezeFrame) 
        ? state.freezeFrame 
        : state.screenVideo;

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
    for (const mask of state.blurMasks) {
      const pStart = mapCoord(mask.x, mask.y);
      const pEnd = mapCoord(mask.x + mask.width, mask.y + mask.height);
      const minX = Math.min(pStart.x, pEnd.x);
      const minY = Math.min(pStart.y, pEnd.y);
      const rw = Math.abs(pEnd.x - pStart.x);
      const rh = Math.abs(pEnd.y - pStart.y);

      if (rw > 4 && rh > 4) {
        if (!state.blurOffscreenCanvas.current) {
          state.blurOffscreenCanvas.current = document.createElement('canvas');
        }
        const offCanvas = state.blurOffscreenCanvas.current;
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
    if (state.isSpotlight && zoom > 1.05) {
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
    const opts = state.options;
    if (opts.showMouseClicks && state.ripples.current.length > 0) {
      const now = performance.now();
      state.ripples.current = state.ripples.current.filter(r => now - r.startTime < r.duration);
      
      for (const ripple of state.ripples.current) {
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
    state.strokes.current = state.strokes.current.filter(s => {
      if (s.fadeDuration === null) return true;
      return nowMs - s.startTime < s.fadeDuration;
    });

    const allStrokes = [...state.strokes.current];
    if (state.currentStroke) {
      allStrokes.push(state.currentStroke);
    }

    for (const stroke of allStrokes) {
      if (stroke.points.length === 0) continue;

      let alpha = 1.0;
      if (stroke.fadeDuration !== null && stroke !== state.currentStroke) {
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
        const pts = stroke.points;
        const p0 = mapCoord(pts[0].x, pts[0].y);

        if (pts.length === 1) {
          ctx.beginPath();
          ctx.arc(p0.x, p0.y, ctx.lineWidth / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (pts.length === 2) {
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          const p1 = mapCoord(pts[1].x, pts[1].y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          for (let i = 1; i < pts.length - 1; i++) {
            const pi = mapCoord(pts[i].x, pts[i].y);
            const pNext = mapCoord(pts[i + 1].x, pts[i + 1].y);
            const xc = (pi.x + pNext.x) / 2;
            const yc = (pi.y + pNext.y) / 2;
            ctx.quadraticCurveTo(pi.x, pi.y, xc, yc);
          }
          const last = mapCoord(pts[pts.length - 1].x, pts[pts.length - 1].y);
          const prev = mapCoord(pts[pts.length - 2].x, pts[pts.length - 2].y);
          ctx.quadraticCurveTo(prev.x, prev.y, last.x, last.y);
          ctx.stroke();
        }
      } else if (stroke.tool === 'rect') {
        const pStart = mapCoord(stroke.points[0].x, stroke.points[0].y);
        const pEnd = mapCoord(stroke.points[stroke.points.length - 1].x, stroke.points[stroke.points.length - 1].y);
        const minX = Math.min(pStart.x, pEnd.x);
        const minY = Math.min(pStart.y, pEnd.y);
        const rw = Math.abs(pEnd.x - pStart.x);
        const rh = Math.abs(pEnd.y - pStart.y);
        ctx.strokeRect(minX, minY, rw, rh);
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
    if (opts.showWebcam && state.webcamVideo && state.webcamStream) {
      const wVideo = state.webcamVideo.videoWidth;
      const hVideo = state.webcamVideo.videoHeight;
      
      if (wVideo > 0 && hVideo > 0) {
        const r = canvas.width * state.webcamRadius.current;
        const x = canvas.width * state.webcamPos.current.x;
        const y = canvas.height * state.webcamPos.current.y;
        const shape = opts.webcamShape || 'circle';
        const haloColor = opts.webcamHaloColor || '#8b5cf6';
        const isMirror = opts.webcamMirrorMode !== false;
        
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

        // Determine if background segmentation/blur effect is active
        let sourceDrawable: CanvasImageSource = state.webcamVideo;
        if (opts.webcamBackgroundEffect && opts.webcamBackgroundEffect !== 'none') {
          const processed = webcamSegmenter.processFrame(
            state.webcamVideo, 
            opts.webcamBackgroundEffect,
            opts.webcamVirtualBg,
            opts.webcamCustomBgImage
          );
          if (processed) {
            sourceDrawable = processed;
          }
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
          ctx.drawImage(sourceDrawable, sx, sy, sWidth, sHeight, x - boxW / 2, y - boxH / 2, boxW, boxH);
        } else {
          const minDim = Math.min(wVideo, hVideo);
          const sx = (wVideo - minDim) / 2;
          const sy = (hVideo - minDim) / 2;
          ctx.drawImage(sourceDrawable, sx, sy, minDim, minDim, x - r, y - r, boxW, boxH);
        }
        ctx.restore();
        ctx.restore();

        // Draw Neon Halo & Border
        if (haloColor !== 'none') {
          ctx.save();
          ctx.strokeStyle = haloColor;
          ctx.lineWidth = canvas.width * 0.003;
          if (opts.webcamGlow !== false) {
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

    // 5. Draw Cinematic Smoothed Vector Cursor (Screen Studio Style)
    if (opts.enableCinematicCursor !== false && state.hasReceivedCursor) {
      let smoothingRate = 0.28;
      if (opts.cursorSmoothingSpeed === 'smooth') smoothingRate = 0.16;
      else if (opts.cursorSmoothingSpeed === 'direct') smoothingRate = 0.58;

      state.currentCursorPos.current.x += (state.targetCursorPos.current.x - state.currentCursorPos.current.x) * smoothingRate;
      state.currentCursorPos.current.y += (state.targetCursorPos.current.y - state.currentCursorPos.current.y) * smoothingRate;

      state.cursorClickScale.current += (1.0 - state.cursorClickScale.current) * 0.25;

      let curX = state.currentCursorPos.current.x * canvas.width;
      let curY = state.currentCursorPos.current.y * canvas.height;

      if (zoom > 1.0) {
        const cropW = 1.0 / zoom;
        const cropH = 1.0 / zoom;
        const maxCropX = 1.0 - cropW;
        const maxCropY = 1.0 - cropH;
        const cropX = Math.max(0, Math.min(maxCropX, centerX - cropW / 2));
        const cropY = Math.max(0, Math.min(maxCropY, centerY - cropH / 2));

        curX = ((state.currentCursorPos.current.x - cropX) / cropW) * canvas.width;
        curY = ((state.currentCursorPos.current.y - cropY) / cropH) * canvas.height;
      }

      let sizeMultiplier = 1.35;
      if (opts.cursorSize === 'normal') sizeMultiplier = 1.0;
      else if (opts.cursorSize === 'xlarge') sizeMultiplier = 1.7;

      const baseScale = (canvas.width / 1920) * sizeMultiplier * state.cursorClickScale.current;

      ctx.save();
      ctx.translate(curX, curY);
      ctx.scale(baseScale, baseScale);

      ctx.shadowColor = 'rgba(0, 0, 0, 0.42)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2.5;
      ctx.shadowOffsetY = 4.5;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 20);
      ctx.lineTo(5.2, 16.2);
      ctx.lineTo(9.5, 24);
      ctx.lineTo(13.2, 22.2);
      ctx.lineTo(8.8, 14.6);
      ctx.lineTo(15.2, 14.6);
      ctx.closePath();

      ctx.fillStyle = '#0f172a';
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.restore();
    }

    // 6. Draw Live Keystroke Visualizer HUD (Keycaps on Video)
    if (opts.enableKeystrokeHUD !== false && state.activeKeystrokes.current.length > 0) {
      const now = performance.now();
      state.activeKeystrokes.current = state.activeKeystrokes.current.filter(k => now - k.startTime < k.duration);

      if (state.activeKeystrokes.current.length > 0) {
        const latest = state.activeKeystrokes.current[state.activeKeystrokes.current.length - 1];
        const elapsed = now - latest.startTime;
        const progress = elapsed / latest.duration;
        
        let alpha = 1.0;
        if (progress > 0.75) {
          alpha = Math.max(0, 1.0 - (progress - 0.75) / 0.25);
        }

        const parts = latest.combo.split(' + ');
        const fontSize = Math.max(14, canvas.width * 0.013);
        const keyPadX = fontSize * 0.8;
        const keyPadY = fontSize * 0.45;
        const keyGap = fontSize * 0.5;

        ctx.save();
        ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`;
        ctx.globalAlpha = alpha;

        let totalWidth = 0;
        const keyWidths: number[] = [];
        for (const part of parts) {
          const w = ctx.measureText(part).width + keyPadX * 2;
          keyWidths.push(w);
          totalWidth += w;
        }
        const plusWidth = ctx.measureText('+').width;
        const numSeparators = Math.max(0, parts.length - 1);
        totalWidth += numSeparators * (plusWidth + keyGap * 2);

        const containerPadding = fontSize * 0.75;
        const boxWidth = totalWidth + containerPadding * 2;
        const boxHeight = fontSize + keyPadY * 2 + containerPadding * 1.2;

        const pos = opts.keystrokeHUDPosition || 'bottom-center';
        let startX = (canvas.width - boxWidth) / 2;
        let startY = canvas.height - boxHeight - canvas.height * 0.07;

        if (pos === 'bottom-left') {
          startX = canvas.width * 0.04;
          startY = canvas.height - boxHeight - canvas.height * 0.07;
        } else if (pos === 'bottom-right') {
          startX = canvas.width - boxWidth - canvas.width * 0.04;
          startY = canvas.height - boxHeight - canvas.height * 0.07;
        } else if (pos === 'top-right') {
          startX = canvas.width - boxWidth - canvas.width * 0.04;
          startY = canvas.height * 0.06;
        }

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 6;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1.5;

        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(startX, startY, boxWidth, boxHeight, 14);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(startX, startY, boxWidth, boxHeight);
          ctx.strokeRect(startX, startY, boxWidth, boxHeight);
        }
        ctx.restore();

        let curItemX = startX + containerPadding;
        const itemY = startY + (boxHeight - (fontSize + keyPadY * 2)) / 2;

        for (let i = 0; i < parts.length; i++) {
          const kw = keyWidths[i];
          const kh = fontSize + keyPadY * 2;

          ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.lineWidth = 1.2;

          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(curItemX, itemY, kw, kh, 6);
            ctx.fill();
            ctx.stroke();
          } else {
            ctx.fillRect(curItemX, itemY, kw, kh);
            ctx.strokeRect(curItemX, itemY, kw, kh);
          }

          ctx.fillStyle = '#f8fafc';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(parts[i], curItemX + kw / 2, itemY + kh / 2 + 1);

          curItemX += kw;

          if (i < parts.length - 1) {
            curItemX += keyGap;
            ctx.fillStyle = 'rgba(148, 163, 184, 0.75)';
            ctx.fillText('+', curItemX + plusWidth / 2, itemY + kh / 2);
            curItemX += plusWidth + keyGap;
          }
        }

        ctx.restore();
      }
    }
  } catch (err) {
    if (!state.hasLoggedCompositeError.current) {
      console.error('Error drawing composite frame:', err);
      state.hasLoggedCompositeError.current = true;
    }
  }
}
