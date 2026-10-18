export interface SubtitleCue {
  id: string;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  text: string;
}

export type SubtitleStyleKey = 'tiktok' | 'minimal' | 'classic' | 'karaoke';
export type SubtitlePosition = 'bottom' | 'middle' | 'top';
export type WordAnimationType = 'pop' | 'bounce' | 'zoom' | 'none';

export interface SubtitleOptions {
  style: SubtitleStyleKey;
  position: SubtitlePosition;
  fontSize: number;          // in px relative to 1080p (e.g. 42)
  primaryColor: string;      // e.g. '#ffffff'
  highlightColor: string;    // e.g. '#fde047' (yellow) or '#c084fc' (purple)
  backgroundColor?: string;  // e.g. 'rgba(0,0,0,0.7)'
  textTransform?: 'uppercase' | 'none';
  wordAnimation?: WordAnimationType; // 'pop' | 'bounce' | 'zoom' | 'none'
}

export interface SubtitlePreset {
  key: SubtitleStyleKey;
  label: string;
  description: string;
  defaultOptions: SubtitleOptions;
}

export const SUBTITLE_PRESETS: Record<SubtitleStyleKey, SubtitlePreset> = {
  tiktok: {
    key: 'tiktok',
    label: '⚡ TikTok / Reels (Hormozi)',
    description: 'Typographie grasse, mot actif surligné en néon avec fort impact visuel.',
    defaultOptions: {
      style: 'tiktok',
      position: 'bottom',
      fontSize: 44,
      primaryColor: '#ffffff',
      highlightColor: '#fde047',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      textTransform: 'uppercase',
      wordAnimation: 'pop'
    }
  },
  minimal: {
    key: 'minimal',
    label: '✨ Minimaliste Dépoli (Clean)',
    description: 'Bandeau moderne semi-transparent et texte épuré pour démos et tutoriels.',
    defaultOptions: {
      style: 'minimal',
      position: 'bottom',
      fontSize: 34,
      primaryColor: '#ffffff',
      highlightColor: '#38bdf8',
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      textTransform: 'none',
      wordAnimation: 'none'
    }
  },
  classic: {
    key: 'classic',
    label: '🎬 Classique YouTube / Cinéma',
    description: 'Texte blanc avec ombre portée nette et contour noir haute lisibilité.',
    defaultOptions: {
      style: 'classic',
      position: 'bottom',
      fontSize: 36,
      primaryColor: '#ffffff',
      highlightColor: '#ffffff',
      backgroundColor: 'transparent',
      textTransform: 'none',
      wordAnimation: 'none'
    }
  },
  karaoke: {
    key: 'karaoke',
    label: '🎤 Karaoké Lumineux (Glow)',
    description: 'Effet de lueur progressive sur le texte pour capter l’attention.',
    defaultOptions: {
      style: 'karaoke',
      position: 'bottom',
      fontSize: 40,
      primaryColor: '#e2e8f0',
      highlightColor: '#ec4899',
      backgroundColor: 'rgba(10, 10, 20, 0.65)',
      textTransform: 'none',
      wordAnimation: 'zoom'
    }
  }
};
