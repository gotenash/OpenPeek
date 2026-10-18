import type { SubtitleCue } from './subtitleTypes';
import { chunkWhisperSegments } from './subtitleParsers';

/**
 * Resolves accurate video duration even for WebM Blobs where duration is Infinity.
 * First tries Web Audio decoding for exact millisecond audio duration,
 * then falls back to video element seeking (seeking to 1e101 to force Chromium to find the real end).
 */
export async function resolveAccurateBlobDuration(
  videoBlob: Blob,
  fallbackDuration?: number
): Promise<number> {
  // 1. Try Web Audio decode if blob has audio
  try {
    const arrayBuffer = await videoBlob.arrayBuffer();
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const audioCtx = new AudioCtx();
      try {
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
        if (audioBuffer && isFinite(audioBuffer.duration) && audioBuffer.duration > 0.5) {
          return audioBuffer.duration;
        }
      } catch (err) {
        // Fall through to video element probing if no audio track or decode fails
        console.debug('[Subtitles] AudioContext decode fallback to video element probe:', err);
      } finally {
        audioCtx.close().catch(() => {});
      }
    }
  } catch (e) {
    console.warn("AudioContext duration probe error:", e);
  }

  // 2. Probing via HTMLVideoElement
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const videoUrl = URL.createObjectURL(videoBlob);
    video.src = videoUrl;

    let isDone = false;
    const finish = (dur: number) => {
      if (isDone) return;
      isDone = true;
      video.pause();
      URL.revokeObjectURL(videoUrl);
      const chosen = (isFinite(dur) && dur > 0.5)
        ? Math.max(dur, fallbackDuration && isFinite(fallbackDuration) ? fallbackDuration : 0)
        : (fallbackDuration && isFinite(fallbackDuration) && fallbackDuration > 0 ? fallbackDuration : 10);
      resolve(chosen);
    };

    const timeout = setTimeout(() => {
      const d = (isFinite(video.duration) && video.duration > 0)
        ? video.duration
        : (isFinite(video.currentTime) && video.currentTime > 0 ? video.currentTime : (fallbackDuration || 10));
      finish(d);
    }, 2500);

    video.onloadedmetadata = () => {
      if (isFinite(video.duration) && video.duration > 0) {
        clearTimeout(timeout);
        finish(video.duration);
        return;
      }
      try {
        video.currentTime = 1e101;
      } catch (err) {
        console.debug('[Subtitles] Video element currentTime probe error:', err);
        clearTimeout(timeout);
        finish(fallbackDuration || 10);
      }
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      const measured = (isFinite(video.duration) && video.duration > 0) ? video.duration : video.currentTime;
      finish(measured);
    };

    video.onerror = () => {
      clearTimeout(timeout);
      finish(fallbackDuration || 10);
    };
  });
}

/**
 * Resolves accurate video duration from an HTMLVideoElement without blindly trusting fallback.
 */
export async function getAccurateVideoDuration(
  video: HTMLVideoElement,
  fallbackDuration?: number
): Promise<number> {
  if (isFinite(video.duration) && video.duration > 0) {
    return video.duration;
  }

  return new Promise((resolve) => {
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('timeupdate', onTimeUpdate);
      const measured = (isFinite(video.duration) && video.duration > 0)
        ? video.duration
        : (isFinite(video.currentTime) && video.currentTime > 0
            ? Math.max(video.currentTime, fallbackDuration || 0)
            : (fallbackDuration || 10));
      video.currentTime = 0;
      resolve(measured);
    };

    const onSeeked = () => finish();
    const onTimeUpdate = () => {
      if (video.currentTime > 0 && isFinite(video.duration)) finish();
    };

    video.addEventListener('seeked', onSeeked, { once: true });
    video.addEventListener('timeupdate', onTimeUpdate);
    const timeout = setTimeout(finish, 2000);

    try {
      video.currentTime = 1e101;
    } catch (err) {
      console.debug('[Subtitles] Video duration probe seek failed:', err);
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
    } catch (err) {
      console.warn('[Subtitles] Translation request failed for cue, preserving original:', cue.text, err);
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

    const effectiveDuration = (audioBuffer && isFinite(audioBuffer.duration) && audioBuffer.duration > 0.5)
      ? Math.max(audioBuffer.duration, knownDuration || 0)
      : (knownDuration || 10);

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
            endTime: Math.round(Math.min(effectiveDuration, time + 0.1) * 10) / 10,
            text: `[Parole détectée ${cues.length + 1}]`
          });
        }
        inSpeech = false;
      }
    }

    if (inSpeech && effectiveDuration - segStart >= 0.8) {
      cues.push({
        id: `cue_${Date.now()}_${cues.length}`,
        startTime: Math.round(segStart * 10) / 10,
        endTime: Math.round(effectiveDuration * 10) / 10,
        text: `[Parole détectée ${cues.length + 1}]`
      });
    }

    if (cues.length > 0) return cues;
  } catch (e) {
    console.warn("VAD analysis note:", e);
  }

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

    const duration = await resolveAccurateBlobDuration(videoBlob, knownDuration);
    const cues: SubtitleCue[] = [];

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
          try {
            recognition.stop();
          } catch (err) {
            console.debug('[Subtitles] SpeechRecognition stop error:', err);
          }
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
        } catch (err) {
          console.warn('[Subtitles] SpeechRecognition start failed:', err);
          finish();
        }
      });
    }

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
