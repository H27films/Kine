import React, { useEffect, useRef } from 'react';

interface VoiceVisualiserProps {
  amplitudes: number[];
  listening: boolean;
  status: 'idle' | 'listening' | 'processing' | 'success' | 'error';
}

export const VoiceVisualiser: React.FC<VoiceVisualiserProps> = ({ amplitudes, listening, status }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const historyRef = useRef<number[][]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 320;
    const H = 160;
    canvas.width = W;
    canvas.height = H;

    const NUM_HISTORY = 12;
    const cy = H / 2;

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      timeRef.current += 0.03;
      ctx.clearRect(0, 0, W, H);

      // Build current wave from amplitudes or idle sine
      const current: number[] = Array.from({ length: W }, (_, x) => {
        const t = x / W;
        if (listening) {
          const idx = Math.floor(t * amplitudes.length);
          const amp = (amplitudes[idx] - 3) / 80;
          return amp * 55 * Math.sin(t * Math.PI);
        } else if (status === 'success') {
          return 8 * Math.sin(t * Math.PI * 3 + timeRef.current) * Math.sin(t * Math.PI);
        } else {
          // gentle idle breathe
          return 6 * Math.sin(t * Math.PI * 2 + timeRef.current) * Math.sin(t * Math.PI);
        }
      });

      // Push to history
      historyRef.current.unshift(current);
      if (historyRef.current.length > NUM_HISTORY) historyRef.current.pop();

      // Draw from oldest (faintest) to newest (boldest)
      historyRef.current.forEach((wave, hi) => {
        const age = hi / (NUM_HISTORY - 1); // 0 = newest, 1 = oldest
        const opacity = listening
          ? (1 - age) * 0.7
          : (1 - age) * 0.25;
        const lineWidth = listening
          ? 1 + (1 - age) * 1.5
          : 0.8 + (1 - age) * 0.8;
        const yOffset = age * (listening ? 18 : 6);

        ctx.beginPath();
        ctx.moveTo(0, cy + yOffset);
        for (let x = 0; x < W; x++) {
          ctx.lineTo(x, cy + yOffset - wave[x]);
        }
        ctx.strokeStyle = `rgba(26,26,26,${opacity})`;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      });
    };

    draw();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [amplitudes, listening, status]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '320px', height: '160px', marginBottom: '32px' }}
    />
  );
};