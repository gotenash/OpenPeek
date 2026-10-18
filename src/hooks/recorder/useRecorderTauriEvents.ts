import { useEffect } from 'react';
import type { DrawTool, BlurMask, RecorderOptions } from '../useRecorder';

export interface RecorderTauriEventsParams {
  optionsRef: React.MutableRefObject<RecorderOptions>;
  isRecordingRef: React.MutableRefObject<boolean>;
  isPausedRef: React.MutableRefObject<boolean>;
  countdownRef: React.MutableRefObject<number | null>;
  isDrawingModeRef: React.MutableRefObject<boolean>;
  freezeFrameRef: React.MutableRefObject<HTMLCanvasElement | null>;
  drawToolRef: React.MutableRefObject<DrawTool>;
  drawColorRef: React.MutableRefObject<string>;
  isAutoFadeRef: React.MutableRefObject<boolean>;
  currentCursorPosRef: React.MutableRefObject<{ x: number; y: number }>;
  targetCursorPosRef: React.MutableRefObject<{ x: number; y: number }>;
  hasReceivedCursorRef: React.MutableRefObject<boolean>;
  cursorClickScaleRef: React.MutableRefObject<number>;
  activeKeystrokesRef: React.MutableRefObject<Array<{ id: number; combo: string; startTime: number; duration: number }>>;
  targetZoomCenterRef: React.MutableRefObject<{ x: number; y: number }>;
  isAutoZoomingRef: React.MutableRefObject<boolean>;
  isZoomedRef: React.MutableRefObject<boolean>;
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  // Callbacks
  startRecording: () => void;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  toggleZoom: (x?: number, y?: number) => void;
  triggerAutoZoom: (x: number, y: number) => void;
  addClickRipple: (x: number, y: number, button?: string) => void;
  toggleDrawingMode: () => void;
  setIsDrawingMode: (v: boolean) => void;
  clearDrawings: () => void;
  addBlurMask: (mask: BlurMask) => void;
  clearBlurMasks: () => void;
  startDrawingStroke: (x: number, y: number, tool?: DrawTool, color?: string, width?: number, fade?: number | null) => void;
  updateDrawingStroke: (x: number, y: number) => void;
  endDrawingStroke: () => void;
  setDrawTool: (tool: DrawTool) => void;
  setDrawColor: (col: string) => void;
  setIsAutoFade: (v: boolean) => void;
  toggleSecondaryCamRecording: () => void;
}

export function useRecorderTauriEvents(params: RecorderTauriEventsParams) {
  const {
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
    toggleSecondaryCamRecording
  } = params;

  // Native OS-wide Global Hotkeys, Click, and Draw listeners (emitted from Rust backend)
  useEffect(() => {
    let unlistenZoom: (() => void) | null = null;
    let unlistenClick: (() => void) | null = null;
    let unlistenCursorMove: (() => void) | null = null;
    let unlistenKeystroke: (() => void) | null = null;
    let unlistenDraw: (() => void) | null = null;
    let unlistenExitDraw: (() => void) | null = null;
    let unlistenSetDrawingMode: (() => void) | null = null;
    let unlistenUnfreezeSnap: (() => void) | null = null;
    let unlistenDrawStart: (() => void) | null = null;
    let unlistenDrawPoint: (() => void) | null = null;
    let unlistenDrawEnd: (() => void) | null = null;
    let unlistenOverlayDrawStart: (() => void) | null = null;
    let unlistenOverlayDrawPoint: (() => void) | null = null;
    let unlistenOverlayDrawEnd: (() => void) | null = null;
    let unlistenSyncSettings: (() => void) | null = null;
    let unlistenClear: (() => void) | null = null;
    let unlistenAddBlur: (() => void) | null = null;
    let unlistenClearBlur: (() => void) | null = null;
    let unlistenRecord: (() => void) | null = null;
    let unlistenPause: (() => void) | null = null;

    async function setupTauriListener() {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        
        unlistenRecord = await listen('toggle-record', () => {
          if (isRecordingRef.current || countdownRef.current !== null) {
            stopRecording();
          } else {
            startRecording();
          }
        });

        unlistenPause = await listen('toggle-pause', () => {
          if (isRecordingRef.current) {
            if (isPausedRef.current) {
              resumeRecording();
            } else {
              pauseRecording();
            }
          }
        });

        unlistenZoom = await listen<{ x: number; y: number }>('toggle-zoom', (event) => {
          if (event.payload && typeof event.payload.x === 'number') {
            toggleZoom(event.payload.x, event.payload.y);
          } else {
            toggleZoom();
          }
        });

        unlistenCursorMove = await listen<{ x: number; y: number }>('cursor-move', (event) => {
          if (event.payload && typeof event.payload.x === 'number' && typeof event.payload.y === 'number') {
            targetCursorPosRef.current = { x: event.payload.x, y: event.payload.y };
            if (!hasReceivedCursorRef.current) {
              currentCursorPosRef.current = { x: event.payload.x, y: event.payload.y };
              hasReceivedCursorRef.current = true;
            }
          }
        });

        unlistenKeystroke = await listen<{ combo: string; key: string; modifiers: string[] }>('keystroke', (event) => {
          if (!isRecordingRef.current || isPausedRef.current) {
            return;
          }

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

            const opts = optionsRef.current;
            if (opts.enableKeystrokeHUD !== false) {
              activeKeystrokesRef.current.push({
                id: Math.random(),
                combo,
                startTime: performance.now(),
                duration: 2200
              });

              try {
                import('@tauri-apps/api/core').then(({ invoke }) => {
                  invoke('show_overlay_hud').catch(() => {});
                });
                import('@tauri-apps/api/event').then(({ emit }) => {
                  emit('keystroke-hud', { combo: event.payload.combo }).catch(() => {});
                });
              } catch (err) {
                console.debug('[Recorder] keystroke-hud emit error:', err);
              }
            }
          }
        });

        unlistenClick = await listen<{ x: number; y: number; button: string }>('mouse-click', (event) => {
          if (event.payload && typeof event.payload.x === 'number' && typeof event.payload.y === 'number') {
            cursorClickScaleRef.current = 0.88;
            addClickRipple(event.payload.x, event.payload.y, event.payload.button || 'left');
            triggerAutoZoom(event.payload.x, event.payload.y);
          }
        });

        unlistenDraw = await listen('toggle-draw', () => {
          toggleDrawingMode();
        });

        unlistenExitDraw = await listen('exit-draw', () => {
          if (isDrawingModeRef.current) {
            isDrawingModeRef.current = false;
            setIsDrawingMode(false);
            freezeFrameRef.current = null;
          }
        });

        unlistenSetDrawingMode = await listen<{ active: boolean }>('set-drawing-mode', (event) => {
          if (!event.payload?.active && isDrawingModeRef.current) {
            isDrawingModeRef.current = false;
            setIsDrawingMode(false);
            freezeFrameRef.current = null;
          }
        });

        unlistenUnfreezeSnap = await listen('unfreeze-snapshot', () => {
          freezeFrameRef.current = null;
          isDrawingModeRef.current = false;
          setIsDrawingMode(false);
        });

        unlistenOverlayDrawStart = await listen<{
          x: number;
          y: number;
          tool?: DrawTool;
          color?: string;
          width?: number;
          fadeDuration?: number | null;
        }>('overlay-draw-start', (event) => {
          if (event.payload && typeof event.payload.x === 'number') {
            startDrawingStroke(
              event.payload.x,
              event.payload.y,
              event.payload.tool,
              event.payload.color,
              event.payload.width,
              event.payload.fadeDuration
            );
          }
        });

        unlistenOverlayDrawPoint = await listen<{ x: number; y: number }>('overlay-draw-point', (event) => {
          if (event.payload && typeof event.payload.x === 'number') {
            updateDrawingStroke(event.payload.x, event.payload.y);
            if (isAutoZoomingRef.current && isZoomedRef.current) {
              targetZoomCenterRef.current = { x: event.payload.x, y: event.payload.y };
            }
          }
        });

        unlistenOverlayDrawEnd = await listen('overlay-draw-end', () => {
          endDrawingStroke();
        });

        unlistenSyncSettings = await listen<{ tool?: DrawTool; color?: string; isAutoFade?: boolean }>('sync-draw-settings', (event) => {
          if (event.payload) {
            if (event.payload.tool) {
              setDrawTool(event.payload.tool);
              drawToolRef.current = event.payload.tool;
            }
            if (event.payload.color) {
              setDrawColor(event.payload.color);
              drawColorRef.current = event.payload.color;
            }
            if (typeof event.payload.isAutoFade === 'boolean') {
              setIsAutoFade(event.payload.isAutoFade);
              isAutoFadeRef.current = event.payload.isAutoFade;
            }
          }
        });

        unlistenDrawStart = await listen<{ x: number; y: number }>('draw-start', (event) => {
          if (isDrawingModeRef.current && event.payload && typeof event.payload.x === 'number') {
            startDrawingStroke(event.payload.x, event.payload.y);
          }
        });

        unlistenDrawPoint = await listen<{ x: number; y: number }>('draw-point', (event) => {
          if (event.payload && typeof event.payload.x === 'number') {
            if (isDrawingModeRef.current) {
              updateDrawingStroke(event.payload.x, event.payload.y);
            }
            if (isAutoZoomingRef.current && isZoomedRef.current) {
              targetZoomCenterRef.current = { x: event.payload.x, y: event.payload.y };
            }
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
        // Fallback in web browser mode
      }
    }

    setupTauriListener();

    return () => {
      if (unlistenZoom) unlistenZoom();
      if (unlistenClick) unlistenClick();
      if (unlistenCursorMove) unlistenCursorMove();
      if (unlistenKeystroke) unlistenKeystroke();
      if (unlistenDraw) unlistenDraw();
      if (unlistenExitDraw) unlistenExitDraw();
      if (unlistenSetDrawingMode) unlistenSetDrawingMode();
      if (unlistenUnfreezeSnap) unlistenUnfreezeSnap();
      if (unlistenOverlayDrawStart) unlistenOverlayDrawStart();
      if (unlistenOverlayDrawPoint) unlistenOverlayDrawPoint();
      if (unlistenOverlayDrawEnd) unlistenOverlayDrawEnd();
      if (unlistenSyncSettings) unlistenSyncSettings();
      if (unlistenDrawStart) unlistenDrawStart();
      if (unlistenDrawPoint) unlistenDrawPoint();
      if (unlistenDrawEnd) unlistenDrawEnd();
      if (unlistenClear) unlistenClear();
      if (unlistenAddBlur) unlistenAddBlur();
      if (unlistenClearBlur) unlistenClearBlur();
      if (unlistenRecord) unlistenRecord();
      if (unlistenPause) unlistenPause();
    };
  }, [optionsRef.current.showMouseClicks]);

  // In-window Keyboard shortcut listener for F6 (Record), F7 (Pause), Alt+Z, Alt+D, Alt+C, F9, or Z key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const isAltR = (e.altKey && e.key?.toLowerCase() === 'r') || e.code === 'F6';
      const isAltP = (e.altKey && e.key?.toLowerCase() === 'p') || e.code === 'F7';
      const isAltZ = (e.altKey && e.key?.toLowerCase() === 'z') || e.code === 'F9';
      const isAltD = (e.altKey && e.key?.toLowerCase() === 'd') || e.code === 'F8';
      const isAltC = (e.altKey && e.key?.toLowerCase() === 'c');
      const isAltB = (e.altKey && e.key?.toLowerCase() === 'b') || e.code === (optionsRef.current.secondaryCamShortcut || 'F10');
      const isZ = e.key?.toLowerCase() === 'z' || e.code === 'KeyZ' || e.code === 'KeyW';
      
      if (isAltR) {
        e.preventDefault();
        if (isRecordingRef.current || countdownRef.current !== null) {
          stopRecording();
        } else {
          startRecording();
        }
      } else if (isAltP && isRecordingRef.current) {
        e.preventDefault();
        if (isPausedRef.current) {
          resumeRecording();
        } else {
          pauseRecording();
        }
      } else if (isAltD) {
        e.preventDefault();
        toggleDrawingMode();
      } else if (e.key === 'Escape' && isDrawingModeRef.current) {
        e.preventDefault();
        toggleDrawingMode();
      } else if (isAltC) {
        e.preventDefault();
        clearDrawings();
      } else if (isAltB && isRecordingRef.current) {
        e.preventDefault();
        toggleSecondaryCamRecording();
      } else if ((isAltZ || isZ) && (isRecordingRef.current || isZoomedRef.current || canvasRef.current !== null)) {
        e.preventDefault();
        toggleZoom();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
