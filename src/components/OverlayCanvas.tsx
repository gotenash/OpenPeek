import React, { useState, useEffect, useRef } from 'react';
import { Pencil, ArrowUpRight, Square, Highlighter, Trash2, X, Sparkles, ZoomIn, Maximize2 } from 'lucide-react';
import type { DrawTool } from '../hooks/useRecorder';
import { useI18n } from '../i18n/I18nContext';

export function OverlayCanvas() {
  const { t } = useI18n();
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

            // Manage corner indicator
            setIsZoomCornerActive(isZoomed && showCorner);
            setActiveZoomFactor(factor);

            if (showToast) {
              setZoomToast({ zoomed: isZoomed, factor });

              if (zoomToastTimeoutRef.current) {
                clearTimeout(zoomToastTimeoutRef.current);
              }
              zoomToastTimeoutRef.current = setTimeout(async () => {
                setZoomToast(null);
                // If corner indicator is NOT active and not drawing, release overlay
                if (!(isZoomed && showCorner) && !isDrawingRef.current && !snapshotUrl && countdownValue === null && !cutAnimation) {
                  try {
                    const { invoke } = await import('@tauri-apps/api/core');
                    await invoke('hide_overlay');
                  } catch {}
                }
              }, 1400);
            } else if (!isZoomed && !isDrawingRef.current && !snapshotUrl) {
              try {
                const { invoke } = await import('@tauri-apps/api/core');
                await invoke('hide_overlay');
              } catch {}
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
                } catch {}
              }
            }, 2200);
          }
        });

        unlistenCut = await listen<{ duration: number }>('recording-stopped-animation', (event) => {
          setCountdownValue(null);
          // Unconditionally reset drawing, zoom and freeze state
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
            } catch {}
          }, 1600);
        });
      } catch (e) {}
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
    } catch (e) {}
    try {
      const { emit } = await import('@tauri-apps/api/event');
      await emit('exit-draw', {});
      await emit('set-drawing-mode', { active: false });
      await emit('unfreeze-snapshot', {});
    } catch {}
  };

  const clearAll = async () => {
    strokesRef.current = [];
    persistentBlurMasksRef.current = [];
    currentStrokeRef.current = null;
    try {
      const { emit } = await import('@tauri-apps/api/event');
      await emit('clear-drawings', {});
      await emit('clear-blur-masks', {});
    } catch (e) {}
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
            // High-precision smooth quadratic bezier curve through midpoints
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
  }, []);

  const changeTool = async (newTool: DrawTool) => {
    setTool(newTool);
    try {
      const { emit } = await import('@tauri-apps/api/event');
      await emit('sync-draw-settings', { tool: newTool, color, isAutoFade });
    } catch {}
  };

  const changeColor = async (newColor: string) => {
    setColor(newColor);
    try {
      const { emit } = await import('@tauri-apps/api/event');
      await emit('sync-draw-settings', { tool, color: newColor, isAutoFade });
    } catch {}
  };

  const toggleAutoFade = async () => {
    const next = !isAutoFade;
    setIsAutoFade(next);
    try {
      const { emit } = await import('@tauri-apps/api/event');
      await emit('sync-draw-settings', { tool, color, isAutoFade: next });
    } catch {}
  };

  const handleMouseDown = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Only left click
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
    } catch {}
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    const nx = e.clientX / window.innerWidth;
    const ny = e.clientY / window.innerHeight;

    const pts = currentStrokeRef.current.points;
    const lastPt = pts[pts.length - 1];

    // Subpixel jitter deadzone (ignore tremor < 2px)
    const dx = (nx - lastPt.x) * window.innerWidth;
    const dy = (ny - lastPt.y) * window.innerHeight;
    if (dx * dx + dy * dy < 4) return;

    let ptX = nx;
    let ptY = ny;
    if (isSmoothing && (currentStrokeRef.current.tool === 'pen' || currentStrokeRef.current.tool === 'highlighter')) {
      // Exponential moving average filter to soften hand jitter
      const smoothWeight = 0.72;
      ptX = lastPt.x + (nx - lastPt.x) * smoothWeight;
      ptY = lastPt.y + (ny - lastPt.y) * smoothWeight;
    }
    pts.push({ x: ptX, y: ptY });

    try {
      import('@tauri-apps/api/event').then(({ emit }) => {
        emit('overlay-draw-point', { x: ptX, y: ptY }).catch(() => {});
      });
    } catch {}
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
      } catch {}
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

      {/* Sleek Floating Palette for the Screen Overlay (Shown ONLY during drawing mode) */}
      {isInteractiveDrawing && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 16px',
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(139, 92, 246, 0.3)',
            zIndex: 99999,
            cursor: 'default',
            pointerEvents: 'auto'
          }}
        >
        {/* Tools */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => changeTool('pen')}
            title="Feutre à main levée"
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              backgroundColor: tool === 'pen' ? '#8b5cf6' : 'transparent',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => changeTool('arrow')}
            title="Flèche"
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              backgroundColor: tool === 'arrow' ? '#8b5cf6' : 'transparent',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ArrowUpRight size={15} />
          </button>
          <button
            onClick={() => changeTool('rect')}
            title="Rectangle"
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              backgroundColor: tool === 'rect' ? '#8b5cf6' : 'transparent',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Square size={15} />
          </button>
          <button
            onClick={() => changeTool('highlighter')}
            title="Surligneur"
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              backgroundColor: tool === 'highlighter' ? '#8b5cf6' : 'transparent',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Highlighter size={15} />
          </button>
        </div>

        {/* Colors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: '12px' }}>
          {[
            { hex: '#f43f5e', name: 'Rouge Néon' },
            { hex: '#a855f7', name: 'Violet' },
            { hex: '#06b6d4', name: 'Cyan' },
            { hex: '#eab308', name: 'Jaune Fluo' },
            { hex: '#10b981', name: 'Vert' }
          ].map((c) => (
            <button
              key={c.hex}
              onClick={() => changeColor(c.hex)}
              title={c.name}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: c.hex,
                border: color === c.hex ? '2px solid #ffffff' : '2px solid transparent',
                transform: color === c.hex ? 'scale(1.2)' : 'scale(1)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            />
          ))}
        </div>

        {/* Auto-fade */}
        <button
          onClick={toggleAutoFade}
          title="Auto-fade 3s"
          style={{
            padding: '6px 10px',
            borderRadius: '8px',
            backgroundColor: isAutoFade ? 'rgba(139, 92, 246, 0.25)' : 'transparent',
            color: isAutoFade ? '#c084fc' : 'rgba(255,255,255,0.6)',
            border: isAutoFade ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px'
          }}
        >
          <Sparkles size={14} />
          <span>Auto-fade</span>
        </button>

        {/* Lissage Intelligent */}
        <button
          onClick={() => setIsSmoothing(!isSmoothing)}
          title={isSmoothing ? "Lissage intelligent actif (courbes fluides et douces)" : "Lissage désactivé"}
          style={{
            padding: '6px 10px',
            borderRadius: '8px',
            backgroundColor: isSmoothing ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
            color: isSmoothing ? '#38bdf8' : 'rgba(255,255,255,0.6)',
            border: isSmoothing ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: isSmoothing ? 600 : 400
          }}
        >
          <Sparkles size={14} />
          <span>Lissage</span>
        </button>

        {/* Clear button */}
        <button
          onClick={clearAll}
          title="Effacer (F10)"
          style={{
            padding: '6px 10px',
            borderRadius: '8px',
            backgroundColor: 'transparent',
            color: '#fb7185',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px'
          }}
        >
          <Trash2 size={14} />
          <span>Effacer</span>
        </button>

        {/* Close Overlay */}
        <button
          onClick={closeOverlay}
          title="Quitter le mode Feutre (Echap ou F8)"
          style={{
            padding: '6px 10px',
            borderRadius: '8px',
            backgroundColor: 'rgba(244, 63, 94, 0.2)',
            color: '#fb7185',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            fontWeight: 600
          }}
        >
          <X size={14} />
          <span>Fermer (Echap)</span>
        </button>
      </div>
      )}

      {/* Floating HUD Toast Notification (Zoom feedback) */}
      {zoomToast && (
        <div style={{
          position: 'fixed',
          top: '32px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 22px',
          backgroundColor: zoomToast.zoomed ? 'rgba(15, 23, 42, 0.94)' : 'rgba(15, 23, 42, 0.90)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '9999px',
          border: zoomToast.zoomed ? '1.5px solid rgba(56, 189, 248, 0.7)' : '1.5px solid rgba(148, 163, 184, 0.4)',
          boxShadow: zoomToast.zoomed 
            ? '0 12px 36px rgba(0, 0, 0, 0.6), 0 0 28px rgba(56, 189, 248, 0.4)' 
            : '0 12px 30px rgba(0, 0, 0, 0.5)',
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: 600,
          letterSpacing: '0.3px',
          pointerEvents: 'none',
          zIndex: 9999999,
          userSelect: 'none'
        }}>
          {zoomToast.zoomed ? (
            <>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'rgba(56, 189, 248, 0.2)',
                color: '#38bdf8'
              }}>
                <ZoomIn size={16} />
              </span>
              <span style={{ color: '#38bdf8', fontWeight: 800 }}>Zoom {zoomToast.factor.toFixed(1)}x</span>
              <span style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '12px', fontWeight: 500 }}>Activé (Alt + Z)</span>
            </>
          ) : (
            <>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#94a3b8'
              }}>
                <Maximize2 size={16} />
              </span>
              <span style={{ color: '#f1f5f9', fontWeight: 700 }}>Plein Écran</span>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', fontWeight: 500 }}>Zoom désactivé</span>
            </>
          )}
        </div>
      )}

      {/* Discreet Persistent Corner Indicator while Zoom is Active */}
      {isZoomCornerActive && (
        <div style={{
          position: 'fixed',
          top: '18px',
          right: '22px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: '8px',
          border: '1.5px solid rgba(56, 189, 248, 0.65)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.6), 0 0 16px rgba(56, 189, 248, 0.35)',
          color: '#f8fafc',
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.05em',
          pointerEvents: 'none',
          zIndex: 9999999,
          userSelect: 'none'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#38bdf8',
            boxShadow: '0 0 10px #38bdf8'
          }} />
          <span>ZOOM {activeZoomFactor.toFixed(1)}x</span>
        </div>
      )}

      {/* Live Keystroke Visualizer Toast on Screen */}
      {keystrokeToast && (
        <div style={{
          position: 'fixed',
          bottom: '48px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 18px',
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '12px',
          border: '1.5px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.65), 0 0 20px rgba(56, 189, 248, 0.3)',
          pointerEvents: 'none',
          zIndex: 9999999,
          userSelect: 'none'
        }}>
          {keystrokeToast.split(' + ').map((part, idx, arr) => (
            <React.Fragment key={idx}>
              <span style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: 'rgba(30, 41, 59, 0.95)',
                border: '1px solid rgba(56, 189, 248, 0.45)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                color: '#f8fafc',
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}>
                {part}
              </span>
              {idx < arr.length - 1 && (
                <span style={{ color: 'rgba(148, 163, 184, 0.8)', fontSize: '13px', fontWeight: 700 }}>+</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Screen-Wide Glowing Countdown Overlay */}
      {countdownValue !== null && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.42)',
          backdropFilter: 'blur(10px)',
          pointerEvents: 'none',
          zIndex: 999999
        }}>
          <div style={{
            width: '190px',
            height: '190px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(192, 132, 252, 0.45) 0%, rgba(236, 72, 153, 0.2) 70%, transparent 100%)',
            border: '4px solid #c084fc',
            boxShadow: '0 0 60px rgba(192, 132, 252, 0.7), 0 0 100px rgba(236, 72, 153, 0.4), inset 0 0 30px rgba(192, 132, 252, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'countdown-pop 0.95s cubic-bezier(0.175, 0.885, 0.32, 1.275) infinite'
          }}>
            <span style={{
              fontSize: countdownValue === 0 ? '42px' : '96px',
              fontWeight: 900,
              color: '#ffffff',
              textShadow: '0 0 30px #c084fc, 0 0 60px #ec4899',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              {countdownValue === 0 ? t('overlay.action') : countdownValue}
            </span>
          </div>

          <p style={{
            marginTop: '22px',
            fontSize: '22px',
            fontWeight: 800,
            color: '#f8fafc',
            letterSpacing: '0.04em',
            textShadow: '0 2px 12px rgba(0,0,0,0.9)'
          }}>
            {countdownValue === 0 ? t('overlay.recordingInProgress') : `${t('overlay.startingIn')} ${countdownValue}s...`}
          </p>

          <p style={{
            marginTop: '6px',
            fontSize: '12px',
            color: '#cbd5e1',
            textShadow: '0 1px 6px rgba(0,0,0,0.9)',
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            padding: '4px 12px',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            {t('overlay.shortcutsNotice')}
          </p>
        </div>
      )}

      {/* Cinema Camera Soft Flash */}
      {cutAnimation?.active && <div className="cut-flash-overlay" />}

      {/* Cinema Cut & "That's a wrap! / C'est dans la boîte !" Animation Badge */}
      {cutAnimation?.active && (
        <div className="cut-badge-container">
          <div className="cut-badge-card">
            {/* Animated SVG Clapperboard */}
            <div style={{ position: 'relative', width: '84px', height: '68px', marginBottom: '2px' }}>
              <svg viewBox="0 0 84 68" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                {/* Base board */}
                <rect x="6" y="26" width="72" height="38" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
                <line x1="24" y1="26" x2="24" y2="64" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
                <line x1="42" y1="26" x2="42" y2="64" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
                <line x1="60" y1="26" x2="60" y2="64" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
                {/* Animated snapping top bar */}
                <g className="clapper-top-bar">
                  <rect x="6" y="8" width="72" height="17" rx="3" fill="#1e293b" stroke="#c084fc" strokeWidth="2.5" />
                  <polygon points="12,8 21,8 15,25 6,25" fill="#ffffff" />
                  <polygon points="30,8 39,8 33,25 24,25" fill="#ffffff" />
                  <polygon points="48,8 57,8 51,25 42,25" fill="#ffffff" />
                  <polygon points="66,8 75,8 69,25 60,25" fill="#ffffff" />
                </g>
              </svg>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '26px' }}>🎬</span>
              <h2 style={{
                margin: 0,
                fontSize: '26px',
                fontWeight: 900,
                background: 'linear-gradient(135deg, #4ade80 0%, #38bdf8 50%, #c084fc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.02em',
                textShadow: '0 0 30px rgba(74, 222, 128, 0.4)'
              }}>
                {t('overlay.thatsAWrap')}
              </h2>
            </div>

            <p style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 600,
              color: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>{t('overlay.cutSaved')}</span>
            </p>

            {cutAnimation.duration > 0 && (
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#94a3b8',
                backgroundColor: 'rgba(255,255,255,0.06)',
                padding: '3px 12px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                ⏱️ {t('overlay.duration')} {Math.floor(cutAnimation.duration / 60)}m {cutAnimation.duration % 60}s
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
