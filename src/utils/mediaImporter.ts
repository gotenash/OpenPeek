import { saveMedia, type SavedMedia, type MediaType } from './db';

/**
 * Detect media category from File MIME type or extension
 */
export function detectMediaType(file: File): MediaType {
  const mime = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();

  if (mime.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi|m4v|flv|wmv)$/i.test(name)) {
    return 'video';
  }
  if (mime.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif|svg|bmp|ico|tiff)$/i.test(name)) {
    return 'image';
  }
  if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac|opus|weba|wma)$/i.test(name)) {
    return 'audio';
  }

  // Default to video if uncertain
  return 'video';
}

/**
 * Generate image thumbnail & dimensions
 */
async function processImageFile(file: File): Promise<{ thumbnail: string; width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const width = img.naturalWidth || 640;
      const height = img.naturalHeight || 360;

      // Create compressed 320x180 thumbnail
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 320, 180);

        // Aspect ratio cover/contain
        const scale = Math.min(320 / width, 180 / height);
        const w = width * scale;
        const h = height * scale;
        const x = (320 - w) / 2;
        const y = (180 - h) / 2;
        ctx.drawImage(img, x, y, w, h);
      }
      resolve({
        thumbnail: canvas.toDataURL('image/jpeg', 0.8),
        width,
        height
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ thumbnail: '', width: 0, height: 0 });
    };

    img.src = url;
  });
}

/**
 * Generate video thumbnail & detect duration
 */
async function processVideoFile(file: File): Promise<{ thumbnail: string; duration: number; width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    let resolved = false;
    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        URL.revokeObjectURL(url);
      }
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve({ thumbnail: '', duration: 0, width: 0, height: 0 });
    }, 4000);

    video.onloadedmetadata = () => {
      const duration = isFinite(video.duration) && video.duration > 0 ? Math.round(video.duration) : 0;
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;

      // Seek to 0.5s or 10% to capture a non-black frame
      const seekTime = Math.min(0.5, (video.duration || 1) / 4);
      video.currentTime = seekTime;

      video.onseeked = () => {
        clearTimeout(timeout);
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, 320, 180);
        }
        cleanup();
        resolve({
          thumbnail: canvas.toDataURL('image/jpeg', 0.8),
          duration,
          width,
          height
        });
      };
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      resolve({ thumbnail: '', duration: 0, width: 0, height: 0 });
    };

    video.src = url;
  });
}

/**
 * Generate audio visual thumbnail & detect duration
 */
async function processAudioFile(file: File): Promise<{ thumbnail: string; duration: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';

    let resolved = false;
    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        URL.revokeObjectURL(url);
      }
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve({ thumbnail: generateAudioPlaceholderThumbnail(file.name), duration: 0 });
    }, 3000);

    audio.onloadedmetadata = () => {
      clearTimeout(timeout);
      const duration = isFinite(audio.duration) && audio.duration > 0 ? Math.round(audio.duration) : 0;
      cleanup();
      resolve({
        thumbnail: generateAudioPlaceholderThumbnail(file.name),
        duration
      });
    };

    audio.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      resolve({ thumbnail: generateAudioPlaceholderThumbnail(file.name), duration: 0 });
    };

    audio.src = url;
  });
}

/**
 * Generates an elegant gradient waveform canvas thumbnail for audio files
 */
function generateAudioPlaceholderThumbnail(filename: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 320, 180);
  grad.addColorStop(0, '#111827');
  grad.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 320, 180);

  // Draw simulated sound wave bars
  const bars = 28;
  const barWidth = 6;
  const spacing = 4;
  const startX = (320 - (bars * (barWidth + spacing))) / 2;

  // Pseudo-random heights based on filename hash
  let seed = 0;
  for (let i = 0; i < filename.length; i++) {
    seed = (seed + filename.charCodeAt(i) * (i + 1)) % 1000;
  }

  for (let i = 0; i < bars; i++) {
    const pseudo = Math.sin((i + seed) * 0.45) * 0.5 + 0.5;
    const barHeight = Math.max(12, Math.round(pseudo * 80));
    const x = startX + i * (barWidth + spacing);
    const y = 90 - barHeight / 2;

    const barGrad = ctx.createLinearGradient(0, y, 0, y + barHeight);
    barGrad.addColorStop(0, '#38bdf8');
    barGrad.addColorStop(1, '#818cf8');
    ctx.fillStyle = barGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 3);
    ctx.fill();
  }

  return canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Import a single File into the library
 */
export async function importSingleFile(file: File, projectId: string | null = null): Promise<SavedMedia> {
  const mediaType = detectMediaType(file);
  let thumbnail = '';
  let duration = 0;
  let width = 0;
  let height = 0;

  if (mediaType === 'image') {
    const res = await processImageFile(file);
    thumbnail = res.thumbnail;
    width = res.width;
    height = res.height;
  } else if (mediaType === 'video') {
    const res = await processVideoFile(file);
    thumbnail = res.thumbnail;
    duration = res.duration;
    width = res.width;
    height = res.height;
  } else if (mediaType === 'audio') {
    const res = await processAudioFile(file);
    thumbnail = res.thumbnail;
    duration = res.duration;
  }

  // Clean filename without extension for title
  const cleanTitle = file.name.replace(/\.[^/.]+$/, '');

  const newMedia: SavedMedia = {
    id: crypto.randomUUID ? crypto.randomUUID() : `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: cleanTitle,
    blob: file,
    type: mediaType,
    mimeType: file.type || `${mediaType}/*`,
    duration,
    size: file.size,
    date: new Date(file.lastModified || Date.now()).toISOString(),
    thumbnail,
    projectId: projectId || null,
    width: width || undefined,
    height: height || undefined
  };

  await saveMedia(newMedia);
  return newMedia;
}

/**
 * Batch import multiple files
 */
export async function importMediaFiles(
  files: FileList | File[],
  projectId: string | null = null,
  onProgress?: (current: number, total: number, filename: string) => void
): Promise<SavedMedia[]> {
  const fileArray = Array.from(files);
  const total = fileArray.length;
  const importedList: SavedMedia[] = [];

  for (let i = 0; i < total; i++) {
    const file = fileArray[i];
    if (onProgress) {
      onProgress(i + 1, total, file.name);
    }
    try {
      const media = await importSingleFile(file, projectId);
      importedList.push(media);
    } catch (err) {
      console.error(`Failed to import file "${file.name}":`, err);
    }
  }

  return importedList;
}
