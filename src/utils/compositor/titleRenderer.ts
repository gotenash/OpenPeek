import type { TimelineTitle, TitleAnimation } from './compositorTypes';
export { drawFastForwardBadge } from './badgeRenderer';

/**
 * Renders text overlay for a given timeline timestamp onto a 2D Canvas.
 */
export function drawTitleOverlay(
  ctx: CanvasRenderingContext2D,
  title: TimelineTitle,
  canvasW: number,
  canvasH: number,
  timeWithinTitle: number
) {
  const progress = timeWithinTitle / title.duration;
  if (progress < 0 || progress > 1) return;

  const anim: TitleAnimation = title.animation || (title.style === 'intro' || title.style === 'outro' ? 'zoom-in' : 'slide-up');

  // Durées des phases d'entrée et de sortie
  const enterDur = Math.min(0.55, title.duration * 0.35);
  const exitDur = Math.min(0.40, title.duration * 0.25);
  const timeFromEnd = title.duration - timeWithinTitle;

  const tEnter = Math.max(0, Math.min(1, timeWithinTitle / enterDur));
  const tExit = Math.max(0, Math.min(1, timeFromEnd / exitDur));

  // Fonctions d'amortissement / Easing
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  const easeOutBack = (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  // Calcul de la transparence globale
  let alpha = 1.0;
  if (timeWithinTitle < enterDur) {
    alpha = tEnter;
  } else if (timeFromEnd < exitDur) {
    alpha = tExit;
  }

  // Calcul des décalages et de l'échelle selon l'animation choisie
  let offsetX = 0;
  let offsetY = 0;
  let scale = 1.0;
  let typewriterProgress = 1.0;

  if (timeWithinTitle < enterDur) {
    const t = tEnter;
    if (anim === 'slide-up') {
      offsetY = (1 - easeOutCubic(t)) * (canvasH * 0.08);
    } else if (anim === 'slide-left') {
      offsetX = -(1 - easeOutCubic(t)) * (canvasW * 0.12);
    } else if (anim === 'zoom-in') {
      scale = 0.72 + easeOutCubic(t) * 0.28;
    } else if (anim === 'pop-bounce') {
      scale = Math.max(0.05, easeOutBack(t));
    } else if (anim === 'typewriter') {
      typewriterProgress = Math.min(1.0, t * 1.15);
    }
    // 'fade' garde offsetX=0, offsetY=0, scale=1.0 et utilise uniquement alpha
  } else if (timeFromEnd < exitDur) {
    const t = 1 - tExit;
    if (anim === 'slide-up' || anim === 'slide-left') {
      offsetY = t * (canvasH * 0.04);
    } else if (anim === 'zoom-in' || anim === 'pop-bounce') {
      scale = 1.0 - t * 0.15;
    }
  }

  // Gestion du texte pour l'animation Machine à écrire
  const rawText = title.text || '';
  const textChars = Math.max(1, Math.floor(rawText.length * typewriterProgress));
  const displayText = anim === 'typewriter' && timeWithinTitle < enterDur
    ? rawText.slice(0, textChars) + (Math.floor(timeWithinTitle * 8) % 2 === 0 ? '▏' : '')
    : rawText;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

  // Helper pour appliquer translation + scale autour du centre géométrique
  const applyTransform = (cx: number, cy: number) => {
    ctx.translate(cx + offsetX, cy + offsetY);
    if (scale !== 1.0) {
      ctx.scale(scale, scale);
    }
    ctx.translate(-cx, -cy);
  };

  const scaleRatio = canvasW / 1280;

  if (title.style === 'intro' || title.style === 'outro') {
    applyTransform(canvasW / 2, canvasH / 2);

    const bgGrad = ctx.createRadialGradient(
      canvasW / 2, canvasH / 2, 80,
      canvasW / 2, canvasH / 2, canvasW * 0.7
    );
    bgGrad.addColorStop(0, title.bgColor || 'rgba(30, 41, 59, 0.94)');
    bgGrad.addColorStop(1, 'rgba(10, 15, 30, 0.98)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = title.textColor || '#ffffff';
    ctx.font = `800 ${title.fontSize * scaleRatio}px "Outfit", sans-serif`;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 20;
    const textY = canvasH / 2 - (title.subtitle ? 28 : 0);
    ctx.fillText(displayText, canvasW / 2, textY);

    if (title.subtitle) {
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(canvasW / 2 - 80, textY + 34);
      ctx.lineTo(canvasW / 2 + 80, textY + 34);
      ctx.stroke();

      ctx.shadowBlur = 10;
      ctx.font = `500 ${(title.fontSize * 0.52) * scaleRatio}px "Inter", sans-serif`;
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(title.subtitle, canvasW / 2, textY + 68);
    }

  } else if (title.style === 'pill') {
    const titleFont = `600 ${title.fontSize * 0.68 * scaleRatio}px "Inter", -apple-system, sans-serif`;
    ctx.font = titleFont;
    const titleW = ctx.measureText(displayText).width;
    let subW = 0;
    if (title.subtitle) {
      ctx.font = `normal ${(title.fontSize * 0.44) * scaleRatio}px "Inter", sans-serif`;
      subW = ctx.measureText(title.subtitle).width;
    }

    const contentW = Math.max(titleW, subW);
    const bannerH = title.subtitle ? canvasH * 0.11 : canvasH * 0.075;
    const bannerW = Math.min(canvasW * 0.55, Math.max(canvasW * 0.22, contentW + bannerH + 36));
    const bannerX = canvasW * 0.04;
    const bannerY = canvasH - bannerH - (canvasH * 0.05);

    applyTransform(bannerX + bannerW / 2, bannerY + bannerH / 2);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = title.bgColor || 'rgba(15, 23, 42, 0.93)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 1.8;

    const radius = bannerH / 2;
    if (typeof (ctx as any).roundRect === 'function') {
      ctx.beginPath();
      (ctx as any).roundRect(bannerX, bannerY, bannerW, bannerH, radius);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
      ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);
    }

    ctx.shadowColor = 'transparent';

    const dotX = bannerX + radius * 0.85;
    const dotY = bannerY + bannerH / 2;
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    const textStartX = dotX + 16;
    const maxTextW = bannerW - (textStartX - bannerX) - radius * 0.5;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = title.textColor || '#ffffff';
    ctx.font = titleFont;

    if (title.subtitle) {
      ctx.fillText(displayText, textStartX, bannerY + bannerH * 0.36, maxTextW);
      ctx.font = `normal ${(title.fontSize * 0.44) * scaleRatio}px "Inter", sans-serif`;
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(title.subtitle, textStartX, bannerY + bannerH * 0.72, maxTextW);
    } else {
      ctx.fillText(displayText, textStartX, bannerY + bannerH * 0.5, maxTextW);
    }

  } else if (title.style === 'badge') {
    const titleFont = `700 ${title.fontSize * 0.65 * scaleRatio}px "Outfit", sans-serif`;
    ctx.font = titleFont;
    const titleW = ctx.measureText(displayText).width;
    let subW = 0;
    if (title.subtitle) {
      ctx.font = `normal ${(title.fontSize * 0.42) * scaleRatio}px "Inter", sans-serif`;
      subW = ctx.measureText(title.subtitle).width;
    }

    const contentW = Math.max(titleW, subW);
    const bannerH = title.subtitle ? canvasH * 0.12 : canvasH * 0.085;
    const bannerW = Math.min(canvasW * 0.50, Math.max(canvasW * 0.22, contentW + 40));
    const bannerX = canvasW * 0.04;
    const bannerY = canvasH * 0.05;

    applyTransform(bannerX + bannerW / 2, bannerY + bannerH / 2);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;

    ctx.fillStyle = title.bgColor || 'rgba(15, 23, 42, 0.94)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;

    if (typeof (ctx as any).roundRect === 'function') {
      ctx.beginPath();
      (ctx as any).roundRect(bannerX, bannerY, bannerW, bannerH, 8);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
      ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);
    }

    ctx.shadowColor = 'transparent';

    ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
    if (typeof (ctx as any).roundRect === 'function') {
      ctx.beginPath();
      (ctx as any).roundRect(bannerX + 10, bannerY + 6, 52, 14, 3);
      ctx.fill();
    }
    ctx.fillStyle = '#fde68a';
    ctx.font = `bold ${9 * scaleRatio}px "Inter", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡ POINT CLÉ', bannerX + 14, bannerY + 13);

    ctx.fillStyle = title.textColor || '#ffffff';
    ctx.font = titleFont;
    const maxTextW = bannerW - 24;
    if (title.subtitle) {
      ctx.fillText(displayText, bannerX + 12, bannerY + bannerH * 0.52, maxTextW);
      ctx.font = `normal ${(title.fontSize * 0.42) * scaleRatio}px "Inter", sans-serif`;
      ctx.fillStyle = '#fcd34d';
      ctx.fillText(title.subtitle, bannerX + 12, bannerY + bannerH * 0.80, maxTextW);
    } else {
      ctx.fillText(displayText, bannerX + 12, bannerY + bannerH * 0.65, maxTextW);
    }

  } else if (title.style === 'center-card') {
    const titleFont = `800 ${title.fontSize * 0.85 * scaleRatio}px "Outfit", sans-serif`;
    ctx.font = titleFont;
    const titleW = ctx.measureText(displayText).width;
    let subW = 0;
    if (title.subtitle) {
      ctx.font = `500 ${(title.fontSize * 0.48) * scaleRatio}px "Inter", sans-serif`;
      subW = ctx.measureText(title.subtitle).width;
    }

    const contentW = Math.max(titleW, subW);
    const cardH = title.subtitle ? canvasH * 0.20 : canvasH * 0.14;
    const cardW = Math.min(canvasW * 0.70, Math.max(canvasW * 0.38, contentW + 64));
    const cardX = (canvasW - cardW) / 2;
    const cardY = (canvasH - cardH) / 2;

    applyTransform(canvasW / 2, canvasH / 2);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;

    ctx.fillStyle = title.bgColor || 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 2.2;

    if (typeof (ctx as any).roundRect === 'function') {
      ctx.beginPath();
      (ctx as any).roundRect(cardX, cardY, cardW, cardH, 12);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(cardX, cardY, cardW, cardH);
      ctx.strokeRect(cardX, cardY, cardW, cardH);
    }

    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#818cf8';
    if (typeof (ctx as any).roundRect === 'function') {
      ctx.beginPath();
      (ctx as any).roundRect(cardX + 24, cardY + 2, cardW - 48, 3, 2);
      ctx.fill();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = title.textColor || '#ffffff';
    ctx.font = titleFont;
    const maxTextW = cardW - 32;

    if (title.subtitle) {
      ctx.fillText(displayText, canvasW / 2, cardY + cardH * 0.40, maxTextW);
      ctx.font = `500 ${(title.fontSize * 0.48) * scaleRatio}px "Inter", sans-serif`;
      ctx.fillStyle = '#c7d2fe';
      ctx.fillText(title.subtitle, canvasW / 2, cardY + cardH * 0.75, maxTextW);
    } else {
      ctx.fillText(displayText, canvasW / 2, cardY + cardH * 0.52, maxTextW);
    }

  } else if (title.style === 'cinema') {
    applyTransform(canvasW / 2, canvasH - canvasH * 0.12);

    const cineGrad = ctx.createLinearGradient(0, canvasH * 0.75, 0, canvasH);
    cineGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    cineGrad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
    ctx.fillStyle = cineGrad;
    ctx.fillRect(0, canvasH * 0.75, canvasW, canvasH * 0.25);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = title.textColor || '#ffffff';
    ctx.font = `800 ${title.fontSize * 0.88 * scaleRatio}px "Outfit", serif`;
    const cineY = canvasH - (title.subtitle ? canvasH * 0.13 : canvasH * 0.08);
    ctx.fillText(displayText.toUpperCase(), canvasW / 2, cineY);

    if (title.subtitle) {
      ctx.font = `600 ${(title.fontSize * 0.46) * scaleRatio}px "Inter", sans-serif`;
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(title.subtitle, canvasW / 2, cineY + 30 * scaleRatio);
    }

  } else {
    const titleFont = `bold ${title.fontSize * 0.75 * scaleRatio}px "Outfit", sans-serif`;
    ctx.font = titleFont;
    const titleW = ctx.measureText(displayText).width;
    let subW = 0;
    if (title.subtitle) {
      ctx.font = `normal ${(title.fontSize * 0.45) * scaleRatio}px "Inter", sans-serif`;
      subW = ctx.measureText(title.subtitle).width;
    }

    const contentW = Math.max(titleW, subW);
    const bannerW = Math.min(canvasW * 0.55, Math.max(canvasW * 0.25, contentW + 48));
    const bannerH = title.subtitle ? canvasH * 0.13 : canvasH * 0.085;
    const bannerX = canvasW * 0.04;
    const bannerY = canvasH - bannerH - (canvasH * 0.05);

    applyTransform(bannerX + bannerW / 2, bannerY + bannerH / 2);

    ctx.fillStyle = title.bgColor || 'rgba(15, 23, 42, 0.88)';
    if (typeof (ctx as any).roundRect === 'function') {
      ctx.beginPath();
      (ctx as any).roundRect(bannerX, bannerY, bannerW, bannerH, 10);
      ctx.fill();
    } else {
      ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
    }

    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2.5;
    if (typeof (ctx as any).roundRect === 'function') {
      ctx.stroke();
    } else {
      ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);
    }

    ctx.fillStyle = '#8b5cf6';
    if (typeof (ctx as any).roundRect === 'function') {
      ctx.beginPath();
      (ctx as any).roundRect(bannerX + 4, bannerY + 6, 4, bannerH - 12, 2);
      ctx.fill();
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = title.textColor || '#ffffff';
    ctx.font = titleFont;
    const maxTextW = bannerW - 40;
    if (title.subtitle) {
      ctx.fillText(displayText, bannerX + 20, bannerY + bannerH * 0.36, maxTextW);
      ctx.font = `normal ${(title.fontSize * 0.45) * scaleRatio}px "Inter", sans-serif`;
      ctx.fillStyle = '#c084fc';
      ctx.fillText(title.subtitle, bannerX + 20, bannerY + bannerH * 0.72, maxTextW);
    } else {
      ctx.fillText(displayText, bannerX + 20, bannerY + bannerH * 0.5, maxTextW);
    }
  }

  ctx.restore();
}
