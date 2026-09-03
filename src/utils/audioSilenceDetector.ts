/**
 * Audio Silence Detector & Speech Segmenter for OpenPeek
 * Uses Web Audio API to decode PCM audio data, computes RMS/dB levels,
 * and detects pauses/silences for automated video trimming.
 */

export interface DetectedSilence {
  start: number; // in seconds
  end: number;   // in seconds
  duration: number; // in seconds
}

export interface SpeechSegment {
  start: number; // in seconds
  end: number;   // in seconds
  duration: number; // in seconds
}

export interface SilenceAnalysisResult {
  originalDuration: number;
  silences: DetectedSilence[];
  speechSegments: SpeechSegment[];
  totalSilenceDuration: number;
  totalSpeechDuration: number;
  percentSaved: number;
}

export interface SilenceDetectionOptions {
  thresholdDb?: number;        // e.g. -36 dB (default)
  minSilenceDuration?: number; // minimum silence in seconds, e.g. 0.6s
  padding?: number;            // safety padding in seconds before/after speech, e.g. 0.12s
}

/**
 * Decodes audio from a video/audio Blob and analyzes audio levels to identify silent regions.
 */
export async function analyzeAudioSilences(
  blob: Blob,
  options: SilenceDetectionOptions = {}
): Promise<SilenceAnalysisResult> {
  const thresholdDb = options.thresholdDb ?? -36;
  const minSilenceDuration = options.minSilenceDuration ?? 0.6;
  const padding = options.padding ?? 0.12;

  // 1. Read array buffer
  const arrayBuffer = await blob.arrayBuffer();

  // 2. Decode audio data with AudioContext
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioCtx();
  
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    audioCtx.close().catch(() => {});
  }

  const sampleRate = audioBuffer.sampleRate;
  const duration = audioBuffer.duration;
  const channelData = audioBuffer.getChannelData(0); // primary channel

  // Convert threshold from dB to linear amplitude
  // dB = 20 * log10(amplitude)  =>  amplitude = 10^(dB / 20)
  const thresholdAmp = Math.pow(10, thresholdDb / 20);

  // 3. Compute RMS in windows of ~30ms
  const windowSize = Math.floor(sampleRate * 0.03); // ~30ms
  const numWindows = Math.floor(channelData.length / windowSize);
  const isSilentArray = new Uint8Array(numWindows);

  for (let i = 0; i < numWindows; i++) {
    const offset = i * windowSize;
    let sumSquares = 0;
    for (let j = 0; j < windowSize; j++) {
      const sample = channelData[offset + j];
      sumSquares += sample * sample;
    }
    const rms = Math.sqrt(sumSquares / windowSize);
    isSilentArray[i] = rms < thresholdAmp ? 1 : 0;
  }

  const windowDuration = windowSize / sampleRate;

  // 4. Identify consecutive silent blocks >= minSilenceDuration
  const rawSilences: DetectedSilence[] = [];
  let inSilence = false;
  let silenceStart = 0;

  for (let i = 0; i < numWindows; i++) {
    const currentTime = i * windowDuration;
    if (isSilentArray[i] === 1) {
      if (!inSilence) {
        inSilence = true;
        silenceStart = currentTime;
      }
    } else {
      if (inSilence) {
        inSilence = false;
        const silenceDur = currentTime - silenceStart;
        if (silenceDur >= minSilenceDuration) {
          rawSilences.push({
            start: silenceStart,
            end: currentTime,
            duration: silenceDur
          });
        }
      }
    }
  }

  // Check ending silence
  if (inSilence) {
    const silenceDur = duration - silenceStart;
    if (silenceDur >= minSilenceDuration) {
      rawSilences.push({
        start: silenceStart,
        end: duration,
        duration: silenceDur
      });
    }
  }

  // 5. Invert silences to get speech segments, applying safety padding
  // Padding contracts silences (leaves padding at end of prior speech and start of next speech)
  const adjustedSilences: DetectedSilence[] = [];
  for (const s of rawSilences) {
    // Contract silence by padding on both sides
    const effectiveStart = Math.min(duration, s.start + padding);
    const effectiveEnd = Math.max(0, s.end - padding);
    if (effectiveEnd - effectiveStart >= 0.25) { // silence must still be at least 250ms
      adjustedSilences.push({
        start: effectiveStart,
        end: effectiveEnd,
        duration: effectiveEnd - effectiveStart
      });
    }
  }

  // Build speech segments between adjusted silences
  const speechSegments: SpeechSegment[] = [];
  let currentPos = 0;

  for (const s of adjustedSilences) {
    if (s.start > currentPos + 0.1) {
      speechSegments.push({
        start: Math.max(0, currentPos),
        end: Math.min(duration, s.start),
        duration: Math.min(duration, s.start) - Math.max(0, currentPos)
      });
    }
    currentPos = s.end;
  }

  if (currentPos < duration - 0.1) {
    speechSegments.push({
      start: currentPos,
      end: duration,
      duration: duration - currentPos
    });
  }

  let totalSilenceDuration = 0;
  for (const s of adjustedSilences) {
    totalSilenceDuration += s.duration;
  }

  let totalSpeechDuration = 0;
  for (const seg of speechSegments) {
    totalSpeechDuration += seg.duration;
  }

  const percentSaved = duration > 0 ? Math.round((totalSilenceDuration / duration) * 100) : 0;

  return {
    originalDuration: duration,
    silences: adjustedSilences,
    speechSegments,
    totalSilenceDuration,
    totalSpeechDuration,
    percentSaved
  };
}
