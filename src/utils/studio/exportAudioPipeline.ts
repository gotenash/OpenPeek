import type { EditorProject } from '../videoCompositor';

export interface ExportAudioPipelineResult {
  exportAudioCtx: AudioContext | null;
  dest: MediaStreamAudioDestinationNode | null;
  voiceAnalyser: AnalyserNode | null;
  voiceDataArray: Uint8Array | null;
  exportVideos: Map<string, HTMLVideoElement>;
  exportVoiceovers: Map<string, HTMLAudioElement>;
  bgExportAudioEl: HTMLAudioElement | null;
  bgGain: GainNode | null;
}

export async function setupExportAudioPipeline(
  project: EditorProject,
  container: HTMLElement
): Promise<ExportAudioPipelineResult> {
  let exportAudioCtx: AudioContext | null = null;
  let dest: MediaStreamAudioDestinationNode | null = null;
  let voiceAnalyser: AnalyserNode | null = null;
  let voiceDataArray: Uint8Array | null = null;
  const exportVideos = new Map<string, HTMLVideoElement>();
  const exportVoiceovers = new Map<string, HTMLAudioElement>();
  let bgExportAudioEl: HTMLAudioElement | null = null;
  let bgGain: GainNode | null = null;

  try {
    exportAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (exportAudioCtx.state === 'suspended') {
      await exportAudioCtx.resume();
    }
    dest = exportAudioCtx.createMediaStreamDestination();

    voiceAnalyser = exportAudioCtx.createAnalyser();
    voiceAnalyser.fftSize = 256;
    voiceDataArray = new Uint8Array(voiceAnalyser.frequencyBinCount);

    // Setup Video Elements for export
    for (const clip of project.clips) {
      if (clip.type === 'video' && clip.video.blob) {
        const vid = document.createElement('video');
        vid.src = URL.createObjectURL(clip.video.blob);
        vid.crossOrigin = 'anonymous';
        vid.muted = false;
        vid.volume = clip.volume !== undefined ? clip.volume : 1.0;
        vid.playsInline = true;
        vid.style.position = 'fixed';
        vid.style.top = '-9999px';
        vid.style.left = '-9999px';
        vid.style.opacity = '0';
        vid.style.pointerEvents = 'none';
        container.appendChild(vid);

        await new Promise<void>((res) => {
          vid.onloadedmetadata = () => res();
          vid.onerror = () => res();
        });

        try {
          const track = (vid as any).captureStream ? (vid as any).captureStream().getAudioTracks()[0] : null;
          if (track && dest && exportAudioCtx) {
            const vSrc = exportAudioCtx.createMediaStreamSource(new MediaStream([track]));
            const vGain = exportAudioCtx.createGain();
            vGain.gain.value = clip.volume !== undefined ? clip.volume : 1.0;
            vSrc.connect(vGain);
            vGain.connect(dest);
          }
        } catch (e) {
          console.debug('[Export] captureStream audio track failed:', e);
        }

        exportVideos.set(clip.id, vid);
      }
    }

    // Setup Voiceover Audio Elements
    if (project.voiceovers && project.voiceovers.length > 0) {
      for (const vo of project.voiceovers) {
        if (vo.blob) {
          const a = document.createElement('audio');
          a.src = URL.createObjectURL(vo.blob);
          a.crossOrigin = 'anonymous';
          a.volume = vo.volume ?? 1.0;
          container.appendChild(a);

          await new Promise<void>((res) => {
            a.onloadedmetadata = () => res();
            a.onerror = () => res();
          });

          try {
            if (dest && exportAudioCtx) {
              const voSrc = exportAudioCtx.createMediaElementSource(a);
              const voGain = exportAudioCtx.createGain();
              voGain.gain.value = vo.volume ?? 1.0;
              voSrc.connect(voGain);
              if (voiceAnalyser) {
                voGain.connect(voiceAnalyser);
              }
              voGain.connect(dest);
            }
          } catch (e) {
            console.debug('[Export] voiceover createMediaElementSource failed:', e);
          }

          exportVoiceovers.set(vo.id, a);
        }
      }
    }

    // Setup Background Music Audio Element
    if (project.backgroundMusic && project.backgroundMusic.blob && dest && exportAudioCtx) {
      bgExportAudioEl = document.createElement('audio');
      bgExportAudioEl.src = URL.createObjectURL(project.backgroundMusic.blob);
      bgExportAudioEl.loop = project.backgroundMusic.loop ?? true;
      container.appendChild(bgExportAudioEl);

      await new Promise<void>((res) => {
        bgExportAudioEl!.onloadedmetadata = () => res();
        bgExportAudioEl!.onerror = () => res();
      });

      try {
        const bgSource = exportAudioCtx.createMediaElementSource(bgExportAudioEl);
        bgGain = exportAudioCtx.createGain();
        bgGain.gain.value = project.backgroundMusic.volume ?? 0.15;
        bgSource.connect(bgGain);
        bgGain.connect(dest);
      } catch (e) {
        console.debug('[Export] bgMusic createMediaElementSource failed:', e);
      }
    }
  } catch (err) {
    console.warn("AudioContext setup failed during export:", err);
  }

  return {
    exportAudioCtx,
    dest,
    voiceAnalyser,
    voiceDataArray,
    exportVideos,
    exportVoiceovers,
    bgExportAudioEl,
    bgGain
  };
}
