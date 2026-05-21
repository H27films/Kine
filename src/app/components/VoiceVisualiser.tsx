import React, { useEffect, useRef } from 'react';

interface VoiceVisualiserProps {
  listening: boolean;
  status: 'idle' | 'listening' | 'processing' | 'success' | 'error';
}

const NUM_BARS = 32;

/**
 * Purely cosmetic waveform visualiser — no AudioContext / AnalyserNode needed.
 * Uses a timer-based sine wave animation that bounces when listening.
 * This avoids iOS conflicts where SpeechRecognition and AudioContext
 * compete for the microphone stream.
 */
export const VoiceVisualiser: React.FC<VoiceVisualiserProps> = ({ listening, status }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 320;
    const H = 120;
    canvas.width = W;
    canvas.height = H;

    const cy = H / 2;
    const DOT_BASE = 4;

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      timeRef.current += 0.04;
      ctx.clearRect(0, 0, W, H);

      for (let i = 0; i < NUM_BARS; i++) {
        const t = i / (NUM_BARS - 1);
        const x = 16 + t * (W - 32);

        let dy = 0;
        let dotSize = DOT_BASE;
        let opacity = 0.5;

        if (listening) {
          // Simulated audio response using sine waves with varying frequencies
          // Creates a natural-looking bouncing waveform pattern
          const envelope = Math.sin(t * Math.PI);
          const freq1 = Math.sin(timeRef.current * 4 + t * 6);
          const freq2 = Math.sin(timeRef.current * 2 + t * 3);
          const amp = 0.3 + 0.7 * Math.abs(freq1 * 0.6 + freq2 * 0.4);
          dy = amp * 45 * envelope;
          dotSize = DOT_BASE * (0.6 + amp * 1.4);
          opacity = 0.5 + amp * 0.5;
        } else if (status === 'success') {
          const envelope = Math.sin(t * Math.PI);
          dy = Math.sin(t * Math.PI * 3 + timeRef.current * 2) * 14 * envelope;
          dotSize = DOT_BASE * 0.9;
          opacity = 0.75;
        } else {
          // Idle wave animation
          const delay = i * 0.18;
          const envelope = Math.sin(t * Math.PI);
          dy = Math.sin(timeRef.current + delay) * 28 * envelope;
          dotSize = DOT_BASE * (0.7 + 0.3 * Math.abs(Math.sin(timeRef.current + delay)));
          opacity = 0.55 + 0.45 * Math.abs(Math.sin(timeRef.current + delay));
        }

        ctx.beginPath();
        ctx.arc(x, cy - dy, Math.max(2, dotSize), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(26,26,26,${opacity})`;
        ctx.fill();
      }
    };

    draw();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [listening, status]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '320px', height: '120px', marginBottom: '32px' }}
    />
  );
};