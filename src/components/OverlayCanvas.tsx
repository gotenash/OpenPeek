import React, { useState, useEffect, useRef } from 'react';
import { Pencil, ArrowUpRight, Square, Highlighter, Trash2, X, Sparkles } from 'lucide-react';
import type { DrawTool } from '../hooks/useRecorder';
import { useI18n } from '../i18n/I18nContext';

export function OverlayCanvas() {
  const { t } = useI18n();
  const [tool, setTool] = useState<DrawTool>('pen');
  const [color, setColor] = useState('#f43f5e');
  const [isAutoFade, setIsAutoFade] = useState(true);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [cutAnimation, setCutAnimation] = useState<{ active: boolean; duration: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<{ tool: DrawTool; color: string; points: Array<{ x: number; y: number }>; startTime: number } | null>(null);
  const strokesRef = useRef<Array<{ id: number; tool: DrawTool; color: string; width: number; points: Array<{ x: number; y: number }>; startTime: number; fadeDuration: number | null }>>([]);
  const persistentBlurMasksRef = useRef<Array<{ id: number; x: number; y: number; width: number; height: number }>>([]);

  // Listen to freeze-snapshot, countdown ticks, and cut animation from recorder engine
  useEffect(() => {
    let unlistenFreeze: (() => void) | null = null;
    let unlistenUnfreeze: (() => void) | null = null;
    let unlistenTick: (() => void) | null = null;
    let unlistenEnd: (() => void) | null = null;
    let unlistenCut: (() => void) | null = null;

    async function setupListeners() {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        unlistenFreeze = await listen<{ image: string }>('freeze-snapshot', (event) => {
          if (event.payload?.image) {
            setSnapshotUrl(event.payload.image);
          }
        });
        unlistenUnfreeze = await listen('unfreeze-snapshot', () => {
          setSnapshotUrl(null);
        });
        unlistenTick = await listen<{ count: number }>('countdown-tick', (event) => {
          if (typeof event.payload?.count === 'number') {
            setCountdownValue(event.payload.count);
          }
        });
        unlistenEnd = await listen('countdown-end', () => {
          setCountdownValue(null);
        });
        unlistenCut = await listen<{ duration: number }>('recording-stopped-animation', (event) => {
          setCountdownValue(null);
          setCutAnimation({ active: true, duration: event.payload?.duration || 0 });
          setTimeout(async () => {
            setCutAnimation(null);
            if (!strokesRef.current.length && !snapshotUrl) {
              try {
                const { invoke } = await import('@tauri-apps/api/core');
                await invoke('hide_overlay');
              } catch {}
            }
          }, 1600);
        });
      } catch (e) {}
    }

    setupListeners();
    return () => {
      if (unlistenFreeze) unlistenFreeze();
      if (unlistenUnfreeze) unlistenUnfreeze();
      if (unlistenTick) unlistenTick();
      if (unlistenEnd) unlistenEnd();
      if (unlistenCut) unlistenCut();
    };
  }, [snapshotUrl]);

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
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('hide_overlay');
    } catch (e) {
      // Fallback
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
          ctx.beginPath();
          ctx.moveTo(stroke.points[0].x * canvas.width, stroke.points[0].y * canvas.height);

          if (stroke.points.length === 1) {
            ctx.arc(stroke.points[0].x * canvas.width, stroke.points[0].y * canvas.height, ctx.lineWidth / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            for (let i = 1; i < stroke.points.length; i++) {
              ctx.lineTo(stroke.points[i].x * canvas.width, stroke.points[i].y * canvas.height);
            }
            ctx.stroke();
          }
        } else if (stroke.tool === 'rect') {
          const pStart = stroke.points[0];
          const pEnd = stroke.points[stroke.points.length - 1];
          const sx = pStart.x * canvas.width;
          const sy = pStart.y * canvas.height;
          const ex = pEnd.x * canvas.width;
          const ey = pEnd.y * canvas.height;
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
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    const nx = e.clientX / window.innerWidth;
    const ny = e.clientY / window.innerHeight;
    currentStrokeRef.current.points.push({ x: nx, y: ny });
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
    }
    isDrawingRef.current = false;
  };

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
      cursor: 'crosshair',
      userSelect: 'none'
    }}>
      {/* Interactive Drawing Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />

      {/* Sleek Floating Palette for the Screen Overlay */}
      <div style={{
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
        cursor: 'default'
      }}>
        {/* Tools */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setTool('pen')}
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
            onClick={() => setTool('arrow')}
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
            onClick={() => setTool('rect')}
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
            onClick={() => setTool('highlighter')}
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
              onClick={() => setColor(c.hex)}
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
          onClick={() => setIsAutoFade(!isAutoFade)}
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
