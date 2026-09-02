import { GIFEncoder, quantize, applyPalette } from 'gifenc';

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

/**
 * Resolves accurate video duration even for WebM Blobs where duration is Infinity.
 */
export async function getAccurateVideoDuration(
  video: HTMLVideoElement,
  fallbackDuration?: number
): Promise<number> {
  if (isFinite(video.duration) && video.duration > 0) {
    return video.duration;
  }
  if (fallbackDuration && isFinite(fallbackDuration) && fallbackDuration > 0) {
    return fallbackDuration;
  }

  return new Promise((resolve) => {
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('timeupdate', onTimeUpdate);
      const dur = isFinite(video.duration) && video.duration > 0
        ? video.duration
        : (isFinite(video.currentTime) && video.currentTime > 0 ? video.currentTime : (fallbackDuration || 10));
      video.currentTime = 0;
      resolve(dur);
    };

    const onSeeked = () => finish();
    const onTimeUpdate = () => {
      if (video.currentTime > 0 && isFinite(video.duration)) finish();
    };

    video.addEventListener('seeked', onSeeked, { once: true });
    video.addEventListener('timeupdate', onTimeUpdate);
    const timeout = setTimeout(finish, 1500);

    try {
      video.currentTime = 1e101;
    } catch {
      clearTimeout(timeout);
      finish();
    }
  });
}

/**
 * Extracts a 16kHz mono WAV Audio Blob from any video blob for Whisper Speech-To-Text processing.
 */
export async function extractAudioWavFromBlob(videoBlob: Blob): Promise<Blob> {
  const arrayBuffer = await videoBlob.arrayBuffer();
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    audioCtx.close().catch(() => {});
  }

  const numChannels = 1;
  const sampleRate = 16000;
  const channelData = audioBuffer.getChannelData(0); // mono
  const length = channelData.length;

  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);

  const writeString = (v: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      v.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, length * 2, true);

  // Write PCM samples (clamped 16-bit)
  let offset = 44;
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Splits words or long text segments into short, punchy subtitle cues (3-5 words / max ~26 chars).
 */
export function chunkWhisperSegments(data: any, maxWords = 4, maxChars = 28): SubtitleCue[] {
  const cues: SubtitleCue[] = [];

  // 1. If global word timestamps are returned
  if (Array.isArray(data.words) && data.words.length > 0) {
    let currentWords: any[] = [];
    let currentText = '';

    for (const w of data.words) {
      const wordStr = (w.word || '').trim();
      if (!wordStr) continue;

      const nextText = currentText ? `${currentText} ${wordStr}` : wordStr;
      if (currentWords.length >= maxWords || nextText.length > maxChars) {
        if (currentWords.length > 0) {
          const first = currentWords[0];
          const last = currentWords[currentWords.length - 1];
          cues.push({
            id: `cue_${Date.now()}_${cues.length}`,
            startTime: Math.max(0, Math.round(first.start * 10) / 10),
            endTime: Math.max(first.start + 0.3, Math.round(last.end * 10) / 10),
            text: currentWords.map((cw) => (cw.word || '').trim()).join(' ')
          });
        }
        currentWords = [w];
        currentText = wordStr;
      } else {
        currentWords.push(w);
        currentText = nextText;
      }
    }

    if (currentWords.length > 0) {
      const first = currentWords[0];
      const last = currentWords[currentWords.length - 1];
      cues.push({
        id: `cue_${Date.now()}_${cues.length}`,
        startTime: Math.max(0, Math.round(first.start * 10) / 10),
        endTime: Math.max(first.start + 0.3, Math.round(last.end * 10) / 10),
        text: currentWords.map((cw) => (cw.word || '').trim()).join(' ')
      });
    }

    if (cues.length > 0) return cues;
  }

  // 2. If segments with segment.words or plain segment text
  if (Array.isArray(data.segments) && data.segments.length > 0) {
    for (const seg of data.segments) {
      if (Array.isArray(seg.words) && seg.words.length > 0) {
        let currentWords: any[] = [];
        let currentText = '';
        for (const w of seg.words) {
          const wordStr = (w.word || '').trim();
          if (!wordStr) continue;
          const nextText = currentText ? `${currentText} ${wordStr}` : wordStr;
          if (currentWords.length >= maxWords || nextText.length > maxChars) {
            if (currentWords.length > 0) {
              const first = currentWords[0];
              const last = currentWords[currentWords.length - 1];
              cues.push({
                id: `cue_${Date.now()}_${cues.length}`,
                startTime: Math.max(0, Math.round(first.start * 10) / 10),
                endTime: Math.max(first.start + 0.3, Math.round(last.end * 10) / 10),
                text: currentWords.map((cw) => (cw.word || '').trim()).join(' ')
              });
            }
            currentWords = [w];
            currentText = wordStr;
          } else {
            currentWords.push(w);
            currentText = nextText;
          }
        }
        if (currentWords.length > 0) {
          const first = currentWords[0];
          const last = currentWords[currentWords.length - 1];
          cues.push({
            id: `cue_${Date.now()}_${cues.length}`,
            startTime: Math.max(0, Math.round(first.start * 10) / 10),
            endTime: Math.max(first.start + 0.3, Math.round(last.end * 10) / 10),
            text: currentWords.map((cw) => (cw.word || '').trim()).join(' ')
          });
        }
      } else {
        const text = (seg.text || '').trim();
        if (!text) continue;
        const words = text.split(/\s+/).filter(Boolean);
        if (words.length <= maxWords && text.length <= maxChars) {
          cues.push({
            id: `cue_${Date.now()}_${cues.length}`,
            startTime: Math.max(0, Math.round(seg.start * 10) / 10),
            endTime: Math.max(seg.start + 0.4, Math.round(seg.end * 10) / 10),
            text
          });
        } else {
          const chunkSize = maxWords;
          const totalChunks = Math.ceil(words.length / chunkSize);
          const totalDuration = Math.max(0.6, seg.end - seg.start);
          const timePerChunk = totalDuration / totalChunks;

          for (let c = 0; c < totalChunks; c++) {
            const chunkWords = words.slice(c * chunkSize, (c + 1) * chunkSize);
            const chunkStart = seg.start + c * timePerChunk;
            const chunkEnd = seg.start + (c + 1) * timePerChunk;
            cues.push({
              id: `cue_${Date.now()}_${cues.length}`,
              startTime: Math.max(0, Math.round(chunkStart * 10) / 10),
              endTime: Math.max(chunkStart + 0.3, Math.round(chunkEnd * 10) / 10),
              text: chunkWords.join(' ')
            });
          }
        }
      }
    }
  } else if (data.text) {
    const words = data.text.trim().split(/\s+/).filter(Boolean);
    const chunkSize = maxWords;
    const totalChunks = Math.ceil(words.length / chunkSize);
    for (let c = 0; c < totalChunks; c++) {
      const chunkWords = words.slice(c * chunkSize, (c + 1) * chunkSize);
      cues.push({
        id: `cue_${Date.now()}_${c}`,
        startTime: c * 2.0,
        endTime: (c + 1) * 2.0,
        text: chunkWords.join(' ')
      });
    }
  }

  return cues;
}

/**
 * Splits any existing long cues into shorter, punchy chunks of 3-5 words each.
 */
export function splitLongCues(cues: SubtitleCue[], maxWords = 4, maxChars = 28): SubtitleCue[] {
  const result: SubtitleCue[] = [];
  for (const cue of cues) {
    const text = cue.text.trim();
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length <= maxWords && text.length <= maxChars) {
      result.push(cue);
    } else {
      const chunkSize = maxWords;
      const totalChunks = Math.ceil(words.length / chunkSize);
      const totalDur = Math.max(0.4, cue.endTime - cue.startTime);
      const step = totalDur / totalChunks;

      for (let c = 0; c < totalChunks; c++) {
        const chunkWords = words.slice(c * chunkSize, (c + 1) * chunkSize);
        const start = cue.startTime + c * step;
        const end = cue.startTime + (c + 1) * step;
        result.push({
          id: `cue_${Date.now()}_${result.length}`,
          startTime: Math.round(start * 10) / 10,
          endTime: Math.round(end * 10) / 10,
          text: chunkWords.join(' ')
        });
      }
    }
  }
  return result;
}

/**
 * Removes verbal tics (filler words, repeated words, hesitation sounds) from subtitles.
 */
export function cleanFillerWords(cues: SubtitleCue[], language = 'fr'): SubtitleCue[] {
  const isFrench = language.startsWith('fr');
  const isEnglish = language.startsWith('en');

  // French filler patterns: "euh", "euhhh", "hum", "bah", "genre", "du coup", "en fait", etc.
  const frFillerRegex = /\b(euh+|euhm+|euhh+|hum+|heum+|bah+|ben+|genre|du coup|en fait|quoi|tu vois|tu sais|en gros|disons)\b/gi;
  // English filler patterns: "um", "uh", "like", "you know", "basically", etc.
  const enFillerRegex = /\b(um+|uh+|er+|ah+|like|you know|basically|actually|sort of|kind of|i mean)\b/gi;

  const fillerRegex = isFrench ? frFillerRegex : (isEnglish ? enFillerRegex : frFillerRegex);

  const cleanedCues: SubtitleCue[] = [];

  for (const cue of cues) {
    let text = cue.text;

    // Remove repeated duplicate words (e.g. "je je", "the the")
    text = text.replace(/\b(\w+)\s+\1\b/gi, '$1');

    // Remove filler words
    text = text.replace(fillerRegex, '');

    // Cleanup whitespace and punctuation
    text = text
      .replace(/\s+/g, ' ')
      .replace(/\s*([,;:.!?])\s*/g, '$1 ')
      .replace(/^[,\s;:.!?]+|[,\s;:.!?]+$/g, '')
      .trim();

    // Capitalize first letter if needed
    if (text.length > 0) {
      text = text.charAt(0).toUpperCase() + text.slice(1);
      cleanedCues.push({
        ...cue,
        text
      });
    }
  }

  return cleanedCues;
}

/**
 * Translates subtitle cues to a target language while strictly preserving start/end timestamps.
 */
export async function translateSubtitleCues(
  cues: SubtitleCue[],
  targetLanguage: string,
  apiKey?: string,
  service: 'groq' | 'openai' = 'groq'
): Promise<SubtitleCue[]> {
  if (cues.length === 0) return cues;

  const targetLangNames: Record<string, string> = {
    'en': 'English',
    'fr': 'French',
    'es': 'Spanish',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ja': 'Japanese',
    'zh': 'Chinese (Simplified)',
    'nl': 'Dutch',
    'ru': 'Russian',
    'ar': 'Arabic'
  };

  const targetName = targetLangNames[targetLanguage.toLowerCase()] || targetLanguage;

  // Use Groq LLM (llama-3.3-70b-versatile) or OpenAI (gpt-4o-mini) for ultra fast & accurate translation
  if (apiKey && apiKey.trim()) {
    try {
      const endpoint = service === 'groq'
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';

      const model = service === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';
      const inputList = cues.map((c, i) => `${i + 1}. ${c.text}`).join('\n');

      const prompt = `You are a professional subtitle translator. Translate the following numbered list of subtitles into ${targetName}.
Keep the subtitles concise, natural, and punchy.
Maintain the exact same numbering (1., 2., etc.) and return ONLY the numbered translated lines, with NO other introductory or concluding text.

${inputList}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2
        })
      });

      if (res.ok) {
        const data = await res.json();
        const answer = (data.choices?.[0]?.message?.content || '').trim();
        const lines = answer.split('\n').map((l: string) => l.trim()).filter(Boolean);

        const translatedCues: SubtitleCue[] = cues.map((cue, idx) => {
          const foundLine = lines.find((l: string) => l.startsWith(`${idx + 1}.`));
          if (foundLine) {
            const cleanText = foundLine.replace(/^\d+\.\s*/, '').trim();
            return { ...cue, text: cleanText || cue.text };
          }
          if (lines[idx]) {
            const cleanText = lines[idx].replace(/^\d+\.\s*/, '').trim();
            return { ...cue, text: cleanText || cue.text };
          }
          return cue;
        });

        return translatedCues;
      }
    } catch (e) {
      console.warn("LLM Translation failed, trying fallback API:", e);
    }
  }

  // Fallback free translation API (MyMemory)
  const translated: SubtitleCue[] = [];
  for (const cue of cues) {
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cue.text)}&langpair=Autodetect|${targetLanguage}`;
      const r = await fetch(url);
      if (r.ok) {
        const d = await r.json();
        const tText = d.responseData?.translatedText || cue.text;
        translated.push({ ...cue, text: tText });
      } else {
        translated.push(cue);
      }
    } catch {
      translated.push(cue);
    }
  }

  return translated;
}

/**
 * Transcribes audio using Whisper API (Groq or OpenAI) with word-level timestamps and short punchy segments.
 */
export async function transcribeWithWhisper(
  audioBlob: Blob,
  apiKey: string,
  service: 'groq' | 'openai' = 'groq',
  language: string = 'fr',
  maxWordsPerSegment = 4
): Promise<SubtitleCue[]> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.wav');
  formData.append('model', service === 'groq' ? 'whisper-large-v3' : 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'word');
  formData.append('timestamp_granularities[]', 'segment');
  if (language) {
    const langCode = language.split('-')[0].toLowerCase();
    formData.append('language', langCode);
  }

  const endpoint = service === 'groq'
    ? 'https://api.groq.com/openai/v1/audio/transcriptions'
    : 'https://api.openai.com/v1/audio/transcriptions';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey.trim()}`
    },
    body: formData
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erreur Whisper (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return chunkWhisperSegments(data, maxWordsPerSegment);
}

/**
 * Smart Voice Activity Detection (VAD) that segments audio by speech bursts and silences.
 */
export async function detectSpeechSegments(
  videoBlob: Blob,
  knownDuration: number
): Promise<SubtitleCue[]> {
  try {
    const arrayBuffer = await videoBlob.arrayBuffer();
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtx.state === 'suspended') await audioCtx.resume();

    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    audioCtx.close().catch(() => {});

    // Compute RMS in 100ms window chunks
    const windowSize = Math.floor(sampleRate * 0.1);
    const numWindows = Math.floor(channelData.length / windowSize);
    const rmsValues: number[] = [];

    let sumRms = 0;
    for (let i = 0; i < numWindows; i++) {
      let sumSq = 0;
      const start = i * windowSize;
      for (let j = 0; j < windowSize; j++) {
        sumSq += channelData[start + j] * channelData[start + j];
      }
      const rms = Math.sqrt(sumSq / windowSize);
      rmsValues.push(rms);
      sumRms += rms;
    }

    const avgRms = sumRms / Math.max(1, numWindows);
    const threshold = Math.max(0.008, avgRms * 0.6);

    const cues: SubtitleCue[] = [];
    let inSpeech = false;
    let segStart = 0;

    for (let i = 0; i < numWindows; i++) {
      const time = i * 0.1;
      const isVoice = rmsValues[i] > threshold;

      if (isVoice && !inSpeech) {
        inSpeech = true;
        segStart = Math.max(0, time - 0.1);
      } else if (!isVoice && inSpeech) {
        if (time - segStart >= 0.8) {
          cues.push({
            id: `cue_${Date.now()}_${cues.length}`,
            startTime: Math.round(segStart * 10) / 10,
            endTime: Math.round(Math.min(knownDuration, time + 0.1) * 10) / 10,
            text: `[Parole détectée ${cues.length + 1}]`
          });
        }
        inSpeech = false;
      }
    }

    if (inSpeech && knownDuration - segStart >= 0.8) {
      cues.push({
        id: `cue_${Date.now()}_${cues.length}`,
        startTime: Math.round(segStart * 10) / 10,
        endTime: Math.round(knownDuration * 10) / 10,
        text: `[Parole détectée ${cues.length + 1}]`
      });
    }

    if (cues.length > 0) return cues;
  } catch (e) {
    console.warn("VAD analysis note:", e);
  }

  // Fallback to evenly spaced segments
  const segmentDuration = Math.min(3.5, Math.max(2.0, knownDuration / 4));
  const totalSegments = Math.max(1, Math.ceil(knownDuration / segmentDuration));
  const cues: SubtitleCue[] = [];
  for (let i = 0; i < totalSegments; i++) {
    const s = i * segmentDuration;
    const e = Math.min(knownDuration, (i + 1) * segmentDuration);
    cues.push({
      id: `cue_${Date.now()}_${i}`,
      startTime: Math.round(s * 10) / 10,
      endTime: Math.round(e * 10) / 10,
      text: `[Texte segment ${i + 1}]`
    });
  }
  return cues;
}

/**
 * Parses SubRip (.SRT) files into SubtitleCue items.
 */
export function parseSrt(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const blocks = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n\n');

  const parseTime = (timeStr: string): number => {
    const parts = timeStr.trim().split(/[:,]/);
    if (parts.length < 4) return 0;
    const [h, m, s, ms] = parts.map(Number);
    return (h * 3600) + (m * 60) + s + (ms / 1000);
  };

  blocks.forEach((block, idx) => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length >= 2) {
      const timeLineIdx = lines.findIndex(l => l.includes('-->'));
      if (timeLineIdx !== -1) {
        const [startStr, endStr] = lines[timeLineIdx].split('-->');
        const textLines = lines.slice(timeLineIdx + 1);
        const text = textLines.join(' ');
        if (text) {
          cues.push({
            id: `cue_${Date.now()}_${idx}`,
            startTime: Math.round(parseTime(startStr) * 10) / 10,
            endTime: Math.round(parseTime(endStr) * 10) / 10,
            text
          });
        }
      }
    }
  });

  return cues;
}

/**
 * Parses WebVTT (.VTT) files into SubtitleCue items.
 */
export function parseVtt(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const clean = content.replace(/^WEBVTT[^\n]*\n/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = clean.split('\n\n');

  const parseTime = (timeStr: string): number => {
    const cleanTime = timeStr.trim().split(' ')[0];
    const parts = cleanTime.split(/[:.]/);
    if (parts.length === 4) {
      const [h, m, s, ms] = parts.map(Number);
      return (h * 3600) + (m * 60) + s + (ms / 1000);
    } else if (parts.length === 3) {
      const [m, s, ms] = parts.map(Number);
      return (m * 60) + s + (ms / 1000);
    }
    return 0;
  };

  blocks.forEach((block, idx) => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const timeLineIdx = lines.findIndex(l => l.includes('-->'));
    if (timeLineIdx !== -1) {
      const [startStr, endStr] = lines[timeLineIdx].split('-->');
      const textLines = lines.slice(timeLineIdx + 1);
      const text = textLines.join(' ');
      if (text) {
        cues.push({
          id: `cue_${Date.now()}_${idx}`,
          startTime: Math.round(parseTime(startStr) * 10) / 10,
          endTime: Math.round(parseTime(endStr) * 10) / 10,
          text
        });
      }
    }
  });

  return cues;
}

/**
 * Transcribes audio from a video blob with accurate duration & VAD heuristics.
 */
export async function transcribeVideoLocally(
  videoBlob: Blob,
  knownDuration?: number,
  language: string = 'fr-FR',
  onProgress?: (progress: number) => void
): Promise<SubtitleCue[]> {
  const videoUrl = URL.createObjectURL(videoBlob);
  const video = document.createElement('video');
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;

  try {
    await new Promise<void>((resolve) => {
      if (video.readyState >= 1) {
        resolve();
        return;
      }
      const to = setTimeout(resolve, 2000);
      video.onloadedmetadata = () => {
        clearTimeout(to);
        resolve();
      };
    });

    const duration = await getAccurateVideoDuration(video, knownDuration);
    const cues: SubtitleCue[] = [];

    // Check if Web Speech API is supported
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRec) {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;

      let startTime = 0;
      let isCompleted = false;

      await new Promise<void>((resolve) => {
        const finish = () => {
          if (isCompleted) return;
          isCompleted = true;
          try { recognition.stop(); } catch {}
          video.pause();
          resolve();
        };

        const timeoutId = setTimeout(finish, (duration + 3) * 1000);

        recognition.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const text = event.results[i][0].transcript.trim();
              if (text) {
                const now = video.currentTime;
                cues.push({
                  id: `cue_${Date.now()}_${cues.length}`,
                  startTime: Math.max(0, startTime),
                  endTime: Math.min(duration, Math.max(startTime + 1.2, now)),
                  text
                });
                startTime = now;
              }
            }
          }
        };

        recognition.onerror = () => finish();
        recognition.onend = () => finish();

        video.ontimeupdate = () => {
          const pct = Math.min(99, Math.round((video.currentTime / duration) * 100));
          onProgress?.(pct);
        };

        video.onended = () => {
          clearTimeout(timeoutId);
          finish();
        };

        try {
          recognition.start();
          video.currentTime = 0;
          video.play().catch(finish);
        } catch {
          finish();
        }
      });
    }

    // If SpeechRec did not produce cues, use smart VAD audio segmentation
    if (cues.length === 0) {
      const detected = await detectSpeechSegments(videoBlob, duration);
      cues.push(...detected);
    }

    onProgress?.(100);
    return cues;
  } finally {
    URL.revokeObjectURL(videoUrl);
  }
}

/**
 * Draws active subtitle cues onto a canvas context with full styling & word highlights.
 */
export function drawSubtitles(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  cues: SubtitleCue[],
  currentTime: number,
  options: SubtitleOptions
) {
  const activeCue = cues.find(
    (cue) => currentTime >= cue.startTime && currentTime <= cue.endTime
  );

  if (!activeCue || !activeCue.text.trim()) return;

  const scale = canvasHeight / 1080;
  let scaledFontSize = Math.max(16, Math.round(options.fontSize * scale));

  ctx.save();

  let posY = canvasHeight * 0.88;
  if (options.position === 'middle') {
    posY = canvasHeight * 0.5;
  } else if (options.position === 'top') {
    posY = canvasHeight * 0.12;
  }

  const posX = canvasWidth / 2;

  let text = activeCue.text;
  if (options.textTransform === 'uppercase') {
    text = text.toUpperCase();
  }

  const maxAllowedWidth = canvasWidth * 0.86;

  ctx.font = `bold ${scaledFontSize}px 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
  let textMetrics = ctx.measureText(text);
  let textWidth = textMetrics.width;

  // If text width exceeds 86% of the screen width, scale font size down proportionally
  if (textWidth > maxAllowedWidth) {
    const scaleRatio = maxAllowedWidth / textWidth;
    scaledFontSize = Math.max(14, Math.floor(scaledFontSize * scaleRatio));
    ctx.font = `bold ${scaledFontSize}px 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    textMetrics = ctx.measureText(text);
    textWidth = textMetrics.width;
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const paddingX = scaledFontSize * 0.7;
  const boxWidth = textWidth + paddingX * 2;
  const boxHeight = scaledFontSize * 1.5;

  if (options.backgroundColor && options.backgroundColor !== 'transparent') {
    ctx.fillStyle = options.backgroundColor;
    const cornerRadius = scaledFontSize * 0.35;
    const boxX = posX - boxWidth / 2;
    const boxY = posY - boxHeight / 2;

    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, cornerRadius);
    ctx.fill();
  }

  if (options.style === 'tiktok' || options.style === 'karaoke') {
    const words = text.split(' ');
    if (words.length > 1) {
      const cueDuration = Math.max(0.1, activeCue.endTime - activeCue.startTime);
      const progress = Math.max(0, Math.min(1, (currentTime - activeCue.startTime) / cueDuration));
      const activeWordIndex = Math.min(words.length - 1, Math.floor(progress * words.length));

      // Calculate progress of the active word (0.0 -> 1.0)
      const wordSlotDuration = cueDuration / words.length;
      const wordStartTime = activeCue.startTime + activeWordIndex * wordSlotDuration;
      const wordProgress = Math.max(0, Math.min(1, (currentTime - wordStartTime) / Math.max(0.01, wordSlotDuration)));

      const animType = options.wordAnimation || (options.style === 'tiktok' ? 'pop' : (options.style === 'karaoke' ? 'zoom' : 'none'));

      let currentX = posX - textWidth / 2;
      for (let i = 0; i < words.length; i++) {
        const word = words[i] + (i < words.length - 1 ? ' ' : '');
        const wordWidth = ctx.measureText(word).width;
        const isActive = i === activeWordIndex;

        let scale = 1.0;
        let yOffset = 0;

        if (isActive) {
          if (animType === 'pop') {
            // Elastic pop scale: 1.0 -> 1.3 -> 1.0
            scale = 1.0 + 0.28 * Math.sin(wordProgress * Math.PI);
            yOffset = -0.15 * scaledFontSize * Math.sin(wordProgress * Math.PI);
          } else if (animType === 'bounce') {
            // Vertical bounce: moves up and settles
            scale = 1.05 + 0.12 * Math.sin(wordProgress * Math.PI);
            yOffset = -0.32 * scaledFontSize * Math.sin(wordProgress * Math.PI);
          } else if (animType === 'zoom') {
            // Static punchy zoom
            scale = 1.16;
            yOffset = -0.08 * scaledFontSize;
          }
        }

        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        const wordCenterX = currentX + wordWidth / 2;
        const wordCenterY = posY + yOffset;

        if (scale !== 1.0 || yOffset !== 0) {
          ctx.translate(wordCenterX, wordCenterY);
          ctx.scale(scale, scale);
          ctx.translate(-wordCenterX, -wordCenterY);
        }

        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(4, scaledFontSize * 0.18);
        ctx.strokeStyle = '#000000';
        ctx.strokeText(word, currentX, posY + yOffset);

        if (isActive) {
          ctx.fillStyle = options.highlightColor;
          if (options.style === 'karaoke') {
            ctx.shadowColor = options.highlightColor;
            ctx.shadowBlur = scaledFontSize * 0.6;
          }
        } else {
          ctx.fillStyle = options.primaryColor;
        }
        ctx.fillText(word, currentX, posY + yOffset);

        ctx.restore();
        currentX += wordWidth;
      }
    } else {
      let scale = 1.0;
      let yOffset = 0;
      const animType = options.wordAnimation || 'pop';
      const cueDuration = Math.max(0.1, activeCue.endTime - activeCue.startTime);
      const cueProgress = Math.max(0, Math.min(1, (currentTime - activeCue.startTime) / cueDuration));

      if (animType === 'pop') {
        scale = 1.0 + 0.25 * Math.sin(cueProgress * Math.PI);
        yOffset = -0.12 * scaledFontSize * Math.sin(cueProgress * Math.PI);
      } else if (animType === 'bounce') {
        scale = 1.05 + 0.1 * Math.sin(cueProgress * Math.PI);
        yOffset = -0.28 * scaledFontSize * Math.sin(cueProgress * Math.PI);
      } else if (animType === 'zoom') {
        scale = 1.15;
      }

      ctx.save();
      const textCenterX = posX;
      const textCenterY = posY + yOffset;

      if (scale !== 1.0 || yOffset !== 0) {
        ctx.translate(textCenterX, textCenterY);
        ctx.scale(scale, scale);
        ctx.translate(-textCenterX, -textCenterY);
      }

      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(4, scaledFontSize * 0.18);
      ctx.strokeStyle = '#000000';
      ctx.strokeText(text, posX, posY + yOffset);

      ctx.fillStyle = options.highlightColor;
      ctx.fillText(text, posX, posY + yOffset);
      ctx.restore();
    }
  } else if (options.style === 'classic') {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.lineWidth = Math.max(3, scaledFontSize * 0.12);
    ctx.strokeStyle = '#000000';
    ctx.strokeText(text, posX, posY);

    ctx.fillStyle = options.primaryColor;
    ctx.fillText(text, posX, posY);
  } else {
    ctx.fillStyle = options.primaryColor;
    ctx.fillText(text, posX, posY);
  }

  ctx.restore();
}

/**
 * Generates SubRip (.SRT) format file content.
 */
export function generateSrt(cues: SubtitleCue[]): string {
  const formatSrtTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  };

  return cues.map((cue, index) => {
    return `${index + 1}\n${formatSrtTime(cue.startTime)} --> ${formatSrtTime(cue.endTime)}\n${cue.text}\n`;
  }).join('\n');
}

/**
 * Generates WebVTT (.VTT) format file content.
 */
export function generateVtt(cues: SubtitleCue[]): string {
  const formatVttTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  };

  const body = cues.map((cue, index) => {
    return `${index + 1}\n${formatVttTime(cue.startTime)} --> ${formatVttTime(cue.endTime)}\n${cue.text}\n`;
  }).join('\n');

  return `WEBVTT - OpenPeek Subtitles Studio\n\n${body}`;
}

/**
 * Burns subtitles permanently into a video Blob with complete sound synchronization.
 */
export async function renderSubtitledVideo(
  videoBlob: Blob,
  cues: SubtitleCue[],
  options: SubtitleOptions,
  knownDuration?: number,
  onProgress?: (progress: number) => void,
  abortSignal?: AbortSignal
): Promise<Blob> {
  const videoUrl = URL.createObjectURL(videoBlob);
  const video = document.createElement('video');
  video.src = videoUrl;
  video.muted = false;
  video.playsInline = true;

  let audioCtx: AudioContext | null = null;

  try {
    await new Promise<void>((resolve) => {
      if (video.readyState >= 1 && video.videoWidth > 0) {
        resolve();
        return;
      }
      const timeout = setTimeout(resolve, 3000);
      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        resolve();
      };
    });

    const duration = await getAccurateVideoDuration(video, knownDuration);
    const width = video.videoWidth || 1920;
    const height = video.videoHeight || 1080;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Contexte Canvas indisponible");

    const canvasStream = canvas.captureStream(60);
    let combinedStream: MediaStream = canvasStream;

    // Audio mixing with explicit resume
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      const source = audioCtx.createMediaElementSource(video);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);

      if (dest.stream.getAudioTracks().length > 0) {
        combinedStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...dest.stream.getAudioTracks()
        ]);
      }
    } catch (e) {
      console.warn("Audio Context Warning during render:", e);
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=h264')
      ? 'video/webm;codecs=h264'
      : (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus'
          : 'video/webm');

    const recorder = new MediaRecorder(combinedStream, { mimeType });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    await new Promise<void>((resolve, reject) => {
      recorder.onstop = () => resolve();
      recorder.onerror = reject;

      recorder.start(100);
      video.currentTime = 0;
      video.play().catch(reject);

      let animId: number;
      const renderLoop = () => {
        if (abortSignal?.aborted) {
          cancelAnimationFrame(animId);
          video.pause();
          recorder.stop();
          reject(new DOMException("Rendu annulé", "AbortError"));
          return;
        }

        if (video.ended || video.currentTime >= duration) {
          cancelAnimationFrame(animId);
          video.pause();
          recorder.stop();
          return;
        }

        ctx.drawImage(video, 0, 0, width, height);
        drawSubtitles(ctx, width, height, cues, video.currentTime, options);

        const pct = Math.min(99, Math.round((video.currentTime / duration) * 100));
        onProgress?.(pct);

        animId = requestAnimationFrame(renderLoop);
      };

      animId = requestAnimationFrame(renderLoop);
    });

    onProgress?.(100);
    return new Blob(chunks, { type: mimeType });
  } finally {
    if (audioCtx && audioCtx.state !== 'closed') {
      audioCtx.close().catch(() => {});
    }
    video.pause();
    URL.revokeObjectURL(videoUrl);
  }
}

/**
 * Burns subtitles permanently into an animated GIF.
 */
export async function renderSubtitledGif(
  videoBlob: Blob,
  cues: SubtitleCue[],
  options: SubtitleOptions,
  gifSettings: { fps?: number; speed?: number; maxColors?: number } = {},
  knownDuration?: number,
  onProgress?: (progress: number) => void,
  abortSignal?: AbortSignal
): Promise<Blob> {
  const { fps = 12, speed = 1.0, maxColors = 256 } = gifSettings;
  const videoUrl = URL.createObjectURL(videoBlob);
  const video = document.createElement('video');
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;

  try {
    await new Promise<void>((resolve) => {
      if (video.readyState >= 1 && video.videoWidth > 0) {
        resolve();
        return;
      }
      const timeout = setTimeout(resolve, 3000);
      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        resolve();
      };
    });

    const origW = video.videoWidth || 1280;
    const origH = video.videoHeight || 720;
    const scale = Math.min(1.0, 680 / origW);
    const targetW = Math.round((origW * scale) / 2) * 2;
    const targetH = Math.round((origH * scale) / 2) * 2;

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error("Contexte Canvas indisponible");

    const duration = await getAccurateVideoDuration(video, knownDuration);
    const frameInterval = 1 / fps;
    const timeStep = frameInterval * speed;
    const timestamps: number[] = [];

    for (let t = 0; t < duration; t += timeStep) {
      timestamps.push(t);
    }

    const totalFrames = timestamps.length;
    const gif = GIFEncoder();
    const frameDelayMs = Math.round(frameInterval * 1000);

    const seekVideo = (time: number): Promise<void> => {
      return new Promise((resolve) => {
        if (Math.abs(video.currentTime - time) < 0.02 && video.readyState >= 2) {
          resolve();
          return;
        }

        let isDone = false;
        const done = () => {
          if (isDone) return;
          isDone = true;
          clearTimeout(timeoutId);
          video.removeEventListener('seeked', onSeeked);
          setTimeout(resolve, 25);
        };

        const onSeeked = () => done();
        const timeoutId = window.setTimeout(done, 300);

        video.addEventListener('seeked', onSeeked, { once: true });

        try {
          video.currentTime = time;
        } catch {
          done();
        }
      });
    };

    for (let i = 0; i < totalFrames; i++) {
      if (abortSignal?.aborted) {
        throw new DOMException("Génération GIF annulée", "AbortError");
      }

      const timestamp = timestamps[i];
      await seekVideo(timestamp);

      ctx.drawImage(video, 0, 0, targetW, targetH);
      drawSubtitles(ctx, targetW, targetH, cues, timestamp, options);

      const imgData = ctx.getImageData(0, 0, targetW, targetH);
      const rgbaData = imgData.data;

      const palette = quantize(rgbaData, maxColors, { format: 'rgb565' });
      const indexedPixels = applyPalette(rgbaData, palette, 'rgb565');

      gif.writeFrame(indexedPixels, targetW, targetH, {
        palette,
        delay: frameDelayMs,
        repeat: 0,
        dispose: 2
      });

      const pct = Math.round(((i + 1) / totalFrames) * 100);
      onProgress?.(pct);

      if (i % 3 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    gif.finish();
    const buffer = gif.bytes();
    return new Blob([buffer as any], { type: 'image/gif' });
  } finally {
    URL.revokeObjectURL(videoUrl);
  }
}
