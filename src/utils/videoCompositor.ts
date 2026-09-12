import type { SavedVideo } from './db';

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
  if (!project) return 0;
  const clips = project.clips || [];
  let clipSequentialTotal = 0;
  let maxExplicitClipEnd = 0;
  let hasExplicitStartTime = false;

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    if (!clip) continue;
    const speed = typeof clip.playbackSpeed === 'number' && clip.playbackSpeed > 0 && !isNaN(clip.playbackSpeed)
      ? clip.playbackSpeed
      : 1.0;
    const start = typeof clip.startTrim === 'number' && !isNaN(clip.startTrim) ? Math.max(0, clip.startTrim) : 0;
    const end = typeof clip.endTrim === 'number' && !isNaN(clip.endTrim)
      ? Math.max(start + 0.1, clip.endTrim)
      : (clip.video?.duration && clip.video.duration > 0 ? clip.video.duration : start + 10);
    const clipDuration = Math.max(0.1, (end - start) / speed);

    if (typeof clip.startTime === 'number' && !isNaN(clip.startTime)) {
      hasExplicitStartTime = true;
      const clipEnd = clip.startTime + clipDuration;
      if (clipEnd > maxExplicitClipEnd) maxExplicitClipEnd = clipEnd;
    }

    clipSequentialTotal += clipDuration;

    // Transitions shorten total time when overlapping
    if (i < clips.length - 1 && clip.transitionToNext && clip.transitionToNext !== 'none') {
      const transDuration = typeof clip.transitionDuration === 'number' && !isNaN(clip.transitionDuration)
        ? clip.transitionDuration
        : 1.0;
      const transDur = Math.min(transDuration, clipDuration / 2);
      clipSequentialTotal -= transDur;
    }
  }

  const effectiveClipDur = hasExplicitStartTime ? Math.max(maxExplicitClipEnd, clipSequentialTotal) : clipSequentialTotal;

  // Also account for titles, images, zooms, voiceovers
  let maxOther = 0;
  for (const t of (project.titles || [])) {
    if (!t) continue;
    const end = (typeof t.startTime === 'number' && !isNaN(t.startTime) ? t.startTime : 0) +
                (typeof t.duration === 'number' && !isNaN(t.duration) ? t.duration : 3);
    if (end > maxOther) maxOther = end;
  }
  for (const img of (project.images || [])) {
    if (!img) continue;
    const end = (typeof img.startTime === 'number' && !isNaN(img.startTime) ? img.startTime : 0) +
                (typeof img.duration === 'number' && !isNaN(img.duration) ? img.duration : 5);
    if (end > maxOther) maxOther = end;
  }
  for (const z of (project.zooms || [])) {
    if (!z) continue;
    const end = (typeof z.startTime === 'number' && !isNaN(z.startTime) ? z.startTime : 0) +
                (typeof z.duration === 'number' && !isNaN(z.duration) ? z.duration : 3);
    if (end > maxOther) maxOther = end;
  }
  for (const v of (project.voiceovers || [])) {
    if (!v) continue;
    const end = (typeof v.startTime === 'number' && !isNaN(v.startTime) ? v.startTime : 0) +
                (typeof v.duration === 'number' && !isNaN(v.duration) ? v.duration : 1);
    if (end > maxOther) maxOther = end;
  }

  const finalDur = effectiveClipDur > 0 ? Math.max(effectiveClipDur, maxOther) : maxOther;
  return typeof finalDur === 'number' && !isNaN(finalDur) ? Math.max(0, finalDur) : 0;
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

  const anim: TitleAnimation = title.animation || (title.style === 'intro' || title.style === 'outro' ? 'zoom-in' : 'slide-up');

  // Durées des phases d'entrée et de sortie
  const enterDur = Math.min(0.55, title.duration * 0.35);
  const exitDur = Math.min(0.40, title.duration * 0.25);
  const timeFromEnd = title.duration - timeWithinTitle;

  const tEnter = Math.max(0, Math.min(1, timeWithinTitle / enterDur));
  const tExit = Math.max(0, Math.min(1, timeFromEnd / exitDur));

  // Fonctions d'amortissement / Easing
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  const easeOutBack = (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  // Calcul de la transparence globale
  let alpha = 1.0;
  if (timeWithinTitle < enterDur) {
    alpha = tEnter;
  } else if (timeFromEnd < exitDur) {
    alpha = tExit;
  }

  // Calcul des décalages et de l'échelle selon l'animation choisie
  let offsetX = 0;
  let offsetY = 0;
  let scale = 1.0;
  let typewriterProgress = 1.0;

  if (timeWithinTitle < enterDur) {
    const t = tEnter;
    if (anim === 'slide-up') {
      offsetY = (1 - easeOutCubic(t)) * (canvasH * 0.08);
    } else if (anim === 'slide-left') {
      offsetX = -(1 - easeOutCubic(t)) * (canvasW * 0.12);
    } else if (anim === 'zoom-in') {
      scale = 0.72 + easeOutCubic(t) * 0.28;
    } else if (anim === 'pop-bounce') {
      scale = Math.max(0.05, easeOutBack(t));
    } else if (anim === 'typewriter') {
      typewriterProgress = Math.min(1.0, t * 1.15);
    }
    // 'fade' garde offsetX=0, offsetY=0, scale=1.0 et utilise uniquement alpha
  } else if (timeFromEnd < exitDur) {
    const t = 1 - tExit;
    if (anim === 'slide-up' || anim === 'slide-left') {
      offsetY = t * (canvasH * 0.04);
    } else if (anim === 'zoom-in' || anim === 'pop-bounce') {
      scale = 1.0 - t * 0.15;
    }
  }

  // Gestion du texte pour l'animation Machine à écrire
  const rawText = title.text || '';
  const textChars = Math.max(1, Math.floor(rawText.length * typewriterProgress));
  const displayText = anim === 'typewriter' && timeWithinTitle < enterDur
    ? rawText.slice(0, textChars) + (Math.floor(timeWithinTitle * 8) % 2 === 0 ? '▏' : '')
    : rawText;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

  // Helper pour appliquer translation + scale autour du centre géométrique
  const applyTransform = (cx: number, cy: number) => {
    ctx.translate(cx + offsetX, cy + offsetY);
    if (scale !== 1.0) {
      ctx.scale(scale, scale);
    }
    ctx.translate(-cx, -cy);
  };

  const scaleRatio = canvasW / 1280;

  if (title.style === 'intro' || title.style === 'outro') {
    // ----------------------------------------------------
    // 1 & 2 : PLEIN ÉCRAN INTRO / OUTRO
    // ----------------------------------------------------
    applyTransform(canvasW / 2, canvasH / 2);

    // Dégradé sombre radial immersif
    const bgGrad = ctx.createRadialGradient(
      canvasW / 2, canvasH / 2, 80,
      canvasW / 2, canvasH / 2, canvasW * 0.7
    );
    bgGrad.addColorStop(0, title.bgColor || 'rgba(30, 41, 59, 0.94)');
    bgGrad.addColorStop(1, 'rgba(10, 15, 30, 0.98)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = title.textColor || '#ffffff';
    ctx.font = `800 ${title.fontSize * scaleRatio}px "Outfit", sans-serif`;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 20;
    const textY = canvasH / 2 - (title.subtitle ? 28 : 0);
    ctx.fillText(displayText, canvasW / 2, textY);

    if (title.subtitle) {
      // Ligne séparatrice lumineuse
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(canvasW / 2 - 80, textY + 34);
      ctx.lineTo(canvasW / 2 + 80, textY + 34);
      ctx.stroke();

      ctx.shadowBlur = 10;
      ctx.font = `500 ${(title.fontSize * 0.52) * scaleRatio}px "Inter", sans-serif`;
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(title.subtitle, canvasW / 2, textY + 68);
    }

  } else if (title.style === 'pill') {
    // ----------------------------------------------------
    // 3 : PILULE FLOTTANTE MODERNE (Screen Studio / Apple Style)
    // ----------------------------------------------------
    const titleFont = `600 ${title.fontSize * 0.68 * scaleRatio}px "Inter", -apple-system, sans-serif`;
    ctx.font = titleFont;
    const titleW = ctx.measureText(displayText).width;
    let subW = 0;
    if (title.subtitle) {
      ctx.font = `normal ${(title.fontSize * 0.44) * scaleRatio}px "Inter", sans-serif`;
      subW = ctx.measureText(title.subtitle).width;
    }

    const contentW = Math.max(titleW, subW);
    const bannerH = title.subtitle ? canvasH * 0.11 : canvasH * 0.075;
    const bannerW = Math.min(canvasW * 0.55, Math.max(canvasW * 0.22, contentW + bannerH + 36));
    const bannerX = canvasW * 0.04;
    const bannerY = canvasH - bannerH - (canvasH * 0.05);

    applyTransform(bannerX + bannerW / 2, bannerY + bannerH / 2);

    // Ombre diffuse élégante
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;

    // Fond pilule sombre givré
    ctx.fillStyle = title.bgColor || 'rgba(15, 23, 42, 0.93)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)'; // Accent cyan subtil
    ctx.lineWidth = 1.8;

    const radius = bannerH / 2;
    if (typeof (ctx as any).roundRect === 'function') {
      ctx.beginPath();
      (ctx as any).roundRect(bannerX, bannerY, bannerW, bannerH, radius);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
      ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);
    }

    ctx.shadowColor = 'transparent';

    // Pastille ronde lumineuse (Dot cyan)
    const dotX = bannerX + radius * 0.85;
    const dotY = bannerY + bannerH / 2;
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Textes
    const textStartX = dotX + 16;
    const maxTextW = bannerW - (textStartX - bannerX) - radius * 0.5;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = title.textColor || '#ffffff';
    ctx.font = titleFont;

    if (title.subtitle) {
      ctx.fillText(displayText, textStartX, bannerY + bannerH * 0.36, maxTextW);
      ctx.font = `normal ${(title.fontSize * 0.44) * scaleRatio}px "Inter", sans-serif`;
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(title.subtitle, textStartX, bannerY + bannerH * 0.72, maxTextW);
    } else {
      ctx.fillText(displayText, textStartX, bannerY + bannerH * 0.5, maxTextW);
    }

  } else if (title.style === 'badge') {
    // ----------------------------------------------------
    // 4 : ENCART / TAG NOTIFICATION HAUT-GAUCHE
    // ----------------------------------------------------
    const titleFont = `700 ${title.fontSize * 0.65 * scaleRatio}px "Outfit", sans-serif`;
    ctx.font = titleFont;
    const titleW = ctx.measureText(displayText).width;
    let subW = 0;
    if (title.subtitle) {
      ctx.font = `normal ${(title.fontSize * 0.42) * scaleRatio}px "Inter", sans-serif`;
      subW = ctx.measureText(title.subtitle).width;
    }

    const contentW = Math.max(titleW, subW);
    const bannerH = title.subtitle ? canvasH * 0.12 : canvasH * 0.085;
    const bannerW = Math.min(canvasW * 0.50, Math.max(canvasW * 0.22, contentW + 40));
    const bannerX = canvasW * 0.04;
    const bannerY = canvasH * 0.05;

    applyTransform(bannerX + bannerW / 2, bannerY + bannerH / 2);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;

    // Fond sombre avec bordure ambre / dorée
    ctx.fillStyle = title.bgColor || 'rgba(15, 23, 42, 0.94)';
    ctx.strokeStyle = '#f59e0b'; // Ambre vif
    ctx.lineWidth = 2;

    if (typeof (ctx as any).roundRect === 'function') {
      ctx.beginPath();
      (ctx as any).roundRect(bannerX, bannerY, bannerW, bannerH, 8);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
      ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);
    }

    ctx.shadowColor = 'transparent';

    // Badge Tag "⚡ INFO" en haut
    ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
    if (typeof (ctx as any).roundRect === 'function') {
      ctx.beginPath();
      (ctx as any).roundRect(bannerX + 10, bannerY + 6, 52, 14, 3);
      ctx.fill();
    }
    ctx.fillStyle = '#fde68a';
    ctx.font = `bold ${9 * scaleRatio}px "Inter", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡ POINT CLÉ', bannerX + 14, bannerY + 13);

    // Titre et sous-titre
    ctx.fillStyle = title.textColor || '#ffffff';
    ctx.font = titleFont;
    const maxTextW = bannerW - 24;
    if (title.subtitle) {
      ctx.fillText(displayText, bannerX + 12, bannerY + bannerH * 0.52, maxTextW);
      ctx.font = `normal ${(title.fontSize * 0.42) * scaleRatio}px "Inter", sans-serif`;
      ctx.fillStyle = '#fcd34d';
      ctx.fillText(title.subtitle, bannerX + 12, bannerY + bannerH * 0.80, maxTextW);
    } else {
      ctx.fillText(displayText, bannerX + 12, bannerY + bannerH * 0.65, maxTextW);
    }

  } else if (title.style === 'center-card') {
    // ----------------------------------------------------
    // 5 : CARTOUCHE CENTRAL (Glassmorphism)
    // ----------------------------------------------------
    const titleFont = `800 ${title.fontSize * 0.85 * scaleRatio}px "Outfit", sans-serif`;
    ctx.font = titleFont;
    const titleW = ctx.measureText(displayText).width;
    let subW = 0;
    if (title.subtitle) {
      ctx.font = `500 ${(title.fontSize * 0.48) * scaleRatio}px "Inter", sans-serif`;
      subW = ctx.measureText(title.subtitle).width;
    }

    const contentW = Math.max(titleW, subW);
    const cardH = title.subtitle ? canvasH * 0.20 : canvasH * 0.14;
    const cardW = Math.min(canvasW * 0.70, Math.max(canvasW * 0.38, contentW + 64));
    const cardX = (canvasW - cardW) / 2;
    const cardY = (canvasH - cardH) / 2;

    applyTransform(canvasW / 2, canvasH / 2);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;

    // Fond glassmorphism avec bordure dégradée violette/indigo
    ctx.fillStyle = title.bgColor || 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 2.2;

    if (typeof (ctx as any).roundRect === 'function') {
      ctx.beginPath();
      (ctx as any).roundRect(cardX, cardY, cardW, cardH, 12);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(cardX, cardY, cardW, cardH);
      ctx.strokeRect(cardX, cardY, cardW, cardH);
    }

    // Ligne lumineuse en haut de la carte
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#818cf8';
    if (typeof (ctx as any).roundRect === 'function') {
      ctx.beginPath();
      (ctx as any).roundRect(cardX + 24, cardY + 2, cardW - 48, 3, 2);
      ctx.fill();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = title.textColor || '#ffffff';
    ctx.font = titleFont;
    const maxTextW = cardW - 32;

    if (title.subtitle) {
      ctx.fillText(displayText, canvasW / 2, cardY + cardH * 0.40, maxTextW);
      ctx.font = `500 ${(title.fontSize * 0.48) * scaleRatio}px "Inter", sans-serif`;
      ctx.fillStyle = '#c7d2fe';
      ctx.fillText(title.subtitle, canvasW / 2, cardY + cardH * 0.75, maxTextW);
    } else {
      ctx.fillText(displayText, canvasW / 2, cardY + cardH * 0.52, maxTextW);
    }

  } else if (title.style === 'cinema') {
    // ----------------------------------------------------
    // 6 : CINÉMA ÉPURÉ (Dégradé d'ambiance bas & typographie premium)
    // ----------------------------------------------------
    applyTransform(canvasW / 2, canvasH - canvasH * 0.12);

    // Dégradé noir subtil en bas de l'écran pour détacher le texte
    const cineGrad = ctx.createLinearGradient(0, canvasH * 0.75, 0, canvasH);
    cineGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    cineGrad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
    ctx.fillStyle = cineGrad;
    ctx.fillRect(0, canvasH * 0.75, canvasW, canvasH * 0.25);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = title.textColor || '#ffffff';
    ctx.font = `800 ${title.fontSize * 0.88 * scaleRatio}px "Outfit", serif`;
    const cineY = canvasH - (title.subtitle ? canvasH * 0.13 : canvasH * 0.08);
    ctx.fillText(displayText.toUpperCase(), canvasW / 2, cineY);

    if (title.subtitle) {
      ctx.font = `600 ${(title.fontSize * 0.46) * scaleRatio}px "Inter", sans-serif`;
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(title.subtitle, canvasW / 2, cineY + 30 * scaleRatio);
    }

  } else {
    // ----------------------------------------------------
    // 7 : BANDEAU INFÉRIEUR BAS-GAUCHE (Lower Third classique)
    // ----------------------------------------------------
    const titleFont = `bold ${title.fontSize * 0.75 * scaleRatio}px "Outfit", sans-serif`;
    ctx.font = titleFont;
    const titleW = ctx.measureText(displayText).width;
    let subW = 0;
    if (title.subtitle) {
      ctx.font = `normal ${(title.fontSize * 0.45) * scaleRatio}px "Inter", sans-serif`;
      subW = ctx.measureText(title.subtitle).width;
    }

    const contentW = Math.max(titleW, subW);
    // Plafonné à 55% de la largeur d'écran (laisse 45% pour la webcam à droite)
    const bannerW = Math.min(canvasW * 0.55, Math.max(canvasW * 0.25, contentW + 48));
    const bannerH = title.subtitle ? canvasH * 0.13 : canvasH * 0.085;
    const bannerX = canvasW * 0.04;
    const bannerY = canvasH - bannerH - (canvasH * 0.05);

    applyTransform(bannerX + bannerW / 2, bannerY + bannerH / 2);

    ctx.fillStyle = title.bgColor || 'rgba(15, 23, 42, 0.88)';
    if (typeof (ctx as any).roundRect === 'function') {
      ctx.beginPath();
      (ctx as any).roundRect(bannerX, bannerY, bannerW, bannerH, 10);
      ctx.fill();
    } else {
      ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
    }

    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2.5;
    if (typeof (ctx as any).roundRect === 'function') {
      ctx.stroke();
    } else {
      ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);
    }

    // Barre d'accentuation violette à gauche
    ctx.fillStyle = '#8b5cf6';
    if (typeof (ctx as any).roundRect === 'function') {
      ctx.beginPath();
      (ctx as any).roundRect(bannerX + 4, bannerY + 6, 4, bannerH - 12, 2);
      ctx.fill();
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = title.textColor || '#ffffff';
    ctx.font = titleFont;
    const maxTextW = bannerW - 40;
    if (title.subtitle) {
      ctx.fillText(displayText, bannerX + 20, bannerY + bannerH * 0.36, maxTextW);
      ctx.font = `normal ${(title.fontSize * 0.45) * scaleRatio}px "Inter", sans-serif`;
      ctx.fillStyle = '#c084fc';
      ctx.fillText(title.subtitle, bannerX + 20, bannerY + bannerH * 0.72, maxTextW);
    } else {
      ctx.fillText(displayText, bannerX + 20, bannerY + bannerH * 0.5, maxTextW);
    }
  }

  ctx.restore();
}

/**
 * Returns the active timeline zoom if any at currentTime.
 */
export function getActiveTimelineZoom(zooms: TimelineZoom[] | undefined, currentTime: number): TimelineZoom | null {
  if (!zooms || zooms.length === 0) return null;
  return zooms.find(z => currentTime >= z.startTime && currentTime <= z.startTime + z.duration) || null;
}

/**
 * Calculates current zoom progress (0 to 1 with smooth in/out easing) and applies the canvas 2D matrix transformation.
 * Returns true if a zoom transformation was applied (meaning ctx.restore() should be called).
 */
export function applyTimelineZoomTransform(
  ctx: CanvasRenderingContext2D,
  zoom: TimelineZoom | null | undefined,
  currentTime: number,
  canvasW: number,
  canvasH: number
): boolean {
  if (!zoom) return false;
  const elapsed = currentTime - zoom.startTime;
  if (elapsed < 0 || elapsed > zoom.duration) return false;

  const transIn = Math.min(0.35, Math.max(0.1, zoom.duration / 3));
  const transOut = Math.min(0.35, Math.max(0.1, zoom.duration / 3));

  let progress = 1.0;
  if (elapsed < transIn) {
    const t = elapsed / transIn;
    // Smooth sinusoidal ease-in
    progress = 0.5 - 0.5 * Math.cos(Math.PI * t);
  } else if (elapsed > zoom.duration - transOut) {
    const t = (zoom.duration - elapsed) / transOut;
    // Smooth sinusoidal ease-out
    progress = 0.5 - 0.5 * Math.cos(Math.PI * t);
  }

  if (progress <= 0.001) return false;

  const currentScale = 1.0 + (zoom.scale - 1.0) * progress;
  const targetCenterX = zoom.originX * canvasW;
  const targetCenterY = zoom.originY * canvasH;

  const currentCenterX = (canvasW / 2) + (targetCenterX - (canvasW / 2)) * progress;
  const currentCenterY = (canvasH / 2) + (targetCenterY - (canvasH / 2)) * progress;

  ctx.save();
  ctx.translate(canvasW / 2, canvasH / 2);
  ctx.scale(currentScale, currentScale);
  ctx.translate(-currentCenterX, -currentCenterY);
  return true;
}

/**
 * Draws an image/logo overlay with position presets or custom coordinates, scale, opacity, shadow, and rounded corners.
 */
export function drawImageOverlay(
  ctx: CanvasRenderingContext2D,
  overlay: TimelineImage,
  img: HTMLImageElement | null | undefined,
  canvasW: number,
  canvasH: number,
  timeWithinOverlay: number,
  isStaticPreview: boolean = false
): void {
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const naturalW = img.naturalWidth;
  const naturalH = img.naturalHeight;
  const aspectRatio = naturalW / naturalH;

  // Target width relative to canvas
  const targetW = canvasW * overlay.scale;
  const targetH = targetW / aspectRatio;

  const margin = Math.min(canvasW, canvasH) * 0.04; // 4% margin from canvas borders

  let drawX = 0;
  let drawY = 0;

  switch (overlay.position) {
    case 'top-left':
      drawX = margin;
      drawY = margin;
      break;
    case 'top-right':
      drawX = canvasW - targetW - margin;
      drawY = margin;
      break;
    case 'bottom-left':
      drawX = margin;
      drawY = canvasH - targetH - margin;
      break;
    case 'bottom-right':
      drawX = canvasW - targetW - margin;
      drawY = canvasH - targetH - margin;
      break;
    case 'center':
      drawX = (canvasW - targetW) / 2;
      drawY = (canvasH - targetH) / 2;
      break;
    case 'custom':
    default:
      drawX = (overlay.x * canvasW) - (targetW / 2);
      drawY = (overlay.y * canvasH) - (targetH / 2);
      break;
  }

  // Alpha calculation
  let alpha = overlay.opacity ?? 1.0;

  // In static preview mode (paused or scrubbing), always show full configured opacity
  // so the creator can see and position the image immediately!
  if (!isStaticPreview) {
    const isPermanent = overlay.startTime === 0 && overlay.duration >= 999;
    if (!isPermanent) {
      const fadeInDuration = 0.25;
      const fadeOutDuration = 0.25;
      if (timeWithinOverlay >= 0 && timeWithinOverlay < fadeInDuration) {
        alpha *= Math.max(0.15, timeWithinOverlay / fadeInDuration);
      } else if (overlay.duration > 0 && timeWithinOverlay > overlay.duration - fadeOutDuration) {
        alpha *= Math.max(0, (overlay.duration - timeWithinOverlay) / fadeOutDuration);
      }
    }
  }

  ctx.save();
  ctx.globalAlpha = Math.max(0.05, Math.min(1, alpha));

  if (overlay.hasShadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
  }

  const radius = overlay.borderRadius ? (overlay.borderRadius * (canvasW / 1280)) : 0;
  if (radius > 0 && typeof (ctx as any).roundRect === 'function') {
    ctx.beginPath();
    (ctx as any).roundRect(drawX, drawY, targetW, targetH, radius);
    ctx.clip();
  }

  ctx.drawImage(img, drawX, drawY, targetW, targetH);
  ctx.restore();
}

/**
 * Formats a list of timeline chapters according to YouTube's official specifications:
 * - The first chapter starts at 00:00 (or 0:00).
 * - Minimum of 3 chapters.
 * - Each chapter duration is at least 10 seconds.
 */
export function formatYouTubeChapters(chapters: TimelineChapter[]): string {
  if (!chapters || chapters.length === 0) {
    return '00:00 Introduction';
  }

  const sorted = [...chapters].sort((a, b) => a.time - b.time);

  // Guarantee that the first chapter starts at 00:00 as required by YouTube
  if (sorted[0].time > 0.5) {
    sorted.unshift({ id: 'intro_auto', time: 0, title: 'Introduction' });
  } else {
    // If it starts near 0, force exact 0
    sorted[0] = { ...sorted[0], time: 0 };
  }

  return sorted.map((c) => {
    const totalSecs = Math.max(0, Math.round(c.time));
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    let timeStr = '';
    if (hours > 0) {
      timeStr = `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    return `${timeStr} ${c.title.trim() || 'Chapitre'}`;
  }).join('\n');
}

/**
 * Draws a full-screen title slide / presentation card directly on the video canvas.
 */
export function drawSlideClip(
  ctx: CanvasRenderingContext2D,
  slide: SlideContent | undefined,
  canvasW: number,
  canvasH: number
): void {
  if (!slide) {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvasW, canvasH);
    return;
  }

  ctx.save();

  // Background
  const bgColor = slide.bgColor || '#0f172a';
  if (bgColor.startsWith('linear-gradient') || bgColor.includes('gradient')) {
    const grad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
    if (bgColor.includes('violet') || bgColor.includes('#8b5cf6') || bgColor.includes('purple')) {
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(0.5, '#2e1065');
      grad.addColorStop(1, '#0f172a');
    } else if (bgColor.includes('blue') || bgColor.includes('#06b6d4') || bgColor.includes('cyan')) {
      grad.addColorStop(0, '#0c4a6e');
      grad.addColorStop(0.5, '#0369a1');
      grad.addColorStop(1, '#0f172a');
    } else if (bgColor.includes('emerald') || bgColor.includes('#10b981') || bgColor.includes('green')) {
      grad.addColorStop(0, '#064e3b');
      grad.addColorStop(0.5, '#047857');
      grad.addColorStop(1, '#022c22');
    } else if (bgColor.includes('sunset') || bgColor.includes('#f59e0b') || bgColor.includes('rose')) {
      grad.addColorStop(0, '#881337');
      grad.addColorStop(0.5, '#7c2d12');
      grad.addColorStop(1, '#18181b');
    } else {
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(1, '#020617');
    }
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = bgColor;
  }
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Background image if provided
  if (slide.bgImageEl && slide.bgImageEl.complete && slide.bgImageEl.naturalWidth > 0) {
    // Proportional cover
    const hRatio = canvasW / slide.bgImageEl.naturalWidth;
    const vRatio = canvasH / slide.bgImageEl.naturalHeight;
    const ratio = Math.max(hRatio, vRatio);
    const targetW = slide.bgImageEl.naturalWidth * ratio;
    const targetH = slide.bgImageEl.naturalHeight * ratio;
    const x = (canvasW - targetW) / 2;
    const y = (canvasH - targetH) / 2;
    ctx.drawImage(slide.bgImageEl, x, y, targetW, targetH);

    // Dark overlay on image for contrast & legibility
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // Text alignment & position calculation
  const align = slide.align || 'center';
  let textX = canvasW / 2;
  let accentX = (canvasW - Math.min(canvasW * 0.35, 240)) / 2;
  const accentBarWidth = Math.min(canvasW * 0.35, 240);

  if (align === 'left') {
    textX = canvasW * 0.1;
    accentX = canvasW * 0.1;
  } else if (align === 'right') {
    textX = canvasW * 0.9;
    accentX = canvasW * 0.9 - accentBarWidth;
  }

  // Accent bar decoration
  const gradLine = ctx.createLinearGradient(accentX, 0, accentX + accentBarWidth, 0);
  gradLine.addColorStop(0, 'rgba(139, 92, 246, 0.2)');
  gradLine.addColorStop(0.5, 'rgba(139, 92, 246, 0.85)');
  gradLine.addColorStop(1, 'rgba(6, 182, 212, 0.2)');
  ctx.fillStyle = gradLine;
  ctx.fillRect(accentX, canvasH / 2 + 54, accentBarWidth, 3);

  // Title
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  const baseFontSize = slide.fontSize || 52;
  const scaledFontSize = Math.round(baseFontSize * (canvasW / 1280));
  ctx.font = `800 ${scaledFontSize}px "Inter", "Segoe UI", system-ui, sans-serif`;
  ctx.fillStyle = slide.textColor || '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  const titleY = slide.subtitle ? (canvasH / 2 - scaledFontSize * 0.45) : (canvasH / 2);
  ctx.fillText(slide.title, textX, titleY);

  // Subtitle
  if (slide.subtitle) {
    const subFontSize = Math.round(scaledFontSize * 0.45);
    ctx.font = `500 ${subFontSize}px "Inter", "Segoe UI", system-ui, sans-serif`;
    ctx.fillStyle = slide.subtextColor || 'rgba(255, 255, 255, 0.75)';
    ctx.shadowBlur = 8;
    ctx.fillText(slide.subtitle, textX, canvasH / 2 + scaledFontSize * 0.75);
  }

  ctx.restore();
}

/**
 * Draws a full-screen image clip on the video canvas (with proportional fit and letterbox).
 */
export function drawImageClip(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | undefined,
  canvasW: number,
  canvasH: number
): void {
  ctx.save();
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, canvasW, canvasH);

  if (img && img.complete && img.naturalWidth > 0) {
    const hRatio = canvasW / img.naturalWidth;
    const vRatio = canvasH / img.naturalHeight;
    const ratio = Math.min(hRatio, vRatio);
    const targetW = img.naturalWidth * ratio;
    const targetH = img.naturalHeight * ratio;
    const x = (canvasW - targetW) / 2;
    const y = (canvasH - targetH) / 2;
    ctx.drawImage(img, x, y, targetW, targetH);
  }
  ctx.restore();
}




