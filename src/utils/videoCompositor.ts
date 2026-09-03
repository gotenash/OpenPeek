import type { SavedVideo } from './db';

export type TransitionType = 'none' | 'crossfade' | 'fade-black' | 'slide';
export type TitleStyle = 'intro' | 'lowerthird' | 'outro';

export interface TimelineClip {
  id: string;
  video: SavedVideo;
  startTrim: number; // in seconds from original video start
  endTrim: number;   // in seconds from original video start
  transitionToNext: TransitionType;
  transitionDuration: number; // e.g. 1.0s
  playbackSpeed?: number;     // e.g. 1.0, 2.0, 4.0, 8.0 (fast-forward)
  showFastForwardBadge?: boolean; // display ⏩ Nx badge on video
}

export interface TimelineTitle {
  id: string;
  text: string;
  subtitle?: string;
  startTime: number; // position on master timeline in seconds
  duration: number;  // duration on master timeline in seconds
  style: TitleStyle;
  textColor: string;
  bgColor: string;
  fontSize: number;
}

export interface BackgroundMusicTrack {
  id: string;
  title: string;
  blob?: Blob;
  url?: string;
  volume: number; // 0.0 to 1.0, default 0.15 (15%)
  loop: boolean;
  isPreset?: boolean;
}

export interface EditorProject {
  clips: TimelineClip[];
  titles: TimelineTitle[];
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

/**
 * Generates an audio WAV blob for ambient presets using Web Audio offline synthesis.
 */
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

/**
 * Calculates the total duration of the master timeline taking into account
 * clip trims and overlapping transition durations.
 */
export function calculateTotalDuration(project: EditorProject): number {
  if (project.clips.length === 0) return 0;

  let total = 0;
  for (let i = 0; i < project.clips.length; i++) {
    const clip = project.clips[i];
    const speed = clip.playbackSpeed && clip.playbackSpeed > 0 ? clip.playbackSpeed : 1.0;
    const clipDuration = Math.max(0.1, (clip.endTrim - clip.startTrim) / speed);
    total += clipDuration;

    // Transitions shorten total time when overlapping
    if (i < project.clips.length - 1 && clip.transitionToNext !== 'none') {
      const transDur = Math.min(clip.transitionDuration, clipDuration / 2);
      total -= transDur;
    }
  }

  return Math.max(0, total);
}

/**
 * Draws an animated high-tech Fast-Forward badge on canvas (Screen Studio style)
 */
export function drawFastForwardBadge(
  ctx: CanvasRenderingContext2D,
  speed: number,
  canvasWidth: number,
  canvasHeight: number
) {
  if (speed <= 1.0) return;

  const text = `⏩ ${speed}x FAST-FORWARD`;
  const fontSize = Math.max(13, Math.round(canvasWidth * 0.014));
  ctx.save();
  ctx.font = `800 ${fontSize}px system-ui, -apple-system, sans-serif`;

  const textMetrics = ctx.measureText(text);
  const padX = fontSize * 1.0;
  const padY = fontSize * 0.55;
  const badgeW = textMetrics.width + padX * 2;
  const badgeH = fontSize + padY * 2;

  // Position at top-right
  const x = canvasWidth - badgeW - canvasWidth * 0.03;
  const y = canvasHeight * 0.05;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.strokeStyle = '#f59e0b'; // Amber / Gold neon border
  ctx.lineWidth = 1.8;

  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, badgeW, badgeH, 10);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(x, y, badgeW, badgeH);
    ctx.strokeRect(x, y, badgeW, badgeH);
  }

  // Text with amber glow
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#fde68a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + badgeW / 2, y + badgeH / 2 + 1);

  ctx.restore();
}

/**
 * Renders text overlay for a given timeline timestamp onto a 2D Canvas.
 */
export function drawTitleOverlay(
  ctx: CanvasRenderingContext2D,
  title: TimelineTitle,
  canvasW: number,
  canvasH: number,
  timeWithinTitle: number
) {
  const progress = timeWithinTitle / title.duration;
  if (progress < 0 || progress > 1) return;

  // Smooth fade-in and fade-out alpha
  let alpha = 1.0;
  if (timeWithinTitle < 0.4) {
    alpha = timeWithinTitle / 0.4;
  } else if (title.duration - timeWithinTitle < 0.4) {
    alpha = Math.max(0, (title.duration - timeWithinTitle) / 0.4);
  }

  ctx.save();
  ctx.globalAlpha = alpha;

  if (title.style === 'intro' || title.style === 'outro') {
    // Full screen card with glassmorphism gradient
    ctx.fillStyle = title.bgColor || 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = title.textColor || '#ffffff';
    ctx.font = `bold ${title.fontSize * (canvasW / 1280)}px "Outfit", sans-serif`;
    
    // Shadow glow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 16;
    ctx.fillText(title.text, canvasW / 2, canvasH / 2 - (title.subtitle ? 24 : 0));

    if (title.subtitle) {
      ctx.font = `normal ${(title.fontSize * 0.5) * (canvasW / 1280)}px "Inter", sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillText(title.subtitle, canvasW / 2, canvasH / 2 + 36);
    }
  } else if (title.style === 'lowerthird') {
    // Elegant lower third banner at the bottom
    const bannerH = canvasH * 0.16;
    const bannerY = canvasH * 0.78;
    const bannerX = canvasW * 0.05;
    const bannerW = canvasW * 0.9;

    ctx.fillStyle = title.bgColor || 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 12);
    ctx.fill();

    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = title.textColor || '#ffffff';
    ctx.font = `bold ${title.fontSize * 0.75 * (canvasW / 1280)}px "Outfit", sans-serif`;
    ctx.fillText(title.text, bannerX + 24, bannerY + bannerH * 0.38);

    if (title.subtitle) {
      ctx.font = `normal ${(title.fontSize * 0.45) * (canvasW / 1280)}px "Inter", sans-serif`;
      ctx.fillStyle = '#c084fc';
      ctx.fillText(title.subtitle, bannerX + 24, bannerY + bannerH * 0.72);
    }
  }

  ctx.restore();
}
