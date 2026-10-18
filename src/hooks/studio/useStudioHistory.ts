import { useCallback } from 'react';
import type { EditorProject } from '../../utils/videoCompositor';

interface UseStudioHistoryOptions {
  undoStackRef: React.MutableRefObject<EditorProject[]>;
  redoStackRef: React.MutableRefObject<EditorProject[]>;
  projectRef: React.MutableRefObject<EditorProject>;
  isUndoRedoRef: React.MutableRefObject<boolean>;
  _setProject: (p: EditorProject) => void;
  setCanUndo: (v: boolean) => void;
  setCanRedo: (v: boolean) => void;
  selectedElement: { type: string; id: string } | null;
  setSelectedElement: (el: any) => void;
  selectedClipId: string | null;
  setSelectedClipId: (id: string | null) => void;
  currentTimeRef: React.MutableRefObject<number>;
  isPlayingRef: React.MutableRefObject<boolean>;
  renderStaticPreviewAt: (t: number) => void;
  removeClipFromTimeline: (id: string) => void;
  removeVoiceover: (id: string) => void;
  removeTitle: (id: string) => void;
  removeImageOverlay: (id: string) => void;
  removeZoom: (id: string) => void;
  handleRemoveChapter: (id: string) => void;
}

export function useStudioHistory({
  undoStackRef,
  redoStackRef,
  projectRef,
  isUndoRedoRef,
  _setProject,
  setCanUndo,
  setCanRedo,
  selectedElement,
  setSelectedElement,
  selectedClipId,
  setSelectedClipId,
  currentTimeRef,
  isPlayingRef,
  renderStaticPreviewAt,
  removeClipFromTimeline,
  removeVoiceover,
  removeTitle,
  removeImageOverlay,
  removeZoom,
  handleRemoveChapter
}: UseStudioHistoryOptions) {
  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const previous = undoStackRef.current.pop();
    if (!previous) return;

    redoStackRef.current.push(projectRef.current);
    if (redoStackRef.current.length > 50) {
      redoStackRef.current.shift();
    }

    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);

    if (selectedElement) {
      const exists =
        (selectedElement.type === 'clip' && (previous.clips || []).some(c => c.id === selectedElement.id)) ||
        (selectedElement.type === 'voiceover' && (previous.voiceovers || []).some(v => v.id === selectedElement.id)) ||
        (selectedElement.type === 'title' && (previous.titles || []).some(t => t.id === selectedElement.id)) ||
        (selectedElement.type === 'image' && (previous.images || []).some(i => i.id === selectedElement.id)) ||
        (selectedElement.type === 'zoom' && (previous.zooms || []).some(z => z.id === selectedElement.id)) ||
        (selectedElement.type === 'chapter' && (previous.chapters || []).some(c => c.id === selectedElement.id));
      if (!exists) {
        setSelectedElement(null);
        setSelectedClipId(null);
      }
    }

    isUndoRedoRef.current = true;
    _setProject(previous);
    setTimeout(() => {
      isUndoRedoRef.current = false;
      if (!isPlayingRef.current) {
        renderStaticPreviewAt(currentTimeRef.current);
      }
    }, 30);
  }, [selectedElement, undoStackRef, redoStackRef, projectRef, setCanUndo, setCanRedo, isUndoRedoRef, _setProject, isPlayingRef, renderStaticPreviewAt, currentTimeRef, setSelectedElement, setSelectedClipId]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop();
    if (!next) return;

    undoStackRef.current.push(projectRef.current);
    if (undoStackRef.current.length > 50) {
      undoStackRef.current.shift();
    }

    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);

    isUndoRedoRef.current = true;
    _setProject(next);
    setTimeout(() => {
      isUndoRedoRef.current = false;
      if (!isPlayingRef.current) {
        renderStaticPreviewAt(currentTimeRef.current);
      }
    }, 30);
  }, [undoStackRef, redoStackRef, projectRef, setCanUndo, setCanRedo, isUndoRedoRef, _setProject, isPlayingRef, renderStaticPreviewAt, currentTimeRef]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedElement) {
      if (selectedElement.type === 'clip') {
        removeClipFromTimeline(selectedElement.id);
      } else if (selectedElement.type === 'voiceover') {
        removeVoiceover(selectedElement.id);
      } else if (selectedElement.type === 'title') {
        removeTitle(selectedElement.id);
      } else if (selectedElement.type === 'image') {
        removeImageOverlay(selectedElement.id);
      } else if (selectedElement.type === 'zoom') {
        removeZoom(selectedElement.id);
      } else if (selectedElement.type === 'chapter') {
        handleRemoveChapter(selectedElement.id);
      }
      setSelectedElement(null);
      setSelectedClipId(null);
    } else if (selectedClipId) {
      removeClipFromTimeline(selectedClipId);
      setSelectedClipId(null);
    }
  }, [selectedElement, selectedClipId, removeClipFromTimeline, removeVoiceover, removeTitle, removeImageOverlay, removeZoom, handleRemoveChapter, setSelectedElement, setSelectedClipId]);

  return {
    handleUndo,
    handleRedo,
    handleDeleteSelected
  };
}
