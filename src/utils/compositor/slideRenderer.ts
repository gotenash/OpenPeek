import type { SlideContent } from './compositorTypes';

/**
 * Draws a full-screen title slide / presentation card directly on the video canvas.
 */
export function drawSlideClip(
  ctx: CanvasRenderingContext2D,
  slide: SlideContent | undefined,
  canvasW: number,
  canvasH: number
): void {
  if (!slide) {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvasW, canvasH);
    return;
  }

  ctx.save();

  // Background
  const bgColor = slide.bgColor || '#0f172a';
  if (bgColor.startsWith('linear-gradient') || bgColor.includes('gradient')) {
    const grad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
    if (bgColor.includes('violet') || bgColor.includes('#8b5cf6') || bgColor.includes('purple')) {
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(0.5, '#2e1065');
      grad.addColorStop(1, '#0f172a');
    } else if (bgColor.includes('blue') || bgColor.includes('#06b6d4') || bgColor.includes('cyan')) {
      grad.addColorStop(0, '#0c4a6e');
      grad.addColorStop(0.5, '#0369a1');
      grad.addColorStop(1, '#0f172a');
    } else if (bgColor.includes('emerald') || bgColor.includes('#10b981') || bgColor.includes('green')) {
      grad.addColorStop(0, '#064e3b');
      grad.addColorStop(0.5, '#047857');
      grad.addColorStop(1, '#022c22');
    } else if (bgColor.includes('sunset') || bgColor.includes('#f59e0b') || bgColor.includes('rose')) {
      grad.addColorStop(0, '#881337');
      grad.addColorStop(0.5, '#7c2d12');
      grad.addColorStop(1, '#18181b');
    } else {
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(1, '#020617');
    }
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = bgColor;
  }
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Background image if provided
  if (slide.bgImageEl && slide.bgImageEl.complete && slide.bgImageEl.naturalWidth > 0) {
    const hRatio = canvasW / slide.bgImageEl.naturalWidth;
    const vRatio = canvasH / slide.bgImageEl.naturalHeight;
    const ratio = Math.max(hRatio, vRatio);
    const targetW = slide.bgImageEl.naturalWidth * ratio;
    const targetH = slide.bgImageEl.naturalHeight * ratio;
    const x = (canvasW - targetW) / 2;
    const y = (canvasH - targetH) / 2;
    ctx.drawImage(slide.bgImageEl, x, y, targetW, targetH);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // Text alignment & position calculation
  const align = slide.align || 'center';
  let textX = canvasW / 2;
  let accentX = (canvasW - Math.min(canvasW * 0.35, 240)) / 2;
  const accentBarWidth = Math.min(canvasW * 0.35, 240);

  if (align === 'left') {
    textX = canvasW * 0.1;
    accentX = canvasW * 0.1;
  } else if (align === 'right') {
    textX = canvasW * 0.9;
    accentX = canvasW * 0.9 - accentBarWidth;
  }

  // Accent bar decoration
  const gradLine = ctx.createLinearGradient(accentX, 0, accentX + accentBarWidth, 0);
  gradLine.addColorStop(0, 'rgba(139, 92, 246, 0.2)');
  gradLine.addColorStop(0.5, 'rgba(139, 92, 246, 0.85)');
  gradLine.addColorStop(1, 'rgba(6, 182, 212, 0.2)');
  ctx.fillStyle = gradLine;
  ctx.fillRect(accentX, canvasH / 2 + 54, accentBarWidth, 3);

  // Title
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  const baseFontSize = slide.fontSize || 52;
  const scaledFontSize = Math.round(baseFontSize * (canvasW / 1280));
  ctx.font = `800 ${scaledFontSize}px "Inter", "Segoe UI", system-ui, sans-serif`;
  ctx.fillStyle = slide.textColor || '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  const titleY = slide.subtitle ? (canvasH / 2 - scaledFontSize * 0.45) : (canvasH / 2);
  ctx.fillText(slide.title, textX, titleY);

  // Subtitle
  if (slide.subtitle) {
    const subFontSize = Math.round(scaledFontSize * 0.45);
    ctx.font = `500 ${subFontSize}px "Inter", "Segoe UI", system-ui, sans-serif`;
    ctx.fillStyle = slide.subtextColor || 'rgba(255, 255, 255, 0.75)';
    ctx.shadowBlur = 8;
    ctx.fillText(slide.subtitle, textX, canvasH / 2 + scaledFontSize * 0.75);
  }

  ctx.restore();
}

/**
 * Draws a full-screen image clip on the video canvas (with proportional fit and letterbox).
 */
export function drawImageClip(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | undefined,
  canvasW: number,
  canvasH: number
): void {
  ctx.save();
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, canvasW, canvasH);

  if (img && img.complete && img.naturalWidth > 0) {
    const hRatio = canvasW / img.naturalWidth;
    const vRatio = canvasH / img.naturalHeight;
    const ratio = Math.min(hRatio, vRatio);
    const targetW = img.naturalWidth * ratio;
    const targetH = img.naturalHeight * ratio;
    const x = (canvasW - targetW) / 2;
    const y = (canvasH - targetH) / 2;
    ctx.drawImage(img, x, y, targetW, targetH);
  }
  ctx.restore();
}
