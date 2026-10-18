import type { SubtitleCue, SubtitleOptions } from './subtitleTypes';
import { resolveAccurateBlobDuration } from './whisperService';

/**
 * Burns subtitles permanently into a video Blob with complete sound synchronization.
 */
export async function renderSubtitledVideo(
  videoBlob: Blob,
  cues: SubtitleCue[],
  options: SubtitleOptions,
  drawSubtitlesFn: (
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    cues: SubtitleCue[],
    currentTime: number,
    options: SubtitleOptions
  ) => void,
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

    const duration = await resolveAccurateBlobDuration(videoBlob, knownDuration);
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
        drawSubtitlesFn(ctx, width, height, cues, video.currentTime, options);

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
