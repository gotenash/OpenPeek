import { useState, useRef, useEffect } from 'react';
import type { RecorderOptions } from '../../types/recorder';

interface UseRecorderZoomProps {
  options: RecorderOptions;
  optionsRef: React.MutableRefObject<RecorderOptions>;
}

export function useRecorderZoom({ options, optionsRef }: UseRecorderZoomProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [isSpotlight, setIsSpotlight] = useState(false);
  const [zoomFactor, setZoomFactorState] = useState(options.autoZoomFactor || 2.0);
  const [isAutoZoomEnabled, setIsAutoZoomEnabled] = useState(options.enableAutoZoom ?? false);

  const isZoomedRef = useRef(false);
  const isSpotlightRef = useRef(false);
  const zoomFactorRef = useRef(options.autoZoomFactor || 2.0);
  const currentZoomRef = useRef(1.0);
  const targetZoomCenterRef = useRef({ x: 0.5, y: 0.5 });
  const currentZoomCenterRef = useRef({ x: 0.5, y: 0.5 });
  const isAutoZoomingRef = useRef(false);
  const autoZoomTimeoutRef = useRef<number | null>(null);
  const isAutoZoomEnabledRef = useRef(options.enableAutoZoom ?? false);

  useEffect(() => {
    isAutoZoomEnabledRef.current = options.enableAutoZoom ?? false;
    setIsAutoZoomEnabled(options.enableAutoZoom ?? false);
  }, [options.enableAutoZoom]);

  useEffect(() => {
    if (options.autoZoomFactor) {
      zoomFactorRef.current = options.autoZoomFactor;
      setZoomFactorState(options.autoZoomFactor);
    }
  }, [options.autoZoomFactor]);

  const playZoomSound = (isZoomingIn: boolean) => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const ctx = new AudioCtxClass();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const now = ctx.currentTime;
      const startFreq = isZoomingIn ? 520 : 780;
      const endFreq = isZoomingIn ? 780 : 520;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.11);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);

      setTimeout(() => {
        ctx.close().catch((err) => {
          console.debug('[Recorder] AudioContext close error:', err);
        });
      }, 200);
    } catch (e) {
      console.debug('[Recorder] playZoomSound error:', e);
    }
  };

  const toggleZoom = (targetX = 0.5, targetY = 0.5) => {
    if (autoZoomTimeoutRef.current) {
      clearTimeout(autoZoomTimeoutRef.current);
      autoZoomTimeoutRef.current = null;
    }
    isAutoZoomingRef.current = false;

    const willZoom = !isZoomedRef.current;
    const currentFactor = zoomFactorRef.current || 2.0;

    if (willZoom) {
      isZoomedRef.current = true;
      targetZoomCenterRef.current = { x: targetX, y: targetY };
      setIsZoomed(true);
    } else {
      isZoomedRef.current = false;
      setIsZoomed(false);
    }

    const opts = optionsRef.current;

    if (opts.zoomSoundFeedback !== false) {
      playZoomSound(willZoom);
    }

    const shouldShowToast = opts.zoomToastFeedback !== false;
    const shouldShowCorner = opts.zoomCornerIndicator !== false;

    if (shouldShowToast || shouldShowCorner) {
      try {
        import('@tauri-apps/api/core').then(({ invoke }) => {
          invoke('show_overlay_hud').catch(() => {});
        });
        import('@tauri-apps/api/event').then(({ emit }) => {
          emit('zoom-hud', { 
            zoomed: willZoom, 
            factor: currentFactor,
            showToast: shouldShowToast,
            showCorner: shouldShowCorner
          }).catch(() => {});
        });
      } catch (e) {
        console.debug('[Recorder] zoom-hud HUD error:', e);
      }
    }
  };

  const triggerAutoZoom = (x: number, y: number) => {
    if (!isAutoZoomEnabledRef.current) return;

    const factor = options.autoZoomFactor || 1.75;
    zoomFactorRef.current = factor;
    setZoomFactorState(factor);

    targetZoomCenterRef.current = { x, y };
    isZoomedRef.current = true;
    isAutoZoomingRef.current = true;
    setIsZoomed(true);

    if (autoZoomTimeoutRef.current) {
      clearTimeout(autoZoomTimeoutRef.current);
    }

    const dur = (options.autoZoomDuration ?? 2.8) * 1000;
    autoZoomTimeoutRef.current = window.setTimeout(() => {
      if (isAutoZoomingRef.current) {
        isZoomedRef.current = false;
        isAutoZoomingRef.current = false;
        setIsZoomed(false);
      }
    }, dur);
  };

  const toggleAutoZoom = () => {
    const next = !isAutoZoomEnabledRef.current;
    isAutoZoomEnabledRef.current = next;
    setIsAutoZoomEnabled(next);
    if (!next && isAutoZoomingRef.current) {
      if (autoZoomTimeoutRef.current) {
        clearTimeout(autoZoomTimeoutRef.current);
        autoZoomTimeoutRef.current = null;
      }
      isZoomedRef.current = false;
      isAutoZoomingRef.current = false;
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

  return {
    isZoomed,
    setIsZoomed,
    isZoomedRef,
    isSpotlight,
    setIsSpotlight,
    isSpotlightRef,
    zoomFactor,
    setZoomFactorState,
    zoomFactorRef,
    isAutoZoomEnabled,
    setIsAutoZoomEnabled,
    isAutoZoomEnabledRef,
    currentZoomRef,
    targetZoomCenterRef,
    currentZoomCenterRef,
    isAutoZoomingRef,
    autoZoomTimeoutRef,
    playZoomSound,
    toggleZoom,
    triggerAutoZoom,
    toggleAutoZoom,
    setZoomCenter,
    setZoomFactor,
    toggleSpotlight
  };
}
