import React, { useState, useEffect, useRef } from 'react';
import type { DrawTool } from '../hooks/useRecorder';
import { DrawingPalette } from './overlay/DrawingPalette';
import { ZoomFeedbackOverlay } from './overlay/ZoomFeedbackOverlay';
import { KeystrokeHUDOverlay } from './overlay/KeystrokeHUDOverlay';
import { CountdownOverlay } from './overlay/CountdownOverlay';
import { CinemaWrapOverlay } from './overlay/CinemaWrapOverlay';

export function OverlayCanvas() {
  const [tool, setTool] = useState<DrawTool>('pen');
  const [color, setColor] = useState('#f43f5e');
  const [isAutoFade, setIsAutoFade] = useState(true);
  const [isSmoothing, setIsSmoothing] = useState(true);
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [cutAnimation, setCutAnimation] = useState<{ active: boolean; duration: number } | null>(null);
  const [zoomToast, setZoomToast] = useState<{ zoomed: boolean; factor: number } | null>(null);
  const [keystrokeToast, setKeystrokeToast] = useState<string | null>(null);
  const [isZoomCornerActive, setIsZoomCornerActive] = useState(false);
  const [activeZoomFactor, setActiveZoomFactor] = useState(2.0);
  const zoomToastTimeoutRef = useRef<any>(null);
  const keystrokeToastTimeoutRef = useRef<any>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<{ tool: DrawTool; color: string; points: Array<{ x: number; y: number }>; startTime: number } | null>(null);
  const strokesRef = useRef<Array<{ id: number; tool: DrawTool; color: string; width: number; points: Array<{ x: number; y: number }>; startTime: number; fadeDuration: number | null }>>([]);
  const persistentBlurMasksRef = useRef<Array<{ id: number; x: number; y: number; width: number; height: number }>>([]);

  // Listen to freeze-snapshot, countdown ticks, and cut animation from recorder engine
  useEffect(() => {
    let unlistenFreeze: (() => void) | null = null;
    let unlistenUnfreeze: (() => void) | null = null;
    let unlistenExit: (() => void) | null = null;
    let unlistenDrawingMode: (() => void) | null = null;
    let unlistenTick: (() => void) | null = null;
    let unlistenEnd: (() => void) | null = null;
    let unlistenCut: (() => void) | null = null;
    let unlistenZoomHud: (() => void) | null = null;
    let unlistenKeystrokeHud: (() => void) | null = null;
    let unlistenClear: (() => void) | null = null;
    let unlistenSyncSettings: (() => void) | null = null;

    async function setupListeners() {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        unlistenSyncSettings = await listen<{ tool?: DrawTool; color?: string; isAutoFade?: boolean }>('sync-draw-settings', (event) => {
          if (event.payload) {
            if (event.payload.tool) setTool(event.payload.tool);
            if (event.payload.color) setColor(event.payload.color);
            if (typeof event.payload.isAutoFade === 'boolean') setIsAutoFade(event.payload.isAutoFade);
          }
        });
        unlistenFreeze = await listen<{ image: string }>('freeze-snapshot', (event) => {
          if (event.payload?.image) {
            setSnapshotUrl(event.payload.image);
            setIsDrawingActive(true);
          }
        });
        unlistenUnfreeze = await listen('unfreeze-snapshot', () => {
          setSnapshotUrl(null);
          setIsDrawingActive(false);
        });
        unlistenExit = await listen('exit-draw', () => {
          setSnapshotUrl(null);
          setIsDrawingActive(false);
          strokesRef.current = [];
          currentStrokeRef.current = null;
        });
        unlistenDrawingMode = await listen<{ active: boolean }>('set-drawing-mode', (event) => {
          const active = !!event.payload?.active;
          setIsDrawingActive(active);
          if (!active) {
            setSnapshotUrl(null);
            strokesRef.current = [];
            currentStrokeRef.current = null;
          }
        });
        unlistenClear = await listen('clear-drawings', () => {
          strokesRef.current = [];
          currentStrokeRef.current = null;
        });
        unlistenTick = await listen<{ count: number }>('countdown-tick', (event) => {
          if (typeof event.payload?.count === 'number') {
            setCountdownValue(event.payload.count);
          }
        });
        unlistenEnd = await listen('countdown-end', () => {
          setCountdownValue(null);
        });
        unlistenZoomHud = await listen<{ 
          zoomed: boolean; 
          factor: number;
          showToast?: boolean;
          showCorner?: boolean;
        }>('zoom-hud', async (event) => {
          if (event.payload) {
            const isZoomed = Boolean(event.payload.zoomed);
            const factor = Number(event.payload.factor) || 2.0;
            const showToast = event.payload.showToast !== false;
            const showCorner = event.payload.showCorner !== false;

            setIsZoomCornerActive(isZoomed && showCorner);
            setActiveZoomFactor(factor);

            if (showToast) {
              setZoomToast({ zoomed: isZoomed, factor });

              if (zoomToastTimeoutRef.current) {
                clearTimeout(zoomToastTimeoutRef.current);
              }
              zoomToastTimeoutRef.current = setTimeout(async () => {
                setZoomToast(null);
                if (!(isZoomed && showCorner) && !isDrawingRef.current && !snapshotUrl && countdownValue === null && !cutAnimation) {
                  try {
                    const { invoke } = await import('@tauri-apps/api/core');
                    await invoke('hide_overlay');
                  } catch (err) {
                    console.debug('[Overlay] Failed to invoke hide_overlay:', err);
                  }
                }
              }, 1400);
            } else if (!isZoomed && !isDrawingRef.current && !snapshotUrl) {
              try {
                const { invoke } = await import('@tauri-apps/api/core');
                await invoke('hide_overlay');
              } catch (err) {
                console.debug('[Overlay] Failed to invoke hide_overlay:', err);
              }
            }
          }
        });

        unlistenKeystrokeHud = await listen<{ combo: string }>('keystroke-hud', (event) => {
          if (event.payload?.combo) {
            const combo = event.payload.combo;
            if (
              combo === 'Alt + R' || combo === 'F6' ||
              combo === 'Alt + P' || combo === 'F7' ||
              combo === 'Alt + Z' || combo === 'F9' ||
              combo === 'Alt + D' || combo === 'F8' ||
              combo === 'Alt + C' || combo === 'F10'
            ) {
              return;
            }

            setKeystrokeToast(combo);
            if (keystrokeToastTimeoutRef.current) {
              clearTimeout(keystrokeToastTimeoutRef.current);
            }
            keystrokeToastTimeoutRef.current = setTimeout(async () => {
              setKeystrokeToast(null);
              if (!isDrawingRef.current && !snapshotUrl && countdownValue === null && !cutAnimation) {
                try {
                  const { invoke } = await import('@tauri-apps/api/core');
                  await invoke('hide_overlay');
                } catch (err) {
                  console.debug('[Overlay] Failed to invoke hide_overlay:', err);
                }
              }
            }, 2200);
          }
        });

        unlistenCut = await listen<{ duration: number }>('recording-stopped-animation', (event) => {
          setCountdownValue(null);
          setIsDrawingActive(false);
          setIsZoomCornerActive(false);
          setZoomToast(null);
          setKeystrokeToast(null);
          setSnapshotUrl(null);
          strokesRef.current = [];
          currentStrokeRef.current = null;
          setCutAnimation({ active: true, duration: event.payload?.duration || 0 });
          setTimeout(async () => {
            setCutAnimation(null);
            try {
              const { invoke } = await import('@tauri-apps/api/core');
              await invoke('hide_overlay');
            } catch (err) {
              console.debug('[Overlay] Failed to invoke hide_overlay:', err);
            }
          }, 1600);
        });
      } catch (e) {
        console.debug('[Overlay] Tauri event listeners setup failed:', e);
      }
    }

    setupListeners();
    return () => {
      if (unlistenFreeze) unlistenFreeze();
      if (unlistenUnfreeze) unlistenUnfreeze();
      if (unlistenExit) unlistenExit();
      if (unlistenDrawingMode) unlistenDrawingMode();
      if (unlistenClear) unlistenClear();
      if (unlistenTick) unlistenTick();
      if (unlistenEnd) unlistenEnd();
      if (unlistenCut) unlistenCut();
      if (unlistenZoomHud) unlistenZoomHud();
      if (unlistenKeystrokeHud) unlistenKeystrokeHud();
      if (unlistenSyncSettings) unlistenSyncSettings();
      if (zoomToastTimeoutRef.current) clearTimeout(zoomToastTimeoutRef.current);
      if (keystrokeToastTimeoutRef.current) clearTimeout(keystrokeToastTimeoutRef.current);
    };
  }, []);

  // Resize canvas to full screen resolution
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Keyboard shortcut listener on overlay (Escape or F8 closes overlay)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'F8' || (e.altKey && e.key?.toLowerCase() === 'd')) {
        e.preventDefault();
        closeOverlay();
      } else if (e.code === 'F10' || (e.altKey && e.key?.toLowerCase() === 'c')) {
        e.preventDefault();
        clearAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const closeOverlay = async () => {
    setIsDrawingActive(false);
    setSnapshotUrl(null);
    strokesRef.current = [];
    currentStrokeRef.current = null;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('hide_overlay');
    } catch (e) {
      console.debug('[Overlay] hide_overlay failed on close:', e);
    }
    try {
      const { emit } = await import('@tauri-apps/api/event');
      await emit('exit-draw', {});
      await emit('set-drawing-mode', { active: false });
      await emit('unfreeze-snapshot', {});
    } catch (err) {
      console.debug('[Overlay] Failed to emit exit-draw events:', err);
    }
  };

  const clearAll = async () => {
    strokesRef.current = [];
    persistentBlurMasksRef.current = [];
    currentStrokeRef.current = null;
    try {
      const { emit } = await import('@tauri-apps/api/event');
      await emit('clear-drawings', {});
      await emit('clear-blur-masks', {});
    } catch (e) {
      console.debug('[Overlay] Failed to emit clear events:', e);
    }
  };

  // Continuous 60 FPS rendering loop for overlay
  useEffect(() => {
    let animationId: number;

    const render = () => {
      animationId = requestAnimationFrame(render);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const now = performance.now();
      strokesRef.current = strokesRef.current.filter(s => {
        if (s.fadeDuration === null) return true;
        return now - s.startTime < s.fadeDuration;
      });

      const allStrokes = [...strokesRef.current];
      if (currentStrokeRef.current) {
        allStrokes.push({
          id: 0,
          tool: currentStrokeRef.current.tool,
          color: currentStrokeRef.current.color,
          width: currentStrokeRef.current.tool === 'highlighter' ? 0.022 : 0.0035,
          points: currentStrokeRef.current.points,
          startTime: currentStrokeRef.current.startTime,
          fadeDuration: null
        });
      }

      for (const stroke of allStrokes) {
        if (stroke.points.length === 0) continue;

        let alpha = 1.0;
        if (stroke.fadeDuration !== null && stroke.id !== 0) {
          const elapsed = now - stroke.startTime;
          if (elapsed > 0) {
            alpha = Math.max(0, 1 - elapsed / stroke.fadeDuration);
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
          if (pts.length === 1) {
            ctx.beginPath();
            ctx.arc(pts[0].x * canvas.width, pts[0].y * canvas.height, ctx.lineWidth / 2, 0, Math.PI * 2);
            ctx.fill();
          } else if (pts.length === 2 || !isSmoothing) {
            ctx.beginPath();
            ctx.moveTo(pts[0].x * canvas.width, pts[0].y * canvas.height);
            for (let i = 1; i < pts.length; i++) {
              ctx.lineTo(pts[i].x * canvas.width, pts[i].y * canvas.height);
            }
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.moveTo(pts[0].x * canvas.width, pts[0].y * canvas.height);
            for (let i = 1; i < pts.length - 1; i++) {
              const xc = ((pts[i].x + pts[i + 1].x) / 2) * canvas.width;
              const yc = ((pts[i].y + pts[i + 1].y) / 2) * canvas.height;
              ctx.quadraticCurveTo(pts[i].x * canvas.width, pts[i].y * canvas.height, xc, yc);
            }
            const last = pts[pts.length - 1];
            const prev = pts[pts.length - 2];
            ctx.quadraticCurveTo(
              prev.x * canvas.width,
              prev.y * canvas.height,
              last.x * canvas.width,
              last.y * canvas.height
            );
            ctx.stroke();
          }
        } else if (stroke.tool === 'rect') {
          const pStart = stroke.points[0];
          const pEnd = stroke.points[stroke.points.length - 1];
          const sx = Math.min(pStart.x, pEnd.x) * canvas.width;
          const sy = Math.min(pStart.y, pEnd.y) * canvas.height;
          const ex = Math.max(pStart.x, pEnd.x) * canvas.width;
          const ey = Math.max(pStart.y, pEnd.y) * canvas.height;
          ctx.strokeRect(sx, sy, ex - sx, ey - sy);
        } else if (stroke.tool === 'arrow') {
          const pStart = stroke.points[0];
          const pEnd = stroke.points[stroke.points.length - 1];
          const sx = pStart.x * canvas.width;
          const sy = pStart.y * canvas.height;
          const ex = pEnd.x * canvas.width;
          const ey = pEnd.y * canvas.height;

          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();

          const angle = Math.atan2(ey - sy, ex - sx);
          const headLen = canvas.width * 0.018;
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      }
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [isSmoothing]);

  const changeTool = async (newTool: DrawTool) => {
    setTool(newTool);
    try {
      const { emit } = await import('@tauri-apps/api/event');
      await emit('sync-draw-settings', { tool: newTool, color, isAutoFade });
    } catch (err) {
      console.debug('[Overlay] sync-draw-settings error:', err);
    }
  };

  const changeColor = async (newColor: string) => {
    setColor(newColor);
    try {
      const { emit } = await import('@tauri-apps/api/event');
      await emit('sync-draw-settings', { tool, color: newColor, isAutoFade });
    } catch (err) {
      console.debug('[Overlay] sync-draw-settings error:', err);
    }
  };

  const toggleAutoFade = async () => {
    const next = !isAutoFade;
    setIsAutoFade(next);
    try {
      const { emit } = await import('@tauri-apps/api/event');
      await emit('sync-draw-settings', { tool, color, isAutoFade: next });
    } catch (err) {
      console.debug('[Overlay] sync-draw-settings error:', err);
    }
  };

  const handleMouseDown = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    isDrawingRef.current = true;
    const nx = e.clientX / window.innerWidth;
    const ny = e.clientY / window.innerHeight;

    currentStrokeRef.current = {
      tool,
      color,
      points: [{ x: nx, y: ny }],
      startTime: performance.now()
    };

    const strokeWidth = tool === 'highlighter' ? 0.022 : 0.0035;
    const fadeDuration = isAutoFade ? 3500 : null;
    try {
      const { emit } = await import('@tauri-apps/api/event');
      await emit('overlay-draw-start', {
        x: nx,
        y: ny,
        tool,
        color,
        width: strokeWidth,
        fadeDuration
      });
    } catch (err) {
      console.debug('[Overlay] overlay-draw-start error:', err);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    const nx = e.clientX / window.innerWidth;
    const ny = e.clientY / window.innerHeight;

    const pts = currentStrokeRef.current.points;
    const lastPt = pts[pts.length - 1];

    const dx = (nx - lastPt.x) * window.innerWidth;
    const dy = (ny - lastPt.y) * window.innerHeight;
    if (dx * dx + dy * dy < 4) return;

    let ptX = nx;
    let ptY = ny;
    if (isSmoothing && (currentStrokeRef.current.tool === 'pen' || currentStrokeRef.current.tool === 'highlighter')) {
      const smoothWeight = 0.72;
      ptX = lastPt.x + (nx - lastPt.x) * smoothWeight;
      ptY = lastPt.y + (ny - lastPt.y) * smoothWeight;
    }
    pts.push({ x: ptX, y: ptY });

    try {
      import('@tauri-apps/api/event').then(({ emit }) => {
        emit('overlay-draw-point', { x: ptX, y: ptY }).catch(() => {});
      });
    } catch (err) {
      console.debug('[Overlay] overlay-draw-point error:', err);
    }
  };

  const handleMouseUp = () => {
    if (isDrawingRef.current && currentStrokeRef.current) {
      strokesRef.current.push({
        id: Math.random(),
        tool: currentStrokeRef.current.tool,
        color: currentStrokeRef.current.color,
        width: currentStrokeRef.current.tool === 'highlighter' ? 0.022 : 0.0035,
        points: currentStrokeRef.current.points,
        startTime: performance.now(),
        fadeDuration: isAutoFade ? 3500 : null
      });
      currentStrokeRef.current = null;
      try {
        import('@tauri-apps/api/event').then(({ emit }) => {
          emit('overlay-draw-end', {}).catch(() => {});
        });
      } catch (err) {
        console.debug('[Overlay] overlay-draw-end error:', err);
      }
    }
    isDrawingRef.current = false;
  };

  const isInteractiveDrawing = isDrawingActive || Boolean(snapshotUrl);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'transparent',
      backgroundImage: snapshotUrl ? `url(${snapshotUrl})` : 'none',
      backgroundSize: '100% 100%',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      overflow: 'hidden',
      cursor: isInteractiveDrawing ? 'crosshair' : 'default',
      pointerEvents: isInteractiveDrawing ? 'auto' : 'none',
      userSelect: 'none'
    }}>
      {/* Interactive Drawing Canvas (Active ONLY during drawing mode) */}
      {isInteractiveDrawing && (
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            display: 'block',
            cursor: 'crosshair',
            pointerEvents: 'auto'
          }}
        />
      )}

      {/* Floating Drawing Palette */}
      {isInteractiveDrawing && (
        <DrawingPalette
          tool={tool}
          color={color}
          isAutoFade={isAutoFade}
          isSmoothing={isSmoothing}
          onToolChange={changeTool}
          onColorChange={changeColor}
          onToggleAutoFade={toggleAutoFade}
          onToggleSmoothing={() => setIsSmoothing(!isSmoothing)}
          onClear={clearAll}
          onClose={closeOverlay}
        />
      )}

      {/* Zoom Feedback Overlay (Toast & Corner Badge) */}
      <ZoomFeedbackOverlay
        zoomToast={zoomToast}
        isZoomCornerActive={isZoomCornerActive}
        activeZoomFactor={activeZoomFactor}
      />

      {/* Live Keystroke Visualizer Toast on Screen */}
      <KeystrokeHUDOverlay
        keystrokeToast={keystrokeToast}
      />

      {/* Screen-Wide Glowing Countdown Overlay */}
      <CountdownOverlay
        countdownValue={countdownValue}
      />

      {/* Cinema Cut & That's a Wrap animation */}
      <CinemaWrapOverlay
        cutAnimation={cutAnimation}
      />
    </div>
  );
}
