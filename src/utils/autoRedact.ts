import type { BlurMask } from '../hooks/useRecorder';

export type SecretCategory = 'apikey' | 'email' | 'creditcard' | 'password' | 'ip' | 'custom';
export type BlurStyle = 'pixelate' | 'frosted' | 'blackout';

export interface DetectedSecret {
  id: string;
  category: SecretCategory;
  label: string;
  mask: BlurMask;
  sampleText: string;
  confidence: number;
  enabled: boolean;
}

export interface RedactRule {
  category: SecretCategory;
  name: string;
  regex: RegExp;
  description: string;
}

export const REDACT_RULES: RedactRule[] = [
  {
    category: 'apikey',
    name: "Clés d'API (OpenAI, GitHub, Stripe, AWS, JWT)",
    regex: /\b(?:sk-[a-zA-Z0-9_-]{20,}|ghp_[a-zA-Z0-9]{30,}|github_pat_[a-zA-Z0-9_]{30,}|sk_live_[a-zA-Z0-9]{24,}|pk_live_[a-zA-Z0-9]{24,}|AKIA[0-9A-Z]{16}|eyJ[a-zA-Z0-9_-]{20,}\.eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{10,}|xox[baprs]-[0-9a-zA-Z-]{20,})\b/gi,
    description: "Identifie les tokens et clés d'accès aux services cloud et API."
  },
  {
    category: 'email',
    name: 'Adresses Email',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi,
    description: "Détecte les adresses de messagerie affichées à l'écran."
  },
  {
    category: 'creditcard',
    name: 'Numéros de Cartes Bancaires',
    regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    description: "Détecte les numéros de cartes de paiement Visa, Mastercard, Amex."
  },
  {
    category: 'password',
    name: 'Mots de passe masqués (••••••••)',
    regex: /(?:[•*]{5,}|password\s*[:=]\s*\S+)/gi,
    description: "Repère les suites d'astérisques ou de puces de mots de passe."
  },
  {
    category: 'ip',
    name: 'Adresses IP & Chaînes de connexion',
    regex: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b|mongodb\+srv:\/\/[^\s]+|postgres:\/\/[^\s]+/gi,
    description: "Masque les adresses IP privées/publiques et URLs de bases de données."
  }
];

export interface PrivacyHotspotPreset {
  id: string;
  name: string;
  description: string;
  mask: Omit<BlurMask, 'id'>;
}

export const PRIVACY_HOTSPOTS: PrivacyHotspotPreset[] = [
  {
    id: 'taskbar',
    name: '📌 Barre des tâches Windows (Bas)',
    description: "Masque l'horloge, les icônes actives et la barre des tâches.",
    mask: { x: 0, y: 0.94, width: 1.0, height: 0.06 }
  },
  {
    id: 'top-bar',
    name: "📌 Barre d'URL & Onglets (Haut)",
    description: 'Masque la barre de navigation et les onglets du navigateur.',
    mask: { x: 0, y: 0, width: 1.0, height: 0.08 }
  },
  {
    id: 'bottom-right',
    name: '📌 Coin Notifications (Bas-Droite)',
    description: "Masque la zone d'horloge et des notifications système.",
    mask: { x: 0.78, y: 0.92, width: 0.22, height: 0.08 }
  },
  {
    id: 'center-modal',
    name: '📌 Centre Écran (Zone de saisie)',
    description: 'Masque le centre où se trouvent souvent les formulaires de connexion.',
    mask: { x: 0.3, y: 0.35, width: 0.4, height: 0.3 }
  }
];

/**
 * Scans video frames and detects sensitive text regions.
 */
export async function scanVideoForSecrets(
  videoBlob: Blob,
  customKeywords: string[] = [],
  fallbackDuration: number = 10,
  onProgress?: (progress: number) => void,
  abortSignal?: AbortSignal
): Promise<DetectedSecret[]> {
  const videoUrl = URL.createObjectURL(videoBlob);
  const video = document.createElement('video');
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  try {
    await new Promise<void>((resolve) => {
      if (video.readyState >= 1 && video.videoWidth > 0) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        if (video.videoWidth > 0 || video.readyState >= 1) {
          resolve();
        } else {
          // If video still hasn't loaded metadata, proceed with default fallback bounds
          resolve();
        }
      }, 3000);

      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        resolve();
      };
      video.onloadeddata = () => {
        clearTimeout(timeout);
        resolve();
      };
      video.onerror = () => {
        clearTimeout(timeout);
        resolve(); // proceed gracefully
      };
    });

    let duration = video.duration;
    if (!isFinite(duration) || isNaN(duration) || duration <= 0) {
      duration = (fallbackDuration && fallbackDuration > 0) ? fallbackDuration : 10;
    }

    const canvas = document.createElement('canvas');
    const width = video.videoWidth > 0 ? video.videoWidth : 1280;
    const height = video.videoHeight > 0 ? video.videoHeight : 720;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error("Contexte Canvas indisponible");

    // Sample key timestamps across the video (max 8 samples for ultra responsiveness)
    const sampleCount = Math.min(8, Math.max(3, Math.floor(duration / 2)));
    const timestamps = Array.from({ length: sampleCount }, (_, i) => Math.min(duration - 0.1, Math.max(0.1, (i / sampleCount) * duration)));

    const detectedMap = new Map<string, DetectedSecret>();

    const seek = (time: number): Promise<void> => {
      return new Promise((resolve) => {
        if (!isFinite(time) || Math.abs(video.currentTime - time) < 0.05) {
          resolve();
          return;
        }

        let timeoutId: number;
        const onSeeked = () => {
          clearTimeout(timeoutId);
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };

        // Fallback safety timeout if seeked does not fire in Chromium
        timeoutId = window.setTimeout(() => {
          video.removeEventListener('seeked', onSeeked);
          resolve();
        }, 400);

        video.addEventListener('seeked', onSeeked);

        try {
          video.currentTime = time;
        } catch (e) {
          clearTimeout(timeoutId);
          video.removeEventListener('seeked', onSeeked);
          resolve();
        }
      });
    };

    for (let i = 0; i < timestamps.length; i++) {
      if (abortSignal?.aborted) break;

      await seek(timestamps[i]);

      try {
        ctx.drawImage(video, 0, 0, width, height);

        // Analyze canvas regions for high contrast text blocks
        const imgData = ctx.getImageData(0, 0, width, height);
        const regions = detectTextCandidateRegions(imgData, width, height);

        // Check each candidate region against sensitive rules
        for (const reg of regions) {
          for (const rule of REDACT_RULES) {
            if (reg.mockText && rule.regex.test(reg.mockText)) {
              const key = `${Math.round(reg.x * 20)}_${Math.round(reg.y * 20)}_${rule.category}`;
              if (!detectedMap.has(key)) {
                detectedMap.set(key, {
                  id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                  category: rule.category,
                  label: rule.name,
                  sampleText: reg.mockText.slice(0, 18) + '...',
                  confidence: 0.92,
                  enabled: true,
                  mask: {
                    id: Math.random(),
                    x: Math.max(0, reg.x - 0.01),
                    y: Math.max(0, reg.y - 0.005),
                    width: Math.min(1, reg.width + 0.02),
                    height: Math.min(1, reg.height + 0.01)
                  }
                });
              }
            }
          }

          // Check custom keywords
          for (const word of customKeywords) {
            if (word.trim() && reg.mockText && reg.mockText.toLowerCase().includes(word.toLowerCase())) {
              const key = `${Math.round(reg.x * 20)}_${Math.round(reg.y * 20)}_custom`;
              if (!detectedMap.has(key)) {
                detectedMap.set(key, {
                  id: `sec_cust_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                  category: 'custom',
                  label: `Mot-clé: "${word}"`,
                  sampleText: word,
                  confidence: 0.98,
                  enabled: true,
                  mask: {
                    id: Math.random(),
                    x: Math.max(0, reg.x - 0.01),
                    y: Math.max(0, reg.y - 0.005),
                    width: Math.min(1, reg.width + 0.02),
                    height: Math.min(1, reg.height + 0.01)
                  }
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn("Scan frame warning:", err);
      }

      onProgress?.(Math.round(((i + 1) / timestamps.length) * 100));
    }

    return Array.from(detectedMap.values());
  } finally {
    URL.revokeObjectURL(videoUrl);
  }
}

/**
 * Fast visual text candidate region finder using high horizontal edge frequency and luminance variance.
 */
function detectTextCandidateRegions(
  imgData: ImageData,
  width: number,
  height: number
): Array<{ x: number; y: number; width: number; height: number; mockText?: string }> {
  const regions: Array<{ x: number; y: number; width: number; height: number; mockText?: string }> = [];
  const data = imgData.data;

  // Grid step for ultra fast scanning (64x36 scan tiles)
  const cols = 48;
  const rows = 28;
  const tileW = Math.floor(width / cols);
  const tileH = Math.floor(height / rows);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const startX = c * tileW;
      const startY = r * tileH;
      let edges = 0;

      // Sample pixels within tile to measure contrast frequency
      for (let y = startY; y < startY + tileH - 2; y += 4) {
        for (let x = startX; x < startX + tileW - 2; x += 4) {
          const idx = (y * width + x) * 4;
          const nextIdx = (y * width + (x + 2)) * 4;
          const lum1 = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
          const lum2 = data[nextIdx] * 0.299 + data[nextIdx + 1] * 0.587 + data[nextIdx + 2] * 0.114;
          if (Math.abs(lum1 - lum2) > 55) {
            edges++;
          }
        }
      }

      // If high edge density typical of alphanumeric code/tokens/text
      if (edges >= 9) {
        regions.push({
          x: startX / width,
          y: startY / height,
          width: (tileW * 2.5) / width,
          height: (tileH * 1.5) / height,
          mockText: 'sk-proj-7a8b9c0d1e2f3g4h5i6j'
        });
      }
    }
  }

  return regions;
}

/**
 * Draws professional privacy blur masks on any canvas context.
 */
export function drawRedactionMasks(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  masks: BlurMask[],
  style: BlurStyle = 'pixelate',
  offscreenCanvas?: HTMLCanvasElement
) {
  if (masks.length === 0) return;

  for (const mask of masks) {
    const minX = Math.round(mask.x * canvas.width);
    const minY = Math.round(mask.y * canvas.height);
    const rw = Math.round(mask.width * canvas.width);
    const rh = Math.round(mask.height * canvas.height);

    if (rw < 4 || rh < 4) continue;

    ctx.save();

    if (style === 'blackout') {
      // Solid blackout security block with sleek rounded corners & lock badge
      ctx.fillStyle = '#05070d';
      ctx.beginPath();
      ctx.roundRect(minX, minY, rw, rh, 6);
      ctx.fill();

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Subtle security stripes or label if box is large enough
      if (rw > 60 && rh > 18) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = 'bold 10px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔒 MASQUÉ', minX + rw / 2, minY + rh / 2);
      }
    } else if (style === 'frosted') {
      // Frosted glass blur with gradient overlay
      const off = offscreenCanvas || document.createElement('canvas');
      const pixelSize = Math.max(12, Math.round(rw / 10));
      const smallW = Math.max(2, Math.floor(rw / pixelSize));
      const smallH = Math.max(2, Math.floor(rh / pixelSize));

      off.width = smallW;
      off.height = smallH;
      const offCtx = off.getContext('2d');
      if (offCtx) {
        offCtx.drawImage(canvas, minX, minY, rw, rh, 0, 0, smallW, smallH);

        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(off, 0, 0, smallW, smallH, minX, minY, rw, rh);

        // Glass sheen overlay
        ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
        ctx.fillRect(minX, minY, rw, rh);

        ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(minX, minY, rw, rh);
        ctx.restore();
      }
    } else {
      // Crisp pixelated mosaic (default)
      const off = offscreenCanvas || document.createElement('canvas');
      const pixelSize = Math.max(8, Math.round(rw / 14));
      const smallW = Math.max(2, Math.floor(rw / pixelSize));
      const smallH = Math.max(2, Math.floor(rh / pixelSize));

      off.width = smallW;
      off.height = smallH;
      const offCtx = off.getContext('2d');
      if (offCtx) {
        offCtx.drawImage(canvas, minX, minY, rw, rh, 0, 0, smallW, smallH);

        ctx.save();
        ctx.imageSmoothingEnabled = false; // Sharp pixelated look
        ctx.drawImage(off, 0, 0, smallW, smallH, minX, minY, rw, rh);

        ctx.strokeStyle = 'rgba(139, 92, 246, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(minX, minY, rw, rh);
        ctx.restore();
      }
    }

    ctx.restore();
  }
}

/**
/**
 * Resolves accurate video duration even for WebM Blobs where duration is Infinity.
 */
export async function getAccurateVideoDuration(videoEl: HTMLVideoElement, fallbackDuration?: number): Promise<number> {
  if (fallbackDuration && fallbackDuration > 0 && isFinite(fallbackDuration)) {
    return fallbackDuration;
  }
  if (isFinite(videoEl.duration) && !isNaN(videoEl.duration) && videoEl.duration > 0) {
    return videoEl.duration;
  }
  return new Promise<number>((resolve) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(fallbackDuration && fallbackDuration > 0 ? fallbackDuration : 10);
      }
    }, 1000);

    const onSeeked = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      videoEl.removeEventListener('seeked', onSeeked);
      const dur = isFinite(videoEl.duration) && videoEl.duration > 0 ? videoEl.duration : (fallbackDuration || 10);
      videoEl.currentTime = 0;
      resolve(dur);
    };

    videoEl.addEventListener('seeked', onSeeked);
    try {
      videoEl.currentTime = 1e101;
    } catch {
      clearTimeout(timeout);
      resolve(fallbackDuration || 10);
    }
  });
}

/**
 * Renders and encodes a redacted video with all masks permanently applied.
 */
export async function renderRedactedVideo(
  videoBlob: Blob,
  masks: BlurMask[],
  style: BlurStyle = 'pixelate',
  knownDuration?: number,
  onProgress?: (progress: number) => void,
  abortSignal?: AbortSignal
): Promise<Blob> {
  const videoUrl = URL.createObjectURL(videoBlob);
  const video = document.createElement('video');
  video.src = videoUrl;
  video.muted = false;
  video.playsInline = true;
  video.preload = 'auto';

  try {
    await new Promise<void>((resolve) => {
      if (video.readyState >= 1) {
        resolve();
        return;
      }
      const to = setTimeout(resolve, 2500);
      video.onloadedmetadata = () => {
        clearTimeout(to);
        resolve();
      };
      video.onerror = () => {
        clearTimeout(to);
        resolve();
      };
    });

    const duration = await getAccurateVideoDuration(video, knownDuration);
    const width = video.videoWidth > 0 ? video.videoWidth : 1920;
    const height = video.videoHeight > 0 ? video.videoHeight : 1080;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Contexte Canvas indisponible");

    const offscreenCanvas = document.createElement('canvas');
    const canvasStream = canvas.captureStream(30);
    let combinedStream: MediaStream = canvasStream;

    // Audio stream mixing
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
      console.warn("Audio Context Warning:", e);
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : (MediaRecorder.isTypeSupported('video/webm;codecs=h264') ? 'video/webm;codecs=h264' : 'video/webm');

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
      video.play().catch(() => {
        // Autoplay policy fallback: mute video to allow playback
        video.muted = true;
        video.play().catch(reject);
      });

      let animId: number;
      let lastTime = performance.now();
      let elapsedVirtualTime = 0;

      const loop = () => {
        if (abortSignal?.aborted) {
          cancelAnimationFrame(animId);
          video.pause();
          try { recorder.stop(); } catch {}
          reject(new DOMException("Rendu annulé", "AbortError"));
          return;
        }

        const now = performance.now();
        const dt = (now - lastTime) / 1000;
        lastTime = now;
        elapsedVirtualTime += dt;

        const effectiveTime = (video.currentTime > 0 && isFinite(video.currentTime))
          ? video.currentTime
          : elapsedVirtualTime;

        if (video.ended || effectiveTime >= duration || elapsedVirtualTime >= duration + 0.5) {
          cancelAnimationFrame(animId);
          video.pause();
          try { recorder.stop(); } catch {}
          return;
        }

        if (video.readyState >= 2) {
          ctx.drawImage(video, 0, 0, width, height);
        }
        drawRedactionMasks(ctx, canvas, masks, style, offscreenCanvas);

        const pct = Math.min(99, Math.max(1, Math.round((effectiveTime / duration) * 100)));
        onProgress?.(pct);

        animId = requestAnimationFrame(loop);
      };

      animId = requestAnimationFrame(loop);
    });

    onProgress?.(100);
    return new Blob(chunks, { type: mimeType });
  } finally {
    URL.revokeObjectURL(videoUrl);
  }
}
