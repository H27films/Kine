import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// Conversion ratio: 1 KM = 12 minutes
const MINUTES_PER_KM = 12;

interface Props {
  onClose: () => void;
  onApply: (km: number) => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

const CrossTrainerTimer: React.FC<Props> = ({ onClose, onApply }) => {
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startRef = useRef<number>(0);

  // Tick while running
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setElapsedMs(Date.now() - startRef.current);
    }, 200);
    return () => clearInterval(id);
  }, [running]);

  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const timeStr = hours > 0
    ? `${hours}:${pad(mins)}:${pad(secs)}`
    : `${pad(mins)}:${pad(secs)}`;

  // KM equivalent from elapsed time (1 KM = 12 MIN)
  const km = totalSeconds / 60 / MINUTES_PER_KM;

  const handleStart = () => {
    startRef.current = Date.now();
    setElapsedMs(0);
    setRunning(true);
  };

  const handleStop = () => {
    const ms = Date.now() - startRef.current;
    const sec = Math.floor(ms / 1000);
    setElapsedMs(ms);
    setRunning(false);
    onApply(sec / 60 / MINUTES_PER_KM);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'absolute', bottom: '0px', left: '10px', right: '10px',
          backgroundColor: '#F2F2ED',
          borderRadius: '20px 20px 0 0',
          padding: '24px 24px 32px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <p style={{
            fontSize: '14px', fontWeight: 900,
            color: '#000000',
            letterSpacing: '0.2em', textTransform: 'uppercase',
            margin: 0,
          }}>
            Cross Trainer Timer
          </p>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: '#000000', lineHeight: 0 }}
            aria-label="Close"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Time + KM readout */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <div style={{
            fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-0.02em',
            color: '#000000', lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {timeStr}
          </div>
          <div style={{
            marginTop: 14,
            fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.08em',
            color: '#000000', textTransform: 'uppercase',
          }}>
            {km.toFixed(2)} KM
          </div>
          <div style={{
            marginTop: 6,
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em',
            color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase',
          }}>
            1 KM = {MINUTES_PER_KM} MIN
          </div>
        </div>

        {/* Controls */}
        {running ? (
          <button
            onClick={handleStop}
            style={{
              width: '100%', padding: '15px',
              backgroundColor: '#000000', color: '#ffffff',
              borderRadius: 999, border: 'none',
              fontSize: '12px', fontWeight: 900,
              letterSpacing: '0.25em', textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Stop
          </button>
        ) : (
          <button
            onClick={handleStart}
            style={{
              width: '100%', padding: '15px',
              backgroundColor: '#000000', color: '#ffffff',
              borderRadius: 999, border: 'none',
              fontSize: '12px', fontWeight: 900,
              letterSpacing: '0.25em', textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Start
          </button>
        )}
      </div>
    </div>
  );
};

export default CrossTrainerTimer;
