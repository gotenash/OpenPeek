import type { EditorProject } from '../videoCompositor';

export async function preloadExportMedia(
  project: EditorProject,
  imagesCache: Map<string, HTMLImageElement>
): Promise<void> {
  // Preload all timeline images and image clips in cache
  if (project.images && project.images.length > 0) {
    for (const img of project.images) {
      if (!imagesCache.has(img.id) && img.dataUrl) {
        const imageEl = new Image();
        imageEl.src = img.dataUrl;
        await new Promise((resolve) => {
          imageEl.onload = resolve;
          imageEl.onerror = resolve;
        });
        imagesCache.set(img.id, imageEl);
      }
    }
  }

  for (const clip of project.clips) {
    if (clip.type === 'image') {
      if (!imagesCache.has(clip.id)) {
        const imageEl = new Image();
        if (clip.video.thumbnail) {
          imageEl.src = clip.video.thumbnail;
        } else if (clip.video.blob && clip.video.blob.size > 0) {
          imageEl.src = URL.createObjectURL(clip.video.blob);
        }
        await new Promise((resolve) => {
          imageEl.onload = resolve;
          imageEl.onerror = resolve;
        });
        imagesCache.set(clip.id, imageEl);
      }
    } else if (clip.type === 'slide' && clip.slideContent?.bgImageUrl) {
      const cacheKey = `slide_bg_${clip.id}`;
      if (!imagesCache.has(cacheKey)) {
        const imageEl = new Image();
        imageEl.src = clip.slideContent.bgImageUrl;
        await new Promise((resolve) => {
          imageEl.onload = resolve;
          imageEl.onerror = resolve;
        });
        if (clip.slideContent) clip.slideContent.bgImageEl = imageEl;
        imagesCache.set(cacheKey, imageEl);
      }
    }
  }
}
