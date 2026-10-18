import React, { useState, useRef } from 'react';
import {
  type EditorProject,
  AMBIENT_MUSIC_PRESETS,
  generateAmbientMusicBlob
} from '../../utils/videoCompositor';

export interface UseStudioAudioProps {
  setProject: (updater: EditorProject | ((prev: EditorProject) => EditorProject)) => void;
  bgMusicAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
}

export function useStudioAudio({
  setProject,
  bgMusicAudioRef
}: UseStudioAudioProps) {
  const [customAudios, setCustomAudios] = useState<{ id: string; title: string; blob: Blob; url: string }[]>([]);
  const [previewingAudioId, setPreviewingAudioId] = useState<string | null>(null);
  const [generatingPresetId, setGeneratingPresetId] = useState<string | null>(null);
  const audioPreviewElRef = useRef<HTMLAudioElement | null>(null);

  const handleSelectPresetMusic = async (presetId: string) => {
    const preset = AMBIENT_MUSIC_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    setGeneratingPresetId(presetId);
    try {
      const blob = await generateAmbientMusicBlob(presetId);
      setProject(prev => ({
        ...prev,
        backgroundMusic: {
          id: preset.id,
          title: preset.title,
          blob,
          volume: prev.backgroundMusic?.volume ?? 0.15,
          loop: true,
          isPreset: true
        }
      }));
    } catch (e) {
      alert("Erreur lors de la génération de l'ambiance musicale.");
    } finally {
      setGeneratingPresetId(null);
    }
  };

  const handleUploadAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newAudio = {
      id: `audio_${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ""),
      blob: file,
      url: URL.createObjectURL(file)
    };

    setCustomAudios(prev => [newAudio, ...prev]);

    setProject(prev => ({
      ...prev,
      backgroundMusic: {
        id: newAudio.id,
        title: newAudio.title,
        blob: newAudio.blob,
        volume: prev.backgroundMusic?.volume ?? 0.15,
        loop: true,
        isPreset: false
      }
    }));

    e.target.value = '';
  };

  const handleTogglePreviewAudio = (id: string, blob: Blob) => {
    if (previewingAudioId === id) {
      if (audioPreviewElRef.current) {
        audioPreviewElRef.current.pause();
      }
      setPreviewingAudioId(null);
    } else {
      if (!audioPreviewElRef.current) {
        audioPreviewElRef.current = document.createElement('audio');
      }
      const audioEl = audioPreviewElRef.current;
      audioEl.src = URL.createObjectURL(blob);
      audioEl.volume = 0.5;
      audioEl.play().catch(() => {});
      audioEl.onended = () => setPreviewingAudioId(null);
      setPreviewingAudioId(id);
    }
  };

  const handleUpdateMusicVolume = (volume: number) => {
    setProject(prev => {
      if (!prev.backgroundMusic) return prev;
      return {
        ...prev,
        backgroundMusic: {
          ...prev.backgroundMusic,
          volume: Math.max(0, Math.min(1, volume))
        }
      };
    });
  };

  const handleRemoveBackgroundMusic = () => {
    setProject(prev => ({ ...prev, backgroundMusic: null }));
    if (bgMusicAudioRef.current) {
      bgMusicAudioRef.current.pause();
    }
  };

  return {
    customAudios,
    previewingAudioId,
    generatingPresetId,
    handleSelectPresetMusic,
    handleUploadAudio,
    handleTogglePreviewAudio,
    handleUpdateMusicVolume,
    handleRemoveBackgroundMusic
  };
}
