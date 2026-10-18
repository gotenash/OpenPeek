import { saveRecording, saveProject, type SavedVideo } from '../db';
import { repairWebmDuration } from '../webmDurationPatcher';
import { type EditorProject } from '../videoCompositor';

export interface FinalizeParams {
  chunks: BlobPart[];
  mimeType: string;
  recordingTime: number;
  totalElapsedMs: number;
  canvasElement: HTMLCanvasElement;
  secondaryCamSegments: Array<{ blob: Blob; duration: number; startTime: number }>;
  stopAllStreams: () => void;
  onSaveComplete?: () => void;
}

export async function finalizeRecordingSession({
  chunks,
  mimeType,
  recordingTime,
  totalElapsedMs,
  canvasElement,
  secondaryCamSegments,
  stopAllStreams,
  onSaveComplete
}: FinalizeParams): Promise<SavedVideo> {
  const videoBlob = new Blob(chunks, { type: mimeType || 'video/webm' });

  let finalDuration = recordingTime;
  const elapsedSec = Math.round(totalElapsedMs / 1000);
  if (elapsedSec > finalDuration) {
    finalDuration = elapsedSec;
  }

  // Fix WebM missing duration header instantly via chunked 64KB EBML patch (< 1ms, zero IPC, 0 memory overhead)
  let finalBlob = videoBlob;
  try {
    finalBlob = await repairWebmDuration(videoBlob, finalDuration);
  } catch (e) {
    console.warn('Could not repair WebM duration header, fallback to raw blob:', e);
  }
  const finalSize = finalBlob.size;

  // Generate thumbnail from canvas
  let thumbnailBase64 = '';
  try {
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 320;
    thumbCanvas.height = 180;
    const thumbCtx = thumbCanvas.getContext('2d');
    if (thumbCtx) {
      thumbCtx.drawImage(canvasElement, 0, 0, 320, 180);
      thumbnailBase64 = thumbCanvas.toDataURL('image/jpeg', 0.7);
    }
  } catch (e) {
    console.error('Failed to generate thumbnail:', e);
  }

  // Stop all raw camera/mic/screen capture tracks
  stopAllStreams();

  // Save to IndexedDB
  const dateStr = new Date().toISOString();
  const formattedDate = new Date().toLocaleString();
  const newVideo: SavedVideo = {
    id: crypto.randomUUID(),
    title: `Enregistrement du ${formattedDate}`,
    blob: finalBlob,
    duration: finalDuration,
    size: finalSize,
    date: dateStr,
    thumbnail: thumbnailBase64
  };

  try {
    await saveRecording(newVideo);

    // If secondary camera segments were recorded, save them and generate multi-track project for Studio Montage
    if (secondaryCamSegments.length > 0) {
      const secVideos: SavedVideo[] = [];
      for (let i = 0; i < secondaryCamSegments.length; i++) {
        const seg = secondaryCamSegments[i];
        const secVideo: SavedVideo = {
          id: crypto.randomUUID(),
          title: `Caméra 2 (B-Roll) #${i + 1} - ${formattedDate}`,
          blob: seg.blob,
          duration: seg.duration,
          size: seg.blob.size,
          date: dateStr
        };
        await saveRecording(secVideo);
        secVideos.push(secVideo);
      }

      const autoProject: EditorProject = {
        clips: [
          {
            id: `clip_main_${Date.now()}`,
            type: 'video',
            track: 1,
            startTime: 0,
            video: newVideo,
            startTrim: 0,
            endTrim: finalDuration,
            transitionToNext: 'none',
            transitionDuration: 1.0,
            playbackSpeed: 1.0,
            volume: 1.0
          },
          ...secVideos.map((sv, idx) => ({
            id: `clip_broll_${idx}_${Date.now()}`,
            type: 'video' as const,
            track: 2 as const,
            startTime: secondaryCamSegments[idx]?.startTime || 0,
            video: sv,
            startTrim: 0,
            endTrim: sv.duration || 10,
            transitionToNext: 'none' as const,
            transitionDuration: 0.5,
            playbackSpeed: 1.0,
            volume: 1.0
          }))
        ],
        titles: [],
        zooms: [],
        images: []
      };

      await saveProject({
        id: `proj_${Date.now()}`,
        title: `Projet Multi-Caméra - ${formattedDate}`,
        date: dateStr,
        data: JSON.stringify(autoProject),
        clipCount: 1 + secVideos.length,
        totalDuration: finalDuration
      });
    }

    if (onSaveComplete) {
      onSaveComplete();
    }
  } catch (err) {
    console.error('Failed to save video to database:', err);
  }

  return newVideo;
}
