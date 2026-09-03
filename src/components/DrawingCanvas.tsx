import React, { useEffect, useRef, useState } from 'react';
import { Edit2, Eraser, Trash2, Sparkles, Highlighter } from 'lucide-react';

export function DrawingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#8b5cf6'); // Default primary purple
  const [thickness, setThickness] = useState(5);
  const [tool, setTool] = useState<'brush' | 'highlighter' | 'eraser'>('brush');

  const colors = [
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#10b981', // Green
    '#f43f5e', // Red
    '#fbbf24', // Yellow
    '#000000', // Black
    '#ffffff'  // White
  ];

  // Set up the canvas resolution and context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // We make the canvas match its rendering dimensions in the DOM
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    const context = canvas.getContext('2d');
    if (!context) return;

    // Scale drawing context to account for HiDPI/Retina screens
    context.scale(window.devicePixelRatio, window.devicePixelRatio);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    contextRef.current = context;

    // Fill background with white initially
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, rect.width, rect.height);

    // Re-initialize on window resize
    const handleResize = () => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0);
      }

      const newRect = canvas.getBoundingClientRect();
      canvas.width = newRect.width * window.devicePixelRatio;
      canvas.height = newRect.height * window.devicePixelRatio;
      
      const newCtx = canvas.getContext('2d');
      if (newCtx) {
        newCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
        newCtx.lineCap = 'round';
        newCtx.lineJoin = 'round';
        newCtx.fillStyle = '#ffffff';
        newCtx.fillRect(0, 0, newRect.width, newRect.height);
        newCtx.drawImage(tempCanvas, 0, 0, newRect.width, newRect.height);
        contextRef.current = newCtx;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Update context parameters when drawing settings change
  useEffect(() => {
    const ctx = contextRef.current;
    if (!ctx) return;

    if (tool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = thickness * 3; // Make eraser slightly larger
      ctx.globalAlpha = 1.0;
    } else if (tool === 'highlighter') {
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness * 2.5; // Highlighter is wider
      ctx.globalAlpha = 0.4; // Semi-transparent
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.globalAlpha = 1.0;
    }
  }, [color, thickness, tool]);

  const pointsRef = useRef<Array<{ x: number; y: number }>>([]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    pointsRef.current = [{ x, y }];
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    const pts = pointsRef.current;
    const prev = pts[pts.length - 1];

    // Jitter deadzone
    const dx = rawX - prev.x;
    const dy = rawY - prev.y;
    if (dx * dx + dy * dy < 4) return;

    // Moving average smoothing
    const x = prev.x + dx * 0.75;
    const y = prev.y + dy * 0.75;
    pts.push({ x, y });

    if (pts.length === 2) {
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (pts.length > 2) {
      const pPrev = pts[pts.length - 2];
      const pPrevPrev = pts[pts.length - 3];
      const mid1X = (pPrevPrev.x + pPrev.x) / 2;
      const mid1Y = (pPrevPrev.y + pPrev.y) / 2;
      const mid2X = (pPrev.x + x) / 2;
      const mid2Y = (pPrev.y + y) / 2;

      ctx.beginPath();
      ctx.moveTo(mid1X, mid1Y);
      ctx.quadraticCurveTo(pPrev.x, pPrev.y, mid2X, mid2Y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    const ctx = contextRef.current;
    const pts = pointsRef.current;
    if (ctx && pts.length > 1) {
      const last = pts[pts.length - 1];
      const prev = pts[pts.length - 2];
      ctx.beginPath();
      ctx.moveTo((prev.x + last.x) / 2, (prev.y + last.y) / 2);
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    }
    pointsRef.current = [];
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    
    // Animate clear
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
  };

  return (
    <div className="whiteboard-container">
      {/* Top Drawing Toolbar */}
      <div className="glass-panel whiteboard-toolbar">
        <div className="whiteboard-tools-group">
          {/* Tool selectors */}
          <button 
            className={`control-icon-btn ${tool === 'brush' ? 'active' : ''}`}
            onClick={() => setTool('brush')}
            title="Crayon"
          >
            <Edit2 size={16} />
          </button>
          
          <button 
            className={`control-icon-btn ${tool === 'highlighter' ? 'active' : ''}`}
            onClick={() => setTool('highlighter')}
            title="Surligneur"
          >
            <Highlighter size={16} />
          </button>

          <button 
            className={`control-icon-btn ${tool === 'eraser' ? 'active' : ''}`}
            onClick={() => setTool('eraser')}
            title="Gomme"
          >
            <Eraser size={16} />
          </button>

          <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 4px' }} />

          {/* Color palette */}
          {tool !== 'eraser' && colors.map((col) => (
            <div
              key={col}
              className={`color-option ${color === col ? 'selected' : ''}`}
              style={{ backgroundColor: col === '#ffffff' ? '#f1f5f9' : col }}
              onClick={() => setColor(col)}
              title={col}
            />
          ))}
        </div>

        <div className="whiteboard-tools-group">
          {/* Brush thickness */}
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Épaisseur :</span>
          <input 
            type="range" 
            min="2" 
            max="30" 
            value={thickness}
            className="thickness-slider"
            onChange={(e) => setThickness(Number(e.target.value))}
          />
          <span style={{ fontSize: '12px', width: '20px', textAlign: 'right' }}>{thickness}px</span>

          <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 8px' }} />

          {/* Clear button */}
          <button className="btn-secondary" style={{ padding: '8px 16px', background: 'rgba(244,63,94,0.05)', borderColor: 'rgba(244,63,94,0.15)', color: '#fb7185' }} onClick={clearCanvas}>
            <Trash2 size={14} /> Effacer tout
          </button>
        </div>
      </div>

      {/* Screen Whiteboard Canvas drawing area */}
      <div className="whiteboard-canvas-wrapper">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="whiteboard-canvas"
        />
        <div style={{ position: 'absolute', bottom: '16px', left: '16px', display: 'flex', gap: '8px', padding: '8px 12px', background: 'rgba(13,17,39,0.8)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '11px', color: 'var(--text-secondary)', alignItems: 'center', pointerEvents: 'none' }}>
          <Sparkles size={12} style={{ color: 'var(--primary)' }} />
          <span>Tableau blanc interactif : utile pour dessiner vos concepts en direct pendant l'enregistrement de votre fenêtre.</span>
        </div>
      </div>
    </div>
  );
}
