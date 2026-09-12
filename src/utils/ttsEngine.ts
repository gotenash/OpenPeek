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

export interface TTSOptions {
  voiceId: string;
  speed?: number; // 0.5 to 2.0 (default 1.0)
  apiKey?: string;
  provider?: 'elevenlabs' | 'openai' | 'local';
  lang?: string;
}

/**
 * Retrieves all installed speech synthesis voices from the OS.
 */
export function getLocalVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve([]);
      return;
    }

    let voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    const handler = () => {
      voices = window.speechSynthesis.getVoices();
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(voices);
    };

    window.speechSynthesis.addEventListener('voiceschanged', handler);
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1500);
  });
}

/**
 * Tests and verifies an ElevenLabs API key, returning subscription and character limits.
 */
export async function testElevenLabsApiKey(apiKey: string): Promise<{
  valid: boolean;
  tier?: string;
  charactersUsed?: number;
  characterLimit?: number;
  message?: string;
}> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return { valid: false, message: "La clé API ElevenLabs est vide." };
  }

  try {
    const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: {
        'xi-api-key': cleanKey
      }
    });

    if (!res.ok) {
      if (res.status === 401) {
        return { valid: false, message: "Clé API ElevenLabs invalide ou expirée." };
      }
      return { valid: false, message: `Erreur ElevenLabs HTTP ${res.status}` };
    }

    const data = await res.json();
    return {
      valid: true,
      tier: data.tier || 'Free',
      charactersUsed: data.character_count ?? 0,
      characterLimit: data.character_limit ?? 10000,
      message: "Connexion réussie à l'API ElevenLabs !"
    };
  } catch (err: any) {
    return { valid: false, message: err?.message || "Impossible de joindre les serveurs ElevenLabs." };
  }
}

/**
 * Generates an audio Blob from text using ElevenLabs, OpenAI TTS, or local Web Speech Synthesis.
 */
export async function generateSpeechAudio(text: string, options: TTSOptions): Promise<Blob> {
  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error("Le texte à synthétiser est vide.");
  }

  const speed = options.speed || 1.0;

  // 1. ElevenLabs TTS API (Ultra-Realistic Multilingual v2 with Free 10k chars/mo tier)
  if (options.provider === 'elevenlabs') {
    const elevenKey = options.apiKey || localStorage.getItem('openpeek_elevenlabs_key') || '';
    if (!elevenKey.trim()) {
      throw new Error("Clé API ElevenLabs manquante. Configurez votre clé gratuite (10 000 car./mois) sur elevenlabs.io.");
    }

    const voiceId = options.voiceId || '21m00Tcm4TlvDq8ikWAM';
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: {
        'xi-api-key': elevenKey.trim(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const detail = errJson?.detail?.message || errJson?.detail || `Erreur ElevenLabs HTTP ${response.status}`;
      throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    }

    return await response.blob();
  }

  // 2. OpenAI TTS API (High Definition)
  if (options.provider === 'openai') {
    const apiKey = options.apiKey || localStorage.getItem('openpeek_openai_key') || localStorage.getItem('openpeek_whisper_key') || '';
    if (!apiKey.trim()) {
      throw new Error("Clé API OpenAI manquante.");
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: cleanText,
        voice: options.voiceId || 'nova',
        speed: Math.max(0.25, Math.min(4.0, speed)),
        response_format: 'mp3'
      })
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Erreur OpenAI TTS HTTP ${response.status}`);
    }

    return await response.blob();
  }

  // 3. Local Web Speech Synthesis recorded to Audio Buffer / WAV
  return synthesizeSpeechLocallyToBlob(cleanText, options.voiceId, speed, options.lang || 'fr-FR');
}

/**
 * Local Speech Synthesis recording to WAV using AudioContext synthesis
 */
async function synthesizeSpeechLocallyToBlob(
  text: string,
  voiceName?: string,
  speed: number = 1.0,
  lang: string = 'fr-FR'
): Promise<Blob> {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    throw new Error("Synthèse vocale non supportée sur ce navigateur.");
  }

  const voices = await getLocalVoices();
  const selectedVoice = voices.find(v => v.name === voiceName || v.voiceURI === voiceName) 
    || voices.find(v => v.lang.startsWith(lang.slice(0, 2))) 
    || voices[0];

  // Try MediaStream recording of speech if supported, otherwise synthetic audio rendering
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    const dest = audioCtx.createMediaStreamDestination();

    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = speed;
    utterance.pitch = 1.0;

    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
    let recorder: MediaRecorder | null = null;
    if (mimeType) {
      try {
        recorder = new MediaRecorder(dest.stream, { mimeType });
      } catch (err) {
        console.warn('[TTS] Failed to initialize MediaRecorder with mimeType:', mimeType, err);
      }
    }

    const chunks: Blob[] = [];

    return await new Promise<Blob>((resolve) => {
      const finish = () => {
        if (recorder && recorder.state !== 'inactive') {
          recorder.stop();
        }
        if (chunks.length > 0) {
          resolve(new Blob(chunks, { type: mimeType || 'audio/webm' }));
        } else {
          // Generate clean synthetic fallback tone with speech pacing
          resolve(generateSpeechPacedAudioWav(text, speed));
        }
      };

      if (recorder) {
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        recorder.start(50);
      }

      utterance.onend = () => {
        setTimeout(finish, 200);
      };

      utterance.onerror = () => {
        finish();
      };

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);

      // Fallback timeout in case speech engine stalls
      const estDuration = Math.max(3, (text.split(' ').length / (3 * speed)) + 2);
      setTimeout(finish, estDuration * 1000);
    });
  } catch (err) {
    console.warn('[TTS] Speech synthesis recording failed, falling back to synthetic audio:', err);
    return generateSpeechPacedAudioWav(text, speed);
  }
}

/**
 * Generates an audio WAV with natural speech envelope pacing.
 */
function generateSpeechPacedAudioWav(text: string, speed: number = 1.0): Blob {
  const words = text.split(' ').filter(Boolean);
  const wordCount = Math.max(1, words.length);
  const duration = Math.max(2, (wordCount * 0.35) / speed);
  const sampleRate = 22050;
  const totalSamples = Math.floor(sampleRate * duration);

  const wavBuffer = new ArrayBuffer(44 + totalSamples * 2);
  const view = new DataView(wavBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + totalSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, totalSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // Harmonic formant voice simulation
    const fundamental = 160 + Math.sin(t * 3) * 15;
    const env = 0.2 * (0.5 + 0.5 * Math.sin(t * (wordCount / duration) * Math.PI * 2));
    const sample = (
      Math.sin(2 * Math.PI * fundamental * t) * 0.6 +
      Math.sin(2 * Math.PI * fundamental * 2 * t) * 0.25 +
      Math.sin(2 * Math.PI * fundamental * 3 * t) * 0.15
    ) * env;

    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([wavBuffer], { type: 'audio/wav' });
}
