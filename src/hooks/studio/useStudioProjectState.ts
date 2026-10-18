import { useState, useRef, useCallback } from 'react';
import type { EditorProject } from '../../utils/videoCompositor';

export function useStudioProjectState() {
  const [_project, _setProject] = useState<EditorProject>({
    clips: [],
    titles: [],
    zooms: [],
    images: [],
    chapters: [],
    voiceovers: [],
    backgroundMusic: null
  });

  const project = _project;
  const projectRef = useRef<EditorProject>(_project);
  projectRef.current = _project;

  const undoStackRef = useRef<EditorProject[]>([]);
  const redoStackRef = useRef<EditorProject[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const isUndoRedoRef = useRef<boolean>(false);
  const lastHistoryPushTimeRef = useRef<number>(0);

  const [selectedElement, setSelectedElement] = useState<{
    type: 'clip' | 'voiceover' | 'title' | 'image' | 'zoom' | 'chapter';
    id: string;
  } | null>(null);

  const setProject = useCallback((
    updater: EditorProject | ((prev: EditorProject) => EditorProject),
    forceHistory: boolean = false
  ) => {
    _setProject(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next === prev) return prev;

      if (!isUndoRedoRef.current) {
        const now = Date.now();
        if (forceHistory || now - lastHistoryPushTimeRef.current > 250) {
          undoStackRef.current.push(prev);
          if (undoStackRef.current.length > 50) {
            undoStackRef.current.shift();
          }
          redoStackRef.current = [];
          setCanUndo(true);
          setCanRedo(false);
          lastHistoryPushTimeRef.current = now;
        }
      }
      return next;
    });
  }, []);

  return {
    project,
    setProject,
    _setProject,
    projectRef,
    undoStackRef,
    redoStackRef,
    canUndo,
    setCanUndo,
    canRedo,
    setCanRedo,
    isUndoRedoRef,
    selectedElement,
    setSelectedElement
  };
}
