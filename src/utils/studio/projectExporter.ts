import {
  type EditorProject,
  drawTitleOverlay,
  drawImageOverlay,
  getActiveTimelineZoom,
  applyTimelineZoomTransform,
} from '../videoCompositor';
import { compositeActiveClipsToCanvas, type RenderClipOffset } from './masterCanvasRenderer';
import { preloadExportMedia } from './exportPreloader';
import { setupExportAudioPipeline } from './exportAudioPipeline';

export interface ExportProjectOptions {
  project: EditorProject;
  totalDuration: number;
  exportFormat: 'mp4' | 'webm';
  exportEngine?: 'auto' | 'turbo' | 'studio';
  projectName: string;
  imagesCache: Map<string, HTMLImageElement>;
  container: HTMLElement;
  clipTimelineOffsets: Map<string, RenderClipOffset>;
  isAborted: () => boolean;
  onStatus: (status: string) => void;
  onProgress: (progress: number, currentSec: number) => void;
  onFrame: (exportCanvas: HTMLCanvasElement) => void;
  onComplete: (finalBlob: Blob, ext: 'mp4' | 'webm', thumbDataUrl: string) => void;
  onError: (errorMsg: string) => void;
}

export async function exportProjectVideo(opts: ExportProjectOptions): Promise<void> {
  const {
    project,
    totalDuration,
    exportFormat,
    imagesCache,
    container,
    clipTimelineOffsets,
    isAborted,
    onStatus,
    onProgress,
    onFrame,
    onComplete,
    onError
  } = opts;

  if (project.clips.length === 0 || totalDuration <= 0) {
    onError("Ajoutez au moins un clip à la timeline avant d'exporter.");
    return;
  }

  onProgress(0, 0);
  onStatus('Préparation du montage et des médias...');

  // Preload all timeline images and image clips in cache
  await preloadExportMedia(project, imagesCache);

  // --- MODE TURBO / HYBRIDE (FFmpeg direct ultra-rapide) ---
  const hasZooms = (project.zooms || []).length > 0;
  const hasTitles = (project.titles || []).length > 0;
  const hasImages = (project.images || []).length > 0;
  const hasVoiceovers = (project.voiceovers || []).length > 0;
  const hasSlides = project.clips.some(c => c.type === 'slide');
  const isEligibleForTurbo = !hasZooms && !hasTitles && !hasImages && !hasVoiceovers && !hasSlides;

  const engine = opts.exportEngine || 'auto';
  const willUseTurbo = (engine === 'turbo') || (engine === 'auto' && isEligibleForTurbo);

  if (willUseTurbo && !isAborted()) {
    try {
      onStatus('Initialisation du moteur Turbo FFmpeg...');
      onProgress(8, 0);

      const { invoke } = await import('@tauri-apps/api/core');
      const isFfmpeg = await invoke<boolean>('is_ffmpeg_available').catch(() => false);

      if (isFfmpeg) {
        onStatus('Préparation et transfert des médias vers FFmpeg...');
        await invoke('cleanup_temp_render_clips').catch(() => {});

        const turboClips: any[] = [];
        for (let i = 0; i < project.clips.length; i++) {
          if (isAborted()) return;
          const clip = project.clips[i];
          const isImage = clip.type === 'image';
          onStatus(`Préparation des médias (${i + 1}/${project.clips.length}) : ${isImage ? 'Image' : 'Vidéo'}...`);
          onProgress(Math.round(4 + ((i + 1) / project.clips.length) * 11), 0);

          let filePath: string | null = null;
          let blob = clip.video?.blob;
          const targetSize = clip.video?.size || (blob ? blob.size : 0);

          // 1. Accès direct ultra-rapide disque SSD si le fichier source existe déjà dans IndexedDB
          if (!isImage && targetSize > 0) {
            try {
              filePath = await invoke<string | null>('find_clip_disk_path', { size: targetSize });
              if (filePath) {
                console.log(`[Export Turbo] Clip #${i + 1} (${targetSize} octets) localisé directement sur SSD:`, filePath);
              }
            } catch (e) {
              console.warn("[Export Turbo] Erreur lors de la recherche directe sur SSD:", e);
            }
          }

          // 2. Si non trouvé ou s'il s'agit d'une image/vignette : transfert vers le dossier temporaire
          if (!filePath) {
            const ext = isImage ? 'png' : 'webm';
            const filename = `clip_${i}_${clip.id}.${ext}`;

            if (!blob || blob.size === 0) {
              if (isImage && clip.video?.thumbnail) {
                const res = await fetch(clip.video.thumbnail);
                blob = await res.blob();
              } else {
                throw new Error(`Média introuvable pour le clip #${i + 1}`);
              }
            }

            if (blob.size <= 8 * 1024 * 1024) {
              const arrayBuf = await blob.arrayBuffer();
              filePath = await invoke<string>(
                'save_temp_render_clip',
                new Uint8Array(arrayBuf),
                { headers: { 'x-filename': filename } }
              );
            } else {
              // Streaming par paquets de 2 Mo pour éviter tout blocage du pont IPC Tauri
              const CHUNK_SIZE = 2 * 1024 * 1024;
              const totalChunks = Math.ceil(blob.size / CHUNK_SIZE);
              for (let c = 0; c < totalChunks; c++) {
                if (isAborted()) return;
                const pct = Math.round(((c + 1) / totalChunks) * 100);
                onStatus(`Transfert fragmenté (${i + 1}/${project.clips.length}) : ${pct}%...`);
                const start = c * CHUNK_SIZE;
                const end = Math.min(blob.size, start + CHUNK_SIZE);
                const chunkSlice = blob.slice(start, end);
                const chunkBuf = await chunkSlice.arrayBuffer();
                filePath = await invoke<string>(
                  'append_temp_render_chunk',
                  new Uint8Array(chunkBuf),
                  {
                    headers: {
                      'x-filename': filename,
                      'x-is-first': c === 0 ? 'true' : 'false'
                    }
                  }
                );
              }
            }
          }

          const speed = clip.playbackSpeed && clip.playbackSpeed > 0 ? clip.playbackSpeed : 1.0;
          const startTrim = clip.startTrim || 0;
          const rawEndTrim = clip.endTrim && clip.endTrim > startTrim ? clip.endTrim : (clip.video?.duration || (startTrim + 5));
          const duration = Math.max(0.1, (rawEndTrim - startTrim) / speed);

          turboClips.push({
            file_path: filePath,
            is_image: isImage,
            has_audio: !isImage && (clip.volume === undefined || clip.volume > 0),
            duration: duration,
            start_trim: startTrim,
            end_trim: rawEndTrim,
            transition_to_next: clip.transitionToNext || 'none',
            transition_duration: clip.transitionDuration || 1.0,
            volume: clip.volume !== undefined ? clip.volume : 1.0,
            playback_speed: speed
          });
        }

        let bgMusicPath: string | null = null;
        if (project.backgroundMusic?.blob) {
          onStatus('Préparation de la piste musicale...');
          const bgBlob = project.backgroundMusic.blob;
          if (bgBlob.size <= 8 * 1024 * 1024) {
            const bgBuf = await bgBlob.arrayBuffer();
            bgMusicPath = await invoke<string>(
              'save_temp_render_clip',
              new Uint8Array(bgBuf),
              { headers: { 'x-filename': 'bg_music.wav' } }
            );
          } else {
            const CHUNK_SIZE = 2 * 1024 * 1024;
            const totalChunks = Math.ceil(bgBlob.size / CHUNK_SIZE);
            for (let c = 0; c < totalChunks; c++) {
              if (isAborted()) return;
              const start = c * CHUNK_SIZE;
              const end = Math.min(bgBlob.size, start + CHUNK_SIZE);
              const chunkSlice = bgBlob.slice(start, end);
              const chunkBuf = await chunkSlice.arrayBuffer();
              bgMusicPath = await invoke<string>(
                'append_temp_render_chunk',
                new Uint8Array(chunkBuf),
                {
                  headers: {
                    'x-filename': 'bg_music.wav',
                    'x-is-first': c === 0 ? 'true' : 'false'
                  }
                }
              );
            }
          }
        }

        if (isAborted()) return;

        // Connect real-time progress listener to FFmpeg stdout streaming
        let unlistenProgress: (() => void) | null = null;
        try {
          const { listen } = await import('@tauri-apps/api/event');
          unlistenProgress = await listen<{
            out_time_sec: number;
            total_duration_sec: number;
            percent: number;
            speed: string;
            fps: number;
          }>('turbo-ffmpeg-progress', (event) => {
            if (isAborted()) return;
            const { out_time_sec, total_duration_sec, percent, speed, fps } = event.payload;
            const scaledProgress = Math.min(96, Math.max(15, Math.round(15 + (percent / 100) * 81)));
            onProgress(scaledProgress, out_time_sec);
            const speedTag = speed ? ` • Vitesse: ${speed}` : '';
            const fpsTag = fps > 0 ? ` (${Math.round(fps)} fps)` : '';
            const fmt = (s: number) => {
              const safe = typeof s === 'number' && !isNaN(s) && s >= 0 ? s : 0;
              const m = Math.floor(safe / 60);
              const sec = Math.floor(safe % 60);
              return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
            };
            onStatus(`Encodage Turbo : ${fmt(out_time_sec)} / ${fmt(total_duration_sec)}${speedTag}${fpsTag} • ${Math.round(percent)}%`);
          });
        } catch (listenErr) {
          console.warn("Progress listener setup warning:", listenErr);
        }

        onStatus('Démarrage de l\'encodage Turbo FFmpeg (Transitions & Encodage H.264)...');
        onProgress(15, 0);

        let mp4Data: ArrayBuffer | Uint8Array;
        try {
          mp4Data = await invoke<ArrayBuffer | Uint8Array>('render_project_turbo_ffmpeg', {
            payload: {
              clips: turboClips,
              bg_music_path: bgMusicPath,
              bg_music_volume: project.backgroundMusic?.volume ?? 0.15
            }
          });
        } finally {
          if (unlistenProgress) {
            unlistenProgress();
          }
        }

        if (isAborted()) return;

        onProgress(98, totalDuration);
        onStatus('Finalisation du montage MP4...');

        let finalBlob: Blob;
        if (mp4Data instanceof ArrayBuffer) {
          finalBlob = new Blob([mp4Data], { type: 'video/mp4' });
        } else if (mp4Data instanceof Uint8Array) {
          finalBlob = new Blob([mp4Data.buffer as ArrayBuffer], { type: 'video/mp4' });
        } else if ((mp4Data as any)?.data) {
          finalBlob = new Blob([(mp4Data as any).data], { type: 'video/mp4' });
        } else {
          finalBlob = new Blob([mp4Data as any], { type: 'video/mp4' });
        }

        let thumbDataUrl = '';
        if (imagesCache.size > 0) {
          const firstImg = imagesCache.values().next().value;
          if (firstImg) {
            const c = document.createElement('canvas');
            c.width = 320; c.height = 180;
            const ctx = c.getContext('2d');
            if (ctx) ctx.drawImage(firstImg, 0, 0, 320, 180);
            thumbDataUrl = c.toDataURL('image/jpeg', 0.8);
          }
        }

        onComplete(finalBlob, 'mp4', thumbDataUrl);
        return;
      }
    } catch (turboErr: any) {
      console.warn("Échec Mode Turbo FFmpeg, bascule automatique vers le Mode Studio Canvas:", turboErr);
      if (engine === 'turbo') {
        onError(`Erreur lors du rendu Turbo FFmpeg: ${turboErr?.message || turboErr}`);
        return;
      }
      onStatus('Bascule vers le Mode Studio Canvas...');
    }
  }

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = 1920;
  exportCanvas.height = 1080;
  const exportCtx = exportCanvas.getContext('2d');
  if (!exportCtx) {
    onError("Erreur: Contexte Canvas indisponible.");
    return;
  }

  // Setup AudioContext and export elements
  const {
    exportAudioCtx,
    dest,
    voiceAnalyser,
    voiceDataArray,
    exportVideos,
    exportVoiceovers,
    bgExportAudioEl,
    bgGain
  } = await setupExportAudioPipeline(project, container);

  // Combine Canvas Video Track + AudioContext Tracks
  const canvasStream = exportCanvas.captureStream(60);
  const combinedStream = new MediaStream();
  canvasStream.getVideoTracks().forEach(t => combinedStream.addTrack(t));

  if (dest && dest.stream.getAudioTracks().length > 0) {
    dest.stream.getAudioTracks().forEach(t => combinedStream.addTrack(t));
  } else {
    try {
      if (exportAudioCtx) {
        const silentDest = exportAudioCtx.createMediaStreamDestination();
        const osc = exportAudioCtx.createOscillator();
        const silentGain = exportAudioCtx.createGain();
        silentGain.gain.value = 0.00001;
        osc.connect(silentGain);
        silentGain.connect(silentDest);
        osc.start();
        silentDest.stream.getAudioTracks().forEach(t => combinedStream.addTrack(t));
      }
    } catch (e) {
      console.debug('[Export] silent fallback error:', e);
    }
  }

  let mimeType = 'video/webm;codecs=vp9,opus';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm;codecs=vp8,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }
  }

  const mediaRecorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 16_000_000,
    audioBitsPerSecond: 256_000
  });

  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  mediaRecorder.start(250);

  let currentExportTime = 0;
  let lastTickTime = performance.now();
  let isFinished = false;
  let animId = 0;
  let watchdogTimer: any = null;

  if (bgExportAudioEl) {
    bgExportAudioEl.currentTime = 0;
    bgExportAudioEl.play().catch(() => {});
  }

  const cleanupExportSession = () => {
    isFinished = true;
    cancelAnimationFrame(animId);
    if (watchdogTimer) clearInterval(watchdogTimer);
    exportVideos.forEach(v => {
      v.pause();
      if (v.parentNode) v.parentNode.removeChild(v);
    });
    exportVoiceovers.forEach(a => {
      a.pause();
      if (a.parentNode) a.parentNode.removeChild(a);
    });
    if (bgExportAudioEl) {
      bgExportAudioEl.pause();
      if (bgExportAudioEl.parentNode) bgExportAudioEl.parentNode.removeChild(bgExportAudioEl);
    }
    if (exportAudioCtx && exportAudioCtx.state !== 'closed') {
      exportAudioCtx.close().catch(() => {});
    }
  };

  const exportLoop = () => {
    if (isAborted()) {
      cleanupExportSession();
      mediaRecorder.stop();
      return;
    }

    if (currentExportTime >= totalDuration) {
      if (!isFinished) {
        cleanupExportSession();
        onStatus('Finalisation de la vidéo...');
        onProgress(100, totalDuration);
        mediaRecorder.stop();
      }
      return;
    }

    const now = performance.now();
    const dt = Math.min(0.08, (now - lastTickTime) / 1000);
    lastTickTime = now;

    currentExportTime += dt;
    if (currentExportTime > totalDuration) currentExportTime = totalDuration;

    const progressPct = Math.min(99, Math.round((currentExportTime / totalDuration) * 100));
    onProgress(progressPct, currentExportTime);
    onStatus(`Exportation en cours : ${progressPct}%`);

    // Dynamic auto-ducking for background music during export
    if (bgGain && project.backgroundMusic) {
      const baseVol = project.backgroundMusic.volume ?? 0.15;
      if (project.backgroundMusic.autoDucking !== false) {
        let isVoiceActive = false;
        if (voiceAnalyser && voiceDataArray) {
          voiceAnalyser.getByteFrequencyData(voiceDataArray as any);
          let sum = 0;
          for (let i = 0; i < voiceDataArray.length; i++) sum += voiceDataArray[i];
          const avg = sum / voiceDataArray.length;
          if (avg > 12) isVoiceActive = true;
        }
        const hasActiveVoiceoverClip = (project.voiceovers || []).some(
          vo => currentExportTime >= vo.startTime && currentExportTime <= vo.startTime + vo.duration
        );
        const hasActiveVideoClip = (project.clips || []).length > 0;
        const shouldDuck = isVoiceActive || hasActiveVoiceoverClip || hasActiveVideoClip;
        const targetVol = shouldDuck ? baseVol * (project.backgroundMusic.duckingLevel ?? 0.25) : baseVol;
        bgGain.gain.value = bgGain.gain.value * 0.85 + targetVol * 0.15;
      } else {
        bgGain.gain.value = baseVol;
      }
    }

    // Sync Voiceovers playback
    exportVoiceovers.forEach((a, id) => {
      const vo = (project.voiceovers || []).find(v => v.id === id);
      if (vo) {
        const voEnd = vo.startTime + vo.duration;
        if (currentExportTime >= vo.startTime && currentExportTime <= voEnd) {
          const targetAudioTime = currentExportTime - vo.startTime;
          if (Math.abs(a.currentTime - targetAudioTime) > 0.15) {
            a.currentTime = targetAudioTime;
          }
          if (a.paused) a.play().catch(() => {});
        } else {
          if (!a.paused) a.pause();
        }
      }
    });

    // Render Canvas Frame
    exportCtx.fillStyle = '#0a0a0a';
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Apply Timeline Zoom Transform
    const activeZoom = getActiveTimelineZoom(project.zooms || [], currentExportTime);
    const isZoomed = applyTimelineZoomTransform(exportCtx, activeZoom, currentExportTime, exportCanvas.width, exportCanvas.height);

    // Render Clips
    compositeActiveClipsToCanvas(
      exportCtx,
      currentExportTime,
      exportCanvas.width,
      exportCanvas.height,
      project.clips || [],
      clipTimelineOffsets,
      exportVideos,
      imagesCache,
      true,
      container
    );

    if (isZoomed) {
      exportCtx.restore();
    }

    // Draw Titles
    for (const title of (project.titles || [])) {
      if (currentExportTime >= title.startTime && currentExportTime <= title.startTime + title.duration) {
        drawTitleOverlay(exportCtx, title, exportCanvas.width, exportCanvas.height, currentExportTime - title.startTime);
      }
    }

    // Draw Image Overlays
    if (project.images) {
      for (const imgOverlay of (project.images || [])) {
        if (currentExportTime >= imgOverlay.startTime && currentExportTime <= imgOverlay.startTime + imgOverlay.duration) {
          const cachedImg = imagesCache.get(imgOverlay.id);
          drawImageOverlay(exportCtx, imgOverlay, cachedImg, exportCanvas.width, exportCanvas.height, currentExportTime - imgOverlay.startTime, false);
        }
      }
    }

    onFrame(exportCanvas);
    animId = requestAnimationFrame(exportLoop);
  };

  // Watchdog timer
  watchdogTimer = setInterval(() => {
    if (isFinished || isAborted()) {
      clearInterval(watchdogTimer);
      return;
    }
    if (performance.now() - lastTickTime > 80) {
      exportLoop();
    }
  }, 40);

  animId = requestAnimationFrame(exportLoop);

  mediaRecorder.onstop = async () => {
    cleanupExportSession();
    if (isAborted()) return;

    let finalBlob = new Blob(chunks, { type: 'video/webm' });
    let outputExt: 'mp4' | 'webm' = 'webm';

    if (exportFormat === 'mp4') {
      try {
        onStatus('Finalisation MP4 (H.264 / AAC)...');
        onProgress(96, totalDuration);
        const { invoke } = await import('@tauri-apps/api/core');
        const isFfmpeg = await invoke<boolean>('is_ffmpeg_available').catch(() => false);
        if (isFfmpeg) {
          onStatus('Encodage haute qualité FFmpeg...');
          onProgress(98, totalDuration);
          const arrayBuf = await finalBlob.arrayBuffer();
          const mp4Data = await invoke<ArrayBuffer | Uint8Array>('convert_webm_to_mp4', new Uint8Array(arrayBuf));
          if (mp4Data instanceof ArrayBuffer) {
            finalBlob = new Blob([mp4Data], { type: 'video/mp4' });
          } else {
            finalBlob = new Blob([mp4Data as any], { type: 'video/mp4' });
          }
          outputExt = 'mp4';
        } else {
          console.warn("FFmpeg non détecté, exportation WebM.");
          outputExt = 'webm';
        }
      } catch (convErr) {
        console.warn("Erreur lors de la conversion MP4 via FFmpeg:", convErr);
        outputExt = 'webm';
      }
    }

    onComplete(finalBlob, outputExt, exportCanvas.toDataURL('image/jpeg', 0.8));
  };
}
