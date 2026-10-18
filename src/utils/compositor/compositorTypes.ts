import type { SavedVideo } from '../db';

export type TransitionType = 'none' | 'crossfade' | 'fade-black' | 'slide';
export type TitleStyle =
  | 'lowerthird'   // Bandeau inférieur bas-gauche avec barre d'accent
  | 'pill'         // Capsule moderne Screen Studio / Apple avec puce lumineuse
  | 'badge'        // Encart / Tag en haut à gauche pour astuces et raccourcis
  | 'center-card'  // Cartouche glassmorphism centré pour étapes clés
  | 'cinema'       // Typographie cinéma épurée avec dégradé d'ambiance bas
  | 'intro'        // Carton plein écran d'introduction
  | 'outro';       // Carton plein écran de conclusion

export type TitleAnimation =
  | 'slide-up'     // Glissement fluide vers le haut
  | 'slide-left'   // Glissement dynamique depuis la gauche
  | 'zoom-in'      // Zoom progressif avec fondu
  | 'pop-bounce'   // Rebond pop & spring punchy
  | 'typewriter'   // Révélation lettre par lettre
  | 'fade';        // Fondu classique en douceur

export type ImagePositionPreset = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom';
export type ClipType = 'video' | 'slide' | 'image';

export interface SlideContent {
  title: string;
  subtitle?: string;
  bgColor: string;        // Hex or preset
  textColor: string;      // Title color
  subtextColor?: string;  // Subtitle color
  fontSize?: number;      // Title font size in px
  bgImageUrl?: string;    // Background image DataURL
  bgImageEl?: HTMLImageElement;
  align?: 'center' | 'left' | 'right';
}

export interface TimelineClip {
  id: string;
  type?: ClipType;            // 'video' | 'slide' | 'image' (default 'video')
  track?: 1 | 2;              // 1 (Piste V1 Principale) or 2 (Piste V2 Alternée)
  startTime?: number;         // Position de début sur la timeline maître en secondes
  video: SavedVideo;
  startTrim: number; // in seconds from original video start
  endTrim: number;   // in seconds from original video start
  transitionToNext: TransitionType;
  transitionDuration: number; // e.g. 1.0s
  playbackSpeed?: number;     // e.g. 1.0, 2.0, 4.0, 8.0 (fast-forward)
  showFastForwardBadge?: boolean; // display ⏩ Nx badge on video
  slideContent?: SlideContent; // For 'slide' or 'image' clips
  volume?: number;            // 0.0 to 1.0 (default 1.0 for audio mixing)
}

export interface TimelineTitle {
  id: string;
  text: string;
  subtitle?: string;
  startTime: number; // position on master timeline in seconds
  duration: number;  // duration on master timeline in seconds
  style: TitleStyle;
  animation?: TitleAnimation; // animation d'apparition (défaut 'slide-up')
  textColor: string;
  bgColor: string;
  fontSize: number;
}

export interface TimelineZoom {
  id: string;
  startTime: number; // position on master timeline in seconds
  duration: number;  // duration on master timeline in seconds (e.g. 3s)
  scale: number;     // e.g. 1.5, 2.0, 2.5
  originX: number;   // 0.0 to 1.0 (horizontal center of zoom target)
  originY: number;   // 0.0 to 1.0 (vertical center of zoom target)
  label?: string;    // e.g. "Zoom Code", "Détail"
}

// Aliases for studio component compatibility
export type TimelineZoomEffect = TimelineZoom;
export type TimelineImageOverlay = TimelineImage;
export type TimelineProject = EditorProject;

export interface TimelineImage {
  id: string;
  name: string;
  dataUrl: string; // Base64 data or object URL
  startTime: number; // position on master timeline in seconds
  duration: number; // duration on master timeline in seconds (or full video)
  position: ImagePositionPreset;
  x: number; // 0.0 to 1.0 (relative center or custom pos)
  y: number; // 0.0 to 1.0 (relative center or custom pos)
  scale: number; // 0.05 to 0.50 (relative to canvas width)
  opacity: number; // 0.1 to 1.0
  hasShadow?: boolean;
  borderRadius?: number; // corner radius in px
  title?: string;
}

export interface TimelineChapter {
  id: string;
  time: number; // in seconds on timeline
  title: string;
}

export interface BackgroundMusicTrack {
  id: string;
  title: string;
  blob?: Blob;
  url?: string;
  volume: number; // 0.0 to 1.0, default 0.15 (15%)
  loop: boolean;
  isPreset?: boolean;
  autoDucking?: boolean; // automatically lowers volume when speech is detected
  duckingLevel?: number; // ducked volume multiplier (e.g. 0.25)
}

export interface TimelineVoiceover {
  id: string;
  blob: Blob;
  dataUrl?: string;
  startTime: number;
  duration: number;
  volume: number; // 0.0 to 1.0 (default 1.0)
  label?: string;
  title?: string;
}

export interface EditorProject {
  clips: TimelineClip[];
  titles: TimelineTitle[];
  zooms?: TimelineZoom[];
  images?: TimelineImage[];
  chapters?: TimelineChapter[];
  voiceovers?: TimelineVoiceover[];
  backgroundMusic?: BackgroundMusicTrack | null;
}

export interface AmbientPreset {
  id: string;
  title: string;
  description: string;
  genre: string;
  bpm: number;
  baseFreqs: number[];
}

export const AMBIENT_MUSIC_PRESETS: AmbientPreset[] = [
  {
    id: 'lofi-chill',
    title: '☕ Lo-Fi Chill & Focus',
    description: 'Accords feutrés et doux pour tutoriels de programmation et bureautique.',
    genre: 'Lo-Fi',
    bpm: 75,
    baseFreqs: [220, 261.63, 329.63, 392.0]
  },
  {
    id: 'modern-tech',
    title: '🚀 Modern Tech & Upbeat',
    description: 'Pulsation dynamique et lumineuse pour présentations de logiciels et démos.',
    genre: 'Tech',
    bpm: 110,
    baseFreqs: [293.66, 369.99, 440.0, 554.37]
  },
  {
    id: 'ambient-drone',
    title: '✨ Ambient Calme & Soft Drone',
    description: 'Nappe sonore subtile et relaxante sans percussion pour laisser parler la voix.',
    genre: 'Ambient',
    bpm: 60,
    baseFreqs: [174.61, 220.0, 261.63, 329.63]
  },
  {
    id: 'acoustic-focus',
    title: '🎸 Acoustic Calm & Inspiring',
    description: 'Ambiance acoustique épurée pour vidéos explicatives et études de cas.',
    genre: 'Acoustic',
    bpm: 85,
    baseFreqs: [196.0, 246.94, 293.66, 392.0]
  }
];

export async function generateAmbientMusicBlob(presetId: string): Promise<Blob> {
  const preset = AMBIENT_MUSIC_PRESETS.find(p => p.id === presetId) || AMBIENT_MUSIC_PRESETS[0];
  const sampleRate = 44100;
  const duration = 16; // 16-second loop
  const totalSamples = sampleRate * duration;

  const offlineCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(
    2,
    totalSamples,
    sampleRate
  );

  const chords = [
    preset.baseFreqs,
    preset.baseFreqs.map(f => f * 1.122),
    preset.baseFreqs.map(f => f * 0.89),
    preset.baseFreqs
  ];

  const chordDuration = duration / chords.length;

  chords.forEach((chord, chordIdx) => {
    const startTime = chordIdx * chordDuration;

    chord.forEach((freq, noteIdx) => {
      const osc = offlineCtx.createOscillator();
      osc.type = preset.genre === 'Lo-Fi' ? 'triangle' : (preset.genre === 'Tech' ? 'sawtooth' : 'sine');
      osc.frequency.setValueAtTime(freq * (noteIdx === 0 ? 0.5 : 1), startTime);

      const filter = offlineCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(preset.genre === 'Lo-Fi' ? 650 : (preset.genre === 'Tech' ? 1200 : 480), startTime);

      const gain = offlineCtx.createGain();
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.12 / (noteIdx + 1), startTime + 0.6);
      gain.gain.exponentialRampToValueAtTime(0.06 / (noteIdx + 1), startTime + chordDuration - 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + chordDuration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(offlineCtx.destination);

      osc.start(startTime);
      osc.stop(startTime + chordDuration);
    });
  });

  const renderedBuffer = await offlineCtx.startRendering();
  return audioBufferToWav(renderedBuffer);
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const wavBuffer = new ArrayBuffer(44 + length * numChannels * 2);
  const view = new DataView(wavBuffer);

  const writeString = (v: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) v.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length * numChannels * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, length * numChannels * 2, true);

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([wavBuffer], { type: 'audio/wav' });
}
