import { useRef } from 'react';

export function useRecorderWebcamPosition(canvasRef: React.MutableRefObject<HTMLCanvasElement | null>) {
  // Webcam position & size variables (relative coordinates 0-1)
  const webcamPosRef = useRef({ x: 0.85, y: 0.85 }); // bottom right
  const webcamRadiusRef = useRef(0.08); // 8% of width

  // Helper to drag webcam bubble inside live preview canvas
  const updateWebcamPosition = (clientX: number, clientY: number, canvasBoundingRect: DOMRect) => {
    if (!canvasRef.current) return;
    
    const clickX = (clientX - canvasBoundingRect.left) / canvasBoundingRect.width;
    const clickY = (clientY - canvasBoundingRect.top) / canvasBoundingRect.height;
    
    // Constrain position between radius and 1 - radius
    const rX = webcamRadiusRef.current;
    const rY = webcamRadiusRef.current * (canvasBoundingRect.width / canvasBoundingRect.height);
    
    webcamPosRef.current = {
      x: Math.max(rX, Math.min(1 - rX, clickX)),
      y: Math.max(rY, Math.min(1 - rY, clickY))
    };
  };

  const setWebcamSizePercentage = (percent: number) => {
    // scale radius (range: 0.04 to 0.15)
    webcamRadiusRef.current = Math.max(0.04, Math.min(0.15, percent));
  };

  return {
    webcamPosRef,
    webcamRadiusRef,
    updateWebcamPosition,
    setWebcamSizePercentage
  };
}
