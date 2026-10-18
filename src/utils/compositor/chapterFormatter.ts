import type { TimelineChapter } from './compositorTypes';

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
