import { useState, useRef, useEffect } from 'react';

export const PREVIEW_HEIGHTS = {
  compact: 260,
  standard: 380,
  large: 520
} as const;

export type PreviewSize = keyof typeof PREVIEW_HEIGHTS;

export function useStudioFullscreen() {
  const [previewSize, setPreviewSize] = useState<PreviewSize>(() => {
    const saved = localStorage.getItem('openpeek_editor_preview_size');
    return (saved === 'compact' || saved === 'standard' || saved === 'large') ? saved : 'standard';
  });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const updatePreviewSize = (size: PreviewSize) => {
    setPreviewSize(size);
    try {
      localStorage.setItem('openpeek_editor_preview_size', size);
    } catch (err) {
      console.warn('[VideoEditor] Failed to save preview size to localStorage:', err);
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      try {
        if (previewContainerRef.current && previewContainerRef.current.requestFullscreen) {
          previewContainerRef.current.requestFullscreen().catch((err) => {
            console.debug('[VideoEditor] Container requestFullscreen error:', err);
          });
        } else if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch((err) => {
            console.debug('[VideoEditor] Document requestFullscreen error:', err);
          });
        }
      } catch (err) {
        console.debug('[VideoEditor] Fullscreen request error:', err);
      }
    } else {
      setIsFullscreen(false);
      try {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch((err) => {
            console.debug('[VideoEditor] exitFullscreen error:', err);
          });
        }
      } catch (err) {
        console.debug('[VideoEditor] Exit fullscreen error:', err);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isFullscreen]);

  return {
    previewSize,
    previewHeight: PREVIEW_HEIGHTS[previewSize],
    updatePreviewSize,
    isFullscreen,
    toggleFullscreen,
    previewContainerRef
  };
}
