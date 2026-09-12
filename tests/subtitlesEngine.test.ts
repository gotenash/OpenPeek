import { describe, it, expect } from 'vitest';
import {
  parseSrt,
  parseVtt,
  splitLongCues,
  cleanFillerWords,
  SUBTITLE_PRESETS,
  SubtitleCue
} from '../src/utils/subtitlesEngine';

describe('Subtitles Engine', () => {
  describe('Presets', () => {
    it('provides all 4 core subtitle presets', () => {
      expect(SUBTITLE_PRESETS).toHaveProperty('tiktok');
      expect(SUBTITLE_PRESETS).toHaveProperty('minimal');
      expect(SUBTITLE_PRESETS).toHaveProperty('classic');
      expect(SUBTITLE_PRESETS).toHaveProperty('karaoke');
    });

    it('has valid default options for tiktok preset', () => {
      const tiktok = SUBTITLE_PRESETS.tiktok;
      expect(tiktok.defaultOptions.style).toBe('tiktok');
      expect(tiktok.defaultOptions.textTransform).toBe('uppercase');
      expect(tiktok.defaultOptions.highlightColor).toBe('#fde047');
    });
  });

  describe('parseSrt', () => {
    it('correctly parses standard SRT subtitle blocks', () => {
      const srt = `1
00:00:01,000 --> 00:00:03,500
Bonjour à tous et bienvenue.

2
00:00:04,000 --> 00:00:06,200
Dans ce tutoriel OpenPeek.
`;

      const cues = parseSrt(srt);
      expect(cues).toHaveLength(2);
      expect(cues[0].startTime).toBe(1.0);
      expect(cues[0].endTime).toBe(3.5);
      expect(cues[0].text).toBe('Bonjour à tous et bienvenue.');
      expect(cues[1].startTime).toBe(4.0);
      expect(cues[1].endTime).toBe(6.2);
      expect(cues[1].text).toBe('Dans ce tutoriel OpenPeek.');
    });

    it('handles empty or malformed input gracefully', () => {
      expect(parseSrt('')).toEqual([]);
      expect(parseSrt('Invalid srt content with no timestamps')).toEqual([]);
    });
  });

  describe('parseVtt', () => {
    it('correctly parses WebVTT cues', () => {
      const vtt = `WEBVTT

00:01.000 --> 00:03.000
Première ligne WebVTT

00:04.500 --> 00:07.000
Deuxième segment
`;

      const cues = parseVtt(vtt);
      expect(cues).toHaveLength(2);
      expect(cues[0].startTime).toBe(1.0);
      expect(cues[0].endTime).toBe(3.0);
      expect(cues[0].text).toBe('Première ligne WebVTT');
      expect(cues[1].startTime).toBe(4.5);
      expect(cues[1].endTime).toBe(7.0);
      expect(cues[1].text).toBe('Deuxième segment');
    });
  });

  describe('splitLongCues', () => {
    it('leaves short cues intact', () => {
      const cues: SubtitleCue[] = [
        { id: '1', startTime: 0, endTime: 2, text: 'Court et simple' }
      ];
      const result = splitLongCues(cues, 4, 30);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Court et simple');
    });

    it('splits long cues into punchy chunks', () => {
      const cues: SubtitleCue[] = [
        {
          id: '1',
          startTime: 0,
          endTime: 6,
          text: 'Un deux trois quatre cinq six sept huit neuf dix'
        }
      ];
      const result = splitLongCues(cues, 3, 20);
      expect(result.length).toBeGreaterThan(1);
      // All words are preserved
      const combined = result.map(c => c.text).join(' ');
      expect(combined).toBe('Un deux trois quatre cinq six sept huit neuf dix');
      // Timestamps are chronologically ascending
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].startTime).toBeLessThanOrEqual(result[i + 1].startTime);
        expect(result[i].endTime).toBeLessThanOrEqual(result[i + 1].endTime);
      }
    });
  });

  describe('cleanFillerWords', () => {
    it('removes French filler words and repeated words', () => {
      const cues: SubtitleCue[] = [
        {
          id: '1',
          startTime: 0,
          endTime: 2,
          text: 'euh donc voilà en fait on va tester'
        },
        {
          id: '2',
          startTime: 2,
          endTime: 4,
          text: 'je je pense que c’est bon'
        }
      ];

      const cleaned = cleanFillerWords(cues, 'fr');
      expect(cleaned[0].text).not.toMatch(/\beuh\b/i);
      expect(cleaned[0].text).not.toMatch(/\ben fait\b/i);
      expect(cleaned[1].text).toMatch(/Je pense que c’est bon/i);
    });

    it('removes English filler words', () => {
      const cues: SubtitleCue[] = [
        {
          id: '1',
          startTime: 0,
          endTime: 2,
          text: 'um basically you know this is awesome'
        }
      ];

      const cleaned = cleanFillerWords(cues, 'en');
      expect(cleaned[0].text).not.toMatch(/\bum\b/i);
      expect(cleaned[0].text).not.toMatch(/\byou know\b/i);
      expect(cleaned[0].text).toMatch(/This is awesome/i);
    });
  });
});
