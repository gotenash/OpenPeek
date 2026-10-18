import { useState, useRef, useEffect } from 'react';
import type { DrawTool, BlurMask, DrawingStroke, RecorderOptions } from '../../types/recorder';

interface UseRecorderDrawingProps {
  options: RecorderOptions;
  screenVideoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function useRecorderDrawing({ options, screenVideoRef, canvasRef }: UseRecorderDrawingProps) {
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawTool, setDrawTool] = useState<DrawTool>('pen');
  const [drawColor, setDrawColor] = useState('#f43f5e');
  const [isAutoFade, setIsAutoFade] = useState(true);

  const isDrawingModeRef = useRef(false);
  const drawToolRef = useRef<DrawTool>('pen');
  const drawColorRef = useRef('#f43f5e');
  const isAutoFadeRef = useRef(true);

  const [blurMasks, setBlurMasks] = useState<BlurMask[]>([]);
  const blurMasksRef = useRef<BlurMask[]>([]);

  const strokesRef = useRef<DrawingStroke[]>([]);
  const currentStrokeRef = useRef<DrawingStroke | null>(null);
  const freezeFrameRef = useRef<HTMLCanvasElement | null>(null);
  const blurOffscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const ripplesRef = useRef<Array<{ id: number; x: number; y: number; startTime: number; button: string; duration: number }>>([]);

  useEffect(() => { isDrawingModeRef.current = isDrawingMode; }, [isDrawingMode]);
  useEffect(() => { drawToolRef.current = drawTool; }, [drawTool]);
  useEffect(() => { drawColorRef.current = drawColor; }, [drawColor]);
  useEffect(() => { isAutoFadeRef.current = isAutoFade; }, [isAutoFade]);

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

  const toggleDrawingMode = async () => {
    const next = !isDrawingModeRef.current;
    isDrawingModeRef.current = next;
    setIsDrawingMode(next);

    if (next) {
      if (screenVideoRef.current && screenVideoRef.current.readyState >= 2) {
        const fc = document.createElement('canvas');
        fc.width = screenVideoRef.current.videoWidth || canvasRef.current?.width || 1920;
        fc.height = screenVideoRef.current.videoHeight || canvasRef.current?.height || 1080;
        const fctx = fc.getContext('2d');
        if (fctx) {
          fctx.drawImage(screenVideoRef.current, 0, 0, fc.width, fc.height);
          freezeFrameRef.current = fc;

          try {
            const dataUrl = fc.toDataURL('image/jpeg', 0.92);
            const { emit } = await import('@tauri-apps/api/event');
            await emit('set-drawing-mode', { active: true });
            await emit('freeze-snapshot', { image: dataUrl });
            await emit('sync-draw-settings', {
              tool: drawToolRef.current,
              color: drawColorRef.current,
              isAutoFade: isAutoFadeRef.current
            });
          } catch (e) {
            console.debug('[Recorder] freeze-snapshot emit error:', e);
          }
        }
      }
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('show_overlay');
      } catch (e) {
        console.debug('[Recorder] show_overlay invoke error:', e);
      }
    } else {
      freezeFrameRef.current = null;
      try {
        const { emit } = await import('@tauri-apps/api/event');
        await emit('set-drawing-mode', { active: false });
        await emit('unfreeze-snapshot', {});
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('hide_overlay');
      } catch (e) {
        console.debug('[Recorder] unfreeze-snapshot error:', e);
      }
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

  const startDrawingStroke = (
    x: number, 
    y: number, 
    tool?: DrawTool, 
    color?: string, 
    width?: number, 
    fadeDuration?: number | null
  ) => {
    const strokeTool = tool || drawToolRef.current;
    const strokeColor = color || drawColorRef.current;
    const strokeWidth = width !== undefined 
      ? width 
      : (strokeTool === 'highlighter' ? 0.022 : 0.0035);
    const strokeFade = fadeDuration !== undefined 
      ? fadeDuration 
      : (isAutoFadeRef.current ? 3500 : null);

    const newStroke: DrawingStroke = {
      id: Math.random(),
      tool: strokeTool,
      color: strokeColor,
      width: strokeWidth,
      points: [{ x, y }],
      startTime: performance.now(),
      fadeDuration: strokeFade
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

  return {
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
    setBlurMasks,
    blurMasksRef,
    addBlurMask,
    removeBlurMask,
    updateBlurMask,
    clearBlurMasks,
    startDrawingStroke,
    updateDrawingStroke,
    endDrawingStroke
  };
}
