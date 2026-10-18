import React, { useEffect } from 'react';

export interface UseStudioShortcutsProps {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  togglePlay: () => void;
  handleSeek: (time: number) => void;
  currentTimeRef: React.MutableRefObject<number>;
  totalDuration: number;
  handleUndo: () => void;
  handleRedo: () => void;
  handleDeleteSelected: () => void;
  handleSplitAtPlayhead: () => void;
  selectedElement: { type: string; id: string } | null;
  selectedClipId: string | null;
  isAnyModalOpen: boolean;
}

export function useStudioShortcuts({
  isFullscreen,
  toggleFullscreen,
  togglePlay,
  handleSeek,
  currentTimeRef,
  totalDuration,
  handleUndo,
  handleRedo,
  handleDeleteSelected,
  handleSplitAtPlayhead,
  selectedElement,
  selectedClipId,
  isAnyModalOpen
}: UseStudioShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // Undo / Redo: Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
          return;
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          handleRedo();
          return;
        }
      }

      // Delete key: Supprimer / Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace' || e.key === 'Del') {
        if (!isAnyModalOpen) {
          if (selectedElement || selectedClipId) {
            e.preventDefault();
            handleDeleteSelected();
            return;
          }
        }
      }

      if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        toggleFullscreen();
      } else if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey && !isAnyModalOpen) {
        e.preventDefault();
        toggleFullscreen();
      } else if ((e.key === ' ' || e.code === 'Space') && !isAnyModalOpen) {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft' && !isAnyModalOpen) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        handleSeek(Math.max(0, currentTimeRef.current - step));
      } else if (e.key === 'ArrowRight' && !isAnyModalOpen) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        handleSeek(Math.min(totalDuration, currentTimeRef.current + step));
      } else if (
        (e.key === 'c' || e.key === 'C' || e.key === 's' || e.key === 'S' ||
         ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B' || e.key === 'k' || e.key === 'K'))) &&
        !isAnyModalOpen
      ) {
        e.preventDefault();
        handleSplitAtPlayhead();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isFullscreen,
    toggleFullscreen,
    togglePlay,
    handleSeek,
    currentTimeRef,
    totalDuration,
    handleUndo,
    handleRedo,
    handleDeleteSelected,
    handleSplitAtPlayhead,
    selectedElement,
    selectedClipId,
    isAnyModalOpen
  ]);
}
