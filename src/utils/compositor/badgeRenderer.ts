/**
 * Draws an animated high-tech Fast-Forward badge on canvas (Screen Studio style)
 */
export function drawFastForwardBadge(
  ctx: CanvasRenderingContext2D,
  speed: number,
  canvasWidth: number,
  canvasHeight: number
) {
  if (speed <= 1.0) return;

  const text = `⏩ ${speed}x FAST-FORWARD`;
  const fontSize = Math.max(13, Math.round(canvasWidth * 0.014));
  ctx.save();
  ctx.font = `800 ${fontSize}px system-ui, -apple-system, sans-serif`;

  const textMetrics = ctx.measureText(text);
  const padX = fontSize * 1.0;
  const padY = fontSize * 0.55;
  const badgeW = textMetrics.width + padX * 2;
  const badgeH = fontSize + padY * 2;

  // Position at top-right
  const x = canvasWidth - badgeW - canvasWidth * 0.03;
  const y = canvasHeight * 0.05;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.strokeStyle = '#f59e0b'; // Amber / Gold neon border
  ctx.lineWidth = 1.8;

  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, badgeW, badgeH, 10);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(x, y, badgeW, badgeH);
    ctx.strokeRect(x, y, badgeW, badgeH);
  }

  // Text with amber glow
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#fde68a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + badgeW / 2, y + badgeH / 2 + 1);

  ctx.restore();
}
