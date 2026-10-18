import type { SubtitleCue } from './subtitleTypes';

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
 * Formats seconds into SRT timestamp string: HH:MM:SS,mmm
 */
export function formatSrtTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

/**
 * Formats seconds into VTT timestamp string: HH:MM:SS.mmm
 */
export function formatVttTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

/**
 * Generates SubRip (.SRT) text content from cues.
 */
export function generateSrt(cues: SubtitleCue[]): string {
  return cues.map((cue, index) => {
    return `${index + 1}\n${formatSrtTime(cue.startTime)} --> ${formatSrtTime(cue.endTime)}\n${cue.text}\n`;
  }).join('\n');
}

/**
 * Generates WebVTT (.VTT) text content from cues.
 */
export function generateVtt(cues: SubtitleCue[]): string {
  const body = cues.map((cue, index) => {
    return `${index + 1}\n${formatVttTime(cue.startTime)} --> ${formatVttTime(cue.endTime)}\n${cue.text}\n`;
  }).join('\n');

  return `WEBVTT - OpenPeek Subtitles Studio\n\n${body}`;
}
