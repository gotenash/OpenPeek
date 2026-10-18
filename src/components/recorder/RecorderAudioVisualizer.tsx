import { useEffect, useRef } from 'react';

interface RecorderAudioVisualizerProps {
  analyserNode: AnalyserNode | null;
  isRecording: boolean;
  isPaused: boolean;
  recordMic: boolean;
  micLevel: number;
}

export function RecorderAudioVisualizer({
  analyserNode,
  isRecording,
  isPaused,
  recordMic,
  micLevel
}: RecorderAudioVisualizerProps) {
  const visualizerCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!visualizerCanvasRef.current || !analyserNode || !isRecording || isPaused) return;

    const canvas = visualizerCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationId = requestAnimationFrame(render);
      analyserNode.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / 32) - 2;
      let x = 0;

      for (let i = 0; i < 32; i++) {
        const barHeight = (dataArray[i * 2] / 255) * canvas.height;
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#8b5cf6');
        gradient.addColorStop(1, '#ec4899');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 2;
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [analyserNode, isRecording, isPaused]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Niveau d'Entrée Audio</span>
      <div className="waveform-container">
        <canvas ref={visualizerCanvasRef} width={300} height={60} className="waveform-canvas" />
        <span className="visualizer-label">
          {recordMic ? 'Microactif' : 'Micro désactivé'}
        </span>
      </div>

      {recordMic && isRecording && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <div style={{ flexGrow: 1, height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${micLevel * 100}%`, height: '100%', background: 'var(--success)', transition: 'width 0.1s' }} />
          </div>
          <span>{Math.round(micLevel * 100)}%</span>
        </div>
      )}
    </div>
  );
}
