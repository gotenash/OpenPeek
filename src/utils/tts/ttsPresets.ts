export interface AIVoicePreset {
  id: string;
  name: string;
  gender: 'female' | 'male';
  description: string;
  provider: 'elevenlabs' | 'openai' | 'local';
}

export const ELEVENLABS_VOICE_PRESETS: AIVoicePreset[] = [
  {
    id: '21m00Tcm4TlvDq8ikWAM',
    name: '🌟 Rachel (Femme - Calme & Naturelle)',
    gender: 'female',
    description: 'Idéale pour tutoriels, documentaires, explications claires.',
    provider: 'elevenlabs'
  },
  {
    id: 'pNInz6obpgDQGcFmaJgB',
    name: '⚡ Adam (Homme - Profond & Narratif)',
    gender: 'male',
    description: 'Voix de narration captivante, idéale pour intros et vidéos pro.',
    provider: 'elevenlabs'
  },
  {
    id: 'ErXwobaYiN019PkySvjV',
    name: '🎙️ Antoni (Homme - Clair & Posé)',
    gender: 'male',
    description: 'Ton équilibré et chaleureux, parfait pour guides et présentations.',
    provider: 'elevenlabs'
  },
  {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: '✨ Bella (Femme - Douce & Expressive)',
    gender: 'female',
    description: 'Voix conviviale, storytelling, vlogs et démos produits.',
    provider: 'elevenlabs'
  },
  {
    id: 'VR6AewLTigWG4xSOukaG',
    name: '💎 Arnold (Homme - Professionnel & Dynamique)',
    gender: 'male',
    description: 'Pitchs, annonces percutantes et formations dynamiques.',
    provider: 'elevenlabs'
  },
  {
    id: 'AZnzlk1XvdvUeBnXmlld',
    name: '🔥 Domi (Femme - Énergique & Engagée)',
    gender: 'female',
    description: 'Rythme vif, Shorts, TikTok et résumés expressifs.',
    provider: 'elevenlabs'
  },
  {
    id: 'TxGEqnHWrfWFTfGW9XjX',
    name: '🚀 Josh (Homme - Jeune & Spontané)',
    gender: 'male',
    description: 'Ton décontracté, tutos gaming, vulgarisation moderne.',
    provider: 'elevenlabs'
  },
  {
    id: 'ThT5KcBeYPX3keUQqHPh',
    name: '📖 Dorothy (Femme - Agréable & Convaincante)',
    gender: 'female',
    description: 'Lecture posée, formation continue et guides pas-à-pas.',
    provider: 'elevenlabs'
  }
];

export const AI_VOICE_PRESETS: AIVoicePreset[] = [
  {
    id: 'nova',
    name: '🌟 Nova (Femme - Dynamique & Chaleureuse)',
    gender: 'female',
    description: 'Idéal pour tutoriels YouTube, démos produits et TikTok.',
    provider: 'openai'
  },
  {
    id: 'alloy',
    name: '⚡ Alloy (Neutre - Professionnel & Équilibré)',
    gender: 'male',
    description: 'Parfait pour guides techniques, formations et présentations pro.',
    provider: 'openai'
  },
  {
    id: 'echo',
    name: '🎙️ Echo (Homme - Calme & Posé)',
    gender: 'male',
    description: 'Explications détaillées, documentaires et études de cas.',
    provider: 'openai'
  },
  {
    id: 'shimmer',
    name: '✨ Shimmer (Femme - Claire & Expressive)',
    gender: 'female',
    description: 'Vidéos de présentation, vlogs et cours en ligne.',
    provider: 'openai'
  },
  {
    id: 'onyx',
    name: '💎 Onyx (Homme - Grave & Confiance)',
    gender: 'male',
    description: 'Bandes-annonces, annonces importantes et pitchs.',
    provider: 'openai'
  },
  {
    id: 'fable',
    name: '📖 Fable (Neutre - Narratif & Rythmé)',
    gender: 'female',
    description: 'Storytelling, récits et résumés.',
    provider: 'openai'
  }
];
